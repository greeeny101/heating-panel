"""The panel's config, worked out from the integration's options. Plain Python, so it's tested without Home Assistant.

The panel takes the same config as the panel_custom YAML in the README (see src/types.ts); panel.py fills in the
entities from Home Assistant's registries and registers the panel with it.
"""

from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any

from .const import (
    CONF_AWAY,
    CONF_BOOST,
    CONF_MODES,
    CONF_NAME,
    CONF_OVERRIDE,
    CONF_RADIATORS_WHEN,
    CONF_THEME,
    DEFAULT_NAME,
)

THEMES = ["porch", "ha"]
RADIATORS_WHEN = ["heating", "always"]

# Addresses Home Assistant (or HACS) already uses, or keeps for itself.
RESERVED_PATHS = {
    "api", "auth", "calendar", "climate", "config", "developer-tools", "energy", "hacs", "hacsfiles", "history",
    "home", "light", "local", "logbook", "lovelace", "maintenance", "map", "media-browser", "profile", "security",
    "static", "todo",
}  # fmt: skip
URL_PATH = re.compile(r"^[a-z0-9][a-z0-9-]*$")

# Words at the end of a valve's name that say what it is rather than where: "Bedroom radiator TRV" is "Bedroom".
_DEVICE_WORDS = {"radiator", "trv", "valve", "thermostat"}


@dataclass(frozen=True)
class Sibling:
    """A sensor on the same device as a radiator valve."""

    entity_id: str
    unique_id: str
    device_class: str | None
    name: str | None
    disabled: bool = False


@dataclass(frozen=True)
class Radiator:
    entity: str
    name: str | None = None
    position: str | None = None
    battery: str | None = None


def url_path_error(path: str, taken: set[str]) -> str | None:
    """Why the panel can't have this address (a translation key), or None if it can."""
    if not URL_PATH.match(path):
        return "url_path_invalid"
    if path in RESERVED_PATHS:
        return "url_path_reserved"
    if path in taken:
        return "url_path_taken"
    return None


def room_name(name: str | None) -> str | None:
    """The room a valve is in, from its name: "Office front radiator TRV" is "Office front"."""
    if not name:
        return None
    words = name.split()
    while len(words) > 1 and words[-1].lower() in _DEVICE_WORDS:
        words.pop()
    return " ".join(words)


def find_sensors(siblings: list[Sibling]) -> tuple[str | None, str | None]:
    """The valve's battery and position sensors among the sensors on its device, as (battery, position)."""
    battery = position = None
    for s in siblings:
        if s.disabled:
            continue
        if battery is None and s.device_class == "battery":
            battery = s.entity_id
        # zigbee2mqtt's unique ids are "<address>_<property>_zigbee2mqtt"; other integrations call it "Position".
        elif position is None and ("_position_" in s.unique_id or (s.name or "").lower() == "position"):
            position = s.entity_id
    return battery, position


def panel_config(
    options: dict[str, Any],
    topic: str,
    state_entity: str | None,
    receiver_entity: str | None,
    radiators: list[Radiator],
) -> dict[str, Any]:
    """The panel's config, in the same shape as its panel_custom YAML."""
    receiver: dict[str, Any] = {
        "name": options.get(CONF_NAME) or DEFAULT_NAME,
        "topic": topic,
        "controls": {
            "modes": options.get(CONF_MODES, True),
            "boost": options.get(CONF_BOOST, True),
            "override": options.get(CONF_OVERRIDE, True),
            "away": options.get(CONF_AWAY, True),
        },
    }
    if receiver_entity:
        receiver["entity"] = receiver_entity
    if state_entity:
        receiver["state_entity"] = state_entity
    return {
        "theme": options.get(CONF_THEME, THEMES[0]),
        "receiver": receiver,
        "radiators": [{k: v for k, v in vars(r).items() if v is not None} for r in radiators],
        "radiators_when": options.get(CONF_RADIATORS_WHEN, RADIATORS_WHEN[0]),
    }
