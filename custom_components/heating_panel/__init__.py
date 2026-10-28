"""The heating panel integration: lets any Home Assistant user send the heating panel's receiver commands.

Since 2026.10 Home Assistant only lets administrators call mqtt.publish. This integration's
heating_panel.send service is open to every user, but only publishes to the /set and /get topics of the
receivers set up here, and never retained (a retained /set is re-sent whenever zigbee2mqtt reconnects).

It also makes a heating mode sensor for each receiver, which shows only where a change ended up: the panel
calls heating_panel.busy while it sends one (see sensor.py and mode.py).

It also serves the panel and registers it (see panel.py), with a receiver sensor the panel follows the receiver
through. Entries made before 0.4 keep their panel_custom YAML until "Set up the panel" is ticked in the options.

Optionally (the integration's options), it runs TPI boiler control for a receiver: see tpi.py and controller.py.
"""

from __future__ import annotations

from collections.abc import Callable

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import Event, HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv, entity_registry as er
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_call_later
from homeassistant.helpers.typing import ConfigType

from . import panel
from .const import (
    ATTR_BUSY,
    ATTR_COMMAND,
    ATTR_PAYLOAD,
    ATTR_TOPIC,
    CONF_PANEL,
    CONF_TOPIC,
    CONF_TPI,
    DOMAIN,
    SERVICE_BUSY,
    SERVICE_SEND,
    busy_signal,
    panel_setpoint_signal,
)
from .controller import TpiController
from .hold import SendHold
from .panel_config import config_entities, renamed_options
from .publish import async_publish_command
from .topics import COMMANDS, TopicError, check_receiver, command_topic

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)
PLATFORMS = [Platform.SENSOR, Platform.SWITCH]

# entry.runtime_data: the receiver's TPI controller, or None when TPI is off in the options.
type HeatingPanelEntry = ConfigEntry[TpiController | None]

SEND_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_TOPIC): cv.string,
        vol.Required(ATTR_COMMAND): vol.In(COMMANDS),
        vol.Required(ATTR_PAYLOAD): vol.All(dict, vol.Length(min=1)),
    }
)

# The receiver's temperature setting, as zigbee2mqtt names it.
SETPOINT = "occupied_heating_setpoint"

BUSY_SCHEMA = vol.Schema({vol.Required(ATTR_TOPIC): cv.string, vol.Required(ATTR_BUSY): cv.boolean})


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    def receivers() -> set[str]:
        return {e.data[CONF_TOPIC] for e in hass.config_entries.async_loaded_entries(DOMAIN)}

    holds: dict[str, SendHold] = {}

    def hold_for(topic: str) -> SendHold:
        """TPI and the mode sensor wait while a change is sent, even if the page doesn't say so (see hold.py)."""
        if topic not in holds:

            def schedule(delay: float, run: Callable[[], None]) -> Callable[[], None]:
                return async_call_later(hass, delay, callback(lambda _now: run()))

            holds[topic] = SendHold(lambda busy: async_dispatcher_send(hass, busy_signal(topic), busy), schedule)
        return holds[topic]

    async def send(call: ServiceCall) -> None:
        topic, command = call.data[ATTR_TOPIC], call.data[ATTR_COMMAND]
        try:
            command_topic(receivers(), topic, command)
        except TopicError as err:
            raise ServiceValidationError(str(err)) from err
        payload = call.data[ATTR_PAYLOAD]
        if command == "set":
            hold_for(topic).sent()
            # A temperature on its own is the panel's dial: tell TPI exactly what was chosen. (Boost, Manual and
            # Off send other settings with it, and aren't a new target.)
            if set(payload) == {SETPOINT}:
                async_dispatcher_send(hass, panel_setpoint_signal(topic), float(payload[SETPOINT]))
        await async_publish_command(hass, topic, command, payload)

    async def busy(call: ServiceCall) -> None:
        """The panel is starting (true) or has finished (false) a change: hold the heating mode sensor meanwhile."""
        try:
            check_receiver(receivers(), call.data[ATTR_TOPIC])
        except TopicError as err:
            raise ServiceValidationError(str(err)) from err
        hold_for(call.data[ATTR_TOPIC]).panel_busy(call.data[ATTR_BUSY])

    hass.services.async_register(DOMAIN, SERVICE_SEND, send, schema=SEND_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_BUSY, busy, schema=BUSY_SCHEMA)
    await panel.async_serve_frontend(hass)
    return True


async def async_migrate_entry(hass: HomeAssistant, entry: HeatingPanelEntry) -> bool:
    if entry.version == 1 and entry.minor_version < 2:
        # Made before the integration could set up the panel: the panel_custom YAML stays in charge until the
        # option is ticked, so the two don't both claim /heating.
        hass.config_entries.async_update_entry(entry, options={**entry.options, CONF_PANEL: False}, minor_version=2)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: HeatingPanelEntry) -> bool:
    entry.runtime_data = None
    if entry.options.get(CONF_TPI):
        controller = TpiController(hass, entry)
        entry.async_on_unload(controller.stop)
        await controller.async_start()
        entry.runtime_data = controller
    entry.async_on_unload(entry.add_update_listener(_options_changed))
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    # After the platforms, so the receiver sensor is in the entity registry.
    panel_entities: set[str] = set()
    if entry.options.get(CONF_PANEL) and (config := await panel.async_register(hass, entry)):
        entry.async_on_unload(lambda: panel.remove(hass, entry))
        panel_entities |= config_entities(config)
    entry.async_on_unload(_follow_renames(hass, entry, panel_entities))
    return True


@callback
def _follow_renames(hass: HomeAssistant, entry: HeatingPanelEntry, panel_entities: set[str]) -> Callable[[], None]:
    """Keep working when an entity is renamed in Settings → Entities.

    An entity chosen in the options (a radiator, TPI's room sensor...) is renamed there, which reloads the entry.
    One the integration found itself (the receiver sensor, a valve's battery...) only needs the panel registered
    again with the new name, which leaves TPI running.
    """

    async def register_again() -> None:
        panel.remove(hass, entry)
        panel_entities.clear()
        if config := await panel.async_register(hass, entry):
            panel_entities.update(config_entities(config))

    @callback
    def renamed(event: Event[er.EventEntityRegistryUpdatedData]) -> None:
        data = event.data
        if data["action"] != "update" or "old_entity_id" not in data:
            return
        old, new = data["old_entity_id"], data["entity_id"]
        if (options := renamed_options(dict(entry.options), old, new)) is not None:
            hass.config_entries.async_update_entry(entry, options=options)
        elif old in panel_entities:
            entry.async_create_task(hass, register_again(), f"{DOMAIN} panel after rename")

    return hass.bus.async_listen(er.EVENT_ENTITY_REGISTRY_UPDATED, renamed)


async def _options_changed(hass: HomeAssistant, entry: HeatingPanelEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: HeatingPanelEntry) -> bool:
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
