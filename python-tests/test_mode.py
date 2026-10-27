import pytest

from heating_panel.mode import NO_END, Settler, decode_mode

SCHEDULE = {"system_mode": "heat", "temperature_setpoint_hold": False, "occupied_heating_setpoint": 1, "temperature_setpoint_hold_duration": 0}


class TestDecodeMode:
    @pytest.mark.parametrize(
        ("report", "mode"),
        [
            ({"system_mode": "off"}, "off"),
            (SCHEDULE, "schedule"),
            ({"system_mode": "heat", "temperature_setpoint_hold": True, "temperature_setpoint_hold_duration": NO_END}, "manual"),
            ({"system_mode": "emergency_heating", "occupied_heating_setpoint": 22, "temperature_setpoint_hold_duration": 30}, "boost"),
            ({"system_mode": "emergency_heating", "occupied_heating_setpoint": 15, "temperature_setpoint_hold_duration": 30}, "away"),
            ({"system_mode": "emergency_heating", "occupied_heating_setpoint": 20, "temperature_setpoint_hold_duration": 2000}, "away"),
            # "No end" on a boost is a boost the receiver didn't take the length for, not Away.
            ({"system_mode": "emergency_heating", "occupied_heating_setpoint": 22, "temperature_setpoint_hold_duration": NO_END}, "boost"),
            # A temporary change written over zigbee2mqtt: held until the next slot.
            ({"system_mode": "heat", "temperature_setpoint_hold": True, "temperature_setpoint_hold_duration": 516}, "schedule"),
            ({"system_mode": "heat", "temperature_setpoint_hold": True}, "unknown"),
            ({}, "unknown"),
        ],
    )
    def test_modes(self, report, mode):
        assert decode_mode(report) == mode


class FakeClock:
    """Runs scheduled callbacks when time is moved on, like Home Assistant's async_call_later."""

    def __init__(self):
        self.now = 0.0
        self.timers = []

    def schedule(self, delay, callback):
        timer = [self.now + delay, callback, True]
        self.timers.append(timer)

        def cancel():
            timer[2] = False

        return cancel

    def advance(self, seconds):
        end = self.now + seconds
        while True:
            due = sorted((t for t in self.timers if t[2] and t[0] <= end), key=lambda t: t[0])
            if not due:
                break
            timer = due[0]
            timer[2] = False
            self.now = timer[0]
            timer[1]()
        self.now = end


@pytest.fixture
def clock():
    return FakeClock()


@pytest.fixture
def seen(clock):
    shown = []
    settler = Settler(lambda r: shown.append(decode_mode(r)), clock.schedule)
    settler.report(SCHEDULE)
    return settler, shown


class TestSettler:
    def test_shows_the_first_report_at_once(self, seen):
        _, shown = seen
        assert shown == ["schedule"]

    def test_follows_a_change_once_the_receiver_is_quiet(self, seen, clock):
        settler, shown = seen
        settler.report({"system_mode": "off"})
        clock.advance(1.9)
        assert shown == ["schedule"]
        clock.advance(0.2)
        assert shown == ["schedule", "off"]

    def test_never_shows_away_on_the_way_from_schedule_to_boost(self, seen, clock):
        # Seen on 14 Oct: the receiver reports "boost" with the schedule's setpoint first.
        settler, shown = seen
        settler.set_busy(True)
        settler.report({"system_mode": "emergency_heating", "temperature_setpoint_hold": True})
        clock.advance(5)
        settler.report({"temperature_setpoint_hold_duration": 30, "occupied_heating_setpoint": 22})
        clock.advance(5)
        settler.set_busy(False)
        clock.advance(2)
        assert shown == ["schedule", "boost"]

    def test_hides_a_boost_that_retries(self, seen, clock):
        settler, shown = seen
        settler.set_busy(True)
        settler.report({"system_mode": "emergency_heating", "temperature_setpoint_hold": True, "temperature_setpoint_hold_duration": NO_END})
        clock.advance(20)
        settler.report(SCHEDULE)
        clock.advance(20)
        settler.report({"system_mode": "emergency_heating", "temperature_setpoint_hold": True, "temperature_setpoint_hold_duration": 30, "occupied_heating_setpoint": 22})
        clock.advance(10)
        assert shown == ["schedule"]
        settler.set_busy(False)
        clock.advance(2)
        assert shown == ["schedule", "boost"]

    def test_waits_for_late_reports_after_the_panel_finishes(self, seen, clock):
        settler, shown = seen
        settler.set_busy(True)
        settler.report({"system_mode": "off"})
        settler.set_busy(False)
        clock.advance(1)
        settler.report({"running_state": "idle"})
        clock.advance(1.5)
        assert shown == ["schedule"]
        clock.advance(1)
        assert shown == ["schedule", "off"]

    def test_lets_go_when_the_panel_never_says_it_has_finished(self, seen, clock):
        settler, shown = seen
        settler.set_busy(True)
        settler.report({"system_mode": "off"})
        clock.advance(179)
        assert shown == ["schedule"]
        clock.advance(3)
        assert shown == ["schedule", "off"]

    def test_only_publishes_real_changes(self, seen, clock):
        settler, shown = seen
        settler.report(SCHEDULE)
        clock.advance(3)
        assert shown == ["schedule"]

    def test_keeps_only_the_receiver_fields(self, clock):
        published = []
        settler = Settler(published.append, clock.schedule)
        settler.report({**SCHEDULE, "linkquality": 120, "update": {"state": "idle"}})
        assert set(published[0]) == set(SCHEDULE)
