import { LitElement, html, css, svg, nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";

// The arc runs 270° clockwise from bottom-left to bottom-right, leaving a gap at the bottom
// for the − and + buttons. Angles are SVG degrees: 0 = right, 90 = down.
const START = 135;
const SWEEP = 270;
const C = 120; // centre of the 240 × 240 viewBox
const R = 100;

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const point = (deg: number, r = R) => {
  const a = (deg * Math.PI) / 180;
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
};
const arc = (fromDeg: number, toDeg: number) => {
  const a = point(fromDeg);
  const b = point(toDeg);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
};

export const tempText = (v: number): string => `${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)}°`;

/**
 * How far a temperature sits between "cool" and "warm", for the subtle colour cue: setback
 * temperatures (15° and below) are cool, comfortable ones (19° and up) fully warm.
 */
export const warmth = (v: number): number => Math.round(clamp((v - 15) / 4) * 100);

/** Colour for a temperature: cool blue, through a neutral sand, to warm terracotta (never via pink). */
export function tempColor(v: number): string {
  const p = warmth(v);
  return p <= 50
    ? `color-mix(in oklab, var(--mild) ${p * 2}%, var(--cool))`
    : `color-mix(in oklab, var(--warm) ${(p - 50) * 2}%, var(--mild))`;
}

const iconMinus = html`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M6 12h12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
</svg>`;
const iconPlus = html`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M6 12h12M12 6v12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
</svg>`;

/**
 * Round thermostat dial. Shows the target on a 270° arc with the room temperature as a small
 * marker, and the numbers in the middle. When not `readonly`, drag the ring or use − / + and it
 * fires `dial-change` ({ value }) 600 ms after the last adjustment.
 */
export class HeatingDial extends LitElement {
  @property({ type: Number }) min = 5;
  @property({ type: Number }) max = 32;
  @property({ type: Number }) step = 0.5;
  /** Target temperature; null when not known yet. */
  @property({ attribute: false }) target: number | null = null;
  /** Room temperature. */
  @property({ attribute: false }) current: number | null = null;
  /** Show "Off" instead of a target. */
  @property({ type: Boolean }) off = false;
  /** Amber: the boiler is firing or a boost is running. */
  @property({ type: Boolean }) active = false;
  @property({ type: Boolean }) readonly = false;
  /** Small line above the number, e.g. the mode. */
  @property() label = "";
  /** Line under the room temperature, e.g. "Until 22:00". */
  @property() note = "";
  /** Show the note in amber, for things that need attention. */
  @property({ type: Boolean }) attention = false;

  /** The value being chosen, shown until the new target comes back. */
  @state() private pending: number | null = null;

  private commitTimer?: number;
  private settleTimer?: number;
  private dragging = false;

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this.commitTimer);
    window.clearTimeout(this.settleTimer);
    this.dragging = false;
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    // The device confirmed what was chosen: stop showing the pending value.
    if (changed.has("target") && this.pending !== null && this.target === this.pending) this.pending = null;
  }

  private get interactive(): boolean {
    return !this.readonly && !this.off && this.target !== null;
  }

  private snap(v: number): number {
    return clamp(Math.round(v / this.step) * this.step, this.min, this.max);
  }

  private choose(v: number): void {
    this.pending = this.snap(v);
    window.clearTimeout(this.commitTimer);
    if (this.dragging) return;
    this.commitTimer = window.setTimeout(() => this.commit(), 600);
  }

  private commit(): void {
    if (this.pending === null || this.pending === this.target) {
      this.pending = null;
      return;
    }
    this.dispatchEvent(
      new CustomEvent("dial-change", { detail: { value: this.pending }, bubbles: true, composed: true }),
    );
    // If the device never confirms, go back to showing what it reports.
    window.clearTimeout(this.settleTimer);
    this.settleTimer = window.setTimeout(() => (this.pending = null), 15_000);
  }

  private nudge(dir: 1 | -1): void {
    if (!this.interactive) return;
    this.choose((this.pending ?? this.target ?? this.min) + dir * this.step);
  }

  private valueAt(e: PointerEvent): number | null {
    const box = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * 240 - C;
    const y = ((e.clientY - box.top) / box.height) * 240 - C;
    let rel = ((Math.atan2(y, x) * 180) / Math.PI - START + 720) % 360;
    // In the gap at the bottom: snap to whichever end is nearer.
    if (rel > SWEEP) rel = rel < SWEEP + (360 - SWEEP) / 2 ? SWEEP : 0;
    return this.min + (rel / SWEEP) * (this.max - this.min);
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.interactive) return;
    const box = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * 240 - C;
    const y = ((e.clientY - box.top) / box.height) * 240 - C;
    // Only the ring itself starts a drag, so touching the numbers does nothing.
    if (Math.abs(Math.hypot(x, y) - R) > 28) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    this.dragging = true;
    const v = this.valueAt(e);
    if (v !== null) this.choose(v);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging) return;
    const v = this.valueAt(e);
    if (v !== null) this.choose(v);
  };

  private onPointerUp = (): void => {
    if (!this.dragging) return;
    this.dragging = false;
    this.commitTimer = window.setTimeout(() => this.commit(), 600);
  };

  private onKey = (e: KeyboardEvent): void => {
    if (e.key === "ArrowUp" || e.key === "ArrowRight") this.nudge(1);
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") this.nudge(-1);
    else return;
    e.preventDefault();
  };

  protected render() {
    const shown = this.pending ?? this.target;
    const frac = shown === null || this.off ? null : clamp((shown - this.min) / (this.max - this.min));
    const end = frac === null ? null : START + SWEEP * frac;
    const thumb = end === null ? null : point(end);
    const cur =
      this.current === null ? null : point(START + SWEEP * clamp((this.current - this.min) / (this.max - this.min)));
    const tone = this.active ? "var(--porch)" : tempColor(shown ?? this.min);

    return html`
      <div class="dial ${this.active ? "active" : ""}" style=${`--tone: ${tone}`}>
        <svg
          viewBox="0 0 240 240"
          class=${this.interactive ? "interactive" : ""}
          @pointerdown=${this.onPointerDown}
          @pointermove=${this.onPointerMove}
          @pointerup=${this.onPointerUp}
          @pointercancel=${this.onPointerUp}
        >
          <path class="track" d=${arc(START, START + SWEEP)} />
          ${end !== null && end - START > 0.5 ? svg`<path class="level" d=${arc(START, end)} />` : nothing}
          ${cur ? svg`<circle class="room" cx=${cur.x} cy=${cur.y} r="4" />` : nothing}
          ${thumb
            ? svg`<circle
                class="thumb"
                cx=${thumb.x}
                cy=${thumb.y}
                r="11"
                role="slider"
                tabindex=${this.interactive ? "0" : "-1"}
                aria-label="Target temperature"
                aria-valuemin=${this.min}
                aria-valuemax=${this.max}
                aria-valuenow=${shown ?? nothing}
                aria-readonly=${this.interactive ? "false" : "true"}
                @keydown=${this.onKey}
              />`
            : nothing}
        </svg>
        <div class="center" aria-live="polite">
          <div class="label">${this.label}</div>
          <div class="value">${this.off ? "Off" : shown === null ? "–" : tempText(shown)}</div>
          <div class="room-text">${this.current === null ? "" : `Room ${tempText(this.current)}`}</div>
          <div class="note ${this.attention ? "attention" : ""}">${this.note}</div>
        </div>
        <button
          class="step minus"
          ?disabled=${!this.interactive}
          title="Lower"
          aria-label="Lower the temperature"
          @click=${() => this.nudge(-1)}
        >
          ${iconMinus}
        </button>
        <button
          class="step plus"
          ?disabled=${!this.interactive}
          title="Raise"
          aria-label="Raise the temperature"
          @click=${() => this.nudge(1)}
        >
          ${iconPlus}
        </button>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    .dial {
      position: relative;
      width: min(100%, 320px);
      aspect-ratio: 1;
      margin: 0 auto;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    svg.interactive {
      touch-action: none;
    }
    .track,
    .level {
      fill: none;
      stroke-width: 14;
      stroke-linecap: round;
    }
    .track {
      stroke: var(--slate);
    }
    .level {
      stroke: var(--tone);
    }
    .active .level {
      filter: drop-shadow(0 0 6px color-mix(in srgb, var(--porch) 55%, transparent));
    }
    .room {
      fill: var(--mist);
    }
    .thumb {
      fill: var(--mist);
      stroke: var(--dusk);
      stroke-width: 3;
      outline: none;
    }
    .interactive .thumb {
      cursor: grab;
    }
    .thumb:focus-visible {
      stroke: var(--porch);
    }
    .center {
      position: absolute;
      inset: 18% 18% 24%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      text-align: center;
      pointer-events: none;
    }
    .label {
      min-height: 1.3em;
      color: var(--haze);
      font-size: 0.9375rem;
      font-weight: 600;
    }
    .value {
      font-size: clamp(3rem, 15vw, 4.25rem);
      font-weight: 600;
      line-height: 1.05;
      letter-spacing: -0.02em;
      font-variant-numeric: tabular-nums;
    }
    .room-text {
      min-height: 1.3em;
      color: var(--haze);
      font-size: 0.9375rem;
      font-variant-numeric: tabular-nums;
    }
    .note {
      min-height: 1.3em;
      margin-top: 4px;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .note.attention {
      color: var(--porch);
    }
    button {
      font: inherit;
      color: inherit;
      border: 0;
      cursor: pointer;
    }
    button:focus-visible {
      outline: 3px solid var(--porch);
      outline-offset: 3px;
    }
    .step {
      position: absolute;
      top: calc(89% - 28px);
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--slate);
    }
    .step svg {
      width: 24px;
      height: 24px;
    }
    .step:disabled {
      opacity: 0.35;
      cursor: default;
    }
    .minus {
      left: calc(37.5% - 28px);
    }
    .plus {
      left: calc(62.5% - 28px);
    }
    @media (prefers-reduced-motion: no-preference) {
      .level,
      .thumb {
        transition: stroke 0.2s;
      }
    }
  `;
}

// Home Assistant can load a new version of the panel into a page that already has the old one
// (e.g. after a restart with a bumped ?v=). Defining a name twice throws, so only define it once;
// the new version takes over on the next full reload.
if (!customElements.get("heating-dial")) customElements.define("heating-dial", HeatingDial);

declare global {
  interface HTMLElementTagNameMap {
    "heating-dial": HeatingDial;
  }
}
