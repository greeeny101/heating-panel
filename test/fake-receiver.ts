import { vi } from "vitest";
import { DAYS, dayIndex, padToSlots, setpointAt, type Day, type Transition, type WeekSchedule } from "../src/schedule";
import type { HomeAssistant, MqttMessage } from "../src/types";

export const TOPIC = "zigbee2mqtt/Hive receiver";

/**
 * Things the real receiver has done to a boost message (docs/receiver-protocol.md, 10 Oct log):
 *   no-end    took the mode but kept "no end" (65534) instead of the length
 *   zero      took the mode with a length of 0, so it dropped back to Schedule a second later
 *   lost      never arrived (radio)
 */
export type BoostFault = "no-end" | "zero" | "lost";

/** A normal day: warm in the morning and evening, off (1°) otherwise. */
export const DAY: Transition[] = [
  { time: 6 * 60 + 30, setpoint: 19 },
  { time: 8 * 60, setpoint: 1 },
  { time: 17 * 60, setpoint: 20 },
  { time: 22 * 60, setpoint: 1 },
];

/**
 * A Hive SLR1c behind zigbee2mqtt, as far as the panel can see it: answers /get, applies /set the way
 * the real receiver does, counts holds down and ends them by itself. Driven by Vitest's fake timers.
 */
export class FakeReceiver {
  state = {
    system_mode: "heat",
    running_state: "idle",
    occupied_heating_setpoint: 1,
    temperature_setpoint_hold: false,
    temperature_setpoint_hold_duration: 0,
    local_temperature: 17.8,
  };
  week: WeekSchedule = Object.fromEntries(DAYS.map((d) => [d, padToSlots(DAY)]));
  /** Every /set payload, in order. */
  sets: Array<Record<string, unknown>> = [];
  /** What the next boost messages run into, one per message. */
  boostFaults: BoostFault[] = [];
  /** The receiver ignores the setpoint in this many writes (other than boost messages). */
  dropSetpoints = 0;

  private subscribers = new Map<string, (msg: MqttMessage) => void>();
  private tick?: ReturnType<typeof setTimeout>;

  /** Every service call, in order. */
  calls: Array<{ domain: string; service: string; data?: Record<string, unknown> }> = [];
  /**
   * Which heating_panel services Home Assistant really has. hass.services below is only what the page was told,
   * which can be stale: calling a missing service fails with "not_found", as Home Assistant does.
   */
  integration = { send: true, busy: true };

  readonly hass: HomeAssistant = {
    states: {},
    services: { heating_panel: { send: {}, busy: {} }, mqtt: { publish: {} } },
    connection: {
      subscribeMessage: async <T>(cb: (msg: T) => void, msg: Record<string, unknown>) => {
        const topic = msg.topic as string;
        this.subscribers.set(topic, cb as unknown as (m: MqttMessage) => void);
        return async () => void this.subscribers.delete(topic);
      },
    },
    callWS: async () => undefined as never,
    callService: async (domain, service, data) => {
      this.calls.push({ domain, service, data });
      if (domain === "heating_panel" && !this.integration[service as "send" | "busy"])
        throw { code: "not_found", message: `Service ${domain}.${service} not found.` };
      if (domain === "heating_panel" && service === "busy") return undefined;
      let topic: string;
      let payload: Record<string, unknown>;
      if (domain === "heating_panel" && service === "send") {
        // As the integration does: only this receiver's /set and /get.
        if (data?.topic !== TOPIC) throw new Error(`unexpected receiver ${String(data?.topic)}`);
        topic = `${TOPIC}/${String(data.command)}`;
        payload = data.payload as Record<string, unknown>;
      } else if (domain === "mqtt" && service === "publish") {
        topic = data?.topic as string;
        payload = JSON.parse(data?.payload as string) as Record<string, unknown>;
      } else throw new Error(`unexpected service ${domain}.${service}`);
      if (topic === `${TOPIC}/set`) this.onSet(payload);
      else if (topic === `${TOPIC}/get`) this.onGet(payload);
      else throw new Error(`unexpected topic ${topic}`);
      return undefined;
    },
  };

  constructor() {
    this.state.occupied_heating_setpoint = this.scheduled();
  }

  /** What the schedule asks for now. */
  scheduled(): number {
    const now = new Date();
    return setpointAt(this.week, dayIndex(now), now.getHours() * 60 + now.getMinutes()) ?? 1;
  }

  /** Something outside the panel changed the receiver (the remote, say). */
  external(change: Partial<FakeReceiver["state"]>): void {
    Object.assign(this.state, change);
    this.publish();
  }

  /** zigbee2mqtt publishes again from its cache (e.g. after another attribute report), old count and all. */
  repeatCache(change: Record<string, unknown> = {}): void {
    this.cache = { ...this.cache, ...change };
    this.send(this.cache);
  }

  /** A message on the receiver's /set topic from someone else, e.g. a retained one. */
  setMessage(payload: string, retain: boolean): void {
    this.subscribers.get(`${TOPIC}/set`)?.({ topic: `${TOPIC}/set`, payload, qos: 0, retain });
  }

  /** What zigbee2mqtt last published: it fills each new message from this. */
  private cache: Record<string, unknown> = {};

  /** The receiver reports (or zigbee2mqtt echoes a write): everything current. */
  private publish(extra: Record<string, unknown> = {}): void {
    this.cache = { ...this.state };
    this.send({ ...this.cache, ...extra });
  }

