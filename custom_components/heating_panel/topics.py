"""Which MQTT topics the heating panel may write to: only a set-up receiver's /set and /get.

Plain Python (no Home Assistant imports), so python-tests can load it on its own.
"""

from __future__ import annotations

COMMANDS = ("set", "get")


class TopicError(ValueError):
    """A topic or command the integration won't publish to. `key` names the reason (config flow error keys)."""

    def __init__(self, key: str, message: str) -> None:
        super().__init__(message)
        self.key = key


def clean_topic(topic: str) -> str:
    """A receiver's zigbee2mqtt base topic as typed in the config flow, tidied, or TopicError."""
    topic = (topic or "").strip().rstrip("/")
    if not topic:
        raise TopicError("empty", "Enter the receiver's topic.")
    if "+" in topic or "#" in topic:
        raise TopicError("wildcard", "A receiver's topic can't contain + or #.")
    if topic.rsplit("/", 1)[-1] in COMMANDS:
        raise TopicError("command_topic", "Enter the receiver's own topic, without /set or /get.")
    return topic


def command_topic(receivers: set[str], topic: str, command: str) -> str:
    """Where a command for `topic` goes, if `topic` is a set-up receiver and `command` is set or get."""
    if command not in COMMANDS:
        raise TopicError("command", f"The command must be set or get, not “{command}”.")
    check_receiver(receivers, topic)
    return f"{topic}/{command}"


def check_receiver(receivers: set[str], topic: str) -> None:
    """TopicError unless `topic` is a receiver set up in the integration."""
    if topic not in receivers:
        raise TopicError(
            "unknown_receiver",
            f"“{topic}” isn't a receiver set up in the Heating panel integration (Settings → Devices & services).",
        )
