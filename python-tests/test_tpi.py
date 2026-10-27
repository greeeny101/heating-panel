import pytest

from heating_panel.tpi import (
    IDLE_DISABLED,
    IDLE_FAULT,
    IDLE_LOW_TARGET,
    IDLE_NO_ROOM,
    IDLE_NOT_SCHEDULE,
    IDLE_PAUSED,
    MAX_FAILURES,
    ROOM_MAX_AGE_SECONDS,
    Settings,
    Tpi,
    demand,
    nudge,
    on_minutes,
    plan_cycle,
)
from test_mode import FakeClock

# The mechanics are tested with even margins and a short minimum OFF, which keeps the numbers simple.
S = Settings(min_off_minutes=3, margin_on=1.5, margin_off=1.5)


class TestDefaults:
    def test_on_margin_clears_hives_own_tpi(self):
        assert nudge(18, True, Settings()) == 21
        assert nudge(18, False, Settings()) == 16.5

    @pytest.mark.parametrize(("d", "minutes"), [(0.3, 3), (0.5, 5), (0.55, 10), (0.6, 10)])
    def test_off_lasts_at_least_hives_five_minutes(self, d, minutes):
        assert on_minutes(d, Settings()) == pytest.approx(minutes)


class TestMaths:
    def test_demand_from_the_room(self):
        assert demand(20, 19, None, S) == pytest.approx(0.6)

    def test_outdoor_adds(self):
        assert demand(20, 19.5, 5, S) == pytest.approx(0.3 + 0.15)

    @pytest.mark.parametrize(("room", "expected"), [(25, 0.0), (10, 1.0)])
    def test_clamped(self, room, expected):
        assert demand(20, room, None, S) == expected

    @pytest.mark.parametrize(
        ("d", "minutes"),
        [(0.0, 0), (0.25, 0), (0.3, 3), (0.5, 5), (0.7, 7), (0.75, 10), (1.0, 10)],
    )
    def test_on_minutes_respects_minimum_on_and_off(self, d, minutes):
        assert on_minutes(d, S) == pytest.approx(minutes)

    @pytest.mark.parametrize(
        ("d", "carry", "on", "left"),
        [
            (0.11, 0.0, 0, 1.1),  # too short to run: owed to the next cycle
            (0.11, 2.2, 3.3, 0.0),  # enough with what's owed: runs it all
            (0.0, 2.2, 0, 0.0),  # room at or above target: nothing owed any more
            (0.8, 0.0, 10, -2.0),  # rest too short: runs the whole cycle, two minutes taken off the next
            (0.8, -2.0, 10, -4.0),  # ... still too short a rest, so again, owing four
            (0.6, -2.0, 4, 0.0),  # paid back: runs four of six
            (1.0, 4.0, 10, 4.0),  # flat out and still owed
        ],
    )
    def test_plan_cycle_carries_what_couldnt_run(self, d, carry, on, left):
        assert plan_cycle(d, carry, Settings()) == (pytest.approx(on), pytest.approx(left))

    def test_round_up_runs_the_shortest_run_and_pays_it_back(self):
        assert plan_cycle(0.25, 0.0, Settings(), round_up=True) == (3.0, pytest.approx(-0.5))
        on, carry = plan_cycle(0.25, -0.5, Settings())
        assert (on, carry) == (0.0, pytest.approx(2.0))

    def test_round_up_only_when_theres_demand(self):
        assert plan_cycle(0.0, 0.0, Settings(), round_up=True) == (0.0, 0.0)

    def test_small_demand_runs_on_average(self):
        """22 Oct 2026: at 18° the outdoor part alone was about 11%, which never ran without carrying over."""
        carry, ran = 0.0, []
        for _ in range(30):
            on, carry = plan_cycle(0.11, carry, Settings())
            ran.append(on)
        assert all(on == 0 or on >= 3 for on in ran)
        assert sum(ran) / (30 * 10) == pytest.approx(0.11, abs=0.01)

    def test_nudge_rounds_to_half_degrees(self):
        assert nudge(20, True, S) == 21.5
        assert nudge(20, False, S) == 18.5
        assert nudge(19.5, True, Settings(margin_on=1.2)) == 20.5


