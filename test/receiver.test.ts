import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommandError, NO_END, ReceiverLink, decodeMode } from "../src/receiver";
import { holdLengthWrite } from "../src/z2m";
import { FakeReceiver, TOPIC, settle } from "./fake-receiver";

const BOOST_KEYS = ["system_mode", "temperature_setpoint_hold_duration", "temperature_setpoint_hold", "occupied_heating_setpoint"];
const SCHEDULE = { system_mode: "heat", temperature_setpoint_hold: false };
const isBoostMessage = (p: Record<string, unknown>) => p.system_mode === "emergency_heating";

let fake: FakeReceiver;
let link: ReceiverLink;

/** A receiver on Schedule and a panel connected to it, with the state and the week loaded. */
async function connect(): Promise<void> {
  fake = new FakeReceiver();
  link = new ReceiverLink(() => fake.hass, TOPIC, () => undefined);
  await link.start();
  await vi.advanceTimersByTimeAsync(1000);
}

beforeEach(async () => {
  vi.useFakeTimers();
  // Saturday 10 October 2026, 07:32 local time (the morning Away failed twice).
  vi.setSystemTime(new Date(2026, 9, 10, 7, 32, 0));
  await connect();
});

afterEach(() => {
  // Nothing the panel sent was refused by zigbee2mqtt, or sent to a dual-channel receiver without its endpoint.
  expect(fake.errors).toEqual([]);
  expect(fake.stray).toEqual([]);
  link.stop();
  vi.useRealTimers();
});

describe("decodeMode", () => {
  it.each([
    [{ system_mode: "off" }, "off"],
    [{ system_mode: "heat", temperature_setpoint_hold: false }, "schedule"],
    [{ system_mode: "heat", temperature_setpoint_hold: true, temperature_setpoint_hold_duration: NO_END }, "manual"],
    // zigbee2mqtt 2.6.1 and later report "no end" as null.
    [{ system_mode: "heat", temperature_setpoint_hold: true, temperature_setpoint_hold_duration: null }, "manual"],
    [{ system_mode: "emergency_heating", temperature_setpoint_hold: true }, "boost"],
    // A temperature written over zigbee2mqtt on Schedule: held until the next slot.
    [{ system_mode: "heat", temperature_setpoint_hold: true, temperature_setpoint_hold_duration: 516 }, "schedule"],
    [{ system_mode: "heat", temperature_setpoint_hold: true }, "unknown"],
    [{ system_mode: "auto" }, "unknown"],
  ])("%o is %s", (report, mode) => {
    expect(decodeMode(report)).toBe(mode);
  });
});

