"""Setting up a receiver: the panel, the sensors, the services, and moving from the YAML setup."""

from datetime import timedelta
import json

import pytest
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    MockUser,
    async_fire_mqtt_message,
    async_fire_time_changed,
)
from pytest_homeassistant_custom_component.typing import ClientSessionGenerator, MqttMockHAClient

from custom_components.heating_panel.const import DOMAIN
from homeassistant.components import frontend, mqtt, panel_custom
from homeassistant.config_entries import ConfigEntryState
from homeassistant.const import EVENT_STATE_CHANGED, STATE_UNAVAILABLE
from homeassistant.core import Context, HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import device_registry as dr, entity_registry as er
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.util import dt as dt_util

from .conftest import REPORT, TOPIC, published, setup_receiver


def _panel(hass: HomeAssistant, path: str = "heating") -> dict | None:
    panel = hass.data.get(frontend.DATA_PANELS, {}).get(path)
    return panel.to_response() if panel else None


def _valve(hass: HomeAssistant, z2m: MockConfigEntry, name: str, address: str, position: bool) -> str:
    """A radiator valve as zigbee2mqtt's discovery adds it: a device with a climate entity and its sensors."""
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=z2m.entry_id, identifiers={("mqtt", f"zigbee2mqtt_{address}")}, name=name
    )
    entities = er.async_get(hass)
    climate = entities.async_get_or_create(
        "climate", "mqtt", f"{address}_climate_zigbee2mqtt", device_id=device.id, config_entry=z2m
    )
    entities.async_get_or_create(
        "sensor",
        "mqtt",
        f"{address}_battery_zigbee2mqtt",
        device_id=device.id,
        config_entry=z2m,
        original_device_class="battery",
        original_name="Battery",
        suggested_object_id=f"{address}_battery",
    )
    if position:
        entities.async_get_or_create(
            "sensor",
            "mqtt",
            f"{address}_position_zigbee2mqtt",
            device_id=device.id,
            config_entry=z2m,
            original_name="Position",
            suggested_object_id=f"{address}_position",
        )
    return climate.entity_id


async def test_sets_up_the_panel(
    hass: HomeAssistant, mqtt_mock: MqttMockHAClient, hass_client: ClientSessionGenerator
) -> None:
    await setup_receiver(hass)
    panel = _panel(hass)
    assert panel is not None
    assert panel["component_name"] == "custom"
    assert panel["require_admin"] is False
    assert panel["title"] == "Heating"
    custom = panel["config"]["_panel_custom"]
    assert custom["name"] == "heating-panel"
    assert custom["module_url"].startswith("/heating_panel/heating-panel.js?v=")
    assert panel["config"]["receiver"]["topic"] == TOPIC
    assert panel["config"]["receiver"]["state_entity"] == "sensor.heating_panel_receiver"

    # The panel's file is served, to anyone (the browser fetches it before logging in to the websocket).
    response = await (await hass_client()).get(custom["module_url"])
    assert response.status == 200
    assert "heating-panel" in await response.text()


async def test_radiators_and_receiver_found_in_the_registries(hass: HomeAssistant, mqtt_mock: MqttMockHAClient) -> None:
    z2m = MockConfigEntry(domain="mqtt")
    z2m.add_to_hass(hass)
    bedroom = _valve(hass, z2m, "Bedroom radiator TRV", "0x1", position=True)
    office = _valve(hass, z2m, "Office back radiator", "0x2", position=False)
    receiver = _valve(hass, z2m, "Hive receiver", "0x3", position=False)

    await setup_receiver(hass, {"panel": True, "url_path": "heating", "radiators": [bedroom, office], "sidebar": False})
    panel = _panel(hass)
    assert panel["title"] is None  # not in the sidebar
    config = panel["config"]
    assert config["receiver"]["entity"] == receiver
    assert config["radiators"] == [
        {
            "entity": bedroom,
            "name": "Bedroom",
            "position": "sensor.0x1_position",
            "battery": "sensor.0x1_battery",
        },
        {"entity": office, "name": "Office back", "battery": "sensor.0x2_battery"},
    ]


