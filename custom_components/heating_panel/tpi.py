"""TPI (time-proportional) boiler control, by nudging the receiver's setpoint while it runs its schedule.

Each cycle (10 minutes by default) the boiler gets a share of the time, the demand:

    demand = coef_int · (target − room) + coef_ext · (target − outdoor), clamped to 0–1

A share too small to run (under the shortest run) is carried into the next cycle, so small demands add up to a
proper run every few cycles instead of never running at all (see plan_cycle).

For the ON part of the cycle the receiver's setpoint is written as target + ON margin, for the OFF part as
target − OFF margin, so its own thermostat switches the boiler. The ON margin is the larger: Hive runs its own
TPI and stops early as the room nears its setpoint, so the setpoint has to be well clear of the room for the
boiler to run the whole ON time. Hive also keeps at least 5 minutes between two "on" periods, so the OFF time
can't be shorter. The receiver stays on Schedule and sees each write
as a temporary change, so if Home Assistant stops, the receiver keeps the room within the margins and the next
schedule slot puts it back to the schedule's own value. TPI only runs on Schedule; Boost, Away, Off and Manual
are left alone.

The target is the schedule's value, or a temporary change someone made on the remote's dial or the panel's
(any setpoint that isn't one of ours), until the next slot.

Plain Python (no Home Assistant imports), so python-tests can load it on its own. `Tpi` decides what the
setpoint should be; the controller writes it, verifies it and tells `Tpi` what the receiver reports.
"""

from __future__ import annotations

from collections import deque
from collections.abc import Callable
from dataclasses import dataclass

Cancel = Callable[[], None]
Schedule = Callable[[float, Callable[[], None]], Cancel]

# The receiver takes setpoints in half degrees.
STEP = 0.5
# Below this the schedule means "off" (the receiver stores off as 1°).
MIN_TARGET = 5.0
# A room temperature older than this isn't used.
ROOM_MAX_AGE_SECONDS = 90 * 60
# Writes that fail in a row before TPI stops and leaves the receiver alone.
MAX_FAILURES = 3
# How long the receiver may look off Schedule before TPI stops: a dial change flickers the hold for ~0.5 s.
MODE_GRACE_SECONDS = 5.0
# How many of TPI's own recent writes it remembers as its own.
WRITTEN_KEPT = 4

IDLE_DISABLED = "disabled"
IDLE_FAULT = "fault"
IDLE_PAUSED = "panel_sending"
IDLE_NOT_SCHEDULE = "not_on_schedule"
IDLE_NO_SCHEDULE = "schedule_unknown"
IDLE_LOW_TARGET = "heating_off"
IDLE_NO_ROOM = "no_room_temperature"


@dataclass(frozen=True)
class Settings:
    cycle_minutes: float = 10
    coef_int: float = 0.6
    coef_ext: float = 0.01
    min_on_minutes: float = 3
    # Hive's own minimum gap between two "on" periods (Hive support, "Preventing Temperature Overshoots").
    min_off_minutes: float = 5
    margin_on: float = 3.0
    margin_off: float = 1.5
    # At a new schedule slot, run a too-short demand for the shortest run rather than waiting (see plan_cycle).
    prompt_start: bool = True


def demand(target: float, room: float, outdoor: float | None, s: Settings) -> float:
    """The share of a cycle the boiler should run, 0–1. Without an outdoor temperature only the room counts."""
    d = s.coef_int * (target - room)
    if outdoor is not None:
        d += s.coef_ext * (target - outdoor)
    return min(1.0, max(0.0, d))


