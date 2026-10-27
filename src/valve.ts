/**
 * How far a radiator's valve is open, and whether any heat is reaching it.
 *
 * From its position sensor when it has one. Otherwise from what the valve says it's doing (`hvac_action`):
 * the SONOFF TRV-ZBT drives its valve to its heating position while "heating" and to its idle position while
 * "idle", but doesn't report how far. Only when it says neither is it worked out from the temperatures.
 *
 * A valve can be open with the boiler off: the room is below the valve's target, but the receiver isn't calling
 * for heat (its own room is warm enough). That's shown as open, with "boiler off", rather than as closed.
 */
export interface Valve {
  /** 0 to 100, or null when it can't be told. */
  pct: number | null;
  /** Where `pct` came from: the position sensor, the valve's own heating/idle state, or the temperatures. */
  source: "sensor" | "reported" | "estimated";
  /** Open, but the boiler isn't heating, so no heat is reaching the radiator. */
  noHeat: boolean;
}

export function valveOpening(opts: {
  /** The position sensor's reading, or null without one (or when it has no number). */
  sensor: number | null;
  hasSensor: boolean;
  boilerHeating: boolean;
  /** The valve's climate state ("heat", "off"…). */
  state: string | undefined;
  /** The valve's climate `hvac_action` ("heating", "idle"…), if it reports one. */
  action?: string;
  current: number | null;
  target: number | null;
}): Valve {
  const make = (pct: number | null, source: Valve["source"]): Valve => ({
    pct,
    source,
    noHeat: pct !== null && pct > 0 && !opts.boilerHeating,
  });
  if (opts.hasSensor) return make(opts.sensor, "sensor");
  if (opts.state === "off") return make(0, opts.action === undefined ? "estimated" : "reported");
  if (opts.action === "heating") return make(100, "reported");
  if (opts.action === "idle" || opts.action === "off") return make(0, "reported");
  if (!opts.boilerHeating) return make(0, "estimated");
  if (opts.current === null || opts.target === null) return make(null, "estimated");
  return make(opts.current < opts.target ? 100 : 0, "estimated");
}

/** "45% open", "Open", "Open · boiler off", "Closed" or "–". */
export function valveText(v: Valve): string {
  if (v.pct === null) return "–";
  const open = v.source === "sensor" ? `${v.pct}% open` : v.pct > 0 ? "Open" : "Closed";
  return v.noHeat ? `${open} · boiler off` : open;
}

/** The bar's tooltip. */
export function valveTitle(v: Valve): string {
  if (v.pct === null) return "Valve position unknown";
  const state = v.pct > 0 ? "open" : "closed";
  const how =
    v.source === "sensor"
      ? `Valve ${v.pct}% open`
      : v.source === "reported"
        ? `Valve ${state} (as the valve reports it; it doesn't say how far)`
        : `Valve ${state} (worked out from the temperatures; this valve doesn't report its position)`;
  return v.noHeat ? `${how}. The boiler isn't heating, so no heat is reaching this radiator.` : how;
}
