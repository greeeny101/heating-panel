import { DAYS, dayIndex, hhmm, padToSlots, sameDay, setpointAt, type Day, type WeekSchedule } from "./schedule";
import type { HomeAssistant, MqttMessage } from "./types";

/** What zigbee2mqtt reports for the receiver. See docs/receiver-protocol.md. */
export interface ReceiverReport {
  system_mode?: string;
  running_state?: string;
  occupied_heating_setpoint?: number;
  temperature_setpoint_hold?: boolean;
  /** Minutes left on a hold; the receiver counts it down. 65535 means no end. */
  temperature_setpoint_hold_duration?: number;
  local_temperature?: number;
}

export type ReceiverMode = "off" | "schedule" | "manual" | "override" | "boost" | "away" | "unknown";

export type LinkStatus =
  | "connecting"
  | "live"
  /** Subscribed, but nothing has come back from the receiver. */
  | "silent"
  /** The user isn't an administrator, so the MQTT subscription is refused. */
  | "no-access"
  /** `state_entity` is configured but doesn't exist in Home Assistant. */
  | "no-entity"
  /** The user isn't an administrator and the heating_panel integration isn't installed, so commands are refused. */
  | "no-integration"
  | "no-mqtt"
  | "error";

/** TPI, as the heating_panel integration's heating mode sensor reports it (only when TPI is on). */
export interface TpiState {
  /** The temperature TPI is keeping the room at. */
  target: number;
  /** What TPI last wrote to the receiver: the target plus or minus its margin. */
  setpoint: number | null;
  /** The share of each cycle the boiler gets, %. */
  demand: number;
}

export const NO_END = 65535;
/** The receiver's frost / "off" temperature, as the remote sets it when switched off. */
const OFF_SETPOINT = 1;
/** Longest timed hold the receiver can count down (minutes, about 45 days). */
export const MAX_HOLD = 65534;
/**
 * Away is a long, low boost. It's told apart from a real boost by its temperature or length: a boost
 * is never this cool, nor longer than the remote's 6-hour display.
 */
export const AWAY_MAX_TEMP = 16;
const AWAY_MIN_MINUTES = 360;
/** Boost / Away is sent up to this many times before giving up (see timedBoost). */
const BOOST_TRIES = 3;

/** The compressed messages of Home Assistant's `subscribe_entities` (only the parts used here). */
interface EntityMessage {
  a?: Record<string, { s?: string; a?: Record<string, unknown> }>;
  c?: Record<string, { "+"?: { a?: Record<string, unknown> }; "-"?: { a?: string[] } }>;
}

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
const message = (err: unknown) => (err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err));

/** A holiday set on the remote makes the receiver refuse other changes until it's cancelled there. */
const HOLIDAY_HINT = "If a holiday is set on the remote (plane icon), cancel it there first.";

/** A command that didn't take; the message is written for the person using the panel. */
export class CommandError extends Error {}

const MODE_WORDS: Record<ReceiverMode, string> = {
  off: "Off",
  schedule: "Schedule",
  manual: "Manual",
  override: "a temporary change",
  boost: "Boost",
  away: "Away",
  unknown: "an unknown mode",
};

/**
 * Read in this order. zigbee2mqtt reads one at a time and publishes after each, filling the rest from its
 * cache, so the countdown goes first: then even the first reply carries a fresh count.
 */
const STATE_FIELDS = [
  "temperature_setpoint_hold_duration",
  "temperature_setpoint_hold",
  "system_mode",
  "running_state",
  "occupied_heating_setpoint",
  "local_temperature",
] as const;

/**
 * The receiver never reports "auto": schedule is "heat" with the hold off, or with a hold counting down to
 * the next slot. A temperature written over zigbee2mqtt on Schedule does that (21 Oct 2026); the remote's dial
 * leaves the hold off.
 */
export function decodeMode(r: ReceiverReport): ReceiverMode {
  switch (r.system_mode) {
    case "off":
      return "off";
    case "emergency_heating":
      return "boost";
    case "heat": {
      if (r.temperature_setpoint_hold === false) return "schedule";
      const d = r.temperature_setpoint_hold_duration;
      if (r.temperature_setpoint_hold === true && typeof d === "number") return d === NO_END ? "manual" : "schedule";
      return "unknown";
    }
    default:
      return "unknown";
  }
}

