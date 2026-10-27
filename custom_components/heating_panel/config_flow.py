"""Setting up the heating panel integration: one entry per receiver, by its zigbee2mqtt topic.

The options (Configure) set up the receiver's panel (see panel.py), and turn TPI on for it and tune it (see tpi.py).
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import (
    CONF_AWAY,
    CONF_BOOST,
    CONF_COEF_EXT,
    CONF_COEF_INT,
    CONF_CYCLE_MINUTES,
    CONF_MARGIN_OFF,
    CONF_MARGIN_ON,
    CONF_MIN_OFF_MINUTES,
    CONF_MIN_ON_MINUTES,
    CONF_MODES,
    CONF_NAME,
    CONF_OUTDOOR_ENTITY,
    CONF_OVERRIDE,
    CONF_PANEL,
    CONF_PROMPT_START,
    CONF_RADIATORS,
    CONF_RADIATORS_WHEN,
    CONF_RECEIVER_ENTITY,
    CONF_ROOM_ENTITY,
    CONF_SIDEBAR,
    CONF_THEME,
    CONF_TOPIC,
    CONF_TPI,
    CONF_URL_PATH,
    DEFAULT_NAME,
    DEFAULT_TOPIC,
    DEFAULT_URL_PATH,
    DOMAIN,
)
from .panel_config import RADIATORS_WHEN, THEMES, url_path_error
from .topics import TopicError, clean_topic
from .tpi import Settings


def _url_paths(flow: ConfigFlow | OptionsFlow, but: ConfigEntry | None = None) -> set[str]:
    """The addresses other receivers' panels have."""
    return {
        e.options.get(CONF_URL_PATH) or DEFAULT_URL_PATH
        for e in flow.hass.config_entries.async_entries(DOMAIN)
        if e is not but and e.options.get(CONF_PANEL)
    }


class HeatingPanelConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1
    # 2: the options set up the panel (entries from before keep their panel_custom YAML; see async_migrate_entry).
    MINOR_VERSION = 2

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return HeatingPanelOptionsFlow()

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            try:
                topic = clean_topic(user_input[CONF_TOPIC])
            except TopicError as err:
                errors[CONF_TOPIC] = err.key
            else:
                await self.async_set_unique_id(topic)
                self._abort_if_unique_id_configured()
                # /heating, or /heating-2 and so on for more receivers.
                taken = _url_paths(self)
                paths = (DEFAULT_URL_PATH if n == 1 else f"{DEFAULT_URL_PATH}-{n}" for n in range(1, 100))
                path = next(p for p in paths if p not in taken)
                return self.async_create_entry(
                    title=topic.rsplit("/", 1)[-1],
                    data={CONF_TOPIC: topic},
                    options={CONF_PANEL: True, CONF_URL_PATH: path},
                )
        default = (user_input or {}).get(CONF_TOPIC, DEFAULT_TOPIC)
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({vol.Required(CONF_TOPIC, default=default): str}),
            errors=errors,
        )


def _number(minimum: float, maximum: float, step: float, unit: str | None = None) -> selector.NumberSelector:
    config = selector.NumberSelectorConfig(min=minimum, max=maximum, step=step, mode=selector.NumberSelectorMode.BOX)
    # A unit of None is refused (it must be text), so leave it out when there isn't one.
    if unit:
        config["unit_of_measurement"] = unit
    return selector.NumberSelector(config)


def _temperature_entity(domains: list[str]) -> selector.EntitySelector:
    return selector.EntitySelector(selector.EntitySelectorConfig(domain=domains))


def _select(options: list[str], key: str) -> selector.SelectSelector:
    return selector.SelectSelector(selector.SelectSelectorConfig(options=options, translation_key=key))


