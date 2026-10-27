"""Runs TPI for one receiver: feeds `Tpi` (tpi.py) from Home Assistant and writes what it decides.

- The receiver's reports (its zigbee2mqtt topic) give the mode, the setpoint, the remote's room temperature, and
  the weekly schedule, one day per message. The schedule is kept in a Store so TPI has a target straight after
  a restart.
- The room and outdoor temperatures can instead come from entities chosen in the integration's options.
- A timer at every schedule slot tells TPI the receiver has put the setpoint back to the schedule's value.
- While the panel sends a change (heating_panel.busy), TPI leaves the receiver alone.

Every write is checked the way the panel checks its own (src/receiver.ts): wait for zigbee2mqtt's echo of the
write to pass, then read the setpoint back on its own. See docs/receiver-protocol.md.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
import json
import time
from typing import Any

from homeassistant.components import mqtt, persistent_notification
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import Event, EventStateChangedData, HomeAssistant, State, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect, async_dispatcher_send
from homeassistant.helpers.event import async_call_later, async_track_point_in_time, async_track_state_change_event
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import (
    CONF_COEF_EXT,
    CONF_COEF_INT,
    CONF_CYCLE_MINUTES,
    CONF_MARGIN_OFF,
    CONF_MARGIN_ON,
    CONF_MIN_OFF_MINUTES,
    CONF_MIN_ON_MINUTES,
    CONF_OUTDOOR_ENTITY,
    CONF_PROMPT_START,
    CONF_ROOM_ENTITY,
    CONF_TOPIC,
    DOMAIN,
    LOGGER,
    busy_signal,
    panel_setpoint_signal,
    tpi_signal,
)
from .mode import decode_mode
from .publish import async_first_read, async_publish_command
from .schedule import DAYS, Week, next_slot, parse_day_reply, setpoint_at
from .tpi import IDLE_FAULT, Settings, Tpi

STORE_VERSION = 1
# After a slot starts, give the receiver this long to put its setpoint back before TPI writes.
SLOT_DELAY_SECONDS = 10
# Checking a write: let zigbee2mqtt's echo pass, then read back up to this many times.
ECHO_SECONDS = 1.5
READ_TRIES = 3
READ_TIMEOUT_SECONDS = 8.0
SEND_TRIES = 2


def settings_from(options: dict[str, Any]) -> Settings:
    d = Settings()
    return Settings(
        cycle_minutes=float(options.get(CONF_CYCLE_MINUTES, d.cycle_minutes)),
        coef_int=float(options.get(CONF_COEF_INT, d.coef_int)),
        coef_ext=float(options.get(CONF_COEF_EXT, d.coef_ext)),
        min_on_minutes=float(options.get(CONF_MIN_ON_MINUTES, d.min_on_minutes)),
        min_off_minutes=float(options.get(CONF_MIN_OFF_MINUTES, d.min_off_minutes)),
        margin_on=float(options.get(CONF_MARGIN_ON, d.margin_on)),
        margin_off=float(options.get(CONF_MARGIN_OFF, d.margin_off)),
        prompt_start=bool(options.get(CONF_PROMPT_START, d.prompt_start)),
    )


def _temperature(state: State | None) -> float | None:
    """A sensor's or input_number's state, or a weather entity's temperature; None if there's none."""
    if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
        return None
    value = state.attributes.get("temperature") if state.domain == "weather" else state.state
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _number(v: Any) -> float | None:
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else None


class TpiController:
    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self.topic: str = entry.data[CONF_TOPIC]
        self.room_entity: str | None = entry.options.get(CONF_ROOM_ENTITY) or None
        self.outdoor_entity: str | None = entry.options.get(CONF_OUTDOOR_ENTITY) or None
        self.week: Week = {}
        self.tpi = Tpi(settings_from(entry.options), self._write, self._changed, self._schedule, time.monotonic)

        self._store: Store[dict[str, Any]] = Store(hass, STORE_VERSION, f"{DOMAIN}.{entry.entry_id}")
        self._report: dict[str, Any] = {}
        self._writing: asyncio.Task[None] | None = None
        self._readers: list[asyncio.Future[dict[str, Any]]] = []
        self._unsubs: list[Any] = []
        self._slot_unsub: Any = None
        self._was_fault = False
        self._saved_override: float | None = None

    # ---- Starting and stopping ----

    async def async_start(self) -> None:
        stored = await self._store.async_load() or {}
        self.week = {d: [(int(t), float(sp)) for t, sp in v] for d, v in (stored.get("week") or {}).items() if d in DAYS}
        self.tpi.enabled = stored.get("enabled", True)
        # A temporary change outlives a restart until its slot ends; without it, TPI's leftover nudge of it
        # would look like someone turning the dial.
        until = dt_util.parse_datetime(stored.get("override_until") or "")
        if stored.get("override") is not None and until and dt_util.now() < until:
            self.tpi.override = float(stored["override"])
        self._saved_override = self.tpi.override
        # And TPI's own recent writes, so they're never mistaken for a dial change after a restart.
        self.tpi.remember_written([v for v in stored.get("written") or [] if isinstance(v, (int, float))])

        self._unsubs.append(await mqtt.async_subscribe(self.hass, self.topic, self._message))
        self._unsubs.append(async_dispatcher_connect(self.hass, busy_signal(self.topic), self._busy))
        self._unsubs.append(
            async_dispatcher_connect(self.hass, panel_setpoint_signal(self.topic), self._panel_setpoint)
        )
        for entity in filter(None, (self.room_entity, self.outdoor_entity)):
            self._unsubs.append(async_track_state_change_event(self.hass, [entity], self._entity_changed))
        if self.room_entity:
            self.tpi.set_room(_temperature(self.hass.states.get(self.room_entity)))
        if self.outdoor_entity:
            self.tpi.set_outdoor(_temperature(self.hass.states.get(self.outdoor_entity)))

        self._schedule_changed()
        # Fresh state, and the whole schedule; the heating mode sensor's own read then isn't needed.
        self.entry.async_create_background_task(
            self.hass, async_first_read(self.hass, self.topic, schedule=True), f"{DOMAIN} TPI first read"
        )

    @callback
    def stop(self) -> None:
        self.tpi.stop()
        if self._writing:
            self._writing.cancel()
        for unsub in self._unsubs:
            unsub()
        self._unsubs = []
        if self._slot_unsub:
            self._slot_unsub()
            self._slot_unsub = None

    # ---- Inputs ----

    @callback
    def _message(self, msg: mqtt.ReceiveMessage) -> None:
        try:
            payload = json.loads(msg.payload)
        except ValueError:
            return
        if not isinstance(payload, dict):
            return
        self._report.update(payload)

        readers, self._readers = self._readers, []
        for reader in readers:
            if not reader.done():
                reader.set_result(payload)

        days = parse_day_reply(payload.get("weekly_schedule"))
        if days and any(self.week.get(d) != v for d, v in days.items()):
            self.week.update(days)
            self._store.async_delay_save(self._stored, 5)
            self._schedule_changed()

        if not self.room_entity:
            room = _number(payload.get("local_temperature"))
            if room is not None:
                self.tpi.set_room(room)
        # The setpoint before the mode: coming back to Schedule, TPI looks at the setpoint it finds.
        setpoint = _number(payload.get("occupied_heating_setpoint"))
        if setpoint is not None and not self._writing:
            self.tpi.report_setpoint(setpoint)
        self.tpi.set_mode(decode_mode(self._report))

    @callback
    def _busy(self, busy: bool) -> None:
        self.tpi.set_paused(busy)

    @callback
    def _panel_setpoint(self, value: float) -> None:
        self.tpi.panel_setpoint(value)

    @callback
    def _entity_changed(self, event: Event[EventStateChangedData]) -> None:
        value = _temperature(event.data["new_state"])
        if event.data["entity_id"] == self.room_entity:
            self.tpi.set_room(value)
        else:
            self.tpi.set_outdoor(value)

    def _schedule_changed(self) -> None:
        """The schedule was read or saved: tell TPI what it says now, and time the next slot."""
        self.tpi.set_scheduled(setpoint_at(self.week, dt_util.now()))
        self._time_next_slot()

    def _time_next_slot(self) -> None:
        if self._slot_unsub:
            self._slot_unsub()
            self._slot_unsub = None
        when = next_slot(self.week, dt_util.now())
        if when is not None:
            self._slot_unsub = async_track_point_in_time(
                self.hass, self._slot_started, when + timedelta(seconds=SLOT_DELAY_SECONDS)
            )

    @callback
    def _slot_started(self, _now: datetime) -> None:
        self._slot_unsub = None
        self.tpi.slot_passed(setpoint_at(self.week, dt_util.now()))
        self._time_next_slot()

    def _stored(self) -> dict[str, Any]:
        until = next_slot(self.week, dt_util.now()) if self.tpi.override is not None else None
        return {
            "week": self.week,
            "enabled": self.tpi.enabled,
            "override": self.tpi.override,
            "override_until": until.isoformat() if until else None,
            "written": self.tpi.written,
        }

    # ---- The switch ----

    @callback
    def set_enabled(self, enabled: bool) -> None:
        self.tpi.set_enabled(enabled)
        self._store.async_delay_save(self._stored, 1)

    # ---- What Tpi asks for ----

    def _schedule(self, delay: float, run: Any) -> Any:
        # A callback so Home Assistant runs it in the event loop (see sensor.py).
        return async_call_later(self.hass, delay, callback(lambda _now: run()))

    @callback
    def _changed(self) -> None:
        fault = self.tpi.idle_reason == IDLE_FAULT
        notification_id = f"{DOMAIN}_tpi_fault_{self.entry.entry_id}"
        if fault and not self._was_fault:
            persistent_notification.async_create(
                self.hass,
                f"TPI stopped controlling **{self.topic}**: the receiver didn't take its setpoint "
                "several times in a row. The receiver is running on its own thermostat. Turn the TPI switch "
                "off and on again to retry.",
                title="Heating TPI stopped",
                notification_id=notification_id,
            )
        elif self._was_fault and not fault:
            persistent_notification.async_dismiss(self.hass, notification_id)
        self._was_fault = fault
        if self.tpi.override != self._saved_override:
            self._saved_override = self.tpi.override
            self._store.async_delay_save(self._stored, 1)
        async_dispatcher_send(self.hass, tpi_signal(self.topic))

    @callback
    def _write(self, setpoint: float) -> None:
        """Put `setpoint` on the receiver. A newer write replaces one still being checked."""
        # TPI has just added it to its writes: keep those over a restart.
        self._store.async_delay_save(self._stored, 1)
        if self._writing:
            self._writing.cancel()
        self._writing = self.entry.async_create_background_task(
            self.hass, self._write_and_check(setpoint), f"{DOMAIN} TPI write"
        )

    async def _write_and_check(self, setpoint: float) -> None:
        ok = False
        try:
            for _ in range(SEND_TRIES):
                await self._publish("set", {"occupied_heating_setpoint": setpoint})
                await asyncio.sleep(ECHO_SECONDS)
                for _ in range(READ_TRIES):
                    if _number(await self._read_one("occupied_heating_setpoint")) == setpoint:
                        ok = True
                        break
                    await asyncio.sleep(ECHO_SECONDS)
                if ok:
                    break
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001 - MQTT not connected, etc.: counts as a failed write
            LOGGER.exception("TPI write to %s failed", self.topic)
        self._writing = None
        LOGGER.debug("TPI %s setpoint %s: %s", self.topic, setpoint, "ok" if ok else "not taken")
        self.tpi.write_done(ok)
        # Reports were held back from TPI while checking; now it may look at where the receiver ended up.
        last = _number(self._report.get("occupied_heating_setpoint"))
        if not self._writing and last is not None:
            self.tpi.report_setpoint(last)

    async def _read_one(self, key: str) -> Any:
        """One attribute, read from the receiver. zigbee2mqtt fills the rest of the reply from its cache."""
        reader: asyncio.Future[dict[str, Any]] = self.hass.loop.create_future()
        self._readers.append(reader)
        await self._publish("get", {key: ""})
        try:
            async with asyncio.timeout(READ_TIMEOUT_SECONDS):
                return (await reader).get(key)
        except TimeoutError:
            return None
        finally:
            if reader in self._readers:
                self._readers.remove(reader)

    async def _publish(self, command: str, payload: dict[str, Any]) -> None:
        await async_publish_command(self.hass, self.topic, command, payload)

    # ---- What the entities show ----

    @property
    def cycle_ends(self) -> datetime | None:
        ends = self.tpi.cycle_ends
        return None if ends is None else dt_util.utcnow() + timedelta(seconds=ends - time.monotonic())
