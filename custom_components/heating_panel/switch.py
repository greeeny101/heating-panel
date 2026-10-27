"""The TPI switch: pauses TPI without changing the integration's options.

Off hands the receiver back to its own thermostat at the target (see Tpi.set_enabled). It's only there when
TPI is turned on in the integration's options.
"""

from __future__ import annotations

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import tpi_signal
from .controller import TpiController


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    controller: TpiController | None = entry.runtime_data
    if controller:
        async_add_entities([TpiSwitch(entry, controller)])


class TpiSwitch(SwitchEntity):
    _attr_name = "Heating TPI"
    _attr_icon = "mdi:sine-wave"
    _attr_should_poll = False

    def __init__(self, entry: ConfigEntry, controller: TpiController) -> None:
        self._controller = controller
        self._attr_unique_id = f"{entry.entry_id}_tpi"

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            async_dispatcher_connect(self.hass, tpi_signal(self._controller.topic), self.async_write_ha_state)
        )

    @property
    def is_on(self) -> bool:
        return self._controller.tpi.enabled

    async def async_turn_on(self, **kwargs: Any) -> None:
        self._controller.set_enabled(True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        self._controller.set_enabled(False)
