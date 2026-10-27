import pytest

from heating_panel.topics import TopicError, clean_topic, command_topic

RECEIVER = "zigbee2mqtt/Hive receiver"


class TestCleanTopic:
    def test_tidies(self):
        assert clean_topic("  zigbee2mqtt/Hive receiver/ ") == RECEIVER

    @pytest.mark.parametrize(
        ("topic", "key"),
        [
            ("", "empty"),
            ("  / ", "empty"),
            ("zigbee2mqtt/#", "wildcard"),
            ("zigbee2mqtt/+/set", "wildcard"),
            ("zigbee2mqtt/Hive receiver/set", "command_topic"),
            ("zigbee2mqtt/Hive receiver/get", "command_topic"),
        ],
    )
    def test_refuses(self, topic, key):
        with pytest.raises(TopicError) as err:
            clean_topic(topic)
        assert err.value.key == key


class TestCommandTopic:
    def test_set_and_get_on_a_receiver(self):
        assert command_topic({RECEIVER}, RECEIVER, "set") == f"{RECEIVER}/set"
        assert command_topic({RECEIVER}, RECEIVER, "get") == f"{RECEIVER}/get"

    @pytest.mark.parametrize(
        ("topic", "command", "key"),
        [
            # Only receivers set up in the integration, so the service can't reach other devices.
            ("zigbee2mqtt/Front door lock", "set", "unknown_receiver"),
            ("zigbee2mqtt/bridge/request/restart", "set", "unknown_receiver"),
            ("zigbee2mqtt", "set", "unknown_receiver"),
            # No other suffixes, e.g. availability or a nested topic.
            (RECEIVER, "availability", "command"),
            (RECEIVER, "set/system_mode", "command"),
            (RECEIVER, "", "command"),
        ],
    )
    def test_refuses(self, topic, command, key):
        with pytest.raises(TopicError) as err:
            command_topic({RECEIVER}, topic, command)
        assert err.value.key == key

    def test_nothing_set_up(self):
        with pytest.raises(TopicError):
            command_topic(set(), RECEIVER, "get")
