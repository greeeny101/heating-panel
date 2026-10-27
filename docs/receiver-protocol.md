# Hive SLR1c receiver over zigbee2mqtt — observed behaviour

Notes from watching `zigbee2mqtt/Hive receiver` on 2026-10-08. These drive `src/receiver.ts`.

## Topics

- State: `zigbee2mqtt/Hive receiver` (not retained).
- Commands: `zigbee2mqtt/Hive receiver/set`. **Never publish these retained.** A retained boost sat on
  this topic and was re-sent to the receiver every time zigbee2mqtt reconnected to the broker
  (confirmed: broker restart at 09:18:38 → boost re-applied at 09:18:42).
- Reads: `zigbee2mqtt/Hive receiver/get` with `{"<attribute>": ""}`.

## zigbee2mqtt state is not the device's state

After a `/set`, zigbee2mqtt reports the value it *wrote* until the device reports otherwise. It showed
`temperature_setpoint_hold_duration: 15` for 10 minutes while the receiver actually held ~65535.
To know what the receiver really has, send a `/get` for the attribute and use the reply.

## Boost (system_mode `emergency_heating`)

- `temperature_setpoint_hold_duration` is minutes remaining. The receiver counts it down once a minute.
- 65535 means "no end".
- A single message `{"system_mode":"emergency_heating","temperature_setpoint_hold_duration":15,
  "temperature_setpoint_hold":true,"occupied_heating_setpoint":20.5}` switched to boost but **ignored the
  duration**. It kept the previous 65535, so the boost had no practical end (~45 days).
- **The receiver takes the setpoint and duration only when a hold starts.** Test at 10:57, with healthy
  radio, where every write was acknowledged within ~0.1 s:
  - `{hold: true, system_mode: emergency_heating, setpoint: 21}`: about 0.2 s later the receiver itself put
    the setpoint back to the schedule's value (1) and set the duration to 65535.
  - Writing `{temperature_setpoint_hold_duration: 10}` on its own afterwards: acknowledged, but the receiver
    kept 65535 (3 tries).
  - This is why the old automation sent its payload twice: on the second pass, the hold write picked up the
    duration stored by the first pass. If any write in that second pass failed, the boost had no end.
- **Every hold write resets the setpoint to the schedule's current value** (1 = off, shown as a snowflake /
  frost protection on the remote). Setpoints written once the hold has settled stick (09:19, 09:48, 11:01).