async def test_receiver_sensor_passes_on_every_report(hass: HomeAssistant, mqtt_mock: MqttMockHAClient) -> None:
    await setup_receiver(hass)
    # The mode sensor asked the receiver for its state, on /get, not retained.
    assert (f"{TOPIC}/get", json.dumps({"occupied_heating_setpoint": ""}), 0, False) in published(mqtt_mock)

    changes = []
    hass.bus.async_listen(
        EVENT_STATE_CHANGED,
        lambda event: changes.append(event) if event.data["entity_id"] == "sensor.heating_panel_receiver" else None,
    )
    for _ in range(2):
        async_fire_mqtt_message(hass, TOPIC, json.dumps(REPORT))
        await hass.async_block_till_done()

    state = hass.states.get("sensor.heating_panel_receiver")
    assert state.state == "heat"
    assert {k: state.attributes[k] for k in REPORT} == REPORT
    # The same report twice is still two updates: the panel's checks rely on seeing each one.
    assert len(changes) == 2

    # Not JSON, or not an object: ignored.
    async_fire_mqtt_message(hass, TOPIC, "online")
    async_fire_mqtt_message(hass, TOPIC, "[1]")
    await hass.async_block_till_done()
    assert len(changes) == 2


async def test_receiver_sensor_unavailable_without_mqtt(hass: HomeAssistant, mqtt_mock: MqttMockHAClient) -> None:
    await setup_receiver(hass)
    async_fire_mqtt_message(hass, TOPIC, json.dumps(REPORT))
    await hass.async_block_till_done()
    assert hass.states.get("sensor.heating_panel_receiver").state == "heat"

    # As the MQTT integration reports losing the broker (and the mock reports connecting).
    mqtt_mock.connected = False
    async_dispatcher_send(hass, mqtt.MQTT_CONNECTION_STATE, False)
    await hass.async_block_till_done()
    assert hass.states.get("sensor.heating_panel_receiver").state == STATE_UNAVAILABLE

    mqtt_mock.connected = True
    async_dispatcher_send(hass, mqtt.MQTT_CONNECTION_STATE, True)
    await hass.async_block_till_done()
    assert hass.states.get("sensor.heating_panel_receiver").state == "heat"


async def test_heating_mode_sensor(hass: HomeAssistant, mqtt_mock: MqttMockHAClient) -> None:
    await setup_receiver(hass)
    async_fire_mqtt_message(hass, TOPIC, json.dumps(REPORT))
    await hass.async_block_till_done()
    # It waits until the receiver has been quiet for a moment (see mode.py).
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=5))
    await hass.async_block_till_done()
    state = hass.states.get("sensor.heating_mode")
    assert state.state == "schedule"
    assert state.attributes["setpoint"] == 1
    assert state.attributes["heating"] is False


async def test_entry_from_before_0_4_keeps_its_yaml_panel(hass: HomeAssistant, mqtt_mock: MqttMockHAClient) -> None:
    entry = await setup_receiver(hass, {"tpi": False}, minor_version=1)
    assert entry.minor_version == 2
    assert entry.options == {"tpi": False, "panel": False}
    assert _panel(hass) is None
    assert hass.states.get("sensor.heating_panel_receiver") is None
    # The mode sensor and the services are still there.
    assert hass.states.get("sensor.heating_mode") is not None
    assert hass.services.has_service(DOMAIN, "send")


async def test_address_already_taken(
    hass: HomeAssistant, mqtt_mock: MqttMockHAClient, caplog: pytest.LogCaptureFixture
) -> None:
    # A panel_custom panel from configuration.yaml got there first.
    await panel_custom.async_register_panel(
        hass, frontend_url_path="heating", webcomponent_name="heating-panel", module_url="/local/old.js"
    )
    entry = await setup_receiver(hass)
    assert entry.state is ConfigEntryState.LOADED
    assert "Not adding the heating panel at /heating" in caplog.text
    assert _panel(hass)["config"]["_panel_custom"]["module_url"] == "/local/old.js"

    # Unloading the entry leaves the other panel alone.
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert _panel(hass)["config"]["_panel_custom"]["module_url"] == "/local/old.js"


