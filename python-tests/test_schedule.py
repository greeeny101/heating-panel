from datetime import datetime

from heating_panel.schedule import next_slot, parse_day_reply, setpoint_at

# The receiver's schedule at first read (docs/receiver-protocol.md), same every day.
DAY = {
    "transitions": [
        {"heating_setpoint": 20, "time": 390},
        {"heating_setpoint": 1, "time": 510},
        {"heating_setpoint": 1, "time": 720},
        {"heating_setpoint": 1, "time": 840},
        {"heating_setpoint": 20, "time": 990},
        {"heating_setpoint": 1, "time": 1320},
    ]
}
WEEK = parse_day_reply({"days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"], **DAY})

# 2026-10-19 was a Monday.
MONDAY = datetime(2026, 10, 19)


def at(day, h, m):
    return MONDAY.replace(day=19 + day, hour=h, minute=m)


class TestParse:
    def test_one_day(self):
        week = parse_day_reply({"days": ["sunday"], **DAY})
        assert list(week) == ["sunday"]
        assert week["sunday"][0] == (390, 20)

    def test_unsorted_transitions_are_sorted(self):
        week = parse_day_reply({"days": ["monday"], "transitions": list(reversed(DAY["transitions"]))})
        assert [t for t, _ in week["monday"]] == [390, 510, 720, 840, 990, 1320]

    def test_not_a_schedule(self):
        assert parse_day_reply({"system_mode": "heat"}) == {}
        assert parse_day_reply({"days": ["monday"], "transitions": [{"time": 2000, "heating_setpoint": 20}]}) == {}
        assert parse_day_reply({"days": ["funday"], **DAY}) == {}
        assert parse_day_reply("weekly_schedule") == {}


class TestSetpointAt:
    def test_through_the_day(self):
        assert setpoint_at(WEEK, at(0, 7, 0)) == 20
        assert setpoint_at(WEEK, at(0, 8, 30)) == 1
        assert setpoint_at(WEEK, at(0, 17, 0)) == 20

    def test_before_the_first_slot_runs_yesterdays_last(self):
        assert setpoint_at(WEEK, at(0, 3, 0)) == 1
        week = {**WEEK, "sunday": [(390, 20), (1320, 18)]}
        assert setpoint_at(week, at(0, 3, 0)) == 18

    def test_unknown_day(self):
        assert setpoint_at({"tuesday": WEEK["tuesday"]}, at(0, 12, 0)) is None


class TestNextSlot:
    def test_padding_slots_count(self):
        assert next_slot(WEEK, at(0, 9, 0)) == at(0, 12, 0)

    def test_after_the_last_slot(self):
        assert next_slot(WEEK, at(0, 23, 0)) == at(1, 6, 30)

    def test_exactly_on_a_slot_is_the_next_one(self):
        assert next_slot(WEEK, at(0, 6, 30)) == at(0, 8, 30)

    def test_unknown_day_on_the_way(self):
        assert next_slot({"monday": WEEK["monday"]}, at(0, 23, 0)) is None