def plan_cycle(d: float, carry: float, s: Settings, round_up: bool = False) -> tuple[float, float]:
    """
    Minutes ON this cycle at demand `d`, and the minutes carried to the next, as (on, carry).

    Too short a run (or rest) would short-cycle the boiler, so it's dropped, and what was owed goes into the next
    cycle: a run too short to make is added to the next one, and a rest too short to make (the boiler runs the
    whole cycle) is taken off it. The boiler then gets the demand on average, even when that's a little at a
    time, such as the outdoor part alone on a mild day. With the room at or above the target, nothing is owed.

    With `round_up` (the first cycle of a schedule slot, when the house wants warming now), a run too short to
    make is made the shortest run instead of waiting, and the extra is taken off the next cycle.
    """
    if d <= 0:
        return 0.0, 0.0
    total = d * s.cycle_minutes + carry
    if total < s.min_on_minutes:
        if round_up and total > 0:
            return float(s.min_on_minutes), total - s.min_on_minutes
        return 0.0, max(0.0, total)
    on = float(s.cycle_minutes) if s.cycle_minutes - total < s.min_off_minutes else total
    return on, max(-s.cycle_minutes, min(s.cycle_minutes, total - on))


def on_minutes(d: float, s: Settings) -> float:
    """Minutes ON in a cycle at demand `d`, with nothing carried over."""
    return plan_cycle(d, 0.0, s)[0]


def nudge(target: float, on: bool, s: Settings) -> float:
    """The setpoint that makes the receiver's thermostat switch the boiler on (or off) around `target`."""
    value = target + s.margin_on if on else target - s.margin_off
    return round(value / STEP) * STEP


def same(a: float | None, b: float | None) -> bool:
    return a is not None and b is not None and abs(a - b) < 0.01