class Rig:
    """A Tpi on Schedule at 20°, with the room at 19.5 (demand 0.3 → 3 minutes ON per 10)."""

    def __init__(self):
        self.clock = FakeClock()
        self.writes = []
        self.tpi = Tpi(S, self.write, lambda: None, self.clock.schedule, lambda: self.clock.now)

    def write(self, setpoint):
        self.writes.append(setpoint)
        # The receiver takes it straight away unless a test says otherwise.
        self.tpi.report_setpoint(setpoint)

    def start(self, room=19.5):
        self.tpi.report_setpoint(20)
        self.tpi.set_scheduled(20)
        self.tpi.set_room(room)
        self.tpi.set_mode("schedule")
        return self


@pytest.fixture
def rig():
    return Rig().start()


class TestCycles:
    def test_on_then_off_then_next_cycle(self, rig):
        assert rig.writes == [21.5]
        assert rig.tpi.on and rig.tpi.demand == pytest.approx(0.3)
        rig.clock.advance(3 * 60)
        assert rig.writes == [21.5, 18.5]
        rig.clock.advance(7 * 60)
        assert rig.writes == [21.5, 18.5, 21.5]

    def test_no_writes_when_nothing_changes(self):
        rig = Rig().start(room=21)  # demand 0: OFF all cycle
        assert rig.writes == [18.5]
        rig.clock.advance(60 * 60)
        assert rig.writes == [18.5]

    def test_full_demand_stays_on(self):
        rig = Rig().start(room=17)
        rig.clock.advance(30 * 60)
        assert rig.writes == [21.5]

    def test_small_demand_builds_up_to_a_run(self):
        rig = Rig().start(room=19.8)  # 0.12: too short to run on its own
        assert rig.writes == [18.5]
        rig.clock.advance(10 * 60)
        assert rig.tpi.carry == pytest.approx(2.4)
        rig.clock.advance(10 * 60)  # 1.2 + 2.4 = 3.6 minutes: enough
        assert rig.writes == [18.5, 21.5]
        assert rig.tpi.carry == 0
        rig.clock.advance(3.6 * 60)
        assert rig.writes == [18.5, 21.5, 18.5]

    def test_new_slot_starts_promptly(self):
        """23 Oct 2026 on live: 06:30 slot at 17.5, room 17.22, demand ~25%. It waited until 06:40 to run."""
        rig = Rig()
        rig.tpi.report_setpoint(1)
        rig.tpi.set_scheduled(1)
        rig.tpi.set_room(17.22)
        rig.tpi.set_mode("schedule")
        rig.tpi.set_outdoor(9.3)
        rig.tpi.slot_passed(17.5)
        assert rig.writes[-1] == 19.0  # runs straight away (17.5 + 1.5 in these test settings)
        rig.clock.advance(3 * 60)
        assert rig.writes[-1] == 16.0  # the shortest run, then rests
        assert rig.tpi.carry < 0  # the extra comes off the next cycle

    def test_prompt_start_can_be_turned_off(self):
        rig = Rig()
        rig.tpi.settings = Settings(min_off_minutes=3, margin_on=1.5, margin_off=1.5, prompt_start=False)
        rig.tpi.report_setpoint(1)
        rig.tpi.set_scheduled(1)
        rig.tpi.set_room(17.22)
        rig.tpi.set_mode("schedule")
        rig.tpi.set_outdoor(9.3)
        rig.tpi.slot_passed(17.5)
        assert rig.writes[-1] == 16.0  # waits, carrying it over

    def test_only_the_first_cycle_of_a_slot_rounds_up(self):
        rig = Rig().start(room=19.8)  # 12%: too short, and not a new slot
        assert rig.writes == [18.5]
        assert rig.tpi.carry == pytest.approx(1.2)

    def test_restart_starts_afresh(self):
        rig = Rig().start(room=19.8)
        rig.clock.advance(10 * 60)
        assert rig.tpi.carry > 0
        rig.tpi.report_setpoint(20.5)  # a dial change: a new target
        assert rig.tpi.carry == 0

    def test_room_change_waits_for_the_next_cycle(self, rig):
        rig.tpi.set_room(15)
        rig.clock.advance(3 * 60)
        assert rig.writes == [21.5, 18.5]
        rig.clock.advance(7 * 60)
        assert rig.tpi.demand == 1.0