describe("connecting", () => {
  it("reads the state and the whole week", () => {
    expect(link.status).toBe("live");
    expect(link.scheduleState).toBe("done");
    expect(link.scheduleDays).toBe(7);
    expect(link.mode).toBe("schedule");
  });

  describe("with TPI on", () => {
    const tpiSensor = (attrs: Record<string, unknown>) => {
      (fake.hass.states as Record<string, unknown>)["sensor.hive_receiver_heating_mode"] = {
        entity_id: "sensor.hive_receiver_heating_mode",
        state: "schedule",
        attributes: { topic: TOPIC, tpi_active: true, tpi_target: 19, tpi_setpoint: 20.5, tpi_demand: 40, ...attrs },
      };
    };

    it("shows TPI's target, not its nudge, and stays on Schedule", async () => {
      tpiSensor({});
      fake.external({ occupied_heating_setpoint: 20.5 });
      await vi.advanceTimersByTimeAsync(100);
      expect(link.target).toBe(19);
      expect(link.mode).toBe("schedule");
      expect(link.tpi?.demand).toBe(40);
    });

    it("a dial change TPI hasn't taken up yet is still a temporary change", async () => {
      tpiSensor({});
      fake.external({ occupied_heating_setpoint: 22 });
      await vi.advanceTimersByTimeAsync(100);
      expect(link.target).toBe(22);
      expect(link.mode).toBe("override");
    });

    it("TPI's own temporary target", async () => {
      tpiSensor({ tpi_target: 22, tpi_setpoint: 23.5 });
      fake.external({ occupied_heating_setpoint: 23.5 });
      await vi.advanceTimersByTimeAsync(100);
      expect(link.target).toBe(22);
      expect(link.mode).toBe("override");
    });

    it("idle TPI changes nothing", async () => {
      tpiSensor({ tpi_active: false, tpi_target: null, tpi_setpoint: null });
      fake.external({ occupied_heating_setpoint: 20.5 });
      await vi.advanceTimersByTimeAsync(100);
      expect(link.tpi).toBeNull();
      expect(link.target).toBe(20.5);
    });
  });

  it("reports a temporary change when the setpoint differs from the schedule's", async () => {
    // 07:32 is in the 19° morning slot.
    expect(link.scheduledNow).toBe(19);
    fake.external({ occupied_heating_setpoint: 21 });
    await vi.advanceTimersByTimeAsync(100);
    expect(link.mode).toBe("override");
  });

  it("warns about a retained message on the /set topic", () => {
    fake.setMessage(JSON.stringify(SCHEDULE), false);
    expect(link.retainedCommand).toBe(false);
    fake.setMessage(JSON.stringify(SCHEDULE), true);
    expect(link.retainedCommand).toBe(true);
  });
});

describe("sending (mqtt.publish is admin-only since Home Assistant 2026.10)", () => {
  /** A receiver and panel on a Home Assistant without the heating_panel integration. */
  async function connectWithoutIntegration(publish?: () => Promise<unknown>): Promise<void> {
    link.stop();
    fake = new FakeReceiver();
    delete fake.hass.services!.heating_panel;
    fake.integration = { send: false, busy: false };
    if (publish) fake.hass.callService = publish;
    link = new ReceiverLink(() => fake.hass, TOPIC, () => undefined);
    await link.start();
    await vi.advanceTimersByTimeAsync(1000);
  }

  it("goes through the heating_panel integration, with the payload as an object", async () => {
    expect(fake.calls.length).toBeGreaterThan(0);
    expect(fake.calls.every((c) => c.domain === "heating_panel" && c.service === "send")).toBe(true);
    await settle(link.setTarget(18));
    expect(fake.calls).toContainEqual({
      domain: "heating_panel",
      service: "send",
      data: { topic: TOPIC, command: "set", payload: { occupied_heating_setpoint: 18 } },
    });
  });

  it("tells the integration while a change is being sent, so the heating mode sensor waits for the end", async () => {
    fake.calls = [];
    expect((await settle(link.boost(15, 22))).ok).toBe(true);
    const busy = fake.calls.filter((c) => c.service === "busy");
    expect(busy).toEqual([
      { domain: "heating_panel", service: "busy", data: { topic: TOPIC, busy: true } },
      { domain: "heating_panel", service: "busy", data: { topic: TOPIC, busy: false } },
    ]);
    // Busy before the first write, and not busy only after the last.
    expect(fake.calls[0].service).toBe("busy");
    expect(fake.calls[fake.calls.length - 1].service).toBe("busy");
  });

  it("says it's finished even when a change fails", async () => {
    fake.boostFaults = ["no-end", "no-end", "no-end"];
    fake.calls = [];
    expect((await settle(link.boost(15, 22))).ok).toBe(false);
    expect(fake.calls.filter((c) => c.service === "busy").map((c) => c.data?.busy)).toEqual([true, false]);
  });

  it("works with an older integration that has no busy service", async () => {
    delete (fake.hass.services!.heating_panel as Record<string, unknown>).busy;
    fake.integration.busy = false;
    fake.calls = [];
    expect((await settle(link.setTarget(18))).ok).toBe(true);
    expect(fake.calls.some((c) => c.service === "send")).toBe(true);
  });

  // 23 Oct 2026 on live: after a restart, the open page's service list lacked heating_panel, so it skipped
  // busy and used mqtt.publish; TPI, not told to wait, overwrote every temperature the dial sent.
  it("uses the integration even when the page's service list has gone stale", async () => {
    delete fake.hass.services!.heating_panel;
    fake.calls = [];
    expect((await settle(link.setTarget(18))).ok).toBe(true);
    expect(fake.calls[0]).toEqual({ domain: "heating_panel", service: "busy", data: { topic: TOPIC, busy: true } });
    expect(fake.calls.some((c) => c.domain === "mqtt")).toBe(false);
    expect(fake.calls[fake.calls.length - 1].service).toBe("busy");
  });

  it("falls back to mqtt.publish without the integration (administrators)", async () => {
    await connectWithoutIntegration();
    expect(link.status).toBe("live");
    fake.calls = [];
    await settle(link.setTarget(18));
    expect(fake.calls.every((c) => c.domain === "mqtt" || c.domain === "heating_panel")).toBe(true);
    expect(fake.calls.filter((c) => c.domain === "heating_panel" && c.service === "send").length).toBe(
      fake.calls.filter((c) => c.domain === "mqtt").length,
    );
    expect(fake.calls).toContainEqual({
      domain: "mqtt",
      service: "publish",
      data: { topic: `${TOPIC}/set`, payload: JSON.stringify({ occupied_heating_setpoint: 18 }) },
    });
  });

  it("says the integration is needed when mqtt.publish is refused", async () => {
    await connectWithoutIntegration(() => Promise.reject({ code: "unauthorized", message: "Unauthorized" }));
    expect(link.status).toBe("no-integration");
  });
});

