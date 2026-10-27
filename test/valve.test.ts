import { describe, expect, it } from "vitest";
import { valveOpening, valveText, valveTitle } from "../src/valve";

const base = { sensor: null, hasSensor: false, boilerHeating: true, state: "heat", current: 19.8, target: 22 };

describe("a valve with a position sensor", () => {
  it("shows what the sensor says", () => {
    const v = valveOpening({ ...base, hasSensor: true, sensor: 45 });
    expect(v).toEqual({ pct: 45, source: "sensor", noHeat: false });
    expect(valveText(v)).toBe("45% open");
  });

  it("says when no heat is reaching it", () => {
    expect(valveText(valveOpening({ ...base, hasSensor: true, sensor: 45, boilerHeating: false }))).toBe(
      "45% open · boiler off",
    );
  });

  it("says it doesn't know when the sensor has no reading", () => {
    expect(valveText(valveOpening({ ...base, hasSensor: true, sensor: null }))).toBe("–");
  });
});

describe("a valve that says whether it's heating (SONOFF TRV-ZBT)", () => {
  it("is open while it's heating", () => {
    const v = valveOpening({ ...base, action: "heating" });
    expect(v).toEqual({ pct: 100, source: "reported", noHeat: false });
    expect(valveText(v)).toBe("Open");
    expect(valveTitle(v)).toContain("as the valve reports it");
  });

  // 22 Oct 2026: Office back at 17.6° set to 20°, valve open, while the receiver's own room was warm enough.
  it("is open with the boiler off, and says so", () => {
    const v = valveOpening({ ...base, action: "heating", boilerHeating: false, current: 17.6, target: 20 });
    expect(v).toEqual({ pct: 100, source: "reported", noHeat: true });
    expect(valveText(v)).toBe("Open · boiler off");
    expect(valveTitle(v)).toContain("no heat is reaching this radiator");
  });

  it("is closed while it's idle, whatever the temperatures", () => {
    const v = valveOpening({ ...base, action: "idle" });
    expect(v).toEqual({ pct: 0, source: "reported", noHeat: false });
    expect(valveText(v)).toBe("Closed");
  });

  it("is closed when it's off", () => {
    expect(valveOpening({ ...base, state: "off", action: "off" })).toEqual({ pct: 0, source: "reported", noHeat: false });
  });
});

describe("a valve that reports nothing", () => {
  it("is open while the boiler heats a room below its target", () => {
    const v = valveOpening(base);
    expect(v).toEqual({ pct: 100, source: "estimated", noHeat: false });
    expect(valveText(v)).toBe("Open");
    expect(valveTitle(v)).toContain("worked out from the temperatures");
  });

  it("is closed once the room reaches its target", () => {
    expect(valveText(valveOpening({ ...base, current: 22 }))).toBe("Closed");
    expect(valveText(valveOpening({ ...base, current: 22.5 }))).toBe("Closed");
  });

  it("is closed while the boiler isn't heating", () => {
    expect(valveOpening({ ...base, boilerHeating: false }).pct).toBe(0);
  });

  it("is closed when the valve is off", () => {
    expect(valveOpening({ ...base, state: "off" }).pct).toBe(0);
  });

  it("says it doesn't know without both temperatures", () => {
    expect(valveText(valveOpening({ ...base, current: null }))).toBe("–");
    expect(valveText(valveOpening({ ...base, target: null }))).toBe("–");
  });
});
