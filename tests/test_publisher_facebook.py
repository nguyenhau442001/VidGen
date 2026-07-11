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


def test_init_upload_session_returns_video_id_and_upload_url(monkeypatch):
    monkeypatch.setattr(pub, "FACEBOOK_PAGE_ID", "page123")
    with patch("vidgen.publisher_facebook.requests.post") as mock_post:
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {"video_id": "vid1", "upload_url": "http://rupload/vid1"},
        )
        video_id, upload_url = pub._init_upload_session("page-tok")

    assert video_id == "vid1"
    assert upload_url == "http://rupload/vid1"
    args, kwargs = mock_post.call_args
    assert args[0] == "https://graph.facebook.com/v25.0/page123/video_reels"
    assert kwargs["params"] == {"upload_phase": "start", "access_token": "page-tok"}


def test_init_upload_session_raises_on_failure(monkeypatch):
    monkeypatch.setattr(pub, "FACEBOOK_PAGE_ID", "page123")
    with patch("vidgen.publisher_facebook.requests.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=400, json=lambda: {}, text="bad request")
        with pytest.raises(RuntimeError, match="Upload init failed"):
            pub._init_upload_session("page-tok")


def test_upload_video_chunks_advances_offset_across_chunks(tmp_path):
    video = tmp_path / "v.mp4"
    video.write_bytes(b"a" * 10 + b"b" * 10)  # 20 bytes, chunk_size patched to 10 -> 2 chunks

    resp1 = MagicMock(status_code=200, json=lambda: {"success": True})
    resp2 = MagicMock(status_code=200, json=lambda: {"success": True})

    with patch("vidgen.publisher_facebook.CHUNK_SIZE", 10), \
         patch("vidgen.publisher_facebook.requests.post", side_effect=[resp1, resp2]) as mock_post:
        pub._upload_video_chunks("http://rupload/vid1", video, "page-tok")

    assert mock_post.call_count == 2
    first_headers = mock_post.call_args_list[0].kwargs["headers"]
    second_headers = mock_post.call_args_list[1].kwargs["headers"]
    assert first_headers["offset"] == "0"
    assert second_headers["offset"] == "10"
    assert first_headers["file_size"] == "20"
    assert mock_post.call_args_list[0].kwargs["data"] == b"a" * 10
    assert mock_post.call_args_list[1].kwargs["data"] == b"b" * 10


def test_upload_video_chunks_raises_on_failure_response(tmp_path):
    video = tmp_path / "v.mp4"
    video.write_bytes(b"x" * 10)

    with patch("vidgen.publisher_facebook.requests.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"success": False}, text="rejected")
        with pytest.raises(RuntimeError, match="Chunk upload failed"):
            pub._upload_video_chunks("http://rupload/vid1", video, "page-tok")


def test_upload_video_chunks_raises_on_empty_file(tmp_path):
    video = tmp_path / "v.mp4"
    video.write_bytes(b"")

    with patch("vidgen.publisher_facebook.requests.post") as mock_post:
        with pytest.raises(RuntimeError, match="empty file"):
            pub._upload_video_chunks("http://rupload/vid1", video, "page-tok")
    mock_post.assert_not_called()


def test_finish_upload_success(monkeypatch):
    monkeypatch.setattr(pub, "FACEBOOK_PAGE_ID", "page123")
    with patch("vidgen.publisher_facebook.requests.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"success": True})
        pub._finish_upload("page-tok", "vid1", PublishMetadata(title="T"))

    args, kwargs = mock_post.call_args
    assert args[0] == "https://graph.facebook.com/v25.0/page123/video_reels"
    assert kwargs["params"]["video_id"] == "vid1"
    assert kwargs["params"]["upload_phase"] == "finish"
    assert kwargs["params"]["access_token"] == "page-tok"


def test_finish_upload_raises_when_not_success(monkeypatch):
    monkeypatch.setattr(pub, "FACEBOOK_PAGE_ID", "page123")
    with patch("vidgen.publisher_facebook.requests.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"success": False}, text="rejected")
        with pytest.raises(RuntimeError, match="Publish finish failed"):
            pub._finish_upload("page-tok", "vid1", PublishMetadata(title="T"))


def test_check_publishing_status_complete():
    status_resp = MagicMock(
        status_code=200,
        json=lambda: {"status": {"publishing_phase": {"status": "complete"}}},
    )
    with patch("vidgen.publisher_facebook.requests.get", return_value=status_resp):
        done, terminal_failure, data = pub._check_publishing_status("page-tok", "vid1")
    assert done is True
    assert terminal_failure is False


def test_check_publishing_status_error():
    status_resp = MagicMock(
        status_code=200,
        json=lambda: {"status": {"publishing_phase": {"status": "error", "error_reason": "bad video"}}},
    )
    with patch("vidgen.publisher_facebook.requests.get", return_value=status_resp):
        done, terminal_failure, data = pub._check_publishing_status("page-tok", "vid1")
    assert done is False
    assert terminal_failure is True
    assert data["publishing_phase"]["error_reason"] == "bad video"


def test_check_publishing_status_in_progress():
    status_resp = MagicMock(
        status_code=200,
        json=lambda: {"status": {"publishing_phase": {"status": "in_progress"}}},
    )
    with patch("vidgen.publisher_facebook.requests.get", return_value=status_resp):
        done, terminal_failure, data = pub._check_publishing_status("page-tok", "vid1")
    assert done is False
    assert terminal_failure is False