describe("telling boost and away apart", () => {
  const boosting = (setpoint: number, minutes: number) => ({
    system_mode: "emergency_heating",
    temperature_setpoint_hold: true,
    temperature_setpoint_hold_duration: minutes,
    occupied_heating_setpoint: setpoint,
  });

  it.each([
    [22, 30, "boost"],
    [14, 30, "away"],
    [22, 400, "away"],
    [16, 60, "away"],
  ])("%d° for %d min is %s", async (setpoint, minutes, mode) => {
    fake.external(boosting(setpoint, minutes));
    await vi.advanceTimersByTimeAsync(100);
    expect(link.mode).toBe(mode);
  });
});

describe("boost", () => {
  it("is one message in zigbee2mqtt's documented order, from Schedule", async () => {
    expect((await settle(link.boost(15, 22))).ok).toBe(true);
    expect(fake.sets).toHaveLength(1);
    expect(Object.keys(fake.sets[0])).toEqual(BOOST_KEYS);
    expect(fake.sets[0]).toMatchObject({ system_mode: "emergency_heating", temperature_setpoint_hold_duration: 15, occupied_heating_setpoint: 22 });
    expect(link.mode).toBe("boost");
    expect(fake.state.temperature_setpoint_hold_duration).toBeLessThanOrEqual(15);
  });

  it("goes to Schedule first when a hold is on, so the length latches", async () => {
    await settle(link.manual(18));
    fake.sets = [];
    expect((await settle(link.boost(15, 22))).ok).toBe(true);
    expect(fake.sets[0]).toEqual(SCHEDULE);
    expect(isBoostMessage(fake.sets[1])).toBe(true);
    expect(fake.state.temperature_setpoint_hold_duration).toBeLessThanOrEqual(15);
  });

  it.each(["no-end", "zero", "lost"] as const)("tries again when the receiver loses the message (%s)", async (fault) => {
    fake.boostFaults = [fault];
    expect((await settle(link.boost(15, 22))).ok).toBe(true);
    expect(fake.sets.filter(isBoostMessage)).toHaveLength(2);
    // Between the tries, it went back to Schedule.
    expect(fake.sets).toContainEqual(SCHEDULE);
    expect(link.mode).toBe("boost");
    expect(fake.state.temperature_setpoint_hold_duration).toBeGreaterThan(0);
    expect(fake.state.temperature_setpoint_hold_duration).toBeLessThanOrEqual(15);
  });

  it("gives up after three tries and leaves the heating on its schedule, never boosting without an end", async () => {
    fake.boostFaults = ["no-end", "no-end", "no-end"];
    const result = await settle(link.boost(15, 22));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(CommandError);
    expect(result.error.message).toMatch(/didn't take the boost length/);
    expect(result.error.message).toMatch(/back on its schedule/);
    expect(fake.sets.filter(isBoostMessage)).toHaveLength(3);
    expect(fake.state).toMatchObject({ system_mode: "heat", temperature_setpoint_hold: false });
  });

  it("counts down and ends by itself", async () => {
    await settle(link.boost(5, 22));
    expect(link.minutesLeft).toBe(4);
    await vi.advanceTimersByTimeAsync(6 * 60_000);
    expect(link.mode).toBe("schedule");
  });

  it("refuses a second command while one is being sent", async () => {
    const first = settle(link.boost(15, 22));
    await expect(link.toSchedule()).rejects.toThrow(/Still sending/);
    expect((await first).ok).toBe(true);
  });

  it("warns when the receiver drops the boost soon after", async () => {
    await settle(link.boost(15, 22));
    fake.external({ ...SCHEDULE, temperature_setpoint_hold_duration: 0, occupied_heating_setpoint: fake.scheduled() });
    await vi.advanceTimersByTimeAsync(100);
    expect(link.unexpected).toMatch(/changed to Schedule/);
  });
});

describe("away", () => {
  const todayAt6pm = () => new Date(2026, 9, 10, 18, 0);

  it("is a low boost lasting until the chosen time", async () => {
    vi.setSystemTime(new Date(2026, 9, 10, 7, 35, 54));
    expect((await settle(link.away(todayAt6pm(), 14))).ok).toBe(true);
    const sent = fake.sets.find(isBoostMessage)!;
    // 18:00 is 624.1 minutes away: rounded, so the end lands within half a minute of it.
    expect(sent).toMatchObject({ temperature_setpoint_hold_duration: 624, occupied_heating_setpoint: 14 });
    expect(link.mode).toBe("away");
  });

  it("shows the end as the chosen time, though the receiver's count reads a minute low", async () => {
    vi.setSystemTime(new Date(2026, 9, 10, 7, 35, 54));
    await settle(link.away(todayAt6pm(), 14));
    // The count dropped to 623 seconds after the start.
    expect(fake.state.temperature_setpoint_hold_duration).toBe(623);
    const ends = link.holdEnds!;
    expect(Math.abs(ends - todayAt6pm().getTime())).toBeLessThan(60_000);
    expect(Math.round(ends / 60_000) * 60_000).toBe(todayAt6pm().getTime());
  });

  it("keeps the same end time when zigbee2mqtt repeats its cached count", async () => {
    await settle(link.away(todayAt6pm(), 14));
    const ends = link.holdEnds;
    // A temperature report ten seconds later carries the same, cached count.
    await vi.advanceTimersByTimeAsync(10_000);
    fake.external({ local_temperature: 17.9 });
    await vi.advanceTimersByTimeAsync(100);
    expect(link.holdEnds).toBe(ends);
  });

  it("recalculates the length on a second try, so it still ends on time", async () => {
    fake.boostFaults = ["zero"];
    expect((await settle(link.away(todayAt6pm(), 14))).ok).toBe(true);
    const [first, second] = fake.sets.filter(isBoostMessage);
    // Each try works the length out from the time it's sent, so a later try is never longer.
    const later = second.temperature_setpoint_hold_duration as number;
    expect(later).toBeLessThanOrEqual(first.temperature_setpoint_hold_duration as number);
    expect(Math.abs(link.holdEnds! - todayAt6pm().getTime())).toBeLessThan(60_000);
  });

  // 10 Oct, 20:04-20:13: the receiver counted down without a word, and zigbee2mqtt's next messages
  // still carried the count from when Away was set.
  it("keeps the end steady while old counts keep arriving", async () => {
    await settle(link.away(todayAt6pm(), 14));
    const ends = link.holdEnds!;
    for (let minute = 0; minute < 10; minute++) {
      await vi.advanceTimersByTimeAsync(60_000);
      fake.repeatCache({ local_temperature: 17.8 + minute / 100 });
      await vi.advanceTimersByTimeAsync(100);
      expect(link.holdEnds).toBe(ends);
    }
    // Even a count older than any it's seen can't push the end later.
    fake.repeatCache({ temperature_setpoint_hold_duration: 630 });
    await vi.advanceTimersByTimeAsync(100);
    expect(link.holdEnds).toBe(ends);
  });

  it("shows the chosen end on a panel opened later, after a silent countdown", async () => {
    await settle(link.away(todayAt6pm(), 14));
    await vi.advanceTimersByTimeAsync(8 * 60_000);
    link.stop();
    link = new ReceiverLink(() => fake.hass, TOPIC, () => undefined);
    await link.start();
    await vi.advanceTimersByTimeAsync(2000);
    expect(link.mode).toBe("away");
    expect(Math.abs(link.holdEnds! - todayAt6pm().getTime())).toBeLessThan(60_000);
  });

  it("corrects the end when coming back to the panel", async () => {
    await settle(link.away(todayAt6pm(), 14));
    const ends = link.holdEnds!;
    await vi.advanceTimersByTimeAsync(30 * 60_000);
    link.requestState();
    await vi.advanceTimersByTimeAsync(2000);
    expect(link.holdEnds).toBeLessThanOrEqual(ends);
    expect(Math.abs(link.holdEnds! - todayAt6pm().getTime())).toBeLessThan(60_000);
  });

  // zigbee2mqtt 2.8 and later refuse a longer hold, and drop longer counts from the receiver's reports.
  it("refuses more than 24 hours", async () => {
    await expect(link.away(new Date(2026, 9, 11, 18, 0), 14)).rejects.toThrow(/more than 24 hours.*holiday on the remote/);
    expect(fake.sets).toHaveLength(0);
    expect((await settle(link.away(new Date(2026, 9, 11, 7, 30), 14))).ok).toBe(true);
  });

  it("refuses a time in the past", async () => {
    await expect(link.away(new Date(2026, 9, 10, 7, 0), 14)).rejects.toThrow(/future/);
    expect(fake.sets).toHaveLength(0);
  });
});

describe("other modes", () => {
  it("goes back to the schedule", async () => {
    await settle(link.manual(18));
    expect((await settle(link.toSchedule())).ok).toBe(true);
    expect(fake.sets[fake.sets.length - 1]).toEqual(SCHEDULE);
    expect(link.mode).toBe("schedule");
  });

  it("Manual holds with no end, then sets the temperature (the hold resets it)", async () => {
    expect((await settle(link.manual(18))).ok).toBe(true);
    // "No end" goes before the hold, as a raw write: zigbee2mqtt 2.8 and later refuse 65535 by name.
    expect(fake.sets[0]).toEqual({ system_mode: "heat", ...holdLengthWrite(NO_END), temperature_setpoint_hold: true });
    expect(Object.keys(fake.sets[0])).toEqual(["system_mode", "write", "temperature_setpoint_hold"]);
    expect(fake.sets[1]).toEqual({ occupied_heating_setpoint: 18 });
    expect(fake.state.temperature_setpoint_hold_duration).toBe(NO_END);
    // ...which zigbee2mqtt then reports as null.
    expect(link.report.temperature_setpoint_hold_duration).toBeNull();
    expect(link.mode).toBe("manual");
    expect(link.holdEnds).toBeNull();
    expect(fake.state.occupied_heating_setpoint).toBe(18);
  });

  it("Manual from a temporary change goes to Schedule first, or the hold would keep counting down", async () => {
    // A temperature written over zigbee2mqtt on Schedule: a hold until the next slot (21 Oct 2026).
    fake.external({ temperature_setpoint_hold: true, temperature_setpoint_hold_duration: 516, occupied_heating_setpoint: 21 });
    await vi.advanceTimersByTimeAsync(100);
    expect((await settle(link.manual(18))).ok).toBe(true);
    expect(fake.sets[0]).toEqual(SCHEDULE);
    expect(fake.state.temperature_setpoint_hold_duration).toBe(NO_END);
    expect(link.mode).toBe("manual");
  });

  it("says so when Manual came with an end time", async () => {
    // The receiver took the hold but not "no end", as a boost sometimes loses its length.
    const original = fake.hass.callService;
    fake.hass.callService = async (domain, service, data) => {
      const payload = data?.payload as Record<string, unknown> | undefined;
      if (payload && "write" in payload) {
        const { write: _, ...rest } = payload;
        return original(domain, service, { ...data, payload: { ...rest, temperature_setpoint_hold_duration: 30 } });
      }
      return original(domain, service, data);
    };
    const result = await settle(link.manual(18));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/with an end time/);
  });

  it("Off sets mode off, hold off and 1° in one message, as the remote does", async () => {
    expect((await settle(link.off())).ok).toBe(true);
    expect(fake.sets).toEqual([{ system_mode: "off", temperature_setpoint_hold: false, occupied_heating_setpoint: 1 }]);
    expect(link.mode).toBe("off");
  });

  it("Off sends 1° again if the receiver kept the old temperature", async () => {
    await settle(link.manual(20));
    fake.dropSetpoints = 1;
    fake.sets = [];
    expect((await settle(link.off())).ok).toBe(true);
    expect(fake.sets[fake.sets.length - 1]).toEqual({ occupied_heating_setpoint: 1 });
    expect(fake.state.occupied_heating_setpoint).toBe(1);
  });

  it("a temperature change on Schedule is temporary", async () => {
    expect((await settle(link.setTarget(21))).ok).toBe(true);
    expect(fake.sets).toEqual([{ occupied_heating_setpoint: 21 }]);
    expect(link.mode).toBe("override");
  });

  it("sends a temperature twice if the receiver didn't take it the first time", async () => {
    await settle(link.manual(18));
    fake.dropSetpoints = 1;
    fake.sets = [];
    expect((await settle(link.setTarget(19))).ok).toBe(true);
    expect(fake.sets).toEqual([{ occupied_heating_setpoint: 19 }, { occupied_heating_setpoint: 19 }]);
  });

  it("won't change the temperature while Off", async () => {
    await settle(link.off());
    await expect(link.setTarget(20)).rejects.toThrow(/Choose Schedule/);
  });
});

