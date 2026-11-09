/**
 * What zigbee2mqtt does to the receiver's properties on the way through, in one place. The integration's z2m.py
 * follows the same rules. See docs/receiver-protocol.md ("zigbee2mqtt 2.8 and later", "Dual-channel receivers").
 */

/** The receiver's properties the panel reads and writes, as zigbee2mqtt names them on a heating-only receiver. */
const PROPERTIES = [
  "system_mode",
  "running_state",
  "occupied_heating_setpoint",
  "local_temperature",
  "temperature_setpoint_hold",
  "temperature_setpoint_hold_duration",
  "weekly_schedule",
] as const;

/**
 * A dual-channel receiver (SLR2, SLR2b, SLR2c) has a heating and a hot water endpoint, and zigbee2mqtt names
 * every property after its endpoint: `system_mode_heat`, `system_mode_water`.
 */
const HEAT = "_heat";

/** Hold length meaning "no end". */
export const NO_END = 65535;

/**
 * The longest hold zigbee2mqtt 2.8 and later will write or report (minutes). It checks values against the Zigbee
 * spec's range for the hold length (0-1440), refusing a longer write ("requires max of 1440") and dropping a longer
 * report without a word.
 */
export const MAX_HOLD = 1440;

/** Whether a report comes from a dual-channel receiver. */
export function isDualChannel(p: Record<string, unknown>): boolean {
  return PROPERTIES.some((k) => `${k}${HEAT}` in p);
}

/**
 * A report with the heating-only names. From a dual-channel receiver, that's the heating endpoint's values: hot
 * water is left out, and so are the plain names, which only hold whatever was last written without an endpoint.
 */
export function fromZ2m(p: Record<string, unknown>): Record<string, unknown> {
  if (!isDualChannel(p)) return p;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
    if (k.endsWith(HEAT)) {
      const name = k.slice(0, -HEAT.length);
      if ((PROPERTIES as readonly string[]).includes(name)) out[name] = v;
    } else if (!k.endsWith("_water") && !(PROPERTIES as readonly string[]).includes(k)) out[k] = v;
  }
  return out;
}

/** A /set or /get payload for the heating endpoint: zigbee2mqtt sends a key ending `_heat` there. */
export function toZ2m(p: Record<string, unknown>, dual: boolean): Record<string, unknown> {
  return dual ? Object.fromEntries(Object.entries(p).map(([k, v]) => [`${k}${HEAT}`, v])) : p;
}

/**
 * The hold length, as zigbee2mqtt's generic `write`: by attribute number (0x0024, a 16-bit number), which it
 * doesn't check, so "no end" gets through. In a /set it takes its place in the order like any other key.
 */
export function holdLengthWrite(minutes: number): Record<string, unknown> {
  return { write: { cluster: "hvacThermostat", payload: { "36": { value: minutes, type: 0x21 } } } };
}

/** "No end": zigbee2mqtt 2.6.1 and later report 65535 as null (the Zigbee "no value"), older ones as 65535. */
export function isNoEnd(v: unknown): v is null | typeof NO_END {
  return v === null || v === NO_END;
}
