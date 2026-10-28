"""Adding a receiver, and its Configure pages (Panel, TPI)."""

from pytest_homeassistant_custom_component.typing import MqttMockHAClient

from custom_components.heating_panel.const import DOMAIN
from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType

from .conftest import TOPIC, setup_receiver

PANEL_FORM = {
    "panel": True,
    "url_path": "heating",
    "sidebar": False,
    "name": "Downstairs",
    "radiators": [],
    "radiators_when": "always",
    "theme": "ha",
    "modes": True,
    "boost": False,
    "override": True,
    "away": True,
}


async def _add(hass: HomeAssistant, topic: str) -> dict:
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    assert result["type"] is FlowResultType.FORM
    return await hass.config_entries.flow.async_configure(result["flow_id"], {"topic": topic})


async def test_add_receiver(hass: HomeAssistant, mqtt_mock: MqttMockHAClient) -> None:
    result = await _add(hass, " zigbee2mqtt/Hive receiver/ ")
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Hive receiver"
    assert result["data"] == {"topic": TOPIC}
    # A new entry sets up the panel at /heating.
    assert result["options"] == {"panel": True, "url_path": "heating"}


async def test_second_receiver_gets_its_own_address(hass: HomeAssistant, mqtt_mock: MqttMockHAClient) -> None:
    await _add(hass, TOPIC)
    result = await _add(hass, "zigbee2mqtt/Annexe receiver")
    assert result["options"] == {"panel": True, "url_path": "heating-2"}


async def test_same_receiver_twice(hass: HomeAssistant, mqtt_mock: MqttMockHAClient) -> None:
    await _add(hass, TOPIC)
    result = await _add(hass, TOPIC)
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "already_configured"


async def test_bad_topics(hass: HomeAssistant, mqtt_mock: MqttMockHAClient) -> None:
    for topic, error in (("", "empty"), ("zigbee2mqtt/#", "wildcard"), (f"{TOPIC}/set", "command_topic")):
        result = await _add(hass, topic)
        assert result["type"] is FlowResultType.FORM
        assert result["errors"] == {"topic": error}


async def test_panel_options(hass: HomeAssistant, mqtt_mock: MqttMockHAClient) -> None:
    # TPI settings saved earlier must survive saving the Panel page.
    entry = await setup_receiver(hass, {"panel": True, "url_path": "heating", "tpi": False, "cycle_minutes": 12.0})
    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["type"] is FlowResultType.MENU
    assert result["menu_options"] == ["panel", "tpi"]

    result = await hass.config_entries.options.async_configure(result["flow_id"], {"next_step_id": "panel"})
    assert result["step_id"] == "panel"
    result = await hass.config_entries.options.async_configure(result["flow_id"], {**PANEL_FORM, "url_path": "climate"})
    assert result["errors"] == {"url_path": "url_path_reserved"}
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {**PANEL_FORM, "url_path": "/Heating-Test/"}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    assert entry.options == {**PANEL_FORM, "url_path": "heating-test", "tpi": False, "cycle_minutes": 12.0}


async def test_tpi_options_keep_the_panel_page(hass: HomeAssistant, mqtt_mock: MqttMockHAClient) -> None:
    entry = await setup_receiver(hass, {"panel": True, "url_path": "heating-test", "radiators": ["climate.bed"]})
    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(result["flow_id"], {"next_step_id": "tpi"})
    assert result["step_id"] == "tpi"
    tpi = {
        "tpi": False,
        "cycle_minutes": 10,
        "coef_int": 0.6,
        "coef_ext": 0.01,
        "min_on_minutes": 3,
        "min_off_minutes": 5,
        "margin_on": 3,
        "margin_off": 1.5,
        "prompt_start": True,
    }
    result = await hass.config_entries.options.async_configure(result["flow_id"], {**tpi, "min_on_minutes": 6})
    assert result["errors"] == {"base": "min_times"}
    result = await hass.config_entries.options.async_configure(result["flow_id"], tpi)
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    assert entry.options == {"panel": True, "url_path": "heating-test", "radiators": ["climate.bed"], **tpi}
