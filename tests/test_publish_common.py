import json

from vidgen.publish_common import PublishMetadata, load_tokens, save_tokens


def test_publish_metadata_defaults():
    m = PublishMetadata(title="Hello")
    assert m.description == ""
    assert m.tags == []
    assert m.privacy == "public"
    assert m.made_for_kids is False
    assert m.schedule_time is None


def test_load_tokens_missing_file_returns_empty_dict(tmp_path):
    assert load_tokens(tmp_path / "nope.json") == {}


def test_save_then_load_tokens_roundtrip(tmp_path):
    path = tmp_path / "tokens.json"
    save_tokens(path, {"access_token": "abc", "refresh_token": "xyz"})
    assert load_tokens(path) == {"access_token": "abc", "refresh_token": "xyz"}
    assert json.loads(path.read_text())["access_token"] == "abc"