async def test_unload_removes_the_panel(hass: HomeAssistant, mqtt_mock: MqttMockHAClient) -> None:
    entry = await setup_receiver(hass)
    assert _panel(hass) is not None
    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert _panel(hass) is None


async def test_send_works_for_everyone(
    hass: HomeAssistant, mqtt_mock: MqttMockHAClient, hass_read_only_user: MockUser
) -> None:
    """Since 2026.10 mqtt.publish is for administrators only; heating_panel.send is for every user."""
    await setup_receiver(hass)
    mqtt_mock.async_publish.reset_mock()
    await hass.services.async_call(
        DOMAIN,
        "send",
        {"topic": TOPIC, "command": "set", "payload": {"system_mode": "heat"}},
        blocking=True,
        context=Context(user_id=hass_read_only_user.id),
    )
    assert published(mqtt_mock) == [(f"{TOPIC}/set", json.dumps({"system_mode": "heat"}), 0, False)]

    # A /set holds TPI and the mode sensor for a while, then lets go by itself (see hold.py).
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=30))
    await hass.async_block_till_done()


async def test_send_only_to_set_up_receivers(hass: HomeAssistant, mqtt_mock: MqttMockHAClient) -> None:
    await setup_receiver(hass)
    mqtt_mock.async_publish.reset_mock()
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            "send",
            {"topic": "zigbee2mqtt/Front door lock", "command": "set", "payload": {"state": "UNLOCK"}},
            blocking=True,
        )
    mqtt_mock.async_publish.assert_not_called()


async def test_panel_follows_a_renamed_receiver_sensor(hass: HomeAssistant, mqtt_mock: MqttMockHAClient) -> None:
    """Moving from YAML can leave the new sensor as sensor.heating_panel_receiver_2; renaming it mustn't break the
    panel (it did in 0.4.0, until the options were saved again)."""
    entry = await setup_receiver(hass)
    er.async_get(hass).async_update_entity("sensor.heating_panel_receiver", new_entity_id="sensor.receiver_reports")
    await hass.async_block_till_done()
    assert _panel(hass)["config"]["receiver"]["state_entity"] == "sensor.receiver_reports"
    # Only the panel was registered again: the entry wasn't reloaded.
    assert entry.state is ConfigEntryState.LOADED


async def test_renamed_radiator_is_kept(hass: HomeAssistant, mqtt_mock: MqttMockHAClient) -> None:
    z2m = MockConfigEntry(domain="mqtt")
    z2m.add_to_hass(hass)
    bedroom = _valve(hass, z2m, "Bedroom radiator TRV", "0x1", position=True)
    entry = await setup_receiver(hass, {"panel": True, "url_path": "heating", "radiators": [bedroom]})

    entities = er.async_get(hass)
    entities.async_update_entity(bedroom, new_entity_id="climate.main_bedroom")
    await hass.async_block_till_done()
    assert entry.options["radiators"] == ["climate.main_bedroom"]
    assert _panel(hass)["config"]["radiators"][0]["entity"] == "climate.main_bedroom"

    # Its battery sensor too (found on the device, not chosen in the options).
    entities.async_update_entity("sensor.0x1_battery", new_entity_id="sensor.main_bedroom_battery")
    await hass.async_block_till_done()
    assert _panel(hass)["config"]["radiators"][0]["battery"] == "sensor.main_bedroom_battery"


async def test_other_renames_change_nothing(hass: HomeAssistant, mqtt_mock: MqttMockHAClient) -> None:
    z2m = MockConfigEntry(domain="mqtt")
    z2m.add_to_hass(hass)
    kitchen = _valve(hass, z2m, "Kitchen radiator TRV", "0x9", position=False)
    entry = await setup_receiver(hass)
    options = dict(entry.options)
    before = _panel(hass)
    er.async_get(hass).async_update_entity(kitchen, new_entity_id="climate.galley")
    await hass.async_block_till_done()
    assert dict(entry.options) == options
    assert _panel(hass) == before
