import { LitElement, html, css, nothing, type PropertyValues, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import "./dial";
import { tempColor, tempText } from "./dial";
import { AWAY_MAX_TEMP, MAX_HOLD, ReceiverLink, type ReceiverMode, type TpiState } from "./receiver";
import { valveOpening, valveText, valveTitle, type Valve } from "./valve";
import {
  DAY_LONG,
  DAY_SHORT,
  DAYS,
  changes,
  dayIndex,
  daySegments,
  isOff,
  nextChange,
  nextSlot,
  padToSlots,
  SLOTS,
  sameDay,
  timeText,
  type Day,
  type NextChange,
  type Transition,
  type WeekSchedule,
} from "./schedule";
import type { HassEntity, HeatingConfig, HomeAssistant, PanelInfo, RadiatorConfig } from "./types";

type View = { kind: "main" } | { kind: "schedule" } | { kind: "settings" } | { kind: "radiator"; index: number };

/**
 * Household settings live in Home Assistant helpers so they're shared by everyone and every device.
 * The panel creates them the first time an administrator saves a setting.
 */
const SETTINGS = {
  minutes: { id: "input_number.heating_panel_boost_minutes", name: "Heating panel boost minutes", min: 5, max: 240, step: 5, unit: "min", icon: "mdi:timer-outline" },
  temperature: { id: "input_number.heating_panel_boost_temperature", name: "Heating panel boost temperature", min: 12, max: 32, step: 0.5, unit: "°C", icon: "mdi:thermometer" },
  away_temperature: { id: "input_number.heating_panel_away_temperature", name: "Heating panel away temperature", min: 5, max: 16, step: 0.5, unit: "°C", icon: "mdi:airplane" },
} as const;
type SettingKey = keyof typeof SETTINGS;

const BOOST_LENGTHS = [15, 30, 45, 60, 90, 120];
const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** What the main screen shows for the receiver. */
interface ReceiverView {
  mode: ReceiverMode;
  target: number | null;
  off: boolean;
  current: number | null;
  heating: boolean;
}

/** A change point being edited on the schedule screen. */
interface PointEdit {
  day: number;
  /** Index in the day's change points, or null for a new one. */
  index: number | null;
  time: number;
  setpoint: number;
  off: boolean;
}

const OFF_SETPOINT = 1;
/** Modes where the dial sets the temperature (on Schedule only if `override` isn't switched off). */
const DIAL_MODES: ReceiverMode[] = ["manual", "boost", "away", "schedule", "override"];
const SCHEDULE_MIN = 7;
const SCHEDULE_MAX = 28;
const BACKUP_KEY = "heating-panel:schedule-backup";
const cloneWeek = (w: WeekSchedule): WeekSchedule => JSON.parse(JSON.stringify(w));

const MODE_LABEL: Record<ReceiverMode, string> = {
  off: "Off",
  schedule: "Schedule",
  manual: "Manual",
  override: "Until next change",
  boost: "Boost",
  away: "Away",
  unknown: "",
};

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

const iconBack = html`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

const iconChevron = html`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

const iconFlame = html`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.6 2.2-4.8.2 1.6 1 2.6 2 3C11 9 11 6 12 3z" fill="currentColor" />
</svg>`;

const iconMinus = html`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M6 12h12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
</svg>`;

const iconPlus = html`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M6 12h12M12 6v12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
</svg>`;

/** "30 min", "1 h", "1 h 30 min". */
const minutesText = (m: number): string =>
  m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} h`;

const errorText = (err: unknown): string =>
  err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err);

const iconSettings = html`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M4 7h9M19 7h1M4 17h3M13 17h7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  <circle cx="16" cy="7" r="2.5" fill="none" stroke="currentColor" stroke-width="2" />
  <circle cx="10" cy="17" r="2.5" fill="none" stroke="currentColor" stroke-width="2" />
</svg>`;

const iconPlane = html`<svg viewBox="0 0 24 24" aria-hidden="true" class="plane">
  <path d="M10.5 21l1.5-1 0-5 8 2.5V15l-8-5V4.5a1.5 1.5 0 0 0-3 0V10l-8 5v2.5L9 15v5l1.5 1z" fill="currentColor" transform="translate(1.5 0)" />
</svg>`;

const iconBattery = html`<svg viewBox="0 0 24 24" aria-hidden="true">
  <rect x="3" y="7" width="16" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2" />
  <path d="M21 10v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  <rect x="5.5" y="9.5" width="3" height="5" rx="0.5" fill="currentColor" />