class Tpi:
    """
    Runs the cycles and says which setpoint the receiver should have. The controller feeds it the receiver's
    mode and setpoint, the schedule's value, and the temperatures, and is called back with:
    - `write(setpoint)`: put this setpoint on the receiver (and verify it);
    - `changed()`: something the sensors show has changed.

    `schedule(delay, callback)` runs `callback` after `delay` seconds and returns a function that cancels it;
    `now()` is the time in seconds.
    """

    def __init__(
        self,
        settings: Settings,
        write: Callable[[float], None],
        changed: Callable[[], None],
        schedule: Schedule,
        now: Callable[[], float],
    ) -> None:
        self.settings = settings
        self._write = write
        self._changed = changed
        self._schedule = schedule
        self._now = now

        self.enabled = True
        self.paused = False
        self.failures = 0
        self.mode: str | None = None
        self.setpoint: float | None = None
        self.scheduled: float | None = None
        self.override: float | None = None
        self.room: float | None = None
        self._room_at: float | None = None
        self.outdoor: float | None = None

        self.running = False
        self.on = False
        self.demand = 0.0
        #: Minutes owed to (or, if negative, taken from) the next cycle; see plan_cycle.
        self.carry = 0.0
        self._continuing = False
        self._slot_start = False
        self.cycle_ends: float | None = None
        self.wanted: float | None = None
        self._timers: list[Cancel] = []
        self._grace: Cancel | None = None
        #: The last few setpoints TPI wrote, so they're always known as its own (see _ours).
        self._written: deque[float] = deque(maxlen=WRITTEN_KEPT)
        #: A temperature the panel sent, taken up when it's finished (see panel_setpoint).
        self._panel_value: float | None = None

    # ---- What the sensors show ----

    @property
    def target(self) -> float | None:
        return self.override if self.override is not None else self.scheduled

    @property
    def idle_reason(self) -> str | None:
        """Why TPI isn't controlling the boiler, or None while it is."""
        if not self.enabled:
            return IDLE_DISABLED
        if self.failures >= MAX_FAILURES:
            return IDLE_FAULT
        if self.paused:
            return IDLE_PAUSED
        if self.mode != "schedule":
            return IDLE_NOT_SCHEDULE
        target = self.target
        if target is None:
            return IDLE_NO_SCHEDULE
        if target < MIN_TARGET:
            return IDLE_LOW_TARGET
        if self.room is None or self._room_at is None or self._now() - self._room_at > ROOM_MAX_AGE_SECONDS:
            return IDLE_NO_ROOM
        return None

    # ---- Inputs ----

    def set_enabled(self, enabled: bool) -> None:
        if enabled == self.enabled:
            return
        self.enabled = enabled
        if enabled:
            self.failures = 0
            # A dial change made while TPI was off is the target, as when the panel finishes sending one.
            if self._classify(self.setpoint):
                return
        self._update(restart=True)

    def set_paused(self, paused: bool) -> None:
        """The panel is sending a change: leave the receiver alone until it's finished."""
        if paused == self.paused:
            return
        self.paused = paused
        if not paused and self._take_panel_setpoint():
            return
        # The panel's dial on Schedule is a temporary change: take whatever it left as the target.
        if paused or not self._classify(self.setpoint):
            self._update(restart=True)

    def panel_setpoint(self, value: float) -> None:
        """
        The panel sent the receiver this temperature (its dial). Unlike a report, there's nothing to tell apart:
        it's the person's choice, even when it happens to equal one of TPI's own settings (23 Oct 2026: 19.5 with
        a 16.5 target was taken for TPI's own "run" setting and ignored). Taken up once the panel has finished.
        """
        self._panel_value = value
        if not self.paused:
            self._take_panel_setpoint()

    def _take_panel_setpoint(self) -> bool:
        """Make the panel's temperature the target, if it sent one and the receiver is still on Schedule."""
        value, self._panel_value = self._panel_value, None
        if value is None or self.mode != "schedule" or self.idle_reason in (IDLE_DISABLED, IDLE_FAULT):
            return False
        self.setpoint = value
        self.override = None if same(value, self.scheduled) else value
        self._update(restart=True)
        return True

    def set_mode(self, mode: str) -> None:
        if mode == self.mode:
            return
        self.mode = mode
        self._cancel_grace()
        if mode != "schedule":
            # A boost, Manual or Off from the panel also writes a temperature; that's not a new target.
            self._panel_value = None
        if mode == "schedule":
            if self.running:
                # Only a flicker: carry on with the cycle, catching up on anything held back meanwhile.
                if not self._classify(self.setpoint):
                    self._apply(force=False)
                self._changed()
            elif not self._classify(self.setpoint):
                self._update(restart=True)
            return
        if self.running:
            self._grace = self._schedule(MODE_GRACE_SECONDS, self._left_schedule)
        else:
            self._left_schedule()

    def _left_schedule(self) -> None:
        self._grace = None
        self.override = None
        self._update(restart=True)

    def _cancel_grace(self) -> None:
        if self._grace:
            self._grace()
            self._grace = None

    def set_scheduled(self, value: float | None) -> None:
        """The schedule's value now, when the schedule has been read or saved. A temporary change stays."""
        if same(value, self.scheduled) or (value is None and self.scheduled is None):
            return
        self.scheduled = value
        self._update(restart=True)

    def slot_passed(self, value: float | None) -> None:
        """A schedule slot started: the receiver has put its setpoint back to the schedule's value."""
        self.scheduled = value
        self.override = None
        self.setpoint = value
        self._slot_start = True
        self._update(restart=True)

    def set_room(self, value: float | None) -> None:
        self.room = value
        self._room_at = self._now() if value is not None else None
        if not self.running:
            self._update(restart=True)
        else:
            self._changed()

    def set_outdoor(self, value: float | None) -> None:
        self.outdoor = value
        self._changed()

    def report_setpoint(self, value: float) -> None:
        """The receiver reported its setpoint."""
        self.setpoint = value
        if self.paused or self.mode != "schedule":
            return
        self._classify(value)

    def write_done(self, ok: bool) -> None:
        """The controller's verdict on the last write."""
        if ok:
            self.failures = 0
            return
        self.failures += 1
        if self.failures >= MAX_FAILURES:
            self._update(restart=True)
        else:
            # Try again; the receiver may still take it late, which is fine.
            self._apply(force=True)

    def stop(self) -> None:
        self._cancel_timers()
        self._cancel_grace()
        self.running = False

    # ---- The cycles ----

    def _ours(self, value: float) -> bool:
        """
        A setpoint TPI writes: one it has written lately, or either side of the target or of the schedule's
        value. That covers a write landing late, one written before the schedule changed (22 Oct 2026: saving
        the schedule from the panel turned TPI's own 16.5° into a "temporary change"), and one left over from
        before Home Assistant restarted. (A dial turned to exactly one of these is taken as ours too.)
        """
        if any(same(value, w) for w in self._written):
            return True
        return any(
            same(value, nudge(t, on, self.settings))
            for t in (self.target, self.scheduled)
            if t is not None
            for on in (True, False)
        )

    @property
    def written(self) -> list[float]:
        """The setpoints TPI wrote lately, to keep over a restart (see remember_written)."""
        return list(self._written)

    def remember_written(self, values: list[float]) -> None:
        """
        After a restart: what TPI wrote before it. Without this, a schedule change soon after a restart turned
        TPI's own 16.5° (resting, target 18°) into a "temporary change" (23 Oct 2026, 16:11 on live): with the
        new target, 16.5° was no longer either side of it, and the restart had wiped the list of TPI's writes.
        """
        for value in values:
            if not any(same(value, w) for w in self._written):
                self._written.append(float(value))

    def _send(self, setpoint: float) -> None:
        """Write `setpoint`, remembering it as ours."""
        if not any(same(setpoint, w) for w in self._written):
            self._written.append(setpoint)
        self._write(setpoint)

    def _classify(self, value: float | None) -> bool:
        """Act on a reported setpoint. True if that restarted the cycle."""
        # A dial change can give TPI a target even while it has none (an "off" slot, or the schedule unread).
        if value is None or self.idle_reason not in (None, IDLE_NO_ROOM, IDLE_LOW_TARGET, IDLE_NO_SCHEDULE):
            return False
        if same(value, self.wanted):
            return False
        if self._ours(value):
            self._apply(force=True)
            return False
        # Back to the schedule's value (a new slot, or someone dialled back to it), or a temporary change.
        self.override = None if same(value, self.scheduled) else value
        self._update(restart=True)
        return True

    def _update(self, restart: bool) -> None:
        reason = self.idle_reason
        if reason is not None:
            was_controlling = self.running
            self._cancel_timers()
            self.running = False
            self.on = False
            self.demand = 0.0
            self.carry = 0.0
            self._continuing = False
            self._slot_start = False
            self.cycle_ends = None
            if was_controlling and reason in (IDLE_DISABLED, IDLE_NO_ROOM) and self.mode == "schedule":
                self._release()
            self.wanted = None
            self._changed()
            return
        if restart or not self.running:
            self._start_cycle()

    def _release(self) -> None:
        """Leave the receiver at the target, so its own thermostat carries on as if TPI weren't there."""
        target = self.target
        if target is not None and not same(self.setpoint, target):
            self.wanted = target
            self._send(target)

    def _start_cycle(self) -> None:
        self._cancel_timers()
        target, room = self.target, self.room
        assert target is not None and room is not None
        s = self.settings
        self.running = True
        self.demand = demand(target, room, self.outdoor, s)
        # Only a cycle following on from the last one carries anything over; a restart (a new target, back from
        # a boost, after a pause) starts afresh. The first cycle of a slot starts promptly (22 Oct 2026: 25% at
        # 06:30 waited until 06:40 for enough to run).
        on, self.carry = plan_cycle(
            self.demand, self.carry if self._continuing else 0.0, s, round_up=s.prompt_start and self._slot_start
        )
        self._continuing = False
        self._slot_start = False
        self.cycle_ends = self._now() + s.cycle_minutes * 60
        self._set_on(on > 0)
        if 0 < on < s.cycle_minutes:
            self._timers.append(self._schedule(on * 60, lambda: self._set_on(False)))
        self._timers.append(self._schedule(s.cycle_minutes * 60, self._next_cycle))
        self._changed()

    def _next_cycle(self) -> None:
        self._continuing = True
        self._update(restart=True)

    def _set_on(self, on: bool) -> None:
        self.on = on
        self._apply(force=False)
        self._changed()

    def _apply(self, force: bool) -> None:
        target = self.target
        if target is None or not self.running:
            return
        self.wanted = nudge(target, self.on, self.settings)
        # Off Schedule for a moment: writing now could change a boost's temperature. Caught up on return.
        if self.mode != "schedule":
            return
        if force or not same(self.setpoint, self.wanted):
            self._send(self.wanted)

    def _cancel_timers(self) -> None:
        for cancel in self._timers:
            cancel()
        self._timers = []