/**
 * Watches the receiver's zigbee2mqtt topic through Home Assistant's MQTT websocket API and asks
 * it for its state and weekly schedule (`/get`), and sends it commands (`/set`).
 */
export class ReceiverLink {
  report: ReceiverReport = {};
  status: LinkStatus = "connecting";
  errorText = "";
  week: WeekSchedule = {};
  scheduleState: "idle" | "loading" | "partial" | "done" = "idle";
  /** A retained message sits on the receiver's /set topic and is re-sent whenever zigbee2mqtt reconnects. */
  retainedCommand = false;
  /** A command is being sent and checked. */
  busy = false;
  /** Set when the receiver changes away from what was just asked for. */
  unexpected = "";

  /**
   * When the current hold ends (ms). The receiver doesn't report its count by itself, only when asked,
   * and zigbee2mqtt fills its messages with the last count it saw, so an old count makes the end look
   * later than it really is (20:13 on 10 Oct: 1315 repeated eight minutes after it was read). A fresh
   * count is never later than the truth, so the earliest estimate is kept. Cleared when the hold ends.
   */
  private holdEnd: number | null = null;
  private expect?: { mode: ReceiverMode; until: number };
  private waiters: Array<(p: Record<string, unknown>) => void> = [];
  private unsubs: Array<() => Promise<void>> = [];
  private stopped = false;
  private silentTimer?: number;
  private scheduleTimer?: number;

  /** The sensor's attributes as last seen (entity mode). */
  private entityAttrs: Record<string, unknown> = {};

  /**
   * With `stateEntity`, the receiver's reports come from an MQTT sensor carrying them as attributes,
   * which any Home Assistant user may follow. Without it, the topic is watched directly, which
   * Home Assistant only allows administrators to do.
   */
  constructor(
    private readonly getHass: () => HomeAssistant,
    readonly topic: string,
    private readonly changed: () => void,
    readonly stateEntity?: string,
  ) {}

  async start(): Promise<void> {
    this.stopped = false;
    this.status = "connecting";
    try {
      if (this.stateEntity) {
        if (!this.getHass().states[this.stateEntity]) {
          this.status = "no-entity";
          this.changed();
          return;
        }
        await this.subscribe({ type: "subscribe_entities", entity_ids: [this.stateEntity] }, this.onEntity);
      } else {
        await this.subscribe({ type: "mqtt/subscribe", topic: this.topic }, this.onState);
        await this.subscribe({ type: "mqtt/subscribe", topic: `${this.topic}/set` }, this.onSet);
      }
    } catch (err) {
      if (this.stopped) return;
      const { code, message } = (err ?? {}) as { code?: string; message?: string };
      this.status = code === "unauthorized" ? "no-access" : code === "unknown_command" ? "no-mqtt" : "error";
      this.errorText = message ?? String(err);
      this.changed();
      return;
    }
    if (this.stopped) return;
    this.silentTimer = window.setTimeout(() => {
      if (this.status !== "connecting") return;
      this.status = "silent";
      this.changed();
    }, 10_000);
    this.requestState();
    this.requestSchedule();
  }

  stop(): void {
    this.stopped = true;
    for (const w of this.waiters) w({});
    this.waiters = [];
    window.clearTimeout(this.silentTimer);
    window.clearTimeout(this.scheduleTimer);
    for (const unsub of this.unsubs) void unsub().catch(() => undefined);
    this.unsubs = [];
  }

  requestState(): void {
    this.get(Object.fromEntries(STATE_FIELDS.map((k) => [k, ""])));
  }

  /** The receiver answers with one message per day. */
  requestSchedule(): void {
    this.scheduleState = "loading";
    window.clearTimeout(this.scheduleTimer);
    this.scheduleTimer = window.setTimeout(() => {
      if (this.scheduleState !== "loading") return;
      this.scheduleState = "partial";
      this.changed();
    }, 20_000);
    this.get({ weekly_schedule: "" });
    this.changed();
  }

  /** What the schedule says right now, or null if it isn't loaded. */
  get scheduledNow(): number | null {
    const now = new Date();
    return setpointAt(this.week, dayIndex(now), now.getHours() * 60 + now.getMinutes());
  }

