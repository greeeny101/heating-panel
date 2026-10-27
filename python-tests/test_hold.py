import pytest

from heating_panel.hold import HOLD_SECONDS, SendHold
from test_mode import FakeClock


@pytest.fixture
def rig():
    clock = FakeClock()
    signals = []
    return clock, signals, SendHold(signals.append, clock.schedule)


def test_a_set_holds_until_the_timeout_without_the_panel(rig):
    """A page that never says busy (23 Oct 2026): the send itself holds TPI, then lets go."""
    clock, signals, hold = rig
    hold.sent()
    assert signals == [True]
    clock.advance(HOLD_SECONDS - 1)
    assert signals == [True]
    clock.advance(1)
    assert signals == [True, False]


def test_the_panel_finishing_ends_the_hold_straight_away(rig):
    clock, signals, hold = rig
    hold.panel_busy(True)
    hold.sent()
    hold.panel_busy(False)
    assert signals == [True, True, False]
    clock.advance(HOLD_SECONDS * 2)
    assert signals == [True, True, False]


def test_a_long_change_isnt_cut_short(rig):
    """A boost that retries takes about a minute: the timeout mustn't end the panel's hold."""
    clock, signals, hold = rig
    hold.panel_busy(True)
    hold.sent()
    clock.advance(HOLD_SECONDS + 5)
    assert signals == [True, True]
    hold.panel_busy(False)
    assert signals[-1] is False


def test_each_set_restarts_the_hold(rig):
    clock, signals, hold = rig
    hold.sent()
    clock.advance(HOLD_SECONDS - 5)
    hold.sent()
    clock.advance(HOLD_SECONDS - 5)
    assert signals == [True, True]
    clock.advance(5)
    assert signals == [True, True, False]