  private send(msg: Record<string, unknown>): void {
    this.subscribers.get(TOPIC)?.({ topic: TOPIC, payload: JSON.stringify(msg), qos: 0, retain: false });
  }

  private later(ms: number, fn: () => void): void {
    setTimeout(fn, ms);
  }

  private onGet(payload: Record<string, unknown>): void {
    if ("weekly_schedule" in payload) {
      // One message per day, as the receiver answers.
      DAYS.forEach((d, i) =>
        this.later(100 + i * 50, () =>
          this.publish({
            weekly_schedule: {
              days: [d],
              transitions: (this.week[d] ?? []).map((t) => ({ time: t.time, heating_setpoint: t.setpoint })),
            },
          }),
        ),
      );
      return;
    }
    // zigbee2mqtt reads one attribute at a time and publishes after each, filling the rest from its
    // cache, so the first messages of a multi-attribute read still carry old values (10 Oct, 20:13).
    Object.keys(payload).forEach((key, i) =>
      this.later(50 + i * 20, () => {
        this.cache = { ...this.cache, [key]: (this.state as Record<string, unknown>)[key] };
        this.send(this.cache);
      }),
    );
  }

  private onSet(p: Record<string, unknown>): void {
    this.sets.push(p);
    const s = this.state;

    if (p.weekly_schedule) {
      const ws = p.weekly_schedule as { dayofweek: Day[]; transitions: Array<{ heatSetpoint: number; transitionTime: string }> };
      const transitions = ws.transitions.map((t) => {
        const [h, m] = t.transitionTime.split(":").map(Number);
        return { time: h * 60 + m, setpoint: t.heatSetpoint };
      });
      for (const d of ws.dayofweek) this.week[d] = transitions;
      return;
    }

    if (p.system_mode === "emergency_heating") {
      const fault = this.boostFaults.shift();
      if (fault === "lost") return;
      const wasHolding = s.temperature_setpoint_hold;
      s.system_mode = "emergency_heating";
      s.temperature_setpoint_hold = true;
      // The length only latches as the hold goes from off to on; otherwise the old "no end" stays.
      if (wasHolding) s.temperature_setpoint_hold_duration = Math.max(s.temperature_setpoint_hold_duration, 65534);
      else s.temperature_setpoint_hold_duration = (p.temperature_setpoint_hold_duration as number) ?? 65535;
      if (typeof p.occupied_heating_setpoint === "number") s.occupied_heating_setpoint = p.occupied_heating_setpoint;
      if (fault === "no-end") s.temperature_setpoint_hold_duration = 65534;
      this.later(80, () => this.publish());
      if (fault === "zero") {
        s.temperature_setpoint_hold_duration = 0;
        this.later(1000, () => this.endHold());
      } else if (s.temperature_setpoint_hold_duration < 65534) this.startCountdown();
      return;
    }

    if (p.system_mode === "heat" && p.temperature_setpoint_hold === true && p.temperature_setpoint_hold_duration === 65535) {
      // Manual: a hold with no end; the hold resets the setpoint to the schedule's.
      this.stopCountdown();
      Object.assign(s, { system_mode: "heat", temperature_setpoint_hold: true, temperature_setpoint_hold_duration: 65535 });
      s.occupied_heating_setpoint = this.scheduled();
    } else {
      if (typeof p.system_mode === "string") s.system_mode = p.system_mode;
      if (p.temperature_setpoint_hold === false) {
        this.stopCountdown();
        s.temperature_setpoint_hold = false;
        s.temperature_setpoint_hold_duration = 0;
        if (s.system_mode === "heat") s.occupied_heating_setpoint = this.scheduled();
      }
      if (typeof p.occupied_heating_setpoint === "number") {
        if (this.dropSetpoints > 0) this.dropSetpoints--;
        else s.occupied_heating_setpoint = p.occupied_heating_setpoint;
      }
    }
    this.later(80, () => this.publish());
  }

  /**
   * The count drops a minute ~1.5 s after the hold starts, then once a minute, silently; the hold ends a
   * minute after 0, which the receiver does report.
   */
  private startCountdown(): void {
    this.stopCountdown();
    const step = () => {
      const s = this.state;
      if (s.temperature_setpoint_hold_duration === 0) return this.endHold();
      // The receiver counts down without reporting it (10 Oct: silent from 20:04:55 to 20:13:08).
      s.temperature_setpoint_hold_duration--;
      this.tick = setTimeout(step, 60_000);
    };
    this.tick = setTimeout(step, 1500);
  }

  private stopCountdown(): void {
    if (this.tick !== undefined) clearTimeout(this.tick);
    this.tick = undefined;
  }

  private endHold(): void {
    this.stopCountdown();
    Object.assign(this.state, {
      system_mode: "heat",
      temperature_setpoint_hold: false,
      temperature_setpoint_hold_duration: 0,
      occupied_heating_setpoint: this.scheduled(),
    });
    this.publish();
  }
}

/**
 * Runs fake time forward until the promise settles (or 10 minutes pass), and returns its outcome without
 * letting the countdown run on further than needed.
 */
export async function settle<T>(p: Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: Error }> {
  let outcome: { ok: true; value: T } | { ok: false; error: Error } | undefined;
  p.then(
    (value) => (outcome = { ok: true, value }),
    (error: Error) => (outcome = { ok: false, error }),
  );
  for (let i = 0; i < 600 && !outcome; i++) await vi.advanceTimersByTimeAsync(1000);
  if (!outcome) throw new Error("command never finished");
  return outcome;
}
