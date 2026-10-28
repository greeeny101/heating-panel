"""Fixtures for the tests that run the integration inside Home Assistant (pytest-homeassistant-custom-component).

These catch a Home Assistant release breaking the integration: CI runs them against the newest release and the
newest beta. The receiver is never real: MQTT is mocked, and reports are made up with async_fire_mqtt_message.
"""

from collections.abc import AsyncGenerator, Generator
from unittest.mock import Mock, patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import MqttMockHAClient, MqttMockPahoClient

from custom_components.heating_panel.const import DOMAIN
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant

TOPIC = "zigbee2mqtt/Hive receiver"

# A report as the Hive SLR1c sends it through zigbee2mqtt: Schedule (which it reports as "heat" with no hold),
# in an "off" slot, boiler idle.
REPORT = {
    "linkquality": 91,
    "local_temperature": 18.71,
    "min_heat_setpoint_limit": 5,
    "occupied_heating_setpoint": 1,
    "running_state": "idle",
    "system_mode": "heat",
    "temperature_setpoint_hold": False,
    "temperature_setpoint_hold_duration": 0,
}


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations: None) -> None:
    """Let Home Assistant load the integration from custom_components/."""


@pytest.fixture(autouse=True)
def no_first_read_delay() -> Generator[None]:
    """The mode sensor asks the receiver for its state straight away, instead of after 5 seconds."""
    with patch("custom_components.heating_panel.publish.FIRST_READ_DELAY_SECONDS", 0):
        yield


@pytest.fixture(autouse=True)
async def unload_entries(hass: HomeAssistant, mqtt_client_mock: MqttMockPahoClient) -> AsyncGenerator[None]:
    """Unload everything after each test, the heating panel before MQTT, so no timers are left running.

    The MQTT mock opens a pretend socket but never closes it, which leaves MQTT's once-a-second timer running, so
    it's closed here as the mock opened it. Anything of ours still running after this is a real leftover, and the
    test fails on it.
    """
    yield
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry.state is ConfigEntryState.LOADED:
            await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    if callable(mqtt_client_mock.on_socket_close):
        mqtt_client_mock.on_socket_close(mqtt_client_mock, None, Mock(fileno=Mock(return_value=-1)))
    for entry in hass.config_entries.async_entries():
        if entry.state is ConfigEntryState.LOADED:
            await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()


async def setup_receiver(hass: HomeAssistant, options: dict | None = None, minor_version: int = 2) -> MockConfigEntry:
    """Set up a receiver entry, by default with the panel at /heating as a new entry gets it."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Hive receiver",
        unique_id=TOPIC,
        data={"topic": TOPIC},
        options={"panel": True, "url_path": "heating"} if options is None else options,
        version=1,
        minor_version=minor_version,
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    # Including the mode sensor's first read of the receiver.
    await hass.async_block_till_done(wait_background_tasks=True)
    return entry


def published(mqtt_mock: MqttMockHAClient) -> list[tuple]:
    """What was published, as (topic, payload, qos, retain), whatever else Home Assistant passes along."""
    return [tuple(call.args[:4]) for call in mqtt_mock.async_publish.call_args_list]
