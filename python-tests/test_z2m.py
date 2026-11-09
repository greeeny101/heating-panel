from heating_panel.z2m import NO_END, from_z2m, is_dual_channel, is_no_end, to_z2m

# An SLR2's report (greeeny101/Hive-Thermostat-Zigbee2MQTT#3): the plain names are left over from writes without an
# endpoint, and say nothing about the heating (here "heat" and 18 while the heating is off).
SLR2 = {
    "linkquality": 43,
    "local_temperature_heat": 20.64,
    "occupied_heating_setpoint": 18,
    "occupied_heating_setpoint_heat": 18,
    "running_state_heat": "idle",
    "running_state_water": "heat",
    "system_mode": "heat",
    "system_mode_heat": "off",
    "system_mode_water": "emergency_heating",
    "temperature_setpoint_hold_duration_heat": 65535,
    "temperature_setpoint_hold_duration_water": 65535,
    "temperature_setpoint_hold_heat": True,
    "temperature_setpoint_hold_water": True,
}


def test_heating_only_receiver_is_left_alone():
    report = {"system_mode": "heat", "occupied_heating_setpoint": 19, "linkquality": 90}
    assert not is_dual_channel(report)
    assert from_z2m(report) is report
    assert to_z2m({"occupied_heating_setpoint": 19}, False) == {"occupied_heating_setpoint": 19}


def test_dual_channel_reads_the_heating_only():
    assert is_dual_channel(SLR2)
    assert from_z2m(SLR2) == {
        "linkquality": 43,
        "local_temperature": 20.64,
        "occupied_heating_setpoint": 18,
        "running_state": "idle",
        "system_mode": "off",
        "temperature_setpoint_hold_duration": 65535,
        "temperature_setpoint_hold": True,
    }


def test_dual_channel_schedule_reply():
    reply = {"weekly_schedule_heat": {"days": ["monday"], "transitions": []}, "system_mode_heat": "heat"}
    assert from_z2m(reply)["weekly_schedule"] == {"days": ["monday"], "transitions": []}


def test_dual_channel_writes_go_to_the_heating():
    assert to_z2m({"occupied_heating_setpoint": 19, "write": {"cluster": "hvacThermostat"}}, True) == {
        "occupied_heating_setpoint_heat": 19,
        "write_heat": {"cluster": "hvacThermostat"},
    }


def test_no_end():
    assert is_no_end({"temperature_setpoint_hold_duration": NO_END})
    # zigbee2mqtt 2.6.1 and later.
    assert is_no_end({"temperature_setpoint_hold_duration": None})
    assert not is_no_end({"temperature_setpoint_hold_duration": 516})
    assert not is_no_end({})