class TestIdle:
    @pytest.mark.parametrize("mode", ["boost", "away", "off", "manual"])
    def test_other_modes_are_left_alone(self, rig, mode):
        rig.tpi.set_mode(mode)
        assert rig.tpi.idle_reason == IDLE_NOT_SCHEDULE
        rig.clock.advance(60 * 60)
        assert rig.writes == [21.5]

    def test_back_to_schedule_after_a_boost(self, rig):
        rig.tpi.set_mode("boost")
        rig.tpi.report_setpoint(20)  # the boost ended; the receiver is back on the schedule's value
        rig.tpi.set_mode("schedule")
        assert rig.writes == [21.5, 21.5]

    def test_hold_flicker_keeps_the_cycle(self, rig):
        rig.clock.advance(60)
        rig.tpi.set_mode("unknown")
        rig.tpi.set_mode("schedule")
        assert rig.writes == [21.5]
        rig.clock.advance(2 * 60)  # OFF still due 3 minutes into the cycle
        assert rig.writes == [21.5, 18.5]

    def test_dial_change_with_a_flicker(self, rig):
        rig.tpi.set_mode("unknown")
        rig.tpi.report_setpoint(22)
        rig.tpi.set_mode("schedule")
        assert rig.tpi.target == 22
        assert rig.writes == [21.5, 23.5]

    def test_no_write_while_off_schedule_for_a_moment(self, rig):
        rig.clock.advance(3 * 60 - 1)
        rig.tpi.set_mode("boost")
        rig.clock.advance(2)  # OFF falls in the grace period
        assert rig.writes == [21.5]
        rig.tpi.set_mode("schedule")
        assert rig.writes == [21.5, 18.5]

    def test_schedule_off_slot(self, rig):
        rig.tpi.slot_passed(1)
        assert rig.tpi.idle_reason == IDLE_LOW_TARGET
        rig.clock.advance(60 * 60)
        assert rig.writes == [21.5]

    def test_dial_change_in_an_off_slot_starts_tpi(self, rig):
        rig.tpi.slot_passed(1)
        rig.tpi.report_setpoint(1)
        rig.tpi.report_setpoint(21)  # turned up on the remote
        assert rig.tpi.target == 21
        assert rig.writes[-1] == 22.5
        rig.tpi.slot_passed(1)  # the next slot ends it
        assert rig.tpi.idle_reason == IDLE_LOW_TARGET

    def test_stale_room_releases_to_the_target(self, rig):
        rig.clock.advance(ROOM_MAX_AGE_SECONDS + 10 * 60)  # noticed at the next cycle
        assert rig.tpi.idle_reason == IDLE_NO_ROOM
        assert rig.writes[-1] == 20

    def test_disable_releases_to_the_target(self, rig):
        rig.tpi.set_enabled(False)
        assert rig.tpi.idle_reason == IDLE_DISABLED
        assert rig.writes == [21.5, 20]


