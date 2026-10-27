"""The receiver's mode, and holding it back until a change has finished.

A change reaches the receiver as several writes, and it reports each step: on the way from Schedule to Boost
it briefly reports "boost" with the schedule's low setpoint, which reads as Away. The panel hides these steps
while it sends; `Settler` does the same for the heating mode sensor, so a dashboard only ever sees where a
change ended up.

Plain Python (no Home Assistant imports), so python-tests can load it on its own.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

# The same rules as the panel's (src/receiver.ts) and the dashboard card's.
NO_END = 65535
AWAY_MAX_TEMP = 16
AWAY_MIN_MINUTES = 360

MODES = ["off", "schedule", "manual", "boost", "away", "unknown"]

# The receiver's report fields the sensor keeps, as zigbee2mqtt names them.
FIELDS = (
    "system_mode",
    "running_state",
    "occupied_heating_setpoint",
    "local_temperature",
    "temperature_setpoint_hold",
    "temperature_setpoint_hold_duration",
)

# Seconds the receiver must stay quiet after its last report before the sensor follows.
SETTLE_SECONDS = 2.0
# The longest the panel can hold the sensor while it sends: a boost that has to retry takes about a minute.
BUSY_LIMIT_SECONDS = 180.0


def _number(v: Any) -> float | None:
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def decode_mode(report: dict[str, Any]) -> str:
    """
    The receiver never reports "auto": the schedule is "heat" with the hold off, or with a hold counting down to
    the next slot (a temporary change written over zigbee2mqtt). Away is a long or cool boost.
    """
    system_mode = report.get("system_mode")
    if system_mode == "off":
        return "off"
    if system_mode == "emergency_heating":
        setpoint = _number(report.get("occupied_heating_setpoint"))
        minutes = _number(report.get("temperature_setpoint_hold_duration"))
        if (setpoint is not None and setpoint <= AWAY_MAX_TEMP) or (
            minutes is not None and minutes > AWAY_MIN_MINUTES and minutes != NO_END
        ):
            return "away"
        return "boost"
    if system_mode == "heat":
        hold = report.get("temperature_setpoint_hold")
        if hold is False:
            return "schedule"
        minutes = _number(report.get("temperature_setpoint_hold_duration"))
        if hold is True and minutes == NO_END:
            return "manual"
        # A temperature written while on Schedule holds it until the next slot, counting down (21 Oct 2026).
        if hold is True and minutes is not None:
            return "schedule"
    return "unknown"


def keep_fields(payload: dict[str, Any]) -> dict[str, Any]:
    return {k: payload[k] for k in FIELDS if k in payload}


Cancel = Callable[[], None]
Schedule = Callable[[float, Callable[[], None]], Cancel]


class Settler:
    """
    Passes the receiver's reports on only once they've settled: the panel isn't sending a change
    (`busy`), and nothing new has arrived for SETTLE_SECONDS. The first report goes straight through,
    so there's something to show after a restart.

    `schedule(delay, callback)` runs `callback` after `delay` seconds and returns a function that cancels it.
    """

    def __init__(
        self,
        publish: Callable[[dict[str, Any]], None],
        schedule: Schedule,
        settle: float = SETTLE_SECONDS,
        busy_limit: float = BUSY_LIMIT_SECONDS,
    ) -> None:
        self._publish = publish
        self._schedule = schedule
        self._settle = settle
        self._busy_limit = busy_limit
        self.latest: dict[str, Any] = {}
        self.published: dict[str, Any] | None = None
        self.busy = False
        self._settle_cancel: Cancel | None = None
        self._busy_cancel: Cancel | None = None

    def report(self, payload: dict[str, Any]) -> None:
        self.latest = {**self.latest, **keep_fields(payload)}
        if self.published is None and not self.busy:
            self._send()
            return
        if not self.busy:
            self._restart_settle()

    def set_busy(self, busy: bool) -> None:
        if busy:
            self.busy = True
            self._cancel_settle()
            # A panel closed mid-change never says it's finished.
            if self._busy_cancel:
                self._busy_cancel()
            self._busy_cancel = self._schedule(self._busy_limit, lambda: self.set_busy(False))
            return
        if self._busy_cancel:
            self._busy_cancel()
            self._busy_cancel = None
        if self.busy:
            self.busy = False
            self._restart_settle()

    def stop(self) -> None:
        self._cancel_settle()
        if self._busy_cancel:
            self._busy_cancel()
            self._busy_cancel = None

    def _restart_settle(self) -> None:
        self._cancel_settle()
        self._settle_cancel = self._schedule(self._settle, self._settled)

    def _cancel_settle(self) -> None:
        if self._settle_cancel:
            self._settle_cancel()
            self._settle_cancel = None

    def _settled(self) -> None:
        self._settle_cancel = None
        if not self.busy:
            self._send()

    def _send(self) -> None:
        if self.latest != self.published:
            self.published = dict(self.latest)
            self._publish(self.published)