  /**
   * TPI while it's controlling the boiler, or null. It's found through the integration's heating mode sensor
   * for this receiver, which any user may read.
   */
  get tpi(): TpiState | null {
    const states = this.getHass().states;
    for (const id in states) {
      const a = states[id].attributes;
      if (!id.startsWith("sensor.") || a.topic !== this.topic || !("tpi_active" in a)) continue;
      if (a.tpi_active !== true || typeof a.tpi_target !== "number") return null;
      return {
        target: a.tpi_target,
        setpoint: typeof a.tpi_setpoint === "number" ? a.tpi_setpoint : null,
        demand: typeof a.tpi_demand === "number" ? a.tpi_demand : 0,
      };
    }
    return null;
  }

  /**
   * The temperature being aimed for. With TPI on, the receiver's setpoint is nudged either side of the
   * target, so TPI's target is shown instead, as long as the receiver has what TPI wrote.
   */
  get target(): number | undefined {
    const sp = this.report.occupied_heating_setpoint;
    const tpi = this.tpi;
    if (tpi && decodeMode(this.report) === "schedule" && (sp === tpi.setpoint || sp === tpi.target)) return tpi.target;
    return sp;
  }

  get mode(): ReceiverMode {
    const mode = decodeMode(this.report);
    // A temporary change (from the remote's dial or the panel's) keeps the schedule running with
    // a different temperature, until the next schedule slot.
    const scheduled = this.scheduledNow;
    const sp = this.target;
    if (mode === "schedule" && scheduled !== null && sp !== undefined && sp !== scheduled) return "override";
    if (mode === "boost") {
      const left = this.minutesLeft;
      if ((sp !== undefined && sp <= AWAY_MAX_TEMP) || (left !== null && left > AWAY_MIN_MINUTES)) return "away";
    }
    return mode;
  }

  /** Minutes left on a boost or temporary change, as the receiver counts; null if there's no end time or no hold. */
  get minutesLeft(): number | null {
    const end = this.holdEnds;
    return end === null ? null : Math.max(0, Math.ceil((end - Date.now()) / 60_000) - 1);
  }

  /**
   * When the hold ends (ms), or null. The receiver's count drops a minute within seconds of starting and
   * reaches 0 a minute before the end, so the end is a minute after the count runs out.
   */
  get holdEnds(): number | null {
    const d = this.report.temperature_setpoint_hold_duration;
    if (d === undefined || d === NO_END || !this.report.temperature_setpoint_hold) return null;
    return this.holdEnd;
  }

  get scheduleDays(): number {
    return DAYS.filter((d) => this.week[d]).length;
  }

  // ---- Commands. Sequences and why: docs/receiver-protocol.md ----

  /** Back to the receiver's own schedule. */
  toSchedule(): Promise<void> {
    return this.run("schedule", async () => {
      await this.set({ system_mode: "heat", temperature_setpoint_hold: false });
      if (!(await this.until("temperature_setpoint_hold", (v) => v === false)))
        throw new CommandError(`The receiver didn't go back to its schedule. ${HOLIDAY_HINT}`);
    });
  }

  /**
   * Boost for `minutes` at `temp`, as one message in zigbee2mqtt's documented order. The receiver takes
   * the length only if it's already written when the hold switches from off to on, so the boost has to
   * start with the hold off (from Schedule or Off). Any step that doesn't take sends the receiver back
   * to its schedule, so a boost can never be left without an end. See docs/receiver-protocol.md.
   */
  boost(minutes: number, temp: number): Promise<void> {
    return this.timedBoost("boost", minutes, temp);
  }

  /**
   * Away until `until`: a boost at a low temperature for the minutes until then. The receiver counts it
   * down and goes back to its schedule by itself, without the remote or Home Assistant.
   */
  away(until: Date, temp: number): Promise<void> {
    // The hold ends `minutes` after it starts, so rounding puts the end within half a minute of `until`.
    const minutes = () => Math.min(MAX_HOLD, Math.round((until.getTime() - Date.now()) / 60_000));
    if (minutes() < 1) return Promise.reject(new CommandError("Pick a time in the future."));
    return this.timedBoost("away", minutes, temp);
  }

