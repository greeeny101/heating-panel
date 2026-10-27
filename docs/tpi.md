# TPI boiler control

TPI (time-proportional control) is optional, and off until you turn it on. To turn it on: **Settings →
Devices & services → Heating panel → Configure → TPI boiler control**.

## How it works

The Hive receiver already has a TPI of its own: it learns how quickly the house heats up, stops the boiler
just before the setpoint and lets the radiators' leftover heat finish the job. It can't be tuned, can't use
another room sensor, and doesn't look at the outdoor temperature. This TPI runs in Home Assistant instead, and
can. It splits time into cycles (10 minutes by default).
In each cycle it gives the boiler a share of the time, called the demand:

    demand = room coefficient × (target − room) + outdoor coefficient × (target − outdoor)

The result is kept between 0 and 100%. With the defaults (0.6 and 0.01), a room 1° below target on a 5° day
gets 0.6 + 0.15 = 75% of each cycle. A run shorter than 3 minutes, or a rest shorter than 5, is dropped, so
the boiler never short-cycles. Hive keeps at least 5 minutes between two runs anyway, so the rest can't be set
any shorter. Without an outdoor temperature, only the room counts.

What a dropped run or rest was worth is **carried into the next cycle**. At target on a mild day, the outdoor
part alone might be 11%: about a minute a cycle, too short to run. Carried over, it adds up to a 3-minute run
every third cycle, so the room gets the heat it's losing instead of sagging until the room part grows big
enough. A rest too short to make (the boiler runs the whole cycle) is taken off the next cycle the same way.
Nothing is carried while the room is at or above the target, or after a new target, a new schedule slot or a
pause.

**Starting promptly at a new slot** (on by default): when a slot begins and the room needs only a little heat,
the first cycle runs the boiler for the shortest run (3 minutes) straight away, instead of waiting a cycle or two
for enough demand to build up. The extra is taken off the next cycle. On 23 Oct 2026, the 06:30 slot's 25% would
otherwise have waited until 06:40 to run. Turn it off with **Start promptly at a new schedule slot** in the
options.

TPI doesn't switch the boiler directly. It **nudges the receiver's setpoint** while the receiver runs its
schedule:

- For the ON part of the cycle it writes target + ON margin (3° by default).
- For the OFF part it writes target − OFF margin (1.5° by default).

The receiver's own control then switches the boiler. The ON margin is the larger because Hive's own TPI stops
the boiler early as the room nears the setpoint (0.25° short of it, on 22 Oct 2026). With the setpoint 3° above
the target, the boiler runs the whole ON time. To the receiver, each write is a temporary change,
like turning the remote's dial.

**The target** is the schedule's value. If someone turns the remote's dial or the panel's dial, that
temperature is the target until the next schedule slot, just like a normal temporary change.

**Changes from the panel.** While the panel sends a change, TPI waits. The panel says when it starts and
finishes, and every temperature sent through `heating_panel.send` also holds TPI for up to 20 seconds, in case a
page doesn't say (a page left open across a Home Assistant restart didn't, on 23 Oct 2026, and TPI overwrote every
temperature it sent). A temperature set on the panel's dial is then TPI's target exactly as chosen. One set on the
Hive remote is worked out from the receiver's reports instead, so a remote dial turned to exactly one of TPI's own
settings is taken for TPI's.

**When TPI leaves the receiver alone:**

- in Boost, Away, Manual and Off
- in the schedule's "off" slots
- while the panel is sending a change
- when there's no recent room temperature (none for 90 minutes). In this case it first writes the target,
  so the receiver carries on as an ordinary thermostat.

## If something goes wrong

- **Home Assistant stops.** The receiver keeps whichever nudge it last had, so the room stays between the
  target − OFF margin and the target + ON margin. The next schedule slot puts the receiver back to the schedule's own value.
- **A write doesn't take.** Every write is read back on its own and retried. A write that lands late is put
  right. After 3 failed writes in a row, TPI stops writing and posts a notification. Turn the **Heating TPI**
  switch off and on to try again.
- **Switch off.** Turning the **Heating TPI** switch off writes the target once, then leaves the receiver to
  its own thermostat.

## Entities

| Entity | What it shows |
| --- | --- |
| `switch.heating_tpi` | TPI on or paused. It keeps its state over restarts. |
| `sensor.heating_tpi_demand` | The demand (%). Its attributes include `idle_reason`, `boiler_on`, `target`, `temporary_change`, `room_temperature`, `outdoor_temperature`, `setpoint_written`, `carried_minutes` and `cycle_ends`. |
| `sensor.heating_mode` | Has `tpi_active`, `tpi_target`, `tpi_setpoint` and `tpi_demand`. While TPI runs, its `setpoint` is the target, not the nudge. |

The panel shows the target on the dial, and "TPI n%" under it.

## Tuning

- **Room keeps settling below target:** raise the outdoor coefficient a little (try 0.015). That term makes
  up for the heat the house loses to the outside.
- **Overshoots:** lower the room coefficient (try 0.4–0.5).
- **Slow to warm up:** raise the room coefficient. Boost is still there for a quick warm-up.
- **Cycle length:** 10 minutes (6 cycles an hour) suits most gas boilers. Use a longer cycle for heat pumps or
  slow systems.

## Things to know

- The Hive remote's display shows the nudged setpoint, so it moves between target + 3° and target − 1.5°.
- **Run TPI from one Home Assistant only.** Two copies would fight over the receiver.
- A dial turned to exactly target + ON margin or target − OFF margin is taken for one of TPI's own writes.
- TPI sees the receiver's call for heat, not the boiler. On a combi, hot water fires the boiler whatever the
  receiver asks, and takes priority over heating while a tap runs.
