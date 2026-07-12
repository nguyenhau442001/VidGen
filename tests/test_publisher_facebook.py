import json
import subprocess
import sys
from pathlib import Path
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


def test_build_publish_params_maps_title_and_description():
    params = pub._build_publish_params(PublishMetadata(title="T", description="D"))
    assert params["title"] == "T"
    assert params["description"] == "D"
    assert "published" not in params
    assert "scheduled_publish_time" not in params


def test_build_publish_params_description_falls_back_to_title():
    params = pub._build_publish_params(PublishMetadata(title="T"))
    assert params["description"] == "T"


def test_build_publish_params_warns_on_ignored_fields(capsys):
    pub._build_publish_params(
        PublishMetadata(title="T", tags=["a"], privacy="unlisted", made_for_kids=True),
    )
    out = capsys.readouterr().out
    assert "--tags is ignored" in out
    assert "--privacy=unlisted is ignored" in out
    assert "--made-for-kids is ignored" in out


def test_build_publish_params_schedule_sets_scheduled_state():
    future = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)
    params = pub._build_publish_params(
        PublishMetadata(title="T", schedule_time=future.isoformat()),
    )
    assert params["published"] == "false"
    assert params["scheduled_publish_time"] == int(future.timestamp())


def test_build_publish_params_schedule_too_soon_raises():
    soon = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=2)
    with pytest.raises(ValueError, match="between 10 minutes and 6 months"):
        pub._build_publish_params(PublishMetadata(title="T", schedule_time=soon.isoformat()))


def test_build_publish_params_schedule_too_far_raises():
    far = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=200)
    with pytest.raises(ValueError, match="between 10 minutes and 6 months"):
        pub._build_publish_params(PublishMetadata(title="T", schedule_time=far.isoformat()))


