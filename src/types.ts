export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
}

/** An event from Home Assistant's `mqtt/subscribe` websocket command. */
export interface MqttMessage {
  topic: string;
  payload: string;
  qos: number;
  retain: boolean;
}

/** The parts of Home Assistant's websocket connection this panel uses. */
export interface HassConnection {
  /** Resolves to an unsubscribe function. */
  subscribeMessage<T>(callback: (msg: T) => void, msg: Record<string, unknown>): Promise<() => Promise<void>>;
}

/** The parts of Home Assistant's `hass` object this panel uses. */
export interface HomeAssistant {
  states: Record<string, HassEntity>;
  connection: HassConnection;
  user?: { is_admin: boolean };
  /** Services by domain; only checked for whether one exists. */
  services?: Record<string, Record<string, unknown>>;
  callWS<T>(msg: Record<string, unknown>): Promise<T>;
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: { entity_id?: string | string[] },
    /** Default true: Home Assistant shows a message if the call fails. */
    notifyOnError?: boolean,
  ): Promise<unknown>;
}

export interface PanelInfo<C> {
  config: C;
  url_path: string;
  title: string | null;
}

export interface BoostConfig {
  /** Default boost length in minutes. Default 15. */
  minutes?: number;
  /** Default boost temperature. Default 22. */
  temperature?: number;
  /** Longest boost offered, in minutes. Default 120 (YAML only). */
  max_minutes?: number;
}

/** Which controls appear for the receiver. Each can be switched off. */
export interface ControlsConfig {
  /** Schedule / Manual / Off buttons. Default true. */
  modes?: boolean;
  /** Boost button (the receiver's emergency heating mode). `true` uses the defaults; false hides it. */
  boost?: boolean | BoostConfig;
  /** Turning the dial on Schedule holds that temperature until the next change. Default true. */
  override?: boolean;
  /** "Going away?" button: a long, low boost that ends by itself at the return time. Default true. */
  away?: boolean;
  /** Temperature while away (5–16°). Default 14. Changeable on the settings screen. */
  away_temperature?: number;
}

export interface ReceiverConfig {
  /** Shown above the dial. Default "Heating". */
  name?: string;
  /** zigbee2mqtt base topic of the receiver, e.g. "zigbee2mqtt/Hive receiver". */
  topic: string;
  /** Climate entity for the receiver, used for basic details when nothing better is available. */
  entity?: string;
  /**
   * MQTT sensor carrying the receiver's reports as attributes (see the README). Needed for people
   * who aren't Home Assistant administrators; without it the panel watches the topic directly.
   */
  state_entity?: string;
  /** Dial range. Default 5 to 32. */
  min_temp?: number;
  max_temp?: number;
  controls?: ControlsConfig;
}

export interface RadiatorConfig {
  /** Room name shown in the list. Defaults to the entity's friendly name. */
  name?: string;
  /** The radiator valve's climate entity. */
  entity: string;
  /** Valve opening sensor (%), shown as a bar. */
  position?: string;
  /** Battery sensor (%); a warning shows below 20%. */
  battery?: string;
}

export interface HeatingConfig {
  /**
   * "porch" (default): the panel family's own dusk-and-amber look.
   * "ha": follow the user's Home Assistant theme, light or dark.
   */
  theme?: "porch" | "ha";
  receiver?: ReceiverConfig;
  radiators?: RadiatorConfig[];
  /** "heating" (default): list radiators only while the boiler is on. "always": always list them. */
  radiators_when?: "heating" | "always";
}
