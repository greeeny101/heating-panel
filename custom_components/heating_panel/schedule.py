"""The receiver's weekly schedule, as TPI needs it: what the target is now, and when the next slot starts.

The same rules as the panel's src/schedule.ts. The receiver replies to a weekly_schedule read with one message
per day, `{"days": ["monday"], "transitions": [{"heating_setpoint": 20, "time": 390}, ...]}`, always six
transitions (unused ones repeat the previous setting). Every slot, padding included, puts the setpoint back to
the schedule's value, which ends a temporary change (docs/receiver-protocol.md).

Plain Python (no Home Assistant imports), so python-tests can load it on its own.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

DAYS = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")

# (minutes after midnight, setpoint)
Transition = tuple[int, float]
Week = dict[str, list[Transition]]


def _number(v: Any) -> float | None:
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def parse_day_reply(reply: Any) -> Week:
    """The days in one weekly_schedule reply, or {} if it isn't one."""
    if not isinstance(reply, dict):
        return {}
    days, transitions = reply.get("days"), reply.get("transitions")
    if not isinstance(days, list) or not isinstance(transitions, list):
        return {}
    parsed: list[Transition] = []
    for t in transitions:
        if not isinstance(t, dict):
            return {}
        time, setpoint = _number(t.get("time")), _number(t.get("heating_setpoint"))
        if time is None or setpoint is None or not 0 <= time < 24 * 60:
            return {}
        parsed.append((int(time), setpoint))
    if not parsed:
        return {}
    parsed.sort()
    return {d: list(parsed) for d in days if d in DAYS}


def _minute(now: datetime) -> int:
    return now.hour * 60 + now.minute


def setpoint_at(week: Week, now: datetime) -> float | None:
    """What the schedule says at `now`, or None if today (or, before its first slot, yesterday) isn't known."""
    day = now.weekday()
    today = week.get(DAYS[day])
    if not today:
        return None
    yesterday = week.get(DAYS[(day + 6) % 7])
    setpoint = yesterday[-1][1] if yesterday else None
    for time, sp in today:
        if time > _minute(now):
            break
        setpoint = sp
    return setpoint


def next_slot(week: Week, now: datetime) -> datetime | None:
    """When the receiver next moves to a slot of any kind, or None if a day on the way isn't known."""
    day, minute = now.weekday(), _minute(now)
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    for offset in range(8):
        slots = week.get(DAYS[(day + offset) % 7])
        if not slots:
            return None
        for time, _ in slots:
            if offset > 0 or time > minute:
                return midnight + timedelta(days=offset, minutes=time)
    return None