class TestReports:
    def test_late_write_of_ours_is_put_right(self, rig):
        rig.clock.advance(3 * 60)  # now OFF at 18.5
        rig.tpi.report_setpoint(21.5)  # the earlier ON lands late
        assert rig.writes[-1] == 18.5
        assert rig.tpi.override is None

    def test_dial_change_becomes_the_target_until_the_next_slot(self, rig):
        rig.tpi.report_setpoint(22)
        assert rig.tpi.target == 22
        assert rig.writes[-1] == 23.5  # 2.5° below the new target: full demand
        rig.tpi.slot_passed(20)
        assert rig.tpi.target == 20
        assert rig.writes[-1] == 21.5

    def test_slot_reset_is_put_right(self, rig):
        rig.tpi.report_setpoint(20)  # the receiver went back to the schedule's value
        assert rig.writes[-1] == 21.5

    def test_leftover_nudge_after_a_restart_is_not_a_dial_change(self):
        rig = Rig()
        rig.tpi.set_scheduled(20)
        rig.tpi.set_mode("schedule")
        rig.tpi.report_setpoint(18.5)  # where the last run left it, before the room temperature is known
        assert rig.tpi.override is None
        rig.tpi.set_room(19.5)
        assert rig.writes == [21.5]

    def test_schedule_saved_from_the_panel_keeps_the_target(self):
        """22 Oct 2026, 17:14 on live: TPI resting at 16.5 (target 18); the panel saved the schedule with this slot
        at 17.5. TPI took its own 16.5 for a dial change and wrote 15."""
        rig = Rig()
        rig.tpi.report_setpoint(18)
        rig.tpi.set_scheduled(18)
        rig.tpi.set_room(18.46)
        rig.tpi.set_mode("schedule")
        assert rig.writes == [16.5]
        rig.tpi.set_paused(True)
        rig.tpi.set_scheduled(17.5)  # the saved schedule reports back while the panel's still busy
        rig.tpi.set_paused(False)
        assert rig.tpi.override is None
        assert rig.tpi.target == 17.5
        assert rig.writes[-1] == 16.0  # resting around the new value, not 15

    def test_panel_dial_is_the_target_even_when_it_looks_like_ours(self, rig):
        """23 Oct 2026 on dev: 19.5 from the panel with a 16.5 target is 16.5 + 3, TPI's own "run" setting with the
        default margin, and was ignored. What the panel sends is the person's choice."""
        rig.tpi.settings = Settings()  # margin_on 3
        rig.tpi.report_setpoint(23)  # a dial change on the remote: target 23
        rig.tpi.set_paused(True)
        rig.tpi.panel_setpoint(26)  # 23 + 3, exactly TPI's "run" setting for 23
        rig.tpi.report_setpoint(26)
        rig.tpi.set_paused(False)
        assert rig.tpi.target == 26
        assert rig.tpi.override == 26

    def test_panel_dial_back_to_the_schedule_clears_the_temporary_change(self, rig):
        rig.tpi.report_setpoint(22)
        assert rig.tpi.override == 22
        rig.tpi.set_paused(True)
        rig.tpi.panel_setpoint(20)  # the schedule's value
        rig.tpi.set_paused(False)
        assert rig.tpi.override is None
        assert rig.tpi.target == 20

    def test_a_boost_from_the_panel_isnt_a_new_target(self, rig):
        rig.tpi.set_paused(True)
        rig.tpi.set_mode("boost")
        rig.tpi.panel_setpoint(22)  # the boost's temperature, sent on its own as a repair
        rig.tpi.set_paused(False)
        rig.tpi.report_setpoint(20)  # the boost ends, back to the schedule
        rig.tpi.set_mode("schedule")
        assert rig.tpi.target == 20
        assert rig.tpi.override is None

    def test_schedule_change_after_a_restart_keeps_the_target(self):
        """23 Oct 2026, 16:10–16:11 on live: TPI resting at 16.5 (target 18); HA restarted; a minute later the panel
        saved a schedule that made now an "off" slot. TPI took its own 16.5 for a dial change ("until 21:45")."""
        rig = Rig()
        rig.tpi.settings = Settings()
        rig.tpi.remember_written([21.0, 16.5])  # kept over the restart
        rig.tpi.report_setpoint(16.5)
        rig.tpi.set_scheduled(18)
        rig.tpi.set_room(19.07)
        rig.tpi.set_mode("schedule")
        rig.tpi.set_paused(True)
        rig.tpi.set_scheduled(1)  # the saved schedule: now is "off"
        rig.tpi.set_paused(False)
        assert rig.tpi.override is None
        assert rig.tpi.target == 1
        assert 15.0 not in rig.writes

    def test_written_is_kept_short(self):
        rig = Rig()
        rig.tpi.remember_written([1, 2, 3, 4, 5, 6])
        assert rig.tpi.written == [3, 4, 5, 6]

    def test_panel_change_is_picked_up_when_it_finishes(self, rig):
        rig.tpi.set_paused(True)
        assert rig.tpi.idle_reason == IDLE_PAUSED
        rig.tpi.report_setpoint(21)  # the panel's dial
        assert rig.writes == [21.5]
        rig.tpi.set_paused(False)
        assert rig.tpi.target == 21
        assert rig.writes[-1] == 22.5


class TestFailures:
    def test_retries_then_gives_up(self):
        rig = Rig()
        rig.write = lambda sp: rig.writes.append(sp)  # the receiver never takes anything
        rig.tpi._write = rig.write
        rig.start()
        for _ in range(MAX_FAILURES - 1):
            rig.tpi.write_done(False)
        assert rig.writes == [21.5] * MAX_FAILURES
        rig.tpi.write_done(False)
        assert rig.tpi.idle_reason == IDLE_FAULT
        rig.clock.advance(60 * 60)
        assert len(rig.writes) == MAX_FAILURES

    def test_dial_change_while_off_is_the_target_when_turned_on(self, rig):
        rig.tpi.set_enabled(False)
        rig.tpi.report_setpoint(21)
        rig.tpi.set_enabled(True)
        assert rig.tpi.target == 21
        assert rig.writes[-1] == 22.5

    def test_enabling_again_clears_the_fault(self, rig):
        for _ in range(MAX_FAILURES):
            rig.tpi.write_done(False)
        rig.tpi.set_enabled(False)
        rig.tpi.set_enabled(True)
        assert rig.tpi.idle_reason is None
