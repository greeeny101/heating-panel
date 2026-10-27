"""Publishing a command to a receiver: the one place the integration writes to MQTT."""

from __future__ import annotations

import asyncio
import json
from typing import Any

from homeassistant.components import mqtt
from homeassistant.core import HomeAssistant

from .const import LOGGER


# After MQTT is up, how long to let a new subscription reach the broker before asking the receiver anything.
FIRST_READ_DELAY_SECONDS = 5


async def async_publish_command(hass: HomeAssistant, topic: str, command: str, payload: dict[str, Any]) -> None:
    """Publish `payload` to the receiver's /set or /get. Never retained: zigbee2mqtt re-sends a retained /set on every reconnect."""
    body = json.dumps(payload)
    LOGGER.debug("%s/%s → %s", topic, command, body)
    await mqtt.async_publish(hass, f"{topic}/{command}", body, qos=0, retain=False)


async def async_first_read(hass: HomeAssistant, topic: str, schedule: bool = False) -> None:
    """
    Ask the receiver for its state (one message with everything) and, with `schedule`, its weekly schedule (one
    message per day). The receiver reports by itself only now and then, so without this a restart leaves
    everything unknown for a while. Home Assistant sends subscriptions in batches, so this waits for MQTT and then
    a moment, or the replies arrive before anyone's listening (seen at start-up, 21 Oct 2026). If it fails, the
    receiver's own reports will do.
    """
    try:
        if not await mqtt.async_wait_for_mqtt_client(hass):
            return
        await asyncio.sleep(FIRST_READ_DELAY_SECONDS)
        await async_publish_command(hass, topic, "get", {"occupied_heating_setpoint": ""})
        if schedule:
            await async_publish_command(hass, topic, "get", {"weekly_schedule": ""})
    except Exception:  # noqa: BLE001
        LOGGER.warning("Couldn't ask %s for its state", topic, exc_info=True)