  /**
   * The receiver sometimes takes the mode but not the length: it keeps "no end" (65534/65535), or 0 so the
   * boost ends at once (07:32 and 07:35 on 10 Oct; 5 of 7 tries took). So a try that doesn't take is
   * undone, back to Schedule, and sent again. `minutes` is asked afresh each try, so Away still ends on time.
   */
  private timedBoost(mode: ReceiverMode, minutes: number | (() => number), temp: number): Promise<void> {
    const length = typeof minutes === "number" ? () => minutes : minutes;
    return this.run(mode, async () => {
      if (this.report.temperature_setpoint_hold !== false) {
        await this.set({ system_mode: "heat", temperature_setpoint_hold: false });
        if (!(await this.until("temperature_setpoint_hold", (v) => v === false)))
          throw new CommandError(`The receiver didn't get ready. ${HOLIDAY_HINT}`);
        await sleep(1000);
      }
      for (let attempt = 1; ; attempt++) {
        const n = length();
        try {
          await this.set({
            system_mode: "emergency_heating",
            temperature_setpoint_hold_duration: n,
            temperature_setpoint_hold: true,
            occupied_heating_setpoint: temp,
          });
          if (!(await this.until("system_mode", (v) => v === "emergency_heating")))
            throw new CommandError("The receiver didn't switch to boost.");
          if (!(await this.until("temperature_setpoint_hold_duration", (v) => typeof v === "number" && v >= 1 && v <= n, 3)))
            throw new CommandError("The receiver didn't take the boost length.");
          // The temperature has always stuck so far; if not, it can be set on its own during a boost.
          if (!(await this.until("occupied_heating_setpoint", (v) => v === temp, 2))) await this.setpoint(temp);
          return;
        } catch (err) {
          await this.set({ system_mode: "heat", temperature_setpoint_hold: false }).catch(() => undefined);
          const back = await this.until("temperature_setpoint_hold", (v) => v === false);
          if (back && attempt < BOOST_TRIES) {
            await sleep(2000);
            continue;
          }
          throw new CommandError(
            `${message(err)} ${back ? "The heating is back on its schedule." : "Check the remote: it may still be boosting."}`,
          );
        }
      }
    });
  }

  /** Hold with no end, then the temperature on its own (the hold resets it to the schedule's). */
  manual(temp: number): Promise<void> {
    return this.run("manual", async () => {
      await this.set({ system_mode: "heat", temperature_setpoint_hold: true, temperature_setpoint_hold_duration: NO_END });
      if (!(await this.until("temperature_setpoint_hold", (v) => v === true)))
        throw new CommandError(`The receiver didn't switch to manual. ${HOLIDAY_HINT}`);
      await sleep(1000);
      await this.setpoint(temp);
    });
  }

  /**
   * Off, as the remote does it (17:20): mode off, hold off **and** the temperature set to 1, the
   * receiver's frost / "off" value (the remote's snowflake). Mode off alone left a Manual hold running
   * at its old temperature, and hold off alone left that temperature, so the receiver kept heating to it.
   */
  off(): Promise<void> {
    return this.run("off", async () => {
      await this.set({ system_mode: "off", temperature_setpoint_hold: false, occupied_heating_setpoint: OFF_SETPOINT });
      if (!(await this.until("system_mode", (v) => v === "off")))
        throw new CommandError(`The receiver didn't switch off. ${HOLIDAY_HINT}`);
      if (!(await this.until("temperature_setpoint_hold", (v) => v === false)))
        throw new CommandError(`The receiver is off but still holding a temperature, so it may keep heating. ${HOLIDAY_HINT}`);
      if (!(await this.until("occupied_heating_setpoint", (v) => v === OFF_SETPOINT, 2))) {
        await this.set({ occupied_heating_setpoint: OFF_SETPOINT });
        const sp = await this.readOne("occupied_heating_setpoint");
        if (sp !== OFF_SETPOINT)
          throw new CommandError(`The receiver is off but still set to ${sp}°, so it may keep heating. Turn it off on the remote.`);
      }
    });
  }

