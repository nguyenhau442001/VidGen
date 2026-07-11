from unittest.mock import MagicMock, patch

import pytest

import vidgen.publisher_facebook as pub


def test_get_page_token_raises_when_no_token_saved(tmp_path, monkeypatch):
    monkeypatch.setattr(pub, "TOKENS_FILE", tmp_path / "none.json")
    with pytest.raises(RuntimeError, match="No Facebook Page access token"):
        pub._get_page_token()


def test_get_page_token_returns_existing_token(tmp_path, monkeypatch):
    tokens_file = tmp_path / "tokens.json"
    tokens_file.write_text('{"page_access_token": "page-tok", "page_id": "123"}')
    monkeypatch.setattr(pub, "TOKENS_FILE", tokens_file)
    assert pub._get_page_token() == "page-tok"


import datetime

from vidgen.publish_common import PublishMetadata


def test_build_finish_params_maps_title_and_description():
    params = pub._build_finish_params(PublishMetadata(title="T", description="D"), "vid1")
    assert params["video_id"] == "vid1"
    assert params["upload_phase"] == "finish"
    assert params["title"] == "T"
    assert params["description"] == "D"
    assert params["video_state"] == "PUBLISHED"


def test_build_finish_params_description_falls_back_to_title():
    params = pub._build_finish_params(PublishMetadata(title="T"), "vid1")
    assert params["description"] == "T"


def test_build_finish_params_warns_on_ignored_fields(capsys):
    pub._build_finish_params(
        PublishMetadata(title="T", tags=["a"], privacy="unlisted", made_for_kids=True), "vid1",
    )
    out = capsys.readouterr().out
    assert "--tags is ignored" in out
    assert "--privacy=unlisted is ignored" in out
    assert "--made-for-kids is ignored" in out


def test_build_finish_params_schedule_sets_scheduled_state():
    future = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)
    params = pub._build_finish_params(
        PublishMetadata(title="T", schedule_time=future.isoformat()), "vid1",
    )
    assert params["video_state"] == "SCHEDULED"
    assert params["scheduled_publish_time"] == int(future.timestamp())


def test_build_finish_params_schedule_too_soon_raises():
    soon = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=2)
    with pytest.raises(ValueError, match="between 10 minutes and 29 days"):
        pub._build_finish_params(PublishMetadata(title="T", schedule_time=soon.isoformat()), "vid1")


def test_build_finish_params_schedule_too_far_raises():
    far = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=40)
    with pytest.raises(ValueError, match="between 10 minutes and 29 days"):
        pub._build_finish_params(PublishMetadata(title="T", schedule_time=far.isoformat()), "vid1")
