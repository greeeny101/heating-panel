"""Holding TPI and the heating mode sensor while a change is sent through heating_panel.send.

The panel says when it starts and finishes a change (heating_panel.busy), and TPI leaves the receiver alone
meanwhile. But a page that doesn't say so, such as one left open across a Home Assistant restart with a stale
service list (23 Oct 2026 on live), let TPI overwrite every temperature it sent within a tenth of a second. So
every /set through the service holds things too: until the panel says it's finished, or for HOLD_SECONDS if it
never does. Long enough for the panel to read the change back; TPI then takes up whatever it set.

Plain Python (no Home Assistant imports), so python-tests can load it on its own.
"""

from __future__ import annotations

from collections.abc import Callable

Cancel = Callable[[], None]
Schedule = Callable[[float, Callable[[], None]], Cancel]

HOLD_SECONDS = 20.0


class SendHold:
    """
    For one receiver. `signal(busy)` tells TPI and the mode sensor (the same signal as heating_panel.busy);
    `schedule(delay, callback)` runs `callback` after `delay` seconds and returns a function that cancels it.
    """

    def __init__(self, signal: Callable[[bool], None], schedule: Schedule, seconds: float = HOLD_SECONDS) -> None:
        self._signal = signal
        self._schedule = schedule
        self._seconds = seconds
        self._panel_busy = False
        self._cancel: Cancel | None = None

    def sent(self) -> None:
        """A /set went to the receiver through the service."""
        self._stop_timer()
        self._signal(True)
        self._cancel = self._schedule(self._seconds, self._expired)

    def panel_busy(self, busy: bool) -> None:
        """heating_panel.busy: the panel's own word wins."""
        self._panel_busy = busy
        if not busy:
            self._stop_timer()
        self._signal(busy)

    def stop(self) -> None:
        self._stop_timer()

    def _expired(self) -> None:
        self._cancel = None
        # A panel still in the middle of a change (a boost that retries can take a minute) ends the hold itself.
        if not self._panel_busy:
            self._signal(False)

    def _stop_timer(self) -> None:
        if self._cancel:
            self._cancel()
            self._cancel = None
