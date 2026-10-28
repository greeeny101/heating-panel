"""Serves the panel's file and registers the panel, so it needs no panel_custom YAML.

The panel's config comes from the integration's options (see panel_config.py), with the entities looked up here:
the receiver sensor this integration makes, and each radiator valve's battery and position sensors on its device.
The file's address carries the integration's version, so browsers fetch it again after an update. The config
names entities by id, so __init__.py registers the panel again when one of them is renamed.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er
from homeassistant.loader import async_get_integration

from .const import (
    CONF_NAME,
    CONF_RADIATORS,
    CONF_RECEIVER_ENTITY,
    CONF_SIDEBAR,
    CONF_TOPIC,
    CONF_URL_PATH,
    DEFAULT_NAME,
    DEFAULT_URL_PATH,
    DOMAIN,
    FRONTEND_URL,
    LOGGER,
    PANEL_ELEMENT,
    PANEL_FILE,
)
from .panel_config import Radiator, Sibling, find_sensors, panel_config, room_name

FRONTEND_DIR = Path(__file__).parent / "frontend"


async def async_serve_frontend(hass: HomeAssistant) -> None:
    """Serve the built panel at /heating_panel/heating-panel.js (once, for every receiver)."""
    await hass.http.async_register_static_paths([StaticPathConfig(FRONTEND_URL, str(FRONTEND_DIR), False)])


def receiver_sensor_id(hass: HomeAssistant, entry: ConfigEntry) -> str | None:
    """The receiver sensor's entity id, as it's called now (it can be renamed)."""
    return er.async_get(hass).async_get_entity_id("sensor", DOMAIN, receiver_sensor_unique_id(entry))


def receiver_sensor_unique_id(entry: ConfigEntry) -> str:
    return f"{entry.entry_id}_receiver"


def guess_receiver_entity(hass: HomeAssistant, topic: str) -> str | None:
    """The receiver's climate entity: zigbee2mqtt names the device after the topic's last part."""
    name = topic.rsplit("/", 1)[-1]
    devices = dr.async_get(hass)
    for entity in er.async_get(hass).entities.values():
        if entity.domain != "climate" or entity.platform != "mqtt" or not entity.device_id:
            continue
        device = devices.async_get(entity.device_id)
        if device and name in (device.name, device.name_by_user):
            return entity.entity_id
    return None


def _radiator(hass: HomeAssistant, entity_id: str) -> Radiator:
    entities = er.async_get(hass)
    entry = entities.async_get(entity_id)
    device = dr.async_get(hass).async_get(entry.device_id) if entry and entry.device_id else None
    state = hass.states.get(entity_id)
    name = (
        (state.attributes.get("friendly_name") if state else None)
        or (entry and entry.name)
        or (device and (device.name_by_user or device.name))
        or (entry and entry.original_name)
    )
    battery = position = None
    if entry and entry.device_id:
        siblings = [
            Sibling(e.entity_id, e.unique_id, e.device_class or e.original_device_class, e.original_name, e.disabled)
            for e in er.async_entries_for_device(entities, entry.device_id)
            if e.domain == "sensor"
        ]
        battery, position = find_sensors(siblings)
    return Radiator(entity_id, room_name(name), position, battery)


def url_path(entry: ConfigEntry) -> str:
    return entry.options.get(CONF_URL_PATH) or DEFAULT_URL_PATH


async def async_register(hass: HomeAssistant, entry: ConfigEntry) -> dict[str, Any] | None:
    """Register this receiver's panel, returning its config. None if its address is already in use (e.g. by
    panel_custom YAML)."""
    path = url_path(entry)
    if path in hass.data.get(frontend.DATA_PANELS, {}):
        LOGGER.warning(
            "Not adding the heating panel at /%s: another panel is already there (panel_custom in configuration.yaml?). "
            "Remove that one, or choose another address under Configure → Panel",
            path,
        )
        return None
    o = entry.options
    topic = entry.data[CONF_TOPIC]
    config = panel_config(
        o,
        topic,
        receiver_sensor_id(hass, entry),
        o.get(CONF_RECEIVER_ENTITY) or guess_receiver_entity(hass, topic),
        [_radiator(hass, e) for e in o.get(CONF_RADIATORS, [])],
    )
    version = (await async_get_integration(hass, DOMAIN)).version
    sidebar = o.get(CONF_SIDEBAR, True)
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=path,
        webcomponent_name=PANEL_ELEMENT,
        sidebar_title=(o.get(CONF_NAME) or DEFAULT_NAME) if sidebar else None,
        sidebar_icon="mdi:radiator" if sidebar else None,
        module_url=f"{FRONTEND_URL}/{PANEL_FILE}?v={version}",
        config=config,
        require_admin=False,
    )
    return config


def remove(hass: HomeAssistant, entry: ConfigEntry) -> None:
    frontend.async_remove_panel(hass, url_path(entry), warn_if_unknown=False)