  /**
   * Writes the given days to the receiver (days with the same settings go in one message), then reads
   * the whole schedule back to check every saved day.
   */
  saveSchedule(week: WeekSchedule, days: Day[]): Promise<void> {
    return this.run(this.mode, async () => {
      const groups = new Map<string, Day[]>();
      for (const d of days) {
        const key = JSON.stringify(week[d] ?? []);
        groups.set(key, [...(groups.get(key) ?? []), d]);
      }
      for (const [key, group] of groups) {
        const transitions = padToSlots(JSON.parse(key)).map((t) => ({ heatSetpoint: t.setpoint, transitionTime: hhmm(t.time) }));
        await this.set({ weekly_schedule: { dayofweek: group, transitions } });
      }
      // Forget what we had, so only fresh replies count.
      this.week = {};
      this.requestSchedule();
      for (let i = 0; i < 50 && this.scheduleState === "loading"; i++) await sleep(500);
      const wrong = days.filter((d) => !this.week[d] || !sameDay(this.week[d], week[d]));
      if (wrong.length)
        throw new CommandError(
          `The receiver didn't confirm ${wrong.length === days.length ? "the new schedule" : `${wrong.length} of the days`}. Open the schedule again to see what it has.`,
        );
    });
  }

  /**
   * Change the temperature. In Manual and Boost it stays; on Schedule it's a temporary change,
   * just as the remote's dial does, lasting until the next schedule slot.
   */
  setTarget(temp: number): Promise<void> {
    const mode = this.mode;
    if (mode === "off" || mode === "unknown")
      return Promise.reject(new CommandError("Choose Schedule, Manual or Boost first."));
    const expect = mode === "manual" || mode === "boost" || mode === "away" ? mode : temp === this.scheduledNow ? "schedule" : "override";
    return this.run(expect, () => this.setpoint(temp));
  }

  private async setpoint(temp: number): Promise<void> {
    for (let i = 0; i < 2; i++) {
      await this.set({ occupied_heating_setpoint: temp });
      if (await this.until("occupied_heating_setpoint", (v) => v === temp, 3)) return;
    }
    throw new CommandError("The receiver didn't take the new temperature.");
  }

  /** One command at a time; afterwards, watch for five minutes that the receiver stays put. */
  private async run(mode: ReceiverMode, steps: () => Promise<void>): Promise<void> {
    if (this.busy) throw new CommandError("Still sending the last change. Try again in a moment.");
    this.busy = true;
    this.unexpected = "";
    this.expect = undefined;
    this.changed();
    this.tellBusy(true);
    try {
      await steps();
      this.expect = { mode, until: Date.now() + 5 * 60_000 };
    } finally {
      this.busy = false;
      this.changed();
      this.tellBusy(false);
    }
  }

  /**
   * Tells the heating_panel integration a change is starting or has finished, so its heating mode sensor
   * (and the dashboard card) skips the steps on the way, as the panel does. Without the integration, or with
   * an older one, there's nothing to tell; it never holds up the change.
   */
  private tellBusy(busy: boolean): void {
    // Always tried, not only when hass.services lists it: after Home Assistant restarts, a page left open can
    // reconnect with a service list that's missing the integration, and TPI then overwrote every change the
    // panel sent (23 Oct 2026). No error message if the integration really isn't there.
    void this.getHass()
      .callService("heating_panel", "busy", { topic: this.topic, busy }, undefined, false)
      .catch(() => undefined);
  }

  /**
   * Sends a write, then waits for zigbee2mqtt's echoes of it to pass: an echo shows the value
   * written, not what the receiver kept (it may reset it a moment later).
   */
  private async set(payload: Record<string, unknown>): Promise<void> {
    await this.send("set", payload);
    await sleep(1500);
  }

  /**
   * Publishes to the receiver's /set or /get topic. Since Home Assistant 2026.10 only administrators may
   * call mqtt.publish, so this goes through the heating_panel integration's service when it's installed.
   */
  private async send(command: "set" | "get", payload: Record<string, unknown>): Promise<unknown> {
    const hass = this.getHass();
    // The integration's service first, whatever hass.services says (it can be stale after a restart; see
    // tellBusy): only when Home Assistant says it doesn't exist, fall back to mqtt.publish.
    try {
      return await hass.callService("heating_panel", "send", { topic: this.topic, command, payload }, undefined, false);
    } catch (err) {
      if ((err as { code?: string })?.code !== "not_found") throw err;
    }
    return hass.callService("mqtt", "publish", { topic: `${this.topic}/${command}`, payload: JSON.stringify(payload) });
  }