// SLR2, SLR2b, SLR2c: zigbee2mqtt names every property after the heating or hot water endpoint.
describe("a dual-channel receiver (heating only)", () => {
  beforeEach(async () => {
    link.stop();
    fake = new FakeReceiver(true);
    link = new ReceiverLink(() => fake.hass, TOPIC, () => undefined);
    await link.start();
    await vi.advanceTimersByTimeAsync(1000);
  });

  it("reads the heating's state and week, not the stale plain names or the hot water", () => {
    expect(link.dualChannel).toBe(true);
    expect(link.status).toBe("live");
    expect(link.scheduleDays).toBe(7);
    expect(link.mode).toBe("schedule");
    expect(link.report.occupied_heating_setpoint).toBe(19);
  });

  it("sends every command to the heating endpoint", async () => {
    fake.sets = [];
    expect((await settle(link.boost(15, 22))).ok).toBe(true);
    expect(fake.sets[0]).toMatchObject({ system_mode_heat: "emergency_heating", temperature_setpoint_hold_duration_heat: 15 });
    expect(link.mode).toBe("boost");
    expect((await settle(link.manual(18))).ok).toBe(true);
    expect(fake.sets).toContainEqual({ system_mode_heat: "heat", write_heat: holdLengthWrite(NO_END).write, temperature_setpoint_hold_heat: true });
    expect(link.mode).toBe("manual");
    expect(link.target).toBe(18);
    expect((await settle(link.off())).ok).toBe(true);
    expect(link.mode).toBe("off");
    expect((await settle(link.toSchedule())).ok).toBe(true);
    expect(link.mode).toBe("schedule");
  });

  it("saves the heating's schedule", async () => {
    const week = { monday: [{ time: 7 * 60, setpoint: 20 }] };
    expect((await settle(link.saveSchedule(week, ["monday"]))).ok).toBe(true);
    expect(fake.sets.some((p) => "weekly_schedule_heat" in p)).toBe(true);
    expect(fake.week.monday?.[0]).toEqual({ time: 7 * 60, setpoint: 20 });
  });
});