</svg>`;

export class HeatingPanel extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) panel!: PanelInfo<HeatingConfig>;
  @property({ type: Boolean }) narrow = false;

  @state() private view: View = { kind: "main" };
  @state() private kiosk = false;
  @state() private scheduleDay = dayIndex(new Date());
  /** Bumped every 30 s so countdowns and "next change" stay current. */
  @state() private tick = 0;
  @state() private boostOpen = false;
  @state() private boostMinutes = 15;
  @state() private boostTemp = 22;
  @state() private awayOpen = false;
  /** Return date (local midnight) and time (minutes after midnight) chosen in the Away sheet. */
  @state() private awayDay = 0;
  @state() private awayTime = 18 * 60;
  @state() private awayTemp = 14;
  @state() private toast = "";
  @state() private toastError = false;
  /** Values just chosen on the settings screen, shown until the helpers catch up. */
  @state() private chosen: Partial<Record<SettingKey, number>> = {};
  /** Unsaved schedule edits (change points only, no padding). */
  @state() private draft: WeekSchedule | null = null;
  @state() private editing: PointEdit | null = null;
  @state() private copyDays: number[] | null = null;
  /**
   * While a command runs, the receiver passes through in-between states (e.g. Manual → Schedule → Boost).
   * The display is frozen on what was there, with the mode asked for, until the command finishes.
   */
  @state() private frozen: { view: ReceiverView; mode: ReceiverMode } | null = null;
  /** A temperature chosen on the dial while Manual was still being set up; sent once it's ready. */
  private queuedTemp: number | null = null;

  private link?: ReceiverLink;
  private started = false;
  private tickTimer?: number;
  private toastTimer?: number;

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("location-changed", this.onLocationChanged);
    window.addEventListener("popstate", this.onLocationChanged);
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("keydown", this.onKeyDown);
    this.tickTimer = window.setInterval(() => this.tick++, 30_000);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("location-changed", this.onLocationChanged);
    window.removeEventListener("popstate", this.onLocationChanged);
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("keydown", this.onKeyDown);
    window.clearInterval(this.tickTimer);
    window.clearTimeout(this.toastTimer);
    this.link?.stop();
    this.link = undefined;
    this.started = false;
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("panel")) {
      // Styles switch on this attribute (see :host([theme="ha"]) below).
      this.setAttribute("theme", this.panel?.config?.theme === "ha" ? "ha" : "porch");
    }
  }

  protected updated(): void {
    if (this.started || !this.hass || !this.panel) return;
    this.started = true;
    this.applyUrl();
    const topic = this.rc?.topic;
    if (topic) {
      this.link = new ReceiverLink(() => this.hass, topic, () => this.requestUpdate(), this.rc?.state_entity);
      void this.link.start();
    }
  }

  // Coming back to the app: the receiver may have changed while we weren't looking.
  private onVisibility = (): void => {
    if (!document.hidden) this.link?.requestState();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== "Escape") return;
    this.boostOpen = false;
    this.awayOpen = false;
    this.editing = null;
    this.copyDays = null;
  };

  private showToast(text: string, error = false): void {
    this.toast = text;
    this.toastError = error;
    window.clearTimeout(this.toastTimer);
    // Errors explain what to check, so they stay up longer.
    this.toastTimer = window.setTimeout(() => (this.toast = ""), error ? 8000 : 2500);
  }

  private async command(action: () => Promise<void>, done: string, target?: ReceiverMode, temp?: number): Promise<void> {
    if (target) {
      const view = this.liveReceiver;
      this.frozen = { view: temp === undefined ? view : { ...view, target: temp, off: false }, mode: target };
    }
    let ok = false;
    try {
      await action();
      ok = true;
      // A dial turn is waiting to follow: its message will say where things ended up.
      if (this.queuedTemp === null) this.showToast(done);
    } catch (err) {
      this.showToast(errorText(err), true);
    } finally {
      this.frozen = null;
    }
    const queued = this.queuedTemp;
    this.queuedTemp = null;
    const link = this.link;
    // Freeze straight away on the chosen value, so the dial doesn't flick back to the previous one.
    const mode = target ?? this.receiver.mode;
    if (ok && queued !== null && link)
      void this.command(
        () => link.setTarget(queued),
        `${mode === "manual" ? "Manual at" : "Set to"} ${tempText(queued)}`,
        mode,
        queued,
      );
  }

  /** The dial can be used now, including while a change is still being sent (the turn is then queued). */
  private dialUsable(mode: ReceiverMode): boolean {
    const link = this.link;
    if (!link || link.status !== "live") return false;
    const m = this.frozen?.mode ?? mode;
    if (!DIAL_MODES.includes(m)) return false;
    if ((m === "schedule" || m === "override") && this.rc?.controls?.override === false) return false;
    return !link.busy || !!this.frozen;
  }

  /**
   * The dial was turned. While a change is still being sent (e.g. Manual being set up, which resets the
   * temperature when the hold starts), show the choice straight away and send it once the receiver is ready.
   */
  private onDial(v: number, mode: ReceiverMode): void {
    const link = this.link;
    if (!link) return;
    if (link.busy) {
      if (this.frozen && DIAL_MODES.includes(this.frozen.mode)) {
        this.queuedTemp = v;
        this.frozen = { ...this.frozen, view: { ...this.frozen.view, target: v, off: false } };
      }
      return;
    }
    const slot = mode === "schedule" || mode === "override" ? nextSlot(link.week, new Date()) : null;
    const until = slot ? ` until ${this.whenText({ ...slot, setpoint: v }).replace(/^at /, "")}` : "";
    // Hold the display on the new value while it's sent and checked.
    void this.command(() => link.setTarget(v), `${tempText(v)}${until}`, mode, v);
  }

  private onMode(mode: ReceiverMode): void {
    const link = this.link;
    if (!link) return;
    if (mode === "boost") return this.openBoost();
    if (mode === link.mode) return;
    if (mode === "schedule") void this.command(() => link.toSchedule(), "Back on the schedule", "schedule");
    else if (mode === "manual") {
      const temp = this.manualTemp;
      void this.command(() => link.manual(temp), `Manual at ${tempText(temp)}`, "manual", temp);
    } else if (mode === "off") void this.command(() => link.off(), "Heating off", "off");
  }

  /** Manual starts from the temperature showing, or 20° if the heating is off. */
  private get manualTemp(): number {
    const r = this.receiver;
    return r.target !== null && !r.off ? r.target : 20;
  }

  private get isAdmin(): boolean {
    return this.hass?.user?.is_admin === true;
  }

  /** A shared setting: the helper if it exists, else the panel config, else the built-in default. */
  private setting(key: SettingKey): number {
    const chosen = this.chosen[key];
    if (chosen !== undefined) return chosen;
    const v = Number(this.hass?.states[SETTINGS[key].id]?.state);
    if (Number.isFinite(v)) return v;
    const controls = this.rc?.controls;
    const b = typeof controls?.boost === "object" ? controls.boost : {};
    const fromConfig = key === "away_temperature" ? controls?.away_temperature : b[key];
    return fromConfig ?? { minutes: 15, temperature: 22, away_temperature: 14 }[key];
  }

  private get boostConfig() {
    const b = this.rc?.controls?.boost;
    const max = (typeof b === "object" ? b.max_minutes : undefined) ?? 120;
    return { minutes: Math.min(this.setting("minutes"), max), temperature: this.setting("temperature"), max_minutes: max };
  }

  private async saveSetting(key: SettingKey, value: number): Promise<void> {
    const h = SETTINGS[key];
    this.chosen = { ...this.chosen, [key]: value };
    try {
      if (!this.hass.states[h.id]) {
        await this.hass.callWS({
          type: "input_number/create",
          name: h.name,
          min: h.min,
          max: h.max,
          step: h.step,
          initial: value,
          mode: "box",
          unit_of_measurement: h.unit,
          icon: h.icon,
        });
        for (let i = 0; i < 20 && !this.hass.states[h.id]; i++) await sleep(250);
        if (!this.hass.states[h.id])
          throw new Error(`the helper was created but ${h.id} didn't appear. Check Settings → Devices & services → Helpers.`);
      }
      await this.hass.callService("input_number", "set_value", { value }, { entity_id: h.id });
      this.showToast("Saved for everyone");
    } catch (err) {
      const { [key]: _, ...rest } = this.chosen;
      this.chosen = rest;
      this.showToast(`Couldn't save: ${errorText(err)}`, true);
    }
  }

  private openBoost(): void {
    const b = this.boostConfig;
    this.boostMinutes = b.minutes;
    this.boostTemp = b.temperature;
    this.boostOpen = true;
  }

  private startBoost = (): void => {
    const link = this.link;
    if (!link) return;
    const minutes = this.boostMinutes;
    const temp = this.boostTemp;
    this.boostOpen = false;
    void this.command(() => link.boost(minutes, temp), `Boosting for ${minutesText(minutes)}`, "boost", temp);
  };

  /** A date `days` from today at local midnight, as a timestamp. */
  private dayFromToday(days: number): number {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return d.getTime();
  }

  private get awayUntil(): Date {
    const d = new Date(this.awayDay);
    d.setHours(Math.floor(this.awayTime / 60), this.awayTime % 60, 0, 0);
    return d;
  }

  /** "Sun at 18:00", "tomorrow at 18:00", "12 Oct at 18:00". */
  private dateText(d: Date): string {
    const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - this.dayFromToday(0)) / 86_400_000);
    const day =
      days === 0
        ? "today"
        : days === 1
          ? "tomorrow"
          : days < 7
            ? DAY_SHORT[dayIndex(d)]
            : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
    return `${day} at ${timeText(d.getHours() * 60 + d.getMinutes())}`;
  }

  /** When an Away running now ends, from the receiver's countdown. */
  private get awayEnds(): Date | null {
    const ends = this.link?.holdEnds;
    // To the nearest minute: the end is only known to within a minute or so.
    return ends === null || ends === undefined ? null : new Date(Math.round(ends / 60_000) * 60_000);
  }

  private openAway(): void {
    this.awayDay = this.dayFromToday(1);
    this.awayTime = 18 * 60;
    this.awayTemp = this.setting("away_temperature");
    this.awayOpen = true;
  }

  private startAway = (): void => {
    const link = this.link;
    if (!link) return;
    const until = this.awayUntil;
    const temp = this.awayTemp;
    this.awayOpen = false;
    void this.command(() => link.away(until, temp), `Away until ${this.dateText(until)}`, "away", temp);
  };

  private endAway = (): void => {
    const link = this.link;
    if (!link) return;
    this.awayOpen = false;
    void this.command(() => link.toSchedule(), "Welcome back: on the schedule again", "schedule");
  };

  private stopBoost = (): void => {
    const link = this.link;
    if (!link) return;
    this.boostOpen = false;
    void this.command(() => link.toSchedule(), "Boost stopped, back on the schedule", "schedule");
  };

  private onLocationChanged = (): void => {
    if (this.started) this.applyUrl();
  };

  /**
   * Reads options from the address, so dashboard buttons can open e.g. /heating?view=schedule
   * or /heating?radiator=bedroom. `radiator` matches a radiator's name or entity.
   */
  private applyUrl(): void {
    const base = `/${this.panel?.url_path ?? "heating"}`;
    if (!location.pathname.startsWith(base)) return;
    const params = new URLSearchParams(location.search);
    const kiosk = params.get("kiosk");
    this.kiosk = kiosk !== null && kiosk !== "0" && kiosk !== "false";

    const want = params.get("radiator")?.toLowerCase();
    if (want) {
      const index = this.radiators.findIndex((r) =>
        [r.name, r.entity, r.entity.split(".")[1]].some((v) => v?.toLowerCase() === want),
      );
      if (index >= 0) {
        this.view = { kind: "radiator", index };
        return;
      }
    }
    const view = params.get("view");
    this.view = view === "schedule" ? { kind: "schedule" } : view === "settings" ? { kind: "settings" } : { kind: "main" };
    if (this.view.kind === "settings") this.chosen = {};
  }

  /** Moves between views through the address bar, so the phone's back button works. */
  private go(params: Record<string, string>, replace = false): void {
    const q = new URLSearchParams(params);
    if (this.kiosk) q.set("kiosk", "1");
    const qs = q.toString();
    const url = `/${this.panel.url_path}${qs ? `?${qs}` : ""}`;
    if (replace) history.replaceState(null, "", url);
    else history.pushState({ heatingPanel: true }, "", url);
    window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace } }));
  }

  private back = (): void => {
    if ((history.state as { heatingPanel?: boolean } | null)?.heatingPanel) history.back();
    else this.go({}, true);
  };

  private get rc() {
    return this.panel?.config?.receiver;
  }

  private get radiators(): RadiatorConfig[] {
    return this.panel?.config?.radiators ?? [];
  }

  private get controls() {
    const c = this.rc?.controls ?? {};
    return { modes: c.modes !== false, boost: c.boost !== false, away: c.away !== false };
  }

  /** What to show for the receiver; frozen on the requested mode while a command runs. */
  private get receiver(): ReceiverView {
    const f = this.frozen;
    return f ? { ...f.view, mode: f.mode, off: f.mode === "off" || f.view.off } : this.liveReceiver;
  }

  /** Live from MQTT, or basic details from its climate entity. */
  private get liveReceiver(): ReceiverView {
    const link = this.link;
    if (link?.status === "live") {
      const r = link.report;
      const mode = link.mode;
      const target = num(link.target);
      return {
        mode,
        target,
        off: mode === "off" || (target !== null && isOff(target)),
        current: num(r.local_temperature),
        heating: r.running_state === "heat",
      };
    }
    const e = this.rc?.entity ? this.hass?.states[this.rc.entity] : undefined;
    return {
      mode: "unknown" as ReceiverMode,
      target: num(e?.attributes.temperature),
      off: e?.state === "off",
      current: num(e?.attributes.current_temperature),
      heating: e?.attributes.hvac_action === "heating",
    };
  }

  private whenText(n: NextChange): string {
    const day =
      n.dayOffset === 0 ? "" : n.dayOffset === 1 ? "tomorrow " : `${DAY_SHORT[(dayIndex(new Date()) + n.dayOffset) % 7]} `;
    return `${day}at ${timeText(n.time)}`;
  }

  /** The line under the room temperature: what happens next. */
  private noteFor(mode: ReceiverMode): { text: string; attention: boolean } {
    const link = this.link;
    if (!link || link.status !== "live") return { text: "", attention: false };
    if (mode === "boost") {
      const left = link.minutesLeft;
      if (left === null) return { text: "Boost has no end time", attention: true };
      // The receiver shows 0 for about a minute before the boost actually ends.
      return { text: left === 0 ? "Less than a minute left" : `${left} min left`, attention: false };
    }
    if (mode === "away") {
      const ends = this.awayEnds;
      return { text: ends ? `Until ${this.dateText(ends)}` : "", attention: false };
    }
    if (mode === "manual") return { text: "Until you change it", attention: false };
    if (mode === "schedule" || mode === "override") {
      const next = nextChange(link.week, new Date());
      if (!next) return { text: "", attention: false };
      if (mode === "override") {
        const slot = nextSlot(link.week, new Date());
        return { text: slot ? `Back to schedule ${this.whenText({ ...slot, setpoint: 0 })}` : "", attention: false };
      }
      const what = isOff(next.setpoint) ? "Off" : tempText(next.setpoint);
      return { text: `${what} ${this.whenText(next)}`, attention: false };
    }
    return { text: "", attention: false };
  }

  protected render() {
    if (!this.rc?.topic) {
      return html`<div class="app"><p class="notice setup">
        Add a <code>receiver:</code> with its zigbee2mqtt <code>topic:</code> to this panel's
        <code>config:</code> in configuration.yaml, then restart Home Assistant.
      </p></div>`;
    }
    const v = this.view;
    const radiator = v.kind === "radiator" ? this.radiators[v.index] : undefined;
    const title =
      v.kind === "schedule"
        ? "Schedule"
        : v.kind === "settings"
          ? "Settings"
          : radiator
            ? this.radiatorName(radiator)
            : (this.rc.name ?? "Heating");
    return html`
      <div class="app">
        ${this.renderHeader(title)} ${this.renderNotices()}
        ${v.kind === "schedule"
          ? this.renderSchedule()
          : v.kind === "settings"
            ? this.renderSettings()
            : radiator
              ? this.renderRadiator(radiator)
              : this.renderMain()}
        ${this.renderBoostSheet()} ${this.renderAwaySheet()}
        ${this.toast
          ? html`<div class="toast ${this.toastError ? "error" : ""}" role="status">${this.toast}</div>`
          : nothing}
      </div>
    `;
  }

  private renderHeader(title: string) {
    const sub = this.view.kind !== "main";
    // Kiosk hides the header on the main view only; other views still need a way back.
    if (this.kiosk && !sub) return html`<div class="kiosk-gap"></div>`;
    return html`<header>
      ${sub
        ? html`<button class="round back" title="Back" aria-label="Back" @click=${this.back}>${iconBack}</button>`
        : this.narrow
          ? html`<ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>`
          : nothing}
      <h1>${title}</h1>
      ${!sub && this.isAdmin
        ? html`<button class="round" title="Settings" aria-label="Settings" @click=${() => this.go({ view: "settings" })}>
            ${iconSettings}
          </button>`
        : nothing}
    </header>`;
  }

  private renderNotices() {
    const link = this.link;
    const out: TemplateResult[] = [];
    switch (link?.status) {
      case "no-access":
        out.push(html`<p class="notice">
          The heating controls need the receiver sensor set up in Home Assistant (ask whoever looks after it), or an
          administrator login. ${this.rc?.entity ? `Showing basic details from ${this.rc.entity} for now.` : ""}
        </p>`);
        break;
      case "no-entity":
        out.push(html`<div class="notice">
          <p>
            The receiver sensor <code>${this.rc?.state_entity}</code> doesn't exist yet. Add this to configuration.yaml
            and restart Home Assistant:
          </p>
          <pre>${this.sensorYaml()}</pre>
        </div>`);
        break;
      case "no-integration":
        out.push(html`<p class="notice">
          Changing the heating needs the Heating panel integration installed in Home Assistant (ask whoever looks
          after it), or an administrator login.
        </p>`);
        break;
      case "no-mqtt":
        out.push(html`<p class="notice">
          Home Assistant's MQTT integration isn't set up, so the panel can't reach the receiver. Add it under
          Settings → Devices &amp; services.
        </p>`);
        break;
      case "silent":
        out.push(html`<p class="notice">
          No reply from the receiver on “${link.topic}”. Check this matches the receiver's name in zigbee2mqtt,
          and that zigbee2mqtt is running.
        </p>`);
        break;
      case "error":
        out.push(html`<p class="notice">
          Couldn't reach the receiver (${link.errorText}). Check zigbee2mqtt and Home Assistant's MQTT integration
          are running.
        </p>`);
        break;
    }
    if (link?.unexpected) {
      out.push(html`<div class="notice attention with-action">
        <span>${link.unexpected}</span>
        <button class="close" @click=${() => { link.unexpected = ""; this.requestUpdate(); }}>OK</button>
      </div>`);
    }
    if (link?.retainedCommand) {
      out.push(html`<p class="notice attention">
        Your MQTT broker has a saved command for the receiver (a retained message on “${link.topic}/set”).
        zigbee2mqtt sends it again every time it restarts, which can turn on a boost by itself. Delete it with an
        MQTT tool such as MQTT Explorer.
      </p>`);
    }
    return out.length ? html`<div class="notices">${out}</div>` : nothing;
  }

  /** The configuration.yaml snippet for the receiver sensor, filled in for this receiver. */
  private sensorYaml(): string {
    const id = this.rc?.state_entity ?? "sensor.heating_panel_receiver";
    const slug = id.split(".")[1];
    const topic = this.rc?.topic ?? "zigbee2mqtt/Hive receiver";
    return `mqtt:
  sensor:
    - name: ${slug.replace(/_/g, " ")}
      unique_id: ${slug}
      state_topic: "${topic}"
      value_template: "{{ value_json.system_mode }}"
      json_attributes_topic: "${topic}"
      force_update: true

recorder:
  exclude:
    entities:
      - ${id}`;
  }

  private renderMain() {
    const rc = this.rc!;
    const r = this.receiver;
    // Mid-command values (e.g. a boost before its length lands) would give a misleading note.
    const note = this.frozen ? { text: "", attention: false } : this.noteFor(r.mode);
    const controls = this.controls;
    const modes: Array<{ mode: ReceiverMode; label: string }> = [
      ...(controls.modes
        ? [
            { mode: "schedule" as const, label: "Schedule" },
            { mode: "manual" as const, label: "Manual" },
            { mode: "off" as const, label: "Off" },
          ]
        : []),
      ...(controls.boost ? [{ mode: "boost" as const, label: "Boost" }] : []),
    ];
    // An override is a kind of schedule, so the Schedule button stays lit.
    const pressed = r.mode === "override" ? "schedule" : r.mode;
    const link = this.link;
    const ready = link?.status === "live" && !link.busy;
    const canSetTemp = this.dialUsable(r.mode);
    const awayEnds = r.mode === "away" && !this.frozen ? this.awayEnds : null;
    const tpi = link?.status === "live" ? link.tpi : null;

    return html`
      <section class="hero">
        <heating-dial
          .min=${rc.min_temp ?? 5}
          .max=${rc.max_temp ?? 32}
          .target=${r.target}
          .current=${r.current}
          .off=${r.off}
          .active=${r.heating || r.mode === "boost"}
          .label=${tpi && MODE_LABEL[r.mode] ? `${MODE_LABEL[r.mode]} · TPI` : MODE_LABEL[r.mode]}
          .note=${note.text}
          .attention=${note.attention}
          .readonly=${!canSetTemp}
          @dial-change=${(e: CustomEvent<{ value: number }>) => this.onDial(e.detail.value, r.mode)}
        ></heating-dial>
        <p class="running ${r.heating && !link?.busy ? "on" : ""}">
          ${link?.busy ? "Sending to the receiver…" : r.heating ? html`${iconFlame} Heating now` : "Not heating"}
        </p>
        ${tpi && !link?.busy ? this.renderTpi(tpi) : nothing}
      </section>

      ${modes.length
        ? html`<div class="modes" style=${`--n: ${modes.length}`}>
            ${modes.map(
              (m) => html`<button
                class="mode"
                aria-pressed=${String(pressed === m.mode)}
                title=${m.label}
                ?disabled=${!ready}
                @click=${() => this.onMode(m.mode)}
              >
                ${m.label}
              </button>`,
            )}
          </div>`
        : nothing}

      ${controls.away
        ? html`<button
            class="away-button"
            aria-pressed=${String(r.mode === "away")}
            ?disabled=${!ready || r.mode === "boost"}
            @click=${() => this.openAway()}
          >
            ${iconPlane}
            ${r.mode === "away" ? (awayEnds ? `Away until ${this.dateText(awayEnds)}` : "Away") : "Going away?"}
          </button>`
        : nothing}

      <button class="card" @click=${() => this.go({ view: "schedule" })}>
        <span class="card-head">
          <span>Schedule</span>
          ${iconChevron}
        </span>
        ${this.renderBar(dayIndex(new Date()))} ${this.renderTicks()}
        ${this.renderScheduleStatus()}
      </button>

      ${this.renderRadiators(r.heating)}
    `;
  }

  private renderSettings() {
    if (!this.isAdmin) return html`<p class="notice">Only an administrator can change these settings.</p>`;
    const minutes = this.setting("minutes");
    const max = this.boostConfig.max_minutes;
    const stepper = (key: SettingKey, label: string, lo: number, hi: number) => {
      const v = this.setting(key);
      return html`<div class="stepper">
        <button class="round" title="Lower" aria-label=${`Lower the ${label}`} ?disabled=${v <= lo}
          @click=${() => this.saveSetting(key, Math.max(lo, v - 0.5))}>${iconMinus}</button>
        <span class="stepper-value">${tempText(v)}</span>
        <button class="round" title="Raise" aria-label=${`Raise the ${label}`} ?disabled=${v >= hi}
          @click=${() => this.saveSetting(key, Math.min(hi, v + 0.5))}>${iconPlus}</button>
      </div>`;
    };
    return html`
      <p class="empty">These apply to everyone using the panel, on every phone.</p>
      <h2>Boost</h2>
      <p class="sheet-label">Usual length</p>
      <div class="chips">
        ${BOOST_LENGTHS.filter((m) => m <= max).map(
          (m) => html`<button class="chip" aria-pressed=${String(m === minutes)} @click=${() => this.saveSetting("minutes", m)}>
            ${minutesText(m)}
          </button>`,
        )}
      </div>
      <p class="sheet-label">Usual temperature</p>
      ${stepper("temperature", "usual boost temperature", 12, this.rc?.max_temp ?? 32)}
      ${this.controls.away
        ? html`<h2>Away</h2>
            <p class="sheet-label">Temperature while away</p>
            ${stepper("away_temperature", "away temperature", SETTINGS.away_temperature.min, AWAY_MAX_TEMP)}`
        : nothing}
    `;
  }

  private renderAwaySheet() {
    if (!this.awayOpen) return nothing;
    const link = this.link;
    const busy = !!link?.busy;
    const away = link?.mode === "away";
    const ends = this.awayEnds;
    const until = this.awayUntil;
    const minutes = (until.getTime() - Date.now()) / 60_000;
    const valid = minutes >= 1 && minutes <= MAX_HOLD;
    const toInput = (t: number) => {
      const d = new Date(t);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    const quick = [1, 2, 3, 4, 5, 6, 7].map((n) => this.dayFromToday(n));
    const shift = (by: number) => (this.awayTime = (this.awayTime + by + 24 * 60) % (24 * 60));
    return html`<div class="sheet-backdrop" @click=${(e: Event) => e.target === e.currentTarget && (this.awayOpen = false)}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Away">
        <div class="sheet-head">
          <span>${iconPlane} Away</span>
          <button class="close" @click=${() => (this.awayOpen = false)}>Close</button>
        </div>
        ${away
          ? html`<p class="sheet-text">
                Away at ${tempText(link?.report.occupied_heating_setpoint ?? 0)}${ends ? ` until ${this.dateText(ends)}` : ""}. The
                heating goes back to its schedule then by itself.
              </p>
              <button class="primary" ?disabled=${busy} @click=${this.endAway}>We're back: end Away now</button>`
          : html`<p class="sheet-text">
                Keeps the house at a low temperature while you're away, then goes back to the schedule by itself. Set
                the return a little early to come home to a warm house.
              </p>
              <p class="sheet-label">Back on</p>
              <div class="chips">
                ${quick.slice(0, 6).map(
                  (t, i) => html`<button class="chip" aria-pressed=${String(t === this.awayDay)} @click=${() => (this.awayDay = t)}>
                    ${i === 0 ? "Tomorrow" : DAY_SHORT[dayIndex(new Date(t))]}
                  </button>`,
                )}
              </div>
              <label class="date-pick">
                <span>Or a date</span>
                <input
                  type="date"
                  .value=${toInput(this.awayDay)}
                  min=${toInput(this.dayFromToday(0))}
                  max=${toInput(this.dayFromToday(44))}
                  @change=${(e: Event) => {
                    const [y, m, d] = (e.target as HTMLInputElement).value.split("-").map(Number);
                    if (y) this.awayDay = new Date(y, m - 1, d).getTime();
                  }}
                />
              </label>
              <p class="sheet-label">at</p>
              <div class="stepper time-stepper">
                <button class="round small" title="An hour earlier" aria-label="An hour earlier" @click=${() => shift(-60)}>−1h</button>
                <button class="round" title="15 minutes earlier" aria-label="15 minutes earlier" @click=${() => shift(-15)}>${iconMinus}</button>
                <span class="stepper-value">${timeText(this.awayTime)}</span>
                <button class="round" title="15 minutes later" aria-label="15 minutes later" @click=${() => shift(15)}>${iconPlus}</button>
                <button class="round small" title="An hour later" aria-label="An hour later" @click=${() => shift(60)}>+1h</button>
              </div>
              <p class="sheet-label">Temperature while away</p>
              <div class="stepper">
                <button class="round" title="Lower" aria-label="Lower the away temperature" ?disabled=${this.awayTemp <= 5}
                  @click=${() => (this.awayTemp = Math.max(5, this.awayTemp - 0.5))}>${iconMinus}</button>
                <span class="stepper-value">${tempText(this.awayTemp)}</span>
                <button class="round" title="Raise" aria-label="Raise the away temperature" ?disabled=${this.awayTemp >= AWAY_MAX_TEMP}
                  @click=${() => (this.awayTemp = Math.min(AWAY_MAX_TEMP, this.awayTemp + 0.5))}>${iconPlus}</button>
              </div>
              <button class="primary" ?disabled=${busy || !valid || link?.status !== "live"} @click=${this.startAway}>
                ${valid ? `Away until ${this.dateText(until)}` : minutes < 1 ? "Pick a time in the future" : "That's too far ahead (45 days at most)"}
              </button>`}
      </div>
    </div>`;
  }

  private renderBoostSheet() {
    if (!this.boostOpen) return nothing;
    const link = this.link;
    const busy = !!link?.busy;
    const b = this.boostConfig;
    const boosting = link?.mode === "boost";
    const maxTemp = this.rc?.max_temp ?? 32;
    const options = [...new Set([...BOOST_LENGTHS, b.minutes])]
      .filter((m) => m <= b.max_minutes)
      .sort((x, y) => x - y);
    const left = link?.minutesLeft;
    return html`<div
      class="sheet-backdrop"
      @click=${(e: Event) => {
        if (e.target === e.currentTarget) this.boostOpen = false;
      }}
    >
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Boost">
        <div class="sheet-head">
          <span>Boost</span>
          <button class="close" @click=${() => (this.boostOpen = false)}>Close</button>
        </div>
        ${boosting
          ? html`<p class="sheet-text">
                Boosting at ${tempText(link?.report.occupied_heating_setpoint ?? 0)}${left === null || left === undefined
                  ? ""
                  : left === 0
                    ? ", less than a minute left"
                    : `, ${minutesText(left)} left`}.
              </p>
              <button class="primary" ?disabled=${busy} @click=${this.stopBoost}>Stop boost</button>`
          : html`<p class="sheet-label">How long</p>
              <div class="chips">
                ${options.map(
                  (m) => html`<button
                    class="chip"
                    aria-pressed=${String(m === this.boostMinutes)}
                    @click=${() => (this.boostMinutes = m)}
                  >
                    ${minutesText(m)}
                  </button>`,
                )}
              </div>
              <p class="sheet-label">Temperature</p>
              <div class="stepper">
                <button
                  class="round"
                  title="Lower"
                  aria-label="Lower the boost temperature"
                  ?disabled=${this.boostTemp <= 12}
                  @click=${() => (this.boostTemp = Math.max(12, this.boostTemp - 0.5))}
                >
                  ${iconMinus}
                </button>
                <span class="stepper-value">${tempText(this.boostTemp)}</span>
                <button
                  class="round"
                  title="Raise"
                  aria-label="Raise the boost temperature"
                  ?disabled=${this.boostTemp >= maxTemp}
                  @click=${() => (this.boostTemp = Math.min(maxTemp, this.boostTemp + 0.5))}
                >
                  ${iconPlus}
                </button>
              </div>
              <button class="primary" ?disabled=${busy || link?.status !== "live"} @click=${this.startBoost}>
                Boost for ${minutesText(this.boostMinutes)}
              </button>`}
      </div>
    </div>`;
  }

  private renderScheduleStatus() {
    const s = this.link?.scheduleState;
    if (s === "loading" && !this.link?.scheduleDays) return html`<p class="empty">Reading the schedule from the receiver…</p>`;
    if (s === "partial") return html`<p class="empty">Only ${this.link?.scheduleDays} of 7 days came back from the receiver.</p>`;
    return nothing;
  }

  private renderBar(day: number, week: WeekSchedule = this.link?.week ?? {}) {
    const segs = daySegments(week, day);
    const now = new Date();
    const minute = now.getHours() * 60 + now.getMinutes();
    const isToday = day === dayIndex(now);
    return html`<span class="bar ${segs.length ? "" : "unknown"}">
      ${segs.map((s) => {
        const kind = s.setpoint === null ? "unknown" : isOff(s.setpoint) ? "off" : "on";
        const colour = kind === "on" ? `background: ${tempColor(s.setpoint!)};` : "";
        return html`<span
          class="seg ${kind}"
          style=${`left: ${s.start / 14.4}%; width: ${(s.end - s.start) / 14.4}%; ${colour}`}
        ></span>`;
      })}
      ${isToday && segs.length ? html`<span class="now" style=${`left: ${minute / 14.4}%`}></span>` : nothing}
    </span>`;
  }

  private renderTicks() {
    return html`<span class="ticks" aria-hidden="true">
      ${[0, 6, 12, 18, 24].map((h) => html`<span style=${`left: ${(h / 24) * 100}%`}>${String(h).padStart(2, "0")}</span>`)}
    </span>`;
  }

  // ---- Schedule editing ----

  /** What the schedule screen shows: the draft if there is one, else what the receiver has. */
  private get shownWeek(): WeekSchedule {
    return this.draft ?? this.link?.week ?? {};
  }

  private get canEditSchedule(): boolean {
    const link = this.link;
    return !!link && link.status === "live" && !link.busy && link.scheduleDays === DAYS.length;
  }

  /** Days whose draft differs from the receiver's schedule. */
  private get dirtyDays(): Day[] {
    const draft = this.draft;
    const week = this.link?.week ?? {};
    return draft ? DAYS.filter((d) => !sameDay(draft[d], week[d])) : [];
  }

  private editDraft(update: (draft: WeekSchedule) => void): void {
    const draft = cloneWeek(this.draft ?? this.link?.week ?? {});
    for (const d of DAYS) if (draft[d]) draft[d] = changes(draft[d]!);
    update(draft);
    this.draft = this.dirtyDaysOf(draft).length ? draft : null;
  }

  /**
   * Days whose filler slots aren't the panel's (the receiver's own, at e.g. 12:00 and 14:00). A temporary
   * change ends at the next slot of any kind, so on these days it can end early.
   */
  private get untidyDays(): Day[] {
    const week = this.link?.week ?? {};
    const key = (t: Transition[]) => JSON.stringify([...t].sort((a, b) => a.time - b.time));
    return DAYS.filter((d) => week[d] && key(week[d]!) !== key(padToSlots(week[d]!)));
  }

  private tidySchedule = (): void => {
    const link = this.link;
    if (!link) return;
    const days = this.untidyDays;
    const week: WeekSchedule = {};
    for (const d of days) week[d] = changes(link.week[d]!);
    void this.command(
      () => link.saveSchedule(week, days),
      `Tidied ${days.length === 1 ? DAY_LONG[DAYS.indexOf(days[0])] : `${days.length} days`}; your heating times are unchanged`,
    );
  };

  private dirtyDaysOf(draft: WeekSchedule): Day[] {
    const week = this.link?.week ?? {};
    return DAYS.filter((d) => !sameDay(draft[d], week[d]));
  }

  private openPoint(day: number, index: number | null): void {
    if (!this.canEditSchedule) return;
    const points = changes(this.shownWeek[DAYS[day]] ?? []);
    const p = index === null ? undefined : points[index];
    // A new change starts an hour after the last one, at the opposite setting.
    const last = points[points.length - 1];
    const time = p?.time ?? Math.min(23 * 60 + 45, (last?.time ?? 6 * 60) + 60);
    const setpoint = p?.setpoint ?? (last && !isOff(last.setpoint) ? OFF_SETPOINT : 20);
    this.editing = {
      day,
      index,
      time,
      setpoint: isOff(setpoint) ? 20 : setpoint,
      off: isOff(setpoint),
    };
  }

  private applyPoint = (): void => {
    const e = this.editing;
    if (!e) return;
    const key = DAYS[e.day];
    const points = changes(this.shownWeek[key] ?? []);
    const clash = points.findIndex((p, i) => p.time === e.time && i !== e.index);
    if (clash >= 0) {
      this.showToast(`There's already a change at ${timeText(e.time)}. Pick another time.`, true);
      return;
    }
    const point: Transition = { time: e.time, setpoint: e.off ? OFF_SETPOINT : e.setpoint };
    this.editDraft((draft) => {
      const list = [...(draft[key] ?? [])];
      if (e.index === null) list.push(point);
      else list[e.index] = point;
      draft[key] = list.sort((a, b) => a.time - b.time);
    });
    this.editing = null;
  };

  private removePoint = (): void => {
    const e = this.editing;
    if (!e || e.index === null) return;
    const key = DAYS[e.day];
    this.editDraft((draft) => {
      draft[key] = (draft[key] ?? []).filter((_, i) => i !== e.index);
    });
    this.editing = null;
  };

  private applyCopy = (): void => {
    const days = this.copyDays;
    if (!days?.length) return;
    const from = DAYS[this.scheduleDay];
    this.editDraft((draft) => {
      for (const i of days) draft[DAYS[i]] = [...(draft[from] ?? [])];
    });
    this.showToast(`Copied to ${days.length === 1 ? DAY_LONG[days[0]] : `${days.length} days`}. Save to send it.`);
    this.copyDays = null;
  };

  private saveSchedule = (): void => {
    const link = this.link;
    const draft = this.draft;
    if (!link || !draft) return;
    const days = this.dirtyDays;
    // Keep the receiver's schedule from before the first ever save on this device, so it can be put back.
    try {
      if (!localStorage.getItem(BACKUP_KEY))
        localStorage.setItem(BACKUP_KEY, JSON.stringify({ saved: new Date().toISOString(), week: link.week }));
    } catch {
      // Storage unavailable (private mode); carry on without a backup.
    }
    void this.command(async () => {
      await link.saveSchedule(draft, days);
      this.draft = null;
    }, `Saved to the receiver (${days.length === 1 ? DAY_LONG[DAYS.indexOf(days[0])] : `${days.length} days`})`);
  };

  private get backup(): { saved: string; week: WeekSchedule } | null {
    try {
      const raw = localStorage.getItem(BACKUP_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private restoreBackup = (): void => {
    const b = this.backup;
    if (!b) return;
    this.editDraft((draft) => {
      for (const d of DAYS) if (b.week[d]) draft[d] = changes(b.week[d]!);
    });
    this.showToast(this.draft ? "Previous schedule loaded. Save to send it." : "That's already the receiver's schedule.");
  };

  private renderSchedule() {
    const week = this.shownWeek;
    const day = this.scheduleDay;
    const points = changes(week[DAYS[day]] ?? []);
    const s = this.link?.scheduleState;
    const canEdit = this.canEditSchedule;
    const dirty = this.dirtyDays;
    const backup = this.backup;
    return html`
      <section class="schedule ${dirty.length ? "has-save-bar" : ""}">
        <div class="week">
          ${DAYS.map(
            (d, i) => html`<button
              class="day-row"
              aria-pressed=${String(i === day)}
              aria-label=${`${DAY_LONG[i]}${dirty.includes(d) ? ", not saved" : ""}`}
              @click=${() => (this.scheduleDay = i)}
            >
              <span class="day-name">${DAY_SHORT[i]}${dirty.includes(d) ? html`<span class="dot" title="Not saved"></span>` : nothing}</span>
              ${this.renderBar(i, week)}
            </button>`,
          )}
          <div class="day-row ticks-row"><span></span>${this.renderTicks()}</div>
        </div>

        <h2>${DAY_LONG[day]}</h2>
        ${points.length
          ? html`<ol class="points">
              ${points.map(
                (p, i) => html`<li>
                  <button class="point" ?disabled=${!canEdit} @click=${() => this.openPoint(day, i)}>
                    <span class="time">${timeText(p.time)}</span>
                    <span
                      class="swatch ${isOff(p.setpoint) ? "off" : "on"}"
                      style=${isOff(p.setpoint) ? "" : `background: ${tempColor(p.setpoint)}`}
                    ></span>
                    <span>${isOff(p.setpoint) ? "Off" : tempText(p.setpoint)}</span>
                    ${canEdit ? iconChevron : nothing}
                  </button>
                </li>`,
              )}
            </ol>`
          : html`<p class="empty">
              ${s === "loading" ? "Reading the schedule from the receiver…" : "No schedule for this day has come back yet."}
            </p>`}
        ${points.length
          ? html`<div class="point-actions">
              <button class="secondary" ?disabled=${!canEdit || points.length >= SLOTS} @click=${() => this.openPoint(day, null)}>
                Add a change
              </button>
              <button class="secondary" ?disabled=${!canEdit} @click=${() => (this.copyDays = [])}>Copy to other days</button>
            </div>
            ${points.length >= SLOTS ? html`<p class="empty">The receiver allows ${SLOTS} changes a day.</p>` : nothing}`
          : nothing}
        ${s === "partial" || (s !== "loading" && this.link && this.link.scheduleDays < 7)
          ? html`<button class="retry" @click=${() => this.link?.requestSchedule()}>Read again</button>`
          : nothing}
        ${canEdit && !dirty.length && this.untidyDays.length
          ? html`<div class="card tidy">
              <p>
                ${this.untidyDays.length === 7 ? "Every day" : `${this.untidyDays.length} days`} still
                ${this.untidyDays.length === 1 || this.untidyDays.length === 7 ? "has" : "have"} the receiver's own filler times, so a temporary change
                can end early (for example at 12:00). Tidying them keeps your heating times exactly the same.
              </p>
              <button class="secondary" @click=${this.tidySchedule}>Tidy the schedule</button>
            </div>`
          : nothing}
        ${backup && canEdit
          ? html`<button class="link" @click=${this.restoreBackup}>
              Put back the schedule from before the first change (${new Date(backup.saved).toLocaleDateString()})
            </button>`
          : nothing}
      </section>

      ${dirty.length
        ? html`<div class="save-bar">
            <button class="secondary" ?disabled=${this.link?.busy} @click=${() => (this.draft = null)}>Discard</button>
            <button class="primary" ?disabled=${!this.link || this.link.busy || this.link.status !== "live"} @click=${this.saveSchedule}>
              ${this.link?.busy ? "Saving…" : `Save ${dirty.length === 1 ? DAY_LONG[DAYS.indexOf(dirty[0])] : `${dirty.length} days`}`}
            </button>
          </div>`
        : nothing}
      ${this.renderPointSheet()} ${this.renderCopySheet()}
    `;
  }

  private renderPointSheet() {
    const e = this.editing;
    if (!e) return nothing;
    const set = (patch: Partial<PointEdit>) => (this.editing = { ...e, ...patch });
    const shiftTime = (by: number) => set({ time: Math.min(23 * 60 + 45, Math.max(0, e.time + by)) });
    const points = changes(this.shownWeek[DAYS[e.day]] ?? []);
    return html`<div class="sheet-backdrop" @click=${(ev: Event) => ev.target === ev.currentTarget && (this.editing = null)}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Change">
        <div class="sheet-head">
          <span>${e.index === null ? `New change on ${DAY_LONG[e.day]}` : `${DAY_LONG[e.day]}, ${timeText(points[e.index]?.time ?? e.time)}`}</span>
          <button class="close" @click=${() => (this.editing = null)}>Close</button>
        </div>
        <p class="sheet-label">Starts at</p>
        <div class="stepper time-stepper">
          <button class="round small" title="An hour earlier" aria-label="An hour earlier" @click=${() => shiftTime(-60)}>−1h</button>
          <button class="round" title="15 minutes earlier" aria-label="15 minutes earlier" @click=${() => shiftTime(-15)}>${iconMinus}</button>
          <span class="stepper-value">${timeText(e.time)}</span>
          <button class="round" title="15 minutes later" aria-label="15 minutes later" @click=${() => shiftTime(15)}>${iconPlus}</button>
          <button class="round small" title="An hour later" aria-label="An hour later" @click=${() => shiftTime(60)}>+1h</button>
        </div>
        <p class="sheet-label">Heating</p>
        <div class="chips two">
          <button class="chip" aria-pressed=${String(!e.off)} @click=${() => set({ off: false })}>On</button>
          <button class="chip" aria-pressed=${String(e.off)} @click=${() => set({ off: true })}>Off</button>
        </div>
        <div class="stepper ${e.off ? "dimmed" : ""}">
          <button
            class="round"
            title="Lower"
            aria-label="Lower the temperature"
            ?disabled=${e.off || e.setpoint <= SCHEDULE_MIN}
            @click=${() => set({ setpoint: Math.max(SCHEDULE_MIN, e.setpoint - 0.5) })}
          >
            ${iconMinus}
          </button>
          <span class="stepper-value">${e.off ? "Off" : tempText(e.setpoint)}</span>
          <button
            class="round"
            title="Raise"
            aria-label="Raise the temperature"
            ?disabled=${e.off || e.setpoint >= SCHEDULE_MAX}
            @click=${() => set({ setpoint: Math.min(SCHEDULE_MAX, e.setpoint + 0.5) })}
          >
            ${iconPlus}
          </button>
        </div>
        <button class="primary" @click=${this.applyPoint}>Done</button>
        ${e.index !== null
          ? html`<button class="link danger" ?disabled=${points.length <= 1} @click=${this.removePoint}>
              ${points.length <= 1 ? "A day needs at least one change" : "Remove this change"}
            </button>`
          : nothing}
      </div>
    </div>`;
  }

  private renderCopySheet() {
    const chosen = this.copyDays;
    if (!chosen) return nothing;
    const from = this.scheduleDay;
    const toggle = (i: number) =>
      (this.copyDays = chosen.includes(i) ? chosen.filter((x) => x !== i) : [...chosen, i]);
    const others = DAYS.map((_, i) => i).filter((i) => i !== from);
    return html`<div class="sheet-backdrop" @click=${(ev: Event) => ev.target === ev.currentTarget && (this.copyDays = null)}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Copy to other days">
        <div class="sheet-head">
          <span>Copy ${DAY_LONG[from]} to…</span>
          <button class="close" @click=${() => (this.copyDays = null)}>Close</button>
        </div>
        <div class="chips">
          ${others.map(
            (i) => html`<button class="chip" aria-pressed=${String(chosen.includes(i))} @click=${() => toggle(i)}>
              ${DAY_SHORT[i]}
            </button>`,
          )}
          <button
            class="chip"
            @click=${() => (this.copyDays = from < 5 ? others.filter((i) => i < 5) : others.filter((i) => i >= 5))}
          >
            ${from < 5 ? "Weekdays" : "Weekend"}
          </button>
          <button class="chip" @click=${() => (this.copyDays = others)}>All</button>
        </div>
        <button class="primary" ?disabled=${!chosen.length} @click=${this.applyCopy}>
          ${chosen.length ? `Copy to ${chosen.length === 1 ? DAY_LONG[chosen[0]] : `${chosen.length} days`}` : "Pick the days"}
        </button>
      </div>
    </div>`;
  }

  private radiatorName(r: RadiatorConfig): string {
    const e = this.hass?.states[r.entity];
    return r.name ?? (e?.attributes.friendly_name as string | undefined) ?? r.entity;
  }

  private sensorNumber(id?: string): number | null {
    if (!id) return null;
    const v = Number(this.hass?.states[id]?.state);
    return Number.isFinite(v) ? v : null;
  }

  private valve(r: RadiatorConfig, e: HassEntity): Valve {
    return valveOpening({
      sensor: this.sensorNumber(r.position),
      hasSensor: !!r.position,
      boilerHeating: this.receiver.heating,
      state: e.state,
      action: typeof e.attributes.hvac_action === "string" ? e.attributes.hvac_action : undefined,
      current: num(e.attributes.current_temperature),
      target: num(e.attributes.temperature),
    });
  }

  private renderRadiators(heating: boolean) {
    const list = this.radiators;
    if (!list.length) return nothing;
    const show = this.panel.config.radiators_when === "always" || heating;
    return html`<section class="radiators">
      <h2>Radiators</h2>
      ${show
        ? html`<div class="rows">${list.map((r) => this.renderRadiatorRow(r))}</div>`
        : html`<p class="empty">Radiators appear when the heating is on.</p>`}
    </section>`;
  }

  private renderRadiatorRow(r: RadiatorConfig) {
    const e: HassEntity | undefined = this.hass.states[r.entity];
    const name = this.radiatorName(r);
    if (!e) {
      return html`<div class="row missing">
        <span class="row-name">${name}</span>
        <span class="row-sub">Not found: ${r.entity}. Check the entity id.</span>
      </div>`;
    }
    const cur = num(e.attributes.current_temperature);
    const tgt = num(e.attributes.temperature);
    const valve = this.valve(r, e);
    const bat = this.sensorNumber(r.battery);
    return html`<button class="row" @click=${() => this.go({ radiator: r.entity.split(".")[1] })}>
      <span class="row-name">
        ${name}
        ${bat !== null && bat < 20
          ? html`<span class="battery" title=${`Battery low (${bat}%)`} aria-label=${`Battery low, ${bat}%`}>${iconBattery}</span>`
          : nothing}
      </span>
      <span class="row-temps">
        <span class="row-cur">${cur === null ? "–" : tempText(cur)}</span>
        <span class="row-sub">${tgt === null ? "" : `set ${tempText(tgt)}`}</span>
      </span>
      <span class="valve ${valve.noHeat ? "no-heat" : ""}" title=${valveTitle(valve)}>
        <span style=${`width: ${valve.pct ?? 0}%`}></span>
      </span>
    </button>`;
  }

  /**
   * TPI is running the boiler: whether it's giving it heat this cycle, and why the Hive remote shows a different
   * temperature from the dial (TPI sets the receiver above the target to run the boiler, below it to rest it).
   */
  private renderTpi(tpi: TpiState) {
    const running = tpi.setpoint !== null && tpi.setpoint > tpi.target;
    const title =
      `TPI is running the boiler for ${tpi.demand}% of each cycle to keep the room at ${tempText(tpi.target)}. ` +
      "It sets the receiver above the target to run the boiler and below it to rest it, so the Hive remote shows " +
      "that setting rather than the target.";
    return html`<p class="tpi-line" title=${title}>
      <span class="tpi-badge">TPI</span>
      ${running ? "Heating" : "Resting"} · ${tpi.demand}%${tpi.setpoint !== null
        ? html` · <span class="tpi-remote">remote shows ${tempText(tpi.setpoint)}</span>`
        : nothing}
    </p>`;
  }

  private renderRadiator(r: RadiatorConfig) {
    const e = this.hass.states[r.entity];
    if (!e) return html`<p class="notice">Not found: ${r.entity}. Check the entity id in the panel config.</p>`;
    const valve = this.valve(r, e);
    const bat = this.sensorNumber(r.battery);
    const mode = (e.attributes.preset_mode as string | undefined) ?? e.state;
    return html`
      <section class="hero">
        <heating-dial
          .min=${num(e.attributes.min_temp) ?? 5}
          .max=${num(e.attributes.max_temp) ?? 30}
          .target=${num(e.attributes.temperature)}
          .current=${num(e.attributes.current_temperature)}
          .off=${e.state === "off"}
          .active=${e.attributes.hvac_action === "heating"}
          .label=${capitalise(mode)}
          @dial-change=${(e: CustomEvent<{ value: number }>) => {
            const v = e.detail.value;
            void this.command(
              () => this.hass.callService("climate", "set_temperature", { temperature: v }, { entity_id: r.entity }).then(() => undefined),
              `${this.radiatorName(r)} set to ${tempText(v)}`,
            );
          }}
        ></heating-dial>
      </section>
      <dl class="facts">
        <div><dt>Valve</dt><dd class=${valve.noHeat ? "no-heat" : ""} title=${valveTitle(valve)}>${valveText(valve)}</dd></div>
        <div><dt>Battery</dt><dd class=${bat !== null && bat < 20 ? "low" : ""}>${bat === null ? "–" : `${bat}%`}</dd></div>
      </dl>
    `;
  }

  static styles = css`
    :host {
      --dusk: #1b2431;
      --slate: #273345;
      --slate-2: #33415a;
      --mist: #e9eef4;
      --haze: #93a1b4;
      --porch: #f5b83d;
      --on-porch: #2a1d00; /* text on the amber accent */
      --error-text: #ffb4ae;
      /* Temperature cue, kept soft so amber stays the one thing that stands out */
      --cool: #7d9cc4;
      --mild: #b8ab9b;
      --warm: #d4875f;
      display: block;
      /* Home Assistant's panel container has no set height, so 100% would stop at the content. */
      min-height: 100vh;
      min-height: 100dvh;
      background: var(--dusk);
      color: var(--mist);
      font-family: ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      -webkit-tap-highlight-color: transparent;
    }
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }
    /* Follow the user's Home Assistant theme. */
    :host([theme="ha"]) {
      --dusk: var(--primary-background-color, #111111);
      --slate: var(--secondary-background-color, #282828);
      --slate-2: var(--divider-color, rgba(127, 127, 127, 0.3));
      --mist: var(--primary-text-color, #e1e1e1);
      --haze: var(--secondary-text-color, #9b9b9b);
      --porch: var(--accent-color, #ff9800);
      --on-porch: var(--text-accent-color, var(--text-primary-color, #ffffff));
      --error-text: var(--error-color, #db4437);
      font-family: var(--ha-font-family-body, Roboto, system-ui, sans-serif);
    }
    .app {
      max-width: 560px;
      margin: 0 auto;
      padding: 0 calc(16px + env(safe-area-inset-right)) calc(24px + env(safe-area-inset-bottom))
        calc(16px + env(safe-area-inset-left));
    }
    .kiosk-gap {
      height: calc(12px + env(safe-area-inset-top));
    }
    header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: calc(12px + env(safe-area-inset-top)) 0 12px;
    }
    h1 {
      flex: 1;
      margin: 0;
      font-size: 1.375rem;
      font-weight: 650;
      letter-spacing: -0.01em;
    }
    h2 {
      margin: 24px 0 8px;
      font-size: 1.0625rem;
      font-weight: 650;
    }
    button {
      font: inherit;
      color: inherit;
      border: 0;
      cursor: pointer;
      text-align: inherit;
    }
    button:focus-visible {
      outline: 3px solid var(--porch);
      outline-offset: 3px;
    }
    .round {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--slate);
    }
    .round svg {
      width: 22px;
      height: 22px;
    }

    .notices {
      display: grid;
      gap: 8px;
      margin-bottom: 12px;
    }
    .notice {
      margin: 0;
      padding: 12px 14px;
      border-radius: 14px;
      background: var(--slate);
      line-height: 1.45;
    }
    .notices > * {
      min-width: 0; /* let a long snippet scroll instead of widening the page */
    }
    .notice p {
      margin: 0;
    }
    .notice pre {
      margin: 10px 0 0;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--dusk);
      font-size: 0.8125rem;
      overflow-x: auto;
      user-select: all;
    }
    .notice.attention {
      box-shadow: inset 0 0 0 2px var(--porch);
    }
    .notice.setup {
      margin-top: calc(24px + env(safe-area-inset-top));
    }
    .empty {
      margin: 8px 0 0;
      color: var(--haze);
      line-height: 1.45;
    }

    .hero {
      padding-top: 4px;
    }
    .running {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 24px;
      margin: 4px 0 0;
      color: var(--haze);
      font-size: 0.9375rem;
      font-weight: 600;
    }
    .running.on {
      color: var(--porch);
    }
    .running svg {
      width: 18px;
      height: 18px;
    }

    /* TPI is running the boiler (see renderTpi). */
    .tpi-line {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 6px;
      margin: 6px 0 0;
      color: var(--haze);
      font-size: 0.875rem;
      font-weight: 500;
    }
    .tpi-badge {
      padding: 1px 8px;
      border: 1px solid var(--porch);
      border-radius: 999px;
      /* The accent marks it, but the text is the theme's own, so it reads on light themes too (a yellow accent
         on white was too faint). */
      background: color-mix(in srgb, var(--porch) 22%, transparent);
      color: var(--mist);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.06em;
    }
    .tpi-remote {
      white-space: nowrap;
    }

    .modes {
      display: grid;
      grid-template-columns: repeat(var(--n), 1fr);
      gap: 8px;
      margin-top: 20px;
    }
    .mode {
      height: 56px;
      border-radius: 28px;
      background: var(--slate);
      color: var(--haze);
      font-weight: 650;
      text-align: center;
    }
    .mode[aria-pressed="true"] {
      background: var(--mist);
      color: var(--dusk);
    }
    .mode:disabled {
      cursor: default;
    }
    .mode:disabled:not([aria-pressed="true"]) {
      opacity: 0.6;
    }

    .away-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      height: 52px;
      margin-top: 8px;
      border-radius: 26px;
      background: var(--slate);
      color: var(--haze);
      font-weight: 650;
    }
    .away-button[aria-pressed="true"] {
      background: var(--mist);
      color: var(--dusk);
    }
    .away-button:disabled {
      cursor: default;
    }
    .away-button:disabled:not([aria-pressed="true"]) {
      opacity: 0.6;
    }
    svg.plane {
      width: 20px;
      height: 20px;
      vertical-align: -4px;
    }
    .date-pick {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 10px;
      color: var(--haze);
      font-size: 0.875rem;
      font-weight: 600;
    }
    .date-pick input {
      height: 44px;
      padding: 0 12px;
      border: 0;
      border-radius: 12px;
      background: var(--slate-2);
      color: var(--mist);
      font: inherit;
      color-scheme: dark;
    }
    :host([theme="ha"]) .date-pick input {
      color-scheme: light dark;
    }
    .card {
      display: block;
      width: 100%;
      margin-top: 20px;
      padding: 14px 16px 12px;
      border-radius: 18px;
      background: var(--slate);
    }
    .card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      font-weight: 650;
    }
    .card-head svg {
      width: 20px;
      height: 20px;
      color: var(--haze);
    }

    .bar {
      position: relative;
      display: block;
      height: 14px;
      border-radius: 7px;
      overflow: hidden;
      background: var(--slate-2);
    }
    .card .bar {
      height: 18px;
      border-radius: 9px;
    }
    .bar.unknown {
      background: repeating-linear-gradient(
        -45deg,
        var(--slate-2) 0 6px,
        transparent 6px 12px
      );
    }
    .seg {
      position: absolute;
      top: 0;
      bottom: 0;
    }
    .now {
      position: absolute;
      top: -2px;
      bottom: -2px;
      width: 2px;
      margin-left: -1px;
      background: var(--mist);
    }
    .ticks {
      position: relative;
      display: block;
      height: 18px;
      margin-top: 4px;
      color: var(--haze);
      font-size: 0.75rem;
      font-variant-numeric: tabular-nums;
    }
    .ticks span {
      position: absolute;
      transform: translateX(-50%);
    }
    .ticks span:first-child {
      transform: none;
    }
    .ticks span:last-child {
      transform: translateX(-100%);
    }

    .week {
      display: grid;
      gap: 4px;
    }
    .day-row {
      display: grid;
      grid-template-columns: 3.25em 1fr;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      padding: 0 10px;
      border-radius: 12px;
      background: transparent;
    }
    .day-row[aria-pressed="true"] {
      background: var(--slate);
    }
    .day-name {
      color: var(--haze);
      font-weight: 600;
    }
    .day-row[aria-pressed="true"] .day-name {
      color: var(--mist);
    }
    .ticks-row {
      min-height: 0;
    }
    .points {
      display: grid;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .point {
      display: grid;
      grid-template-columns: 4.5em 14px 1fr 20px;
      align-items: center;
      gap: 10px;
      width: 100%;
      min-height: 52px;
      padding: 0 14px;
      border-radius: 12px;
      background: var(--slate);
      font-weight: 600;
    }
    .point:disabled {
      cursor: default;
    }
    .point svg {
      width: 20px;
      height: 20px;
      color: var(--haze);
    }
    .dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      margin-left: 5px;
      border-radius: 50%;
      background: var(--porch);
      vertical-align: middle;
    }
    .card.tidy {
      cursor: default;
    }
    .card.tidy p {
      margin: 0 0 12px;
      color: var(--haze);
      line-height: 1.45;
    }
    .card.tidy .secondary {
      width: 100%;
      background: var(--slate-2);
    }
    .point-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 12px;
    }
    .secondary {
      height: 52px;
      border-radius: 26px;
      background: var(--slate);
      font-weight: 650;
      text-align: center;
    }
    .secondary:disabled,
    .link:disabled {
      opacity: 0.45;
      cursor: default;
    }
    .link {
      display: block;
      margin: 20px auto 0;
      padding: 10px;
      background: none;
      color: var(--haze);
      text-align: center;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .link.danger {
      color: var(--error-text);
    }
    .schedule.has-save-bar {
      padding-bottom: 96px;
    }
    .save-bar {
      position: fixed;
      left: 50%;
      bottom: 0;
      z-index: 5;
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 8px;
      width: min(560px, 100%);
      transform: translateX(-50%);
      padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
      background: var(--dusk);
      box-shadow: 0 -8px 24px rgb(0 0 0 / 0.35);
    }
    .save-bar .primary {
      height: 56px;
      margin: 0;
    }
    .save-bar .secondary {
      height: 56px;
      background: var(--slate);
    }
    .chips.two {
      grid-template-columns: 1fr 1fr;
      margin-bottom: 12px;
    }
    .time-stepper {
      gap: 10px;
    }
    .round.small {
      width: 48px;
      height: 48px;
      font-size: 0.8125rem;
      font-weight: 650;
    }
    .stepper.dimmed .stepper-value {
      color: var(--haze);
    }
    .time {
      font-variant-numeric: tabular-nums;
    }
    .swatch {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--slate-2);
    }
    .retry {
      margin-top: 12px;
      padding: 10px 18px;
      border-radius: 999px;
      background: var(--mist);
      color: var(--dusk);
      font-weight: 600;
    }

    .rows {
      display: grid;
      gap: 8px;
    }
    .row {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 4px 12px;
      width: 100%;
      min-height: 64px;
      padding: 12px 16px;
      border-radius: 16px;
      background: var(--slate);
    }
    .row-name {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 650;
    }
    .row-temps {
      display: flex;
      align-items: baseline;
      gap: 8px;
      font-variant-numeric: tabular-nums;
    }
    .row-cur {
      font-size: 1.25rem;
      font-weight: 650;
    }
    .row-sub {
      color: var(--haze);
      font-size: 0.875rem;
    }
    .row.missing .row-sub {
      grid-column: 1 / -1;
    }
    .battery {
      display: inline-grid;
      color: var(--porch);
    }
    .battery svg {
      width: 18px;
      height: 18px;
    }
    .valve {
      grid-column: 1 / -1;
      display: block;
      height: 4px;
      border-radius: 2px;
      overflow: hidden;
      background: var(--slate-2);
    }
    .valve span {
      display: block;
      height: 100%;
      background: var(--warm);
    }
    /* Open, but the boiler's off: no heat is reaching it. */
    .valve.no-heat span {
      background: var(--haze);
    }

    .facts {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 24px 0 0;
    }
    .facts div {
      padding: 12px 16px;
      border-radius: 16px;
      background: var(--slate);
    }
    .facts dt {
      color: var(--haze);
      font-size: 0.875rem;
    }
    .facts dd {
      margin: 2px 0 0;
      font-size: 1.125rem;
      font-weight: 650;
      font-variant-numeric: tabular-nums;
    }
    .facts dd.low {
      color: var(--porch);
    }
    /* Open, but the boiler's off: no heat is reaching it (as the valve bar). */
    .facts dd.no-heat {
      color: var(--haze);
      font-weight: 500;
    }

    .notice.with-action {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .notice.with-action span {
      flex: 1;
    }
    .close {
      flex: none;
      padding: 8px 14px;
      border-radius: 999px;
      background: var(--slate-2);
      font-weight: 600;
    }

    .toast {
      position: fixed;
      left: 50%;
      bottom: calc(96px + env(safe-area-inset-bottom));
      z-index: 20;
      transform: translateX(-50%);
      width: max-content;
      max-width: min(528px, calc(100% - 32px));
      padding: 10px 16px;
      border-radius: 18px;
      background: var(--mist);
      color: var(--dusk);
      font-size: 0.9375rem;
      font-weight: 600;
      line-height: 1.4;
      box-shadow: 0 4px 16px rgb(0 0 0 / 0.3);
    }
    .toast.error {
      background: var(--slate);
      color: var(--mist);
      box-shadow: inset 0 0 0 2px var(--porch), 0 4px 16px rgb(0 0 0 / 0.3);
    }

    .sheet-backdrop {
      position: fixed;
      inset: 0;
      z-index: 10;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      background: rgb(0 0 0 / 0.6);
    }
    .sheet {
      width: 100%;
      max-width: 560px;
      padding: 12px 16px calc(16px + env(safe-area-inset-bottom));
      border-radius: 20px 20px 0 0;
      background: var(--slate);
    }
    .sheet-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 4px 0 8px;
      font-size: 1.0625rem;
      font-weight: 650;
    }
    .sheet-label {
      margin: 16px 0 8px;
      color: var(--haze);
      font-size: 0.875rem;
      font-weight: 600;
    }
    .sheet-text {
      margin: 8px 0 16px;
      line-height: 1.45;
    }
    .chips {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .chip {
      height: 48px;
      border-radius: 24px;
      background: var(--slate-2);
      font-weight: 600;
      text-align: center;
    }
    .chip[aria-pressed="true"] {
      background: var(--mist);
      color: var(--dusk);
    }
    .stepper {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 24px;
    }
    .stepper .round {
      width: 56px;
      height: 56px;
      background: var(--slate-2);
    }
    .stepper .round:disabled {
      opacity: 0.35;
      cursor: default;
    }
    .stepper-value {
      min-width: 3.5ch;
      font-size: 2rem;
      font-weight: 600;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }
    .primary {
      display: block;
      width: 100%;
      height: 72px;
      margin-top: 20px;
      border-radius: 36px;
      background: var(--porch);
      color: var(--on-porch);
      font-size: 1.125rem;
      font-weight: 650;
      text-align: center;
    }
    .primary:disabled {
      opacity: 0.45;
      cursor: default;
    }
    @media (prefers-reduced-motion: no-preference) {
      .sheet {
        animation: rise 0.2s ease-out;
      }
    }
    @keyframes rise {
      from {
        transform: translateY(24px);
        opacity: 0.6;
      }
    }

    @media (prefers-reduced-motion: no-preference) {
      .mode,
      .day-row {
        transition: background 0.2s, color 0.2s;
      }
    }
  `;
}

// Home Assistant can load a new version of the panel into a page that already has the old one
// (e.g. after a restart with a bumped ?v=). Defining a name twice throws, so only define it once;
// the new version takes over on the next full reload.
if (!customElements.get("heating-panel")) customElements.define("heating-panel", HeatingPanel);

declare global {
  interface HTMLElementTagNameMap {
    "heating-panel": HeatingPanel;
  }
}