  /**
   * Reads one attribute from the receiver. zigbee2mqtt publishes after each attribute it reads,
   * filling the rest from its cache, so only the attribute asked for is trustworthy.
   */
  private readOne(key: string): Promise<unknown> {
    return new Promise((resolve) => {
      const waiter = (p: Record<string, unknown>) => {
        window.clearTimeout(timer);
        resolve(p[key]);
      };
      const timer = window.setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w !== waiter);
        resolve(undefined);
      }, 8000);
      this.waiters.push(waiter);
      this.get({ [key]: "" });
    });
  }

  private async until(key: string, ok: (v: unknown) => boolean, tries = 5): Promise<boolean> {
    for (let i = 0; i < tries && !this.stopped; i++) {
      if (ok(await this.readOne(key))) return true;
      await sleep(1500);
    }
    return false;
  }

  private async subscribe<T>(msg: Record<string, unknown>, cb: (msg: T) => void): Promise<void> {
    const unsub = await this.getHass().connection.subscribeMessage<T>(cb, msg);
    if (this.stopped) void unsub().catch(() => undefined);
    else this.unsubs.push(unsub);
  }

  private get(payload: Record<string, string>): void {
    this.send("get", payload)
      .catch((err: { code?: string; message?: string }) => {
        this.status = err?.code === "unauthorized" ? "no-integration" : "error";
        this.errorText = err?.message ?? String(err);
        this.changed();
      });
  }

  private onState = (msg: MqttMessage): void => {
    let p: Record<string, unknown>;
    try {
      p = JSON.parse(msg.payload);
    } catch {
      return;
    }
    if (p && typeof p === "object") this.onReport(p);
  };

  /**
   * `subscribe_entities` messages: `a` holds the full state when subscribing, `c` the changes since.
   * The first full state may be old, so only later changes count as hearing from the receiver.
   */
  private onEntity = (msg: EntityMessage): void => {
    const id = this.stateEntity!;
    const added = msg.a?.[id];
    if (added) {
      this.entityAttrs = { ...(added.a ?? {}) };
      this.onReport(this.entityAttrs, false);
    }
    const change = msg.c?.[id];
    if (change) {
      const plus = change["+"]?.a;
      if (plus) this.entityAttrs = { ...this.entityAttrs, ...plus };
      for (const k of change["-"]?.a ?? []) delete this.entityAttrs[k];
      this.onReport(this.entityAttrs);
    }
  };

  private onReport(p: Record<string, unknown>, fresh = true): void {
    const r = this.report as Record<string, unknown>;
    for (const k of STATE_FIELDS) if (k in p) r[k] = p[k];
    // The end of the hold: never later than the earliest estimate (see holdEnd).
    if ("temperature_setpoint_hold_duration" in p || "temperature_setpoint_hold" in p) {
      const d = this.report.temperature_setpoint_hold_duration;
      if (!this.report.temperature_setpoint_hold || d === undefined || d === NO_END) this.holdEnd = null;
      else {
        const estimate = Date.now() + (d + 1) * 60_000;
        this.holdEnd = this.holdEnd === null ? estimate : Math.min(this.holdEnd, estimate);
      }
    }
    if (!fresh) {
      this.changed();
      return;
    }
    window.clearTimeout(this.silentTimer);
    this.status = "live";

    const waiters = this.waiters;
    this.waiters = [];
    for (const w of waiters) w(p);

    const mode = this.mode;
    if (this.expect && !this.busy && mode !== "unknown" && mode !== this.expect.mode) {
      if (Date.now() < this.expect.until)
        this.unexpected = `The receiver changed to ${MODE_WORDS[mode]} shortly after your change. If nobody used the remote, it didn't keep the setting.`;
      this.expect = undefined;
    }

    const ws = p.weekly_schedule as { days?: string[]; transitions?: Array<{ time: number; heating_setpoint: number }> };
    if (ws?.days && Array.isArray(ws.transitions)) {
      const transitions = ws.transitions.map((t) => ({ time: t.time, setpoint: t.heating_setpoint }));
      for (const d of ws.days) if ((DAYS as readonly string[]).includes(d)) this.week[d as Day] = transitions;
      this.week = { ...this.week };
      if (this.scheduleState !== "done" && this.scheduleDays === DAYS.length) {
        this.scheduleState = "done";
        window.clearTimeout(this.scheduleTimer);
      }
    }
    this.changed();
  }

  private onSet = (msg: MqttMessage): void => {
    // Only a stored (retained) command is a problem; live commands pass through with retain=false.
    if (msg.retain && msg.payload.trim()) {
      this.retainedCommand = true;
      this.changed();
    }
  };
}