class HeatingPanelOptionsFlow(OptionsFlow):
    """The panel, and TPI: on or off, where its temperatures come from, and its tuning."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        return self.async_show_menu(step_id="init", menu_options=["panel", "tpi"])

    def _save(self, user_input: dict[str, Any], keys: set[str]) -> ConfigFlowResult:
        """Keep the other page's options; an optional field left blank is dropped."""
        kept = {k: v for k, v in self.config_entry.options.items() if k not in keys}
        return self.async_create_entry(data={**kept, **user_input})

    async def async_step_panel(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            path = user_input[CONF_URL_PATH] = user_input[CONF_URL_PATH].strip().strip("/").lower()
            if error := url_path_error(path, _url_paths(self, self.config_entry)):
                errors[CONF_URL_PATH] = error
            else:
                return self._save(user_input, PANEL_KEYS)

        o = {**self.config_entry.options, **(user_input or {})}
        schema = vol.Schema(
            {
                vol.Required(CONF_PANEL, default=o.get(CONF_PANEL, True)): bool,
                vol.Required(CONF_URL_PATH, default=o.get(CONF_URL_PATH) or DEFAULT_URL_PATH): str,
                vol.Required(CONF_SIDEBAR, default=o.get(CONF_SIDEBAR, True)): bool,
                vol.Required(CONF_NAME, default=o.get(CONF_NAME) or DEFAULT_NAME): str,
                vol.Optional(CONF_RADIATORS, default=o.get(CONF_RADIATORS, [])): selector.EntitySelector(
                    selector.EntitySelectorConfig(domain="climate", multiple=True)
                ),
                vol.Required(CONF_RADIATORS_WHEN, default=o.get(CONF_RADIATORS_WHEN, RADIATORS_WHEN[0])): _select(
                    RADIATORS_WHEN, CONF_RADIATORS_WHEN
                ),
                # Optional with a suggestion rather than a default, so it can be cleared (back to the guess).
                vol.Optional(
                    CONF_RECEIVER_ENTITY, description={"suggested_value": o.get(CONF_RECEIVER_ENTITY)}
                ): selector.EntitySelector(selector.EntitySelectorConfig(domain="climate")),
                vol.Required(CONF_THEME, default=o.get(CONF_THEME, THEMES[0])): _select(THEMES, CONF_THEME),
                vol.Required(CONF_MODES, default=o.get(CONF_MODES, True)): bool,
                vol.Required(CONF_BOOST, default=o.get(CONF_BOOST, True)): bool,
                vol.Required(CONF_OVERRIDE, default=o.get(CONF_OVERRIDE, True)): bool,
                vol.Required(CONF_AWAY, default=o.get(CONF_AWAY, True)): bool,
            }
        )
        return self.async_show_form(step_id="panel", data_schema=schema, errors=errors)

    async def async_step_tpi(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            if user_input[CONF_MIN_ON_MINUTES] + user_input[CONF_MIN_OFF_MINUTES] > user_input[CONF_CYCLE_MINUTES]:
                errors["base"] = "min_times"
            else:
                return self._save(user_input, TPI_KEYS)

        o = {**self.config_entry.options, **(user_input or {})}
        d = Settings()

        def suggested(key: str) -> dict[str, Any]:
            return {"suggested_value": o.get(key)}

        schema = vol.Schema(
            {
                vol.Required(CONF_TPI, default=o.get(CONF_TPI, False)): bool,
                # Optional with a suggestion rather than a default, so it can be cleared (back to the receiver).
                vol.Optional(CONF_ROOM_ENTITY, description=suggested(CONF_ROOM_ENTITY)): _temperature_entity(
                    ["sensor", "input_number"]
                ),
                vol.Optional(CONF_OUTDOOR_ENTITY, description=suggested(CONF_OUTDOOR_ENTITY)): _temperature_entity(
                    ["sensor", "weather", "input_number"]
                ),
                vol.Required(CONF_CYCLE_MINUTES, default=o.get(CONF_CYCLE_MINUTES, d.cycle_minutes)): _number(
                    5, 30, 1, "min"
                ),
                vol.Required(CONF_COEF_INT, default=o.get(CONF_COEF_INT, d.coef_int)): _number(0.05, 2, 0.05),
                vol.Required(CONF_COEF_EXT, default=o.get(CONF_COEF_EXT, d.coef_ext)): _number(0, 0.1, 0.005),
                vol.Required(CONF_MIN_ON_MINUTES, default=o.get(CONF_MIN_ON_MINUTES, d.min_on_minutes)): _number(
                    1, 10, 0.5, "min"
                ),
                # Hive keeps at least 5 minutes between "on" periods anyway.
                vol.Required(CONF_MIN_OFF_MINUTES, default=o.get(CONF_MIN_OFF_MINUTES, d.min_off_minutes)): _number(
                    5, 15, 0.5, "min"
                ),
                vol.Required(CONF_MARGIN_ON, default=o.get(CONF_MARGIN_ON, d.margin_on)): _number(1, 5, 0.5, "°C"),
                vol.Required(CONF_MARGIN_OFF, default=o.get(CONF_MARGIN_OFF, d.margin_off)): _number(1, 3, 0.5, "°C"),
                vol.Required(CONF_PROMPT_START, default=o.get(CONF_PROMPT_START, d.prompt_start)): bool,
            }
        )
        return self.async_show_form(step_id="tpi", data_schema=schema, errors=errors)


PANEL_KEYS = {
    CONF_PANEL, CONF_URL_PATH, CONF_SIDEBAR, CONF_NAME, CONF_RADIATORS, CONF_RADIATORS_WHEN, CONF_RECEIVER_ENTITY,
    CONF_THEME, CONF_MODES, CONF_BOOST, CONF_OVERRIDE, CONF_AWAY,
}  # fmt: skip
TPI_KEYS = {
    CONF_TPI, CONF_ROOM_ENTITY, CONF_OUTDOOR_ENTITY, CONF_CYCLE_MINUTES, CONF_COEF_INT, CONF_COEF_EXT,
    CONF_MIN_ON_MINUTES, CONF_MIN_OFF_MINUTES, CONF_MARGIN_ON, CONF_MARGIN_OFF, CONF_PROMPT_START,
}  # fmt: skip
