# Away for longer than 24 hours: plan for a later release

**Status:** not started. 0.5.0 caps Away at 24 hours and points to the remote's holiday mode for longer.

## Why there's a cap

zigbee2mqtt 2.8 and later won't write a hold longer than 1440 minutes, and drop the receiver's reports of a longer
count (see [receiver-protocol.md](receiver-protocol.md), "zigbee2mqtt 2.8 and later"). A raw write would get a
long hold onto the receiver. But the panel could then neither check that it took nor show when it ends. Before
0.5.0, Away ran for up to about 45 days as one long hold.

## The idea: Home Assistant tops the hold up

The integration keeps the return time and gives the receiver at most 24 hours at a time, so every length is one
zigbee2mqtt passes and reports.

1. The panel calls a new service, e.g. `heating_panel.away` with `{topic, until, temperature}`, instead of
   writing the boost itself. The integration stores `until` and the temperature in its Store, so they survive a
   restart.
2. The integration starts Away for `min(until - now, 1440)` minutes, with the same sequence and checks as the
   panel's `timedBoost` (moved into Python, or kept in the panel and driven by the integration).
3. When that hold ends and the receiver goes back to Schedule by itself, the integration sees it (mode sensor)
   and, if `until` is still ahead, starts the next stretch at once.
4. Pressing Schedule, Manual, Off or Boost (panel or remote) during Away clears `until`, so nothing is topped up.
5. The heating mode sensor gets an `away_until` attribute. The panel and the dashboard card show that instead of
   working the end out from the count.

## Questions to settle first

- **The gap between stretches.** A running hold can't be lengthened: a length written while the hold is on is
  ignored (receiver-protocol.md, Boost). So each top-up is a few seconds on Schedule. If the schedule says
  "heat" then, the boiler could fire briefly. Topping up only in an "off" slot avoids that, but that slot has to
  come before the hold ends. Try it on the real receiver at a low temperature.
- **Home Assistant down when a stretch ends.** The receiver goes back to its schedule and heats the empty house
  until Home Assistant is back and tops it up. That's the safe direction, but it should be said in the README.
  On start-up, the integration should top up straight away if `until` is ahead and the receiver is on Schedule.
- **Telling our top-up apart from someone pressing Schedule on the remote** at about the same moment. Probably:
  only top up when the hold ended by counting down (the count was near 0 at the last read).
- **TPI.** TPI only acts on Schedule. It has to be held (the existing busy signal) through each top-up, or it
  writes a nudge in the gap.
- **Dual-channel receivers.** The same, on the heating endpoint.

## Tests

- python-tests: a pure state machine (like `tpi.py`): stretches, top-up on hold end, cancel on any other mode,
  restart with `until` stored.
- tests/: the service, the Store, the sensor attribute.
- test/: the panel calling the service and showing `away_until`.
- On the real receiver (boiler kept off: low temperature, ask first): a stretch of a few minutes, its top-up,
  and a cancel during Away.
