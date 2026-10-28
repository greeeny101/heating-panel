# Heating panel for Home Assistant

[![Open your Home Assistant and add this repository to HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=greeeny101&repository=heating-panel&category=integration)

A full-screen heating control for Home Assistant, built for phones and the Companion app. One round dial, a
few big buttons, and a schedule editor. Simple enough for anyone in the house.

It talks to a zigbee2mqtt heating receiver over MQTT, and to radiator valves through Home Assistant.

**Tested with:** Hive SLR1c receiver (heating only) with an SLT3C remote, zigbee2mqtt 2.x, and Moes BRT-100
and SONOFF TRV-ZBT radiator valves.

<p>
  <img src="https://raw.githubusercontent.com/greeeny101/heating-panel/main/docs/screenshots/dial.jpg" width="200" alt="The dial: Schedule at 19.5°, room 19.4°, heating now, with the mode buttons and today's schedule below">
  <img src="https://raw.githubusercontent.com/greeeny101/heating-panel/main/docs/screenshots/boost.jpg" width="200" alt="Boost: choose 15 minutes to 2 hours, and a temperature">
  <img src="https://raw.githubusercontent.com/greeeny101/heating-panel/main/docs/screenshots/away.jpg" width="200" alt="Going away: the day and time you're back, and the temperature while away">
</p>
<p>
  <img src="https://raw.githubusercontent.com/greeeny101/heating-panel/main/docs/screenshots/schedule.jpg" width="200" alt="The week's schedule, one bar per day">
  <img src="https://raw.githubusercontent.com/greeeny101/heating-panel/main/docs/screenshots/day.jpg" width="200" alt="One day's schedule: up to 6 changes, copy to other days">
  <img src="https://raw.githubusercontent.com/greeeny101/heating-panel/main/docs/screenshots/change.jpg" width="200" alt="Editing one change: its start time, and heating on at a temperature or off">
</p>

## What it does

- **Dial** shows the target and the room temperature. Drag it, or use − / +.
  - In **Manual** and **Boost**, the new temperature stays until you change it.
  - On **Schedule** it's a temporary change until the next schedule change, like turning the remote's dial.
- **Modes:** Schedule, Manual, Off and Boost.
- **Boost** for 15 minutes to 2 hours at a chosen temperature. It always ends by itself (see "Boost that
  never ends" under Troubleshooting).
- **Going away?** keeps the house at a low temperature until the day and time you're back, then goes back to
  the schedule by itself.
- **Schedule editor:**
  - Up to 6 changes a day; copy a day to other days.
  - Edits are saved to the receiver, so the schedule keeps running even if Home Assistant is down.
  - A backup of the schedule from before your first edit can be put back.
- **Radiators** list room temperatures and targets while the boiler is heating. Tap one to set its
  temperature.
- **Settings** (administrators only): the usual boost length and temperature, and the temperature while
  away. They're shared by everyone, on every device.
- **Checks every change.** After each command the panel reads the receiver back. If something didn't take,
  it says so in plain words, and a boost that didn't take is cancelled rather than left running.
- **Optional TPI boiler control** (off until you turn it on). The boiler gets a share of each 10-minute cycle,
  based on how far the room is below the target and how cold it is outside, instead of the receiver's plain
  on/off. If Home Assistant stops, the receiver carries on by itself. See
  [TPI boiler control](#tpi-boiler-control-optional).

## Requirements

- Home Assistant 2026.10 or later, with the MQTT integration.
- zigbee2mqtt 2.x, with the receiver paired.

## Install

### With HACS

Heating panel isn't in HACS's default list yet (it's waiting for review), so add it as a custom repository first.

Click the blue button at the top of this page: it opens your Home Assistant at this repository in HACS. Or,
in HACS, open the ⋮ menu → **Custom repositories** and add `https://github.com/greeeny101/heating-panel` as an
**Integration**. Then:

1. Download **Heating panel** in HACS.
2. Restart Home Assistant.

### By hand

Copy `custom_components/heating_panel` from this repository to your Home Assistant `config/custom_components/`
folder, then restart Home Assistant.

## Set up

1. Go to **Settings → Devices & services → Add integration → Heating panel**.
2. Enter the receiver's topic in zigbee2mqtt: its base topic and friendly name, for example
   `zigbee2mqtt/Hive receiver`.

The panel now opens at `/heating`, and is in the sidebar. To choose its radiators and other settings, go to
**Heating panel → Configure → Panel**:

| Setting | Default | What it does |
| --- | --- | --- |
| Set up the panel | on | Untick to use a panel from `configuration.yaml` instead (see [Setting the panel up in YAML](#setting-the-panel-up-in-yaml)) |
| Address | `heating` | The panel opens at `/heating`. A second receiver's panel gets `heating-2` |
| Show in the sidebar | on | Without it, the panel opens only from a link, such as a dashboard button. Anyone with the link can still open it |
| Title | Heating | Above the dial, and in the sidebar |
| Radiator valves | none | Climate entities. Each valve's battery and position sensors are found on its device. Valves are listed by their name without words like "radiator" or "TRV" at the end, so "Bedroom radiator TRV" shows as Bedroom. Rename the valve in Home Assistant to change it |
| List the radiators | Only while the boiler is heating | Or always |
| Receiver's climate entity | found from the topic | Only for basic details before the receiver has reported |
| Look | The panel's own dark look | Or follow your Home Assistant theme |
| Schedule, Manual and Off buttons; Boost button; temporary changes on Schedule; Going away? button | all on | Untick any you don't want |

Changes show once the page is reloaded.

The integration does three things for the panel:

- **Sends its commands.** Since Home Assistant 2026.10, only administrators may send MQTT messages
  (`mqtt.publish`). The integration's `heating_panel.send` service sends the panel's commands for everyone. It only
  sends to the `/set` and `/get` topics of the receivers set up in it, and never retained.
- **Passes on the receiver's reports.** People who aren't administrators can't watch MQTT topics, so the
  `sensor.heating_panel_receiver` sensor passes each report on as attributes. Its attributes aren't kept in the
  history.
- **Makes `sensor.heating_mode`**, which shows the receiver's mode once a change has finished (off, schedule,
  manual, boost or away), for dashboards and automations. Its attributes are `setpoint`, `hold_minutes`,
  `heating` (the boiler is firing) and `local_temperature`.

### A button on your dashboard

On the Companion app this opens the panel full screen. The phone's back button returns to the dashboard.

```yaml
type: tile
entity: sensor.heating_mode
name: Heating
tap_action:
  action: navigate
  navigation_path: /heating
```

For a fuller card, with the mode, the radiators and warnings, see [dashboard-card.yaml](dashboard-card.yaml). It
needs Mushroom, Vertical Stack In Card, Bubble Card and card-mod from HACS.

Links can open a particular view:

| Link | Opens |
| --- | --- |
| `/heating` | The dial |
| `/heating?view=schedule` | The schedule |
| `/heating?radiator=bedroom` | One radiator (matches its name or entity) |
| `/heating?kiosk=1` | No header, for wall tablets |

### Settings shared by everyone

Values changed on the panel's settings screen (administrators only) are kept in three helpers the panel creates.
They're shared by everyone, on every device:

- `input_number.heating_panel_boost_minutes`
- `input_number.heating_panel_boost_temperature`
- `input_number.heating_panel_away_temperature`

## Moving from the YAML setup

Before version 0.4 the panel was set up with `panel_custom` and an MQTT sensor in `configuration.yaml`. After
updating, that setup keeps working: the integration doesn't add its own panel until you ask it to. To move over:

1. Remove the heating panel's `panel_custom` entry, and the `heating panel receiver` MQTT sensor (and its
   `recorder: exclude:` line), from `configuration.yaml`.
2. Restart Home Assistant.
3. Go to **Heating panel → Configure → Panel**, tick **Set up the panel**, and choose your radiators.
4. Fully close and reopen the Companion app.

The new receiver sensor takes the old one's name, `sensor.heating_panel_receiver`, so dashboard cards keep
working. If it came out as `sensor.heating_panel_receiver_2` (the old one was still there), rename it in
Settings → Entities. You can also delete `config/www/heating-panel/`: the integration serves the panel itself.

## Setting the panel up in YAML

For settings the Configure page doesn't have (such as the dial's range, or boost lengths), untick **Set up the
panel** and register the panel yourself. The integration still serves the panel's file, but with the option
unticked it doesn't make the receiver sensor, so add that too:

```yaml
panel_custom:
  - name: heating-panel
    sidebar_title: Heating
    sidebar_icon: mdi:radiator
    url_path: heating
    module_url: /heating_panel/heating-panel.js?v=0.4.0   # change v after each update
    config:
      receiver:
        topic: zigbee2mqtt/Hive receiver
        entity: climate.hive_receiver
        state_entity: sensor.heating_panel_receiver
      radiators:
        - name: Bedroom
          entity: climate.bedroom_radiator_trv
          position: sensor.bedroom_radiator_trv_position
          battery: sensor.bedroom_radiator_trv_battery

mqtt:
  sensor:
    - name: heating panel receiver
      unique_id: heating_panel_receiver
      state_topic: "zigbee2mqtt/Hive receiver"
      value_template: "{{ value_json.system_mode }}"
      json_attributes_topic: "zigbee2mqtt/Hive receiver"
      force_update: true      # the panel's checks rely on seeing every report

recorder:
  exclude:
    entities:
      - sensor.heating_panel_receiver   # it updates often; no need to keep its history
```

Restart Home Assistant after changing it: the panel's config is only read at startup. If the receiver sensor is
missing, the panel shows this snippet, already filled in, with a reminder to add it.

Everything except `receiver.topic` is optional:

| Option | Default | What it does |
| --- | --- | --- |
| `theme` | `porch` | `porch` is the panel's own dark look; `ha` follows your Home Assistant theme |
| `receiver.topic` | (required) | The receiver's zigbee2mqtt topic |
| `receiver.name` | `Heating` | Title above the dial |
| `receiver.entity` | | The receiver's climate entity, for basic details if nothing else is available |
| `receiver.state_entity` | | The receiver sensor above |
| `receiver.min_temp` / `max_temp` | `5` / `32` | Dial range |
| `receiver.controls.modes` | `true` | Schedule / Manual / Off buttons |
| `receiver.controls.boost` | `true` | Boost button. Or `{minutes, temperature, max_minutes}` for its defaults |
| `receiver.controls.override` | `true` | Dial works on Schedule (temporary change) |
| `receiver.controls.away` | `true` | "Going away?" button |
| `receiver.controls.away_temperature` | `14` | Temperature while away (5–16°) |
| `radiators` | | List of `{name, entity, position, battery}`. Without `position` (for valves that don't report it, like the SONOFF TRV-ZBT), the valve shows as Open while the boiler heats a room below its target, and Closed otherwise |
| `radiators_when` | `heating` | `heating` lists radiators only while the boiler is on; `always` lists them always |

## Limitations

- **Away starts when you press it.** There's no start date in the future; press it as you leave. A delayed
  start would need a Home Assistant automation.
- **Away is a long, low boost underneath**, because that's the only kind of hold the receiver counts down by
  itself:
  - The remote shows it as a boost with a long countdown.
  - The panel tells Away from Boost by its temperature (16° or below) or its length (more than 6 hours).
  - It can last up to about 45 days.
  - Pressing Boost during Away ends the Away.
- **Away keeps one temperature all day and night.** The heating comes on whenever the house drops below it,
  including overnight. Choose a lower away temperature (10–12°) to keep that rare. A "holiday schedule" (your
  normal times at a lower temperature) isn't offered: nothing could switch the normal schedule back on by
  itself, so it would rely on a Home Assistant automation running on your return date.
- **Holidays set on the remote:**
  - The remote keeps the dates itself and puts the receiver in Manual at the holiday temperature. The panel
    shows that as **Manual**.
  - While it runs, the receiver refuses other changes, so the panel will ask you to cancel it on the remote
    first.
- **A temporary change lasts until the next schedule slot, filler slots included.** The receiver always
  holds 6 slots a day, and pads unused ones itself. The panel puts its filler slots just after real changes,
  so temporary changes last until the next real change.
  - If your receiver still has its own filler slots (for example at 12:00 and 14:00), the schedule screen
    offers **Tidy the schedule**. It keeps your heating times exactly the same.
- **Frost protection is set on the remote (7–12°).** Off on the panel puts the receiver into the same frost
  state as the remote's Off (the snowflake). The frost temperature itself lives in the remote, which the panel
  can't change, so set it there.
- **Boost lengths in the boost sheet go up to 2 hours.** The remote's display goes up to 6 hours.
- **Schedule backup is per device.** The "put back the schedule" backup is kept in the browser that made
  the first change.
- **Heating only.** It's heating only for now: the SLR2's hot water isn't supported yet. If that's something you'd use, let me know.

## Troubleshooting

**Boost that never ends, or heating that boosts by itself.** Check your MQTT broker for a *retained* message
on the receiver's `/set` topic (MQTT Explorer shows them). zigbee2mqtt re-sends a retained command every time
it reconnects. The panel warns about this if it sees one. Delete it, and never publish to `/set` with
"retain" ticked.

**Commands sometimes don't arrive.** Look in zigbee2mqtt's log for `MAC channel access failure` (status
225). It means radio interference at the Zigbee stick. The usual fixes:

- Plug the stick into a USB 2 port, on a 1–2 m extension cable, away from the computer, router and SSDs.
- Check that your 2.4 GHz Wi-Fi channel doesn't overlap the Zigbee channel.

**"No reply from the receiver".** The `topic` must match the receiver's name in zigbee2mqtt exactly, and
zigbee2mqtt must be running.

**The panel looks old, or stops working after an update.** Restart Home Assistant, then fully reload the page
(on the Companion app, close it fully and reopen it). With a YAML panel, also change `?v=` in `module_url`.

**The panel isn't at /heating.** Look in the Home Assistant log for "Not adding the heating panel": another panel
already has that address, usually a `panel_custom` entry in `configuration.yaml`. Remove that one, or choose
another address under Configure → Panel.

## TPI boiler control (optional)

The integration can run the boiler with TPI (time-proportional control) instead of the receiver's plain on/off
thermostat. TPI gives the boiler a share of each 10-minute cycle, based on how far the room is below target
and how cold it is outside. It does this by nudging the receiver's setpoint either side of the target while
the receiver runs its schedule, so if Home Assistant stops, the receiver still keeps the room close to the
target. Turn it on under **Settings → Devices & services → Heating panel → Configure → TPI boiler control**.
How it works, how it fails safe, and how to tune it: [docs/tpi.md](docs/tpi.md).

## How it talks to the receiver

Everything the panel sends was tried on a real receiver first. The details are in
[docs/receiver-protocol.md](docs/receiver-protocol.md): which commands work, in which order, and why. Two
things are worth knowing:

- **Boost** is one message, in a fixed order, sent while no hold is running. The receiver only takes the
  boost length when a hold starts.
- **zigbee2mqtt's reported state is a cache.** It shows what was written, not always what the receiver
  kept, so the panel checks each value with a fresh read of that one value.

## Development

```sh
npm install
npm run build        # builds the panel into custom_components/heating_panel/frontend/
npm run typecheck
npm test             # unit tests (npm run test:watch to rerun on save)
npm run test:py      # the integration's plain-Python parts: topics, mode, schedule, TPI, panel config (python3 -m venv .venv && .venv/bin/pip install pytest pytest-asyncio first)
npm run integration:dev   # build, and copy the integration into the dev Home Assistant (then restart it)
npm run dev          # rebuild on save into the dev Home Assistant's www folder, for a YAML panel there
```

The built panel is committed, because HACS installs the integration straight from the repository. The tests
workflow fails if it doesn't match the source, so run `npm run build` before committing.

The tests run the panel's receiver code against a fake receiver (`test/fake-receiver.ts`) that behaves
as the real one does in [docs/receiver-protocol.md](docs/receiver-protocol.md), including the ways it has
lost commands. No Home Assistant, MQTT or boiler is involved. When the real receiver does something new,
add it to the fake and write a test for it.

`tests/` runs the integration inside a test Home Assistant
([pytest-homeassistant-custom-component](https://github.com/MatthewFlamm/pytest-homeassistant-custom-component)),
with MQTT mocked: setting up a receiver, the Configure pages, the panel, the sensors, the services, and moving from
the YAML setup. The tests workflow runs it against the newest Home Assistant release and the newest beta, on
every push and every Thursday morning (the monthly beta is out by Wednesday evening), so a Home Assistant change
that breaks the integration shows up a week before the release. It needs Python 3.14; with Docker:

```sh
docker run --rm -v "$PWD:/repo" -w /repo -e PYTHONDONTWRITEBYTECODE=1 python:3.14 sh -c 'pip install -q -r requirements_test.txt &&
  pip install -q $(python -c "import json, pathlib, homeassistant.components.frontend as f; print(\" \".join(json.loads((pathlib.Path(f.__file__).parent / \"manifest.json\").read_text())[\"requirements\"]))") &&
  python -m pytest -p no:cacheprovider tests -q'
```

The dev Home Assistant (port 8124) is shared with the doorbell panel. Its config is in
`../doorbell-panel/ha-config`.

### Releasing

1. Change `version` in `custom_components/heating_panel/manifest.json` (and `package.json`).
2. `npm run build`, run the tests, and commit.
3. Make a GitHub release (not just a tag) named after the version, e.g. `v0.4.0`. HACS offers each release as an
   update.
