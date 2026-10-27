"""Constants for the heating panel integration."""

import logging

DOMAIN = "heating_panel"
LOGGER = logging.getLogger(__package__)

CONF_TOPIC = "topic"
DEFAULT_TOPIC = "zigbee2mqtt/Hive receiver"

SERVICE_SEND = "send"
SERVICE_BUSY = "busy"
ATTR_TOPIC = "topic"
ATTR_COMMAND = "command"
ATTR_PAYLOAD = "payload"
ATTR_BUSY = "busy"

# TPI options (config entry options; see tpi.py)
CONF_TPI = "tpi"
CONF_ROOM_ENTITY = "room_entity"
CONF_OUTDOOR_ENTITY = "outdoor_entity"
CONF_CYCLE_MINUTES = "cycle_minutes"
CONF_COEF_INT = "coef_int"
CONF_COEF_EXT = "coef_ext"
CONF_MIN_ON_MINUTES = "min_on_minutes"
CONF_MIN_OFF_MINUTES = "min_off_minutes"
CONF_MARGIN_ON = "margin_on"
CONF_MARGIN_OFF = "margin_off"
CONF_PROMPT_START = "prompt_start"


# Panel options (config entry options; see panel.py and panel_config.py)
CONF_PANEL = "panel"
CONF_URL_PATH = "url_path"
CONF_SIDEBAR = "sidebar"
CONF_NAME = "name"
CONF_THEME = "theme"
CONF_RECEIVER_ENTITY = "receiver_entity"
CONF_RADIATORS = "radiators"
CONF_RADIATORS_WHEN = "radiators_when"
CONF_MODES = "modes"
CONF_BOOST = "boost"
CONF_OVERRIDE = "override"
CONF_AWAY = "away"
DEFAULT_URL_PATH = "heating"
DEFAULT_NAME = "Heating"

# The panel's element (customElements.define in src/heating-panel.ts) and where its built file is served.
PANEL_ELEMENT = "heating-panel"
FRONTEND_URL = f"/{DOMAIN}"
PANEL_FILE = "heating-panel.js"


def busy_signal(topic: str) -> str:
    """The dispatcher signal telling a receiver's heating mode sensor the panel is (or isn't) sending a change."""
    return f"{DOMAIN}_busy_{topic}"


def panel_setpoint_signal(topic: str) -> str:
    """The dispatcher signal telling a receiver's TPI the temperature the panel just sent (its dial)."""
    return f"{DOMAIN}_panel_setpoint_{topic}"


def tpi_signal(topic: str) -> str:
    """The dispatcher signal telling a receiver's entities its TPI state has changed."""
    return f"{DOMAIN}_tpi_{topic}"
