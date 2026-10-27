"""The heating mode sensor: the receiver's mode once a change has finished, for dashboards and automations.

It follows the receiver's zigbee2mqtt topic, but holds back while the panel is sending a change (the
heating_panel.busy service) and until the receiver has been quiet for a moment. See mode.py.

With TPI on, its setpoint is TPI's target rather than the nudged value on the receiver, and a TPI demand
sensor shows the share of each cycle the boiler is given.

With the panel set up here (the options), a receiver sensor passes each of the receiver's reports to the panel.
"""

from __future__ import annotations

import json
from typing import Any

from homeassistant.components import mqtt
from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import MATCH_ALL, PERCENTAGE, EntityCategory
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import async_call_later

from .const import CONF_PANEL, CONF_TOPIC, DOMAIN, LOGGER, busy_signal, tpi_signal
from .controller import TpiController
from .mode import MODES, Settler, decode_mode
from .panel import receiver_sensor_unique_id
from .publish import async_first_read


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    controller: TpiController | None = entry.runtime_data
    entities: list[SensorEntity] = [HeatingModeSensor(entry, controller)]
    if controller:
        entities.append(TpiDemandSensor(entry, controller))
    if entry.options.get(CONF_PANEL):
        entities.append(ReceiverSensor(entry))
    async_add_entities(entities)


class ReceiverSensor(SensorEntity):
    """The receiver's every report, as attributes: the panel follows the receiver through it.

    People who aren't administrators can't watch MQTT topics, but they can watch entities. Its state is the
    receiver's system_mode. Every report is passed on, even one the same as the last (the panel's checks rely on
    seeing each one), and its attributes aren't kept in the history.
    """

    _attr_name = "Heating panel receiver"
    _attr_icon = "mdi:access-point"
    _attr_should_poll = False
    _attr_force_update = True
    _attr_entity_category = EntityCategory.DIAGNOSTIC
    _unrecorded_attributes = frozenset({MATCH_ALL})

    def __init__(self, entry: ConfigEntry) -> None:
        self._topic: str = entry.data[CONF_TOPIC]
        self._attr_unique_id = receiver_sensor_unique_id(entry)
        self._report: dict[str, Any] = {}

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(await mqtt.async_subscribe(self.hass, self._topic, self._message))
        # Unavailable while Home Assistant is cut off from the MQTT broker, like an MQTT sensor.
        self.async_on_remove(mqtt.async_subscribe_connection_status(self.hass, self._connection))

    @callback
    def _connection(self, connected: bool) -> None:
        self.async_write_ha_state()

    @property
    def available(self) -> bool:
        return mqtt.is_connected(self.hass)

    @callback
    def _message(self, msg: mqtt.ReceiveMessage) -> None:
        try:
            payload = json.loads(msg.payload)
        except ValueError:
            return
        if isinstance(payload, dict):
            self._report = payload
            self.async_write_ha_state()

    @property
    def native_value(self) -> str | None:
        mode = self._report.get("system_mode")
        return str(mode) if mode is not None else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return self._report


class HeatingModeSensor(SensorEntity):
    """off, schedule, manual, boost, away or unknown, with the receiver's settled report as attributes."""

    _attr_name = "Heating mode"
    _attr_icon = "mdi:radiator"
    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = MODES
    _attr_should_poll = False

    def __init__(self, entry: ConfigEntry, controller: TpiController | None) -> None:
        self._topic: str = entry.data[CONF_TOPIC]
        self._attr_unique_id = f"{entry.entry_id}_mode"
        self._report: dict[str, Any] = {}
        self._settler: Settler | None = None
        self._controller = controller
        self._entry = entry

    async def async_added_to_hass(self) -> None:
        def schedule(delay: float, run):
            # Marked as a callback so Home Assistant runs it in the event loop: a plain function would be run
            # in a worker thread, where writing the state is refused.
            return async_call_later(self.hass, delay, callback(lambda _now: run()))

        self._settler = Settler(self._publish, schedule)
        self.async_on_remove(self._settler.stop)
        self.async_on_remove(async_dispatcher_connect(self.hass, busy_signal(self._topic), self._busy))
        self.async_on_remove(await mqtt.async_subscribe(self.hass, self._topic, self._message))
        if self._controller:
            self.async_on_remove(async_dispatcher_connect(self.hass, tpi_signal(self._topic), self._tpi_changed))
        else:
            # Without TPI nothing else asks, and the receiver may not report by itself for half an hour.
            self._entry.async_create_background_task(
                self.hass, async_first_read(self.hass, self._topic), f"{DOMAIN} mode first read"
            )

    @callback
    def _tpi_changed(self) -> None:
        if self._report:
            self.async_write_ha_state()

    @callback
    def _message(self, msg: mqtt.ReceiveMessage) -> None:
        try:
            payload = json.loads(msg.payload)
        except ValueError:
            return
        if isinstance(payload, dict) and self._settler:
            self._settler.report(payload)

    @callback
    def _busy(self, busy: bool) -> None:
        LOGGER.debug("%s busy: %s", self._topic, busy)
        if self._settler:
            self._settler.set_busy(busy)

    @callback
    def _publish(self, report: dict[str, Any]) -> None:
        self._report = report
        self.async_write_ha_state()

    @property
    def native_value(self) -> str | None:
        return decode_mode(self._report) if self._report else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        r = self._report
        attrs = {
            "setpoint": r.get("occupied_heating_setpoint"),
            "hold_minutes": r.get("temperature_setpoint_hold_duration"),
            "heating": r.get("running_state") == "heat",
            "local_temperature": r.get("local_temperature"),
            "system_mode": r.get("system_mode"),
            "temperature_setpoint_hold": r.get("temperature_setpoint_hold"),
            "topic": self._topic,
        }
        if self._controller:
            tpi = self._controller.tpi
            active = tpi.running
            # The panel and the card show the target, not the nudge either side of it.
            if active and decode_mode(r) == "schedule":
                attrs["setpoint"] = tpi.target
            attrs |= {
                "tpi_active": active,
                "tpi_target": tpi.target if active else None,
                "tpi_setpoint": tpi.wanted if active else None,
                "tpi_demand": tpi_percent(tpi.demand),
            }
        return attrs


def tpi_percent(demand: float) -> int:
    return round(demand * 100)


class TpiDemandSensor(SensorEntity):
    """The share of each cycle TPI gives the boiler, with why it's idle (if it is) and the cycle's details."""

    _attr_name = "Heating TPI demand"
    _attr_icon = "mdi:fire-circle"
    _attr_native_unit_of_measurement = PERCENTAGE
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_should_poll = False

    def __init__(self, entry: ConfigEntry, controller: TpiController) -> None:
        self._controller = controller
        self._attr_unique_id = f"{entry.entry_id}_tpi_demand"

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            async_dispatcher_connect(self.hass, tpi_signal(self._controller.topic), self.async_write_ha_state)
        )

    @property
    def native_value(self) -> int:
        return tpi_percent(self._controller.tpi.demand)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        c = self._controller
        tpi = c.tpi
        return {
            "idle_reason": tpi.idle_reason,
            "boiler_on": tpi.running and tpi.on,
            "target": tpi.target,
            "temporary_change": tpi.override,
            "room_temperature": tpi.room,
            "outdoor_temperature": tpi.outdoor,
            "setpoint_written": tpi.wanted,
            "carried_minutes": round(tpi.carry, 1),
            "cycle_ends": c.cycle_ends.isoformat() if c.cycle_ends else None,
            "room_source": c.room_entity or "receiver",
            "outdoor_source": c.outdoor_entity,
            "topic": c.topic,
        }