describe("saving the schedule", () => {
  it("sends days with the same settings in one message, padded to six slots, and checks them", async () => {
    const day = [
      { time: 7 * 60, setpoint: 20 },
      { time: 9 * 60, setpoint: 1 },
    ];
    const week = { monday: day, tuesday: day, saturday: [{ time: 8 * 60, setpoint: 19 }] };
    expect((await settle(link.saveSchedule(week, ["monday", "tuesday", "saturday"]))).ok).toBe(true);
    const writes = fake.sets.filter((p) => p.weekly_schedule);
    expect(writes).toHaveLength(2);
    const first = writes[0].weekly_schedule as { dayofweek: string[]; transitions: Array<{ heatSetpoint: number; transitionTime: string }> };
    expect(first.dayofweek).toEqual(["monday", "tuesday"]);
    expect(first.transitions).toHaveLength(6);
    expect(first.transitions[0]).toEqual({ heatSetpoint: 20, transitionTime: "07:00" });
    expect(link.week.monday?.[0]).toEqual({ time: 7 * 60, setpoint: 20 });
  });

  it("says so when the receiver didn't keep a day", async () => {
    // The receiver ignores schedule writes.
    const original = fake.hass.callService;
    fake.hass.callService = async (domain, service, data) =>
      data?.command === "set" && JSON.stringify(data.payload).includes("weekly_schedule")
        ? undefined
        : original(domain, service, data);
    const result = await settle(link.saveSchedule({ monday: [{ time: 7 * 60, setpoint: 20 }] }, ["monday"]));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/didn't confirm/);
  });
});

