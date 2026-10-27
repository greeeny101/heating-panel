from heating_panel.panel_config import Radiator, Sibling, find_sensors, panel_config, room_name, url_path_error


def test_room_name_drops_device_words():
    assert room_name("Office front radiator TRV") == "Office front"
    assert room_name("Office back radiator") == "Office back"
    assert room_name("Bedroom") == "Bedroom"
    # A name that's only device words is left alone.
    assert room_name("Radiator") == "Radiator"
    assert room_name(None) is None


def test_finds_battery_and_position_on_the_device():
    # As zigbee2mqtt discovers a Moes BRT-100.
    siblings = [
        Sibling("sensor.bed_duration", "0x1_boost_heating_countdown_zigbee2mqtt", "duration", "Duration"),
        Sibling("sensor.bed_battery", "0x1_battery_zigbee2mqtt", "battery", "Battery"),
        Sibling("sensor.bed_position", "0x1_position_zigbee2mqtt", None, "Position"),
        Sibling("sensor.bed_local_temperature", "0x1_local_temperature_zigbee2mqtt", "temperature", "Temperature"),
    ]
    assert find_sensors(siblings) == ("sensor.bed_battery", "sensor.bed_position")


def test_valve_without_position_or_with_disabled_battery():
    # The SONOFF TRV-ZBT doesn't report its position.
    siblings = [
        Sibling("sensor.back_battery", "0x2_battery_zigbee2mqtt", "battery", "Battery", disabled=True),
        Sibling("sensor.back_idle_steps", "0x2_idle_steps_zigbee2mqtt", None, "Idle steps"),
    ]
    assert find_sensors(siblings) == (None, None)


def test_url_path():
    assert url_path_error("heating", set()) is None
    assert url_path_error("heating-2", {"heating"}) is None
    assert url_path_error("heating", {"heating"}) == "url_path_taken"
    assert url_path_error("Heating", set()) == "url_path_invalid"
    assert url_path_error("my/heating", set()) == "url_path_invalid"
    assert url_path_error("", set()) == "url_path_invalid"
    assert url_path_error("climate", set()) == "url_path_reserved"
    assert url_path_error("hacsfiles", set()) == "url_path_reserved"
    # The integration's own files are at /heating_panel/.
    assert url_path_error("heating_panel", set()) == "url_path_invalid"


def test_config_has_the_panel_custom_shape():
    config = panel_config(
        {"name": "Downstairs", "boost": False, "radiators_when": "always"},
        "zigbee2mqtt/Hive receiver",
        "sensor.heating_panel_receiver",
        "climate.hive_receiver",
        [Radiator("climate.bed", "Bedroom", "sensor.bed_position", "sensor.bed_battery"), Radiator("climate.back")],
    )
    assert config == {
        "theme": "porch",
        "receiver": {
            "name": "Downstairs",
            "topic": "zigbee2mqtt/Hive receiver",
            "entity": "climate.hive_receiver",
            "state_entity": "sensor.heating_panel_receiver",
            "controls": {"modes": True, "boost": False, "override": True, "away": True},
        },
        "radiators": [
            {
                "entity": "climate.bed",
                "name": "Bedroom",
                "position": "sensor.bed_position",
                "battery": "sensor.bed_battery",
            },
            {"entity": "climate.back"},
        ],
        "radiators_when": "always",
    }


def test_config_defaults():
    config = panel_config({}, "zigbee2mqtt/Hive receiver", None, None, [])
    assert config["theme"] == "porch"
    assert config["radiators_when"] == "heating"
    assert config["receiver"] == {
        "name": "Heating",
        "topic": "zigbee2mqtt/Hive receiver",
        "controls": {"modes": True, "boost": True, "override": True, "away": True},
    }