- **Working boost (12:30, confirmed; replaces the 10:59 three-step sequence, which later failed):**
  zigbee2mqtt's documented single message, in this order, sent **while the hold is off** (Schedule or Off):
  `/set {"system_mode":"emergency_heating","temperature_setpoint_hold_duration":N,"temperature_setpoint_hold":1,"occupied_heating_setpoint":T}`.
  zigbee2mqtt writes the keys in order: mode (the hold is still off), duration, then **hold off→on, which takes the
  duration already written**, then the setpoint, which is kept. Read back at 12:30:43: duration 1 (counting), setpoint 18. It
  ended by itself at 12:32:45, back to Schedule.
  - **The rule:** the duration must be written *before* the hold switches on. If the hold is already on (Manual,
    or our step 1), the receiver keeps/restores "no end" (65535/65534). That explains every failure on 08 Oct
    (12:19 from Manual; 12:22 and 12:23 two-step, even with the remote's batteries out). The 10:59 two-step success
    is not explained; don't rely on it.
  - The panel: if the hold isn't off, go to Schedule first (confirmed), then the single message, then read back
    mode, duration and setpoint one at a time. Failure → Schedule.

## Frost protection temperature

The remote lets you set a frost temperature (7–12°). Changing it (17:25, set to 12) made the receiver report
nothing, and reading `unoccupiedHeatingSetpoint` / `minHeatSetpointLimit` from the receiver (endpoint 5,
hvacThermostat) returned *unsupported attribute*. zigbee2mqtt only exposes the remote's (SLT3C) battery. So the
frost temperature lives in the remote, and the panel can't read or set it. Off sends setpoint 1, the same as the
remote's Off.

## Reading values back

A `/get` for several attributes makes zigbee2mqtt read them one at a time and publish after each reply,
filling the other fields from its cache. **The first message after a multi-attribute `/get` is not a
fresh read of everything.** At 10:59:37 it showed setpoint 21 from the cache while the receiver had already
reset it to 1. For verification, `/get` one attribute and use that attribute from the next message.

- Cancelling boost on the remote (09:42) went back to the previous mode. Confirmed by `/get`:
  `system_mode: heat, occupied_heating_setpoint: 17, temperature_setpoint_hold: true,
  temperature_setpoint_hold_duration: 65535`. That is Manual at 17°.
- Changes made on the remote are pushed by the receiver straight away, with no `/get` needed.

## Root cause of lost commands: radio interference at the coordinator

The zigbee2mqtt debug log (09:18 and 09:45) shows `Data confirm error … 225` = **MAC channel access
failure**. 22 of 30 transmissions failed. The coordinator (Z-Stack) found the 2.4 GHz channel busy and
gave up.
- 09:18:49 `Publish 'set' 'temperature_setpoint_hold_duration' to 'Hive receiver' failed`: the boost
  mode got through, the duration didn't. That's why the receiver kept 65535.
- 09:45:34: the two-step test's step 1 never reached the receiver.
- The SLT3C remote's check-ins failed too.

**Commands can land minutes late.** zigbee2mqtt keeps retrying. The two-step test's step 1 was sent at
09:45:34; a read-back at 09:45:40 showed no change, and the test stopped. But the writes then arrived one by
one: hold 09:45:47, `emergency_heating` 09:46:40, setpoint 21 at 09:48:07. The result was an unintended
boost with no end. Rules that follow from this:
- A read-back showing "no change" does not mean the command won't land later.
- After any command, keep watching for at least 5 minutes, and correct or warn if the receiver ends up
  somewhere unexpected.
- A test that gives up must actively return the receiver to Schedule and confirm it, not just stop.

The receiver's own link quality is fine (83–98), so the problem is at the coordinator, not distance.
The panel must still verify every write by `/get` read-back and retry. But retries can't make up for
~70% loss; the radio problem has to be fixed first.

## Weekly schedule

- Read: `/get {"weekly_schedule":""}`. The receiver replies **one message per day** (some repeated). Each
  reply overwrites `weekly_schedule` in the state, so collect replies by `days[]`.
- Reply shape: `{"days":["monday"],"transitions":[{"heating_setpoint":20,"time":390}, ...]}`. `time` is
  minutes after midnight.
- Always **6 transitions per day**. Unused slots repeat the previous setting.
- **"Off" is `heating_setpoint: 1`.**
- Write (confirmed 11:55, see below): `/set {"weekly_schedule":{"dayofweek":["monday",...],"transitions":[{"heatSetpoint":20,"transitionTime":"06:30"}, ...]}}`.
  Send 6 transitions.

Schedule on the receiver at first read (same every day):
06:30 20° · 08:30 off · 12:00 off · 14:00 off · 16:30 20° · 22:00 off

## Still to confirm

- [x] State reported after the boost is stopped on the remote (back to Manual 17°, see above).
- [x] Schedule mode as reported (remote → Schedule, 09:44, confirmed by `/get`): `system_mode: heat`,
  `temperature_setpoint_hold: false`, `temperature_setpoint_hold_duration: 0`, `occupied_heating_setpoint` =
  current slot (1 = off). The receiver never reports `auto`.

  Decoding: off = `system_mode off` · schedule = `heat` + hold false · manual = `heat` + hold true + 65535 ·
  boost = `emergency_heating` · override = ? (check 4).
- [x] Boost sticks and ends on time (10:59:32 → 11:09:34). The duration counts down once a minute and
  reaches 0 about a minute before the end. The receiver then goes back to Schedule by itself
  (`heat`, hold false, duration 0).
  The first drop comes ~1.5 s after the write (2068 → 2067), so the count reads a minute low throughout;
  the end is a minute after it reaches 0. zigbee2mqtt repeats the cached count in every message, so time
  it from when the value changes.
- [x] The same boost message sometimes loses its length (10 Oct, Away from Schedule, 5 of 7 took):
  at 07:32 the receiver went 2068 → 65535 → 65534 (no end); at 07:35 it went 2065 → 0, then dropped back
  to Schedule a second later. The panel undoes a try that doesn't take and sends it again (up to 3 tries).
- [x] The receiver counts a hold down **without reporting it** (10 Oct: nothing from 20:04:55 to 20:13:08 during
  an Away). The count only arrives when something reads it, and zigbee2mqtt's messages in the meantime repeat
  the last count it saw. An old count makes the end look later, so the panel keeps its earliest estimate of
  the end, and reads the count first whenever it reads the receiver's state.
- [x] Back to schedule (10:28, after the stick was moved to a USB 2 port on an extension): `/set
  {"system_mode":"heat","temperature_setpoint_hold":false}`. Each write landed within ~200 ms. The
  receiver itself then reported duration 0, giving exactly the state the remote's Schedule button produces.
  Confirmed by two `/get` reads.
- [x] Manual (11:26, at 15° so the boiler stayed off): `/set {"system_mode":"heat","temperature_setpoint_hold":true,"temperature_setpoint_hold_duration":65535}`
  → hold on, no end, setpoint reset to the schedule's value (1). Then `/set {"occupied_heating_setpoint":15}`
  → kept (still 15 ten seconds later).
- [x] Off (11:26 from Schedule; **fixed 17:10**): `{"system_mode":"off"}` alone only worked from Schedule. From
  Manual (17:09) it left `temperature_setpoint_hold: true`, 65535, and the old setpoint (20, 18.5), so the receiver
  kept heating to it. `{hold: false, system_mode: off}` (17:12) gave off + hold false but **kept 18.5**. The remote's
  Off (17:20) changed all three in one report: `off`, hold **false**, setpoint **1** (its snowflake / frost). The
  panel now sends `{"system_mode":"off","temperature_setpoint_hold":false,"occupied_heating_setpoint":1}` and checks
  mode, hold and setpoint (re-sending the 1 on its own if needed).
- [x] Temporary change from the remote's dial (11:59, set to 18°): the receiver stays on Schedule
  (`heat`, hold **false**, duration 0; hold flickered true for ~0.5 s) with `occupied_heating_setpoint: 18`.
  It went back to the schedule's value at **12:00**, one of the receiver's own padding slots. **A temporary
  change lasts until the next slot of any kind**, padding included.
  - Panel: a temporary change = Schedule mode with a setpoint different from the schedule's current value. The dial
    on Schedule writes `occupied_heating_setpoint` alone. The end time = the next slot (`nextSlot`).
  - Panel's padding puts filler slots 15 min **after** real changes, so a temporary change lasts until the next
    real change. Days keep the receiver's 12:00/14:00 padding until they're next saved.
- [x] **Temporary change written over zigbee2mqtt (21 Oct 2026, 21:53, TPI test): unlike the remote's dial, it
  holds.** `/set {"occupied_heating_setpoint": 12}` from Schedule (hold false, setpoint 1): the receiver reported
  `heat`, hold **true**, duration **516** = minutes to the next slot (06:30), setpoint 12. Confirmed by single
  `/get`s a minute later (hold true, 515, heat, 13.5 after TPI's next write). Later setpoint writes keep the hold
  and its countdown. Decoding: `heat` + hold true + a finite count = Schedule with a temporary change (65535 is
  still Manual). It ends at the next slot like any temporary change.
- [x] Schedule write + read-back (11:55, from the panel): one `/set {"weekly_schedule": {"dayofweek": ["sunday"],
  "transitions": [6 × {"heatSetpoint", "transitionTime": "HH:MM"}]}}` per group of identical days. The receiver
  reports the new day by itself ~1 s later, and the full `/get` read-back matches. The panel pads to 6 by splitting
  the longest stretch (Sunday's padding moved from 12:00/14:00 to 12:30/19:15, which runs the same).