describe("entity mode (for users who aren't administrators)", () => {
  it("follows the sensor's attributes, and only counts changes as hearing from the receiver", async () => {
    link.stop();
    let push: (msg: unknown) => void = () => undefined;
    const hass = {
      ...fake.hass,
      states: { "sensor.heating_panel_receiver": { entity_id: "sensor.heating_panel_receiver", state: "ok", attributes: {}, last_changed: "" } },
      connection: {
        subscribeMessage: async <T>(cb: (msg: T) => void) => {
          push = cb as (msg: unknown) => void;
          return async () => undefined;
        },
      },
    };
    link = new ReceiverLink(() => hass, TOPIC, () => undefined, "sensor.heating_panel_receiver");
    await link.start();
    push({ a: { "sensor.heating_panel_receiver": { s: "ok", a: { system_mode: "off" } } } });
    expect(link.mode).toBe("off");
    expect(link.status).toBe("connecting");
    push({ c: { "sensor.heating_panel_receiver": { "+": { a: { system_mode: "heat", temperature_setpoint_hold: false } } } } });
    expect(link.status).toBe("live");
    expect(link.report.system_mode).toBe("heat");
  });

  it("says when the sensor is missing", async () => {
    link.stop();
    link = new ReceiverLink(() => fake.hass, TOPIC, () => undefined, "sensor.heating_panel_receiver");
    await link.start();
    expect(link.status).toBe("no-entity");
  });
});