def test_init_upload_session_returns_upload_session_id(tmp_path, monkeypatch):
    monkeypatch.setattr(pub, "FACEBOOK_APP_ID", "app123")
    video = tmp_path / "v.mp4"
    video.write_bytes(b"x" * 20)

    with patch("vidgen.publisher_facebook.requests.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"id": "upload:sess1"})
        upload_session_id = pub._init_upload_session("page-tok", video)

    assert upload_session_id == "upload:sess1"
    args, kwargs = mock_post.call_args
    assert args[0] == "https://graph.facebook.com/v25.0/app123/uploads"
    assert kwargs["params"] == {
        "file_name": "v.mp4",
        "file_length": 20,
        "file_type": "video/mp4",
        "access_token": "page-tok",
    }


def test_init_upload_session_raises_on_failure(tmp_path, monkeypatch):
    monkeypatch.setattr(pub, "FACEBOOK_APP_ID", "app123")
    video = tmp_path / "v.mp4"
    video.write_bytes(b"x" * 20)

    with patch("vidgen.publisher_facebook.requests.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=400, json=lambda: {}, text="bad request")
        with pytest.raises(RuntimeError, match="Upload init failed"):
            pub._init_upload_session("page-tok", video)


def test_upload_video_chunks_advances_offset_and_returns_handle(tmp_path):
    video = tmp_path / "v.mp4"
    video.write_bytes(b"a" * 10 + b"b" * 10)  # 20 bytes, chunk_size patched to 10 -> 2 chunks

    resp1 = MagicMock(status_code=200, json=lambda: {})
    resp2 = MagicMock(status_code=200, json=lambda: {"h": "handle1"})

    with patch("vidgen.publisher_facebook.CHUNK_SIZE", 10), \
         patch("vidgen.publisher_facebook.requests.post", side_effect=[resp1, resp2]) as mock_post:
        handle = pub._upload_video_chunks("upload:sess1", video, "page-tok")

    assert handle == "handle1"
    assert mock_post.call_count == 2
    first_call = mock_post.call_args_list[0]
    second_call = mock_post.call_args_list[1]
    assert first_call.args[0] == "https://graph.facebook.com/v25.0/upload:sess1"
    assert first_call.kwargs["headers"]["file_offset"] == "0"
    assert second_call.kwargs["headers"]["file_offset"] == "10"
    assert first_call.kwargs["data"] == b"a" * 10
    assert second_call.kwargs["data"] == b"b" * 10


def test_upload_video_chunks_raises_on_failure_response(tmp_path):
    video = tmp_path / "v.mp4"
    video.write_bytes(b"x" * 10)

    with patch("vidgen.publisher_facebook.requests.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=400, json=lambda: {}, text="rejected")
        with pytest.raises(RuntimeError, match="Chunk upload failed"):
            pub._upload_video_chunks("upload:sess1", video, "page-tok")


def test_upload_video_chunks_raises_on_empty_file(tmp_path):
    video = tmp_path / "v.mp4"
    video.write_bytes(b"")

    with patch("vidgen.publisher_facebook.requests.post") as mock_post:
        with pytest.raises(RuntimeError, match="empty file"):
            pub._upload_video_chunks("upload:sess1", video, "page-tok")
    mock_post.assert_not_called()


def test_upload_video_chunks_raises_when_no_handle_returned(tmp_path):
    video = tmp_path / "v.mp4"
    video.write_bytes(b"x" * 10)

    with patch("vidgen.publisher_facebook.requests.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {})
        with pytest.raises(RuntimeError, match="no file handle"):
            pub._upload_video_chunks("upload:sess1", video, "page-tok")


def test_finish_upload_success(monkeypatch):
    monkeypatch.setattr(pub, "FACEBOOK_PAGE_ID", "page123")
    with patch("vidgen.publisher_facebook.requests.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"id": "vid42"})
        video_id = pub._finish_upload("page-tok", "handle1", PublishMetadata(title="T"))

    assert video_id == "vid42"
    args, kwargs = mock_post.call_args
    assert args[0] == "https://graph.facebook.com/v25.0/page123/videos"
    assert kwargs["params"]["fbuploader_video_file_chunk"] == "handle1"
    assert kwargs["params"]["access_token"] == "page-tok"


def test_finish_upload_raises_when_no_id(monkeypatch):
    monkeypatch.setattr(pub, "FACEBOOK_PAGE_ID", "page123")
    with patch("vidgen.publisher_facebook.requests.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=400, json=lambda: {}, text="rejected")
        with pytest.raises(RuntimeError, match="Publish failed"):
            pub._finish_upload("page-tok", "handle1", PublishMetadata(title="T"))


def test_check_publishing_status_ready():
    status_resp = MagicMock(
        status_code=200,
        json=lambda: {"status": {"video_status": "ready"}},
    )
    with patch("vidgen.publisher_facebook.requests.get", return_value=status_resp):
        done, terminal_failure, data = pub._check_publishing_status("page-tok", "vid1")
    assert done is True
    assert terminal_failure is False


def test_check_publishing_status_error():
    status_resp = MagicMock(
        status_code=200,
        json=lambda: {"status": {"video_status": "error"}},
    )
    with patch("vidgen.publisher_facebook.requests.get", return_value=status_resp):
        done, terminal_failure, data = pub._check_publishing_status("page-tok", "vid1")
    assert done is False
    assert terminal_failure is True
    assert data["video_status"] == "error"


def test_check_publishing_status_in_progress():
    status_resp = MagicMock(
        status_code=200,
        json=lambda: {"status": {"video_status": "processing"}},
    )
    with patch("vidgen.publisher_facebook.requests.get", return_value=status_resp):
        done, terminal_failure, data = pub._check_publishing_status("page-tok", "vid1")
    assert done is False
    assert terminal_failure is False


def test_publish_video_on_facebook_raises_for_missing_file(tmp_path):
    with pytest.raises(FileNotFoundError):
        pub.publish_video_on_facebook(tmp_path / "missing.mp4", PublishMetadata(title="T"))


def test_publish_video_on_facebook_happy_path(tmp_path, monkeypatch):
    video = tmp_path / "v.mp4"
    video.write_bytes(b"x" * 100)

    monkeypatch.setattr(pub, "_get_page_token", lambda: "page-tok")
    monkeypatch.setattr(pub, "_init_upload_session", lambda token, path: "upload:sess1")
    monkeypatch.setattr(pub, "_upload_video_chunks", lambda session_id, path, token: "handle1")
    monkeypatch.setattr(pub, "_finish_upload", lambda token, handle, meta: "vid42")
    monkeypatch.setattr(
        pub, "_check_publishing_status",
        lambda token, vid: (True, False, {"video_status": "ready"}),
    )

    with patch("vidgen.publisher_facebook.notify_github") as mock_notify:
        result = pub.publish_video_on_facebook(video, PublishMetadata(title="T"))

    assert result == {"video_id": "vid42", "status": "succeeded", "url": "https://www.facebook.com/watch/?v=vid42"}
    assert mock_notify.call_args.kwargs["status"] == "OK"
    assert mock_notify.call_args.kwargs["platform"] == "facebook"


def test_publish_video_on_facebook_notifies_and_reraises_on_failure(tmp_path, monkeypatch):
    video = tmp_path / "v.mp4"
    video.write_bytes(b"x" * 10)

    def boom():
        raise RuntimeError("no page token")

    monkeypatch.setattr(pub, "_get_page_token", boom)

    with patch("vidgen.publisher_facebook.notify_github") as mock_notify:
        with pytest.raises(RuntimeError, match="no page token"):
            pub.publish_video_on_facebook(video, PublishMetadata(title="T"))

    assert "FAIL" in mock_notify.call_args.kwargs["status"]


def test_delete_video_on_facebook_success(monkeypatch):
    monkeypatch.setattr(pub, "_get_page_token", lambda: "page-tok")
    with patch("vidgen.publisher_facebook.requests.delete") as mock_delete:
        mock_delete.return_value = MagicMock(status_code=200, json=lambda: {"success": True})
        pub.delete_video_on_facebook("vid1")

    args, kwargs = mock_delete.call_args
    assert args[0] == "https://graph.facebook.com/v25.0/vid1"
    assert kwargs["params"] == {"access_token": "page-tok"}


def test_delete_video_on_facebook_raises_on_failure(monkeypatch):
    monkeypatch.setattr(pub, "_get_page_token", lambda: "page-tok")
    with patch("vidgen.publisher_facebook.requests.delete") as mock_delete:
        mock_delete.return_value = MagicMock(status_code=400, json=lambda: {"success": False}, text="error")
        with pytest.raises(RuntimeError, match="Delete failed"):
            pub.delete_video_on_facebook("vid1")


def test_setup_guide_flag_prints_guide_and_exits_zero():
    result = subprocess.run(
        [sys.executable, "-m", "vidgen.publisher_facebook", "--setup-guide"],
        capture_output=True, text=True, cwd=str(Path(__file__).parent.parent),
    )
    assert result.returncode == 0
    assert "Meta for Developers" in result.stdout
    assert "FACEBOOK_APP_ID" in result.stdout


def test_cli_without_video_or_flags_prints_help_and_exits_nonzero():
    result = subprocess.run(
        [sys.executable, "-m", "vidgen.publisher_facebook"],
        capture_output=True, text=True, cwd=str(Path(__file__).parent.parent),
    )
    assert result.returncode != 0
    assert "usage" in result.stdout.lower() or "usage" in result.stderr.lower()


def test_run_oauth_flow_saves_page_token_for_matching_page(monkeypatch, tmp_path):
    monkeypatch.setattr(pub, "FACEBOOK_APP_ID", "app-id")
    monkeypatch.setattr(pub, "FACEBOOK_APP_SECRET", "app-secret")
    monkeypatch.setattr(pub, "FACEBOOK_PAGE_ID", "page123")
    tokens_file = tmp_path / "tokens.json"
    monkeypatch.setattr(pub, "TOKENS_FILE", tokens_file)

    code_resp = MagicMock(status_code=200, json=lambda: {"access_token": "short-lived"})
    long_resp = MagicMock(status_code=200, json=lambda: {"access_token": "long-lived"})
    accounts_resp = MagicMock(status_code=200, json=lambda: {"data": [
        {"id": "page999", "access_token": "wrong-page-tok"},
        {"id": "page123", "access_token": "right-page-tok"},
    ]})

    with patch("vidgen.publisher_facebook.run_oauth_local_server", return_value="auth-code"), \
         patch("vidgen.publisher_facebook.requests.get", side_effect=[code_resp, long_resp, accounts_resp]):
        pub._run_oauth_flow()

    saved = json.loads(tokens_file.read_text())
    assert saved == {"page_access_token": "right-page-tok", "page_id": "page123"}


def test_run_oauth_flow_exits_when_page_not_found(monkeypatch, tmp_path):
    monkeypatch.setattr(pub, "FACEBOOK_APP_ID", "app-id")
    monkeypatch.setattr(pub, "FACEBOOK_APP_SECRET", "app-secret")
    monkeypatch.setattr(pub, "FACEBOOK_PAGE_ID", "page123")
    monkeypatch.setattr(pub, "TOKENS_FILE", tmp_path / "tokens.json")

    code_resp = MagicMock(status_code=200, json=lambda: {"access_token": "short-lived"})
    long_resp = MagicMock(status_code=200, json=lambda: {"access_token": "long-lived"})
    accounts_resp = MagicMock(status_code=200, json=lambda: {"data": [{"id": "page999", "access_token": "x"}]})

    with patch("vidgen.publisher_facebook.run_oauth_local_server", return_value="auth-code"), \
         patch("vidgen.publisher_facebook.requests.get", side_effect=[code_resp, long_resp, accounts_resp]):
        with pytest.raises(SystemExit):
            pub._run_oauth_flow()
