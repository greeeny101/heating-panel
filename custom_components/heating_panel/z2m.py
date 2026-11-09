"""What zigbee2mqtt does to the receiver's properties on the way through, in one place.

The same rules as the panel's src/z2m.ts. See docs/receiver-protocol.md ("zigbee2mqtt 2.8 and later",
"Dual-channel receivers").

Plain Python (no Home Assistant imports), so python-tests can load it on its own.
"""

from __future__ import annotations

from typing import Any

# The receiver's properties the integration reads and writes, as zigbee2mqtt names them on a heating-only receiver.
PROPERTIES = (
    "system_mode",
    "running_state",
    "occupied_heating_setpoint",
    "local_temperature",
    "temperature_setpoint_hold",
    "temperature_setpoint_hold_duration",
    "weekly_schedule",
)

# A dual-channel receiver (SLR2, SLR2b, SLR2c) has a heating and a hot water endpoint, and zigbee2mqtt names every
# property after its endpoint: system_mode_heat, system_mode_water.
HEAT = "_heat"
WATER = "_water"

# Hold length meaning "no end".
NO_END = 65535


def is_dual_channel(payload: dict[str, Any]) -> bool:
    """Whether a report comes from a dual-channel receiver."""
    return any(f"{k}{HEAT}" in payload for k in PROPERTIES)


def from_z2m(payload: dict[str, Any]) -> dict[str, Any]:
    """
    A report with the heating-only names. From a dual-channel receiver, that's the heating endpoint's values: hot
    water is left out, and so are the plain names, which only hold whatever was last written without an endpoint.
    """
    if not is_dual_channel(payload):
        return payload
    out: dict[str, Any] = {}
    for key, value in payload.items():
        if key.endswith(HEAT):
            name = key.removesuffix(HEAT)
            if name in PROPERTIES:
                out[name] = value
        elif not key.endswith(WATER) and key not in PROPERTIES:
            out[key] = value
    return out


def to_z2m(payload: dict[str, Any], dual: bool) -> dict[str, Any]:
    """A /set or /get payload for the heating endpoint: zigbee2mqtt sends a key ending _heat there."""
    return {f"{k}{HEAT}": v for k, v in payload.items()} if dual else payload


def is_no_end(report: dict[str, Any]) -> bool:
    """
    The hold has no end. zigbee2mqtt 2.6.1 and later report 65535 as null (the Zigbee "no value"), older ones as
    65535; a report without the hold length at all says nothing.
    """
    key = "temperature_setpoint_hold_duration"
    return key in report and (report[key] is None or report[key] == NO_END)
