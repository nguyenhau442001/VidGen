import json
from unittest.mock import MagicMock, patch

import pytest

from vidgen.publish_common import PublishMetadata, load_tokens, save_tokens, notify_github, poll_until, chunked_resumable_upload


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


def test_notify_github_skips_when_repo_or_token_missing(capsys):
    notify_github("v.mp4", "youtube", "OK", github_repo="", github_token="")
    assert "skipped" in capsys.readouterr().out


@patch("vidgen.publish_common.requests.post")
def test_notify_github_posts_workflow_dispatch_with_platform_and_extra(mock_post):
    mock_post.return_value = MagicMock(status_code=204)

    notify_github(
        "v.mp4", "youtube", "OK",
        github_repo="me/repo", github_token="tok",
        extra={"video_id": "abc123"},
    )

    args, kwargs = mock_post.call_args
    assert args[0] == "https://api.github.com/repos/me/repo/actions/workflows/notify.yml/dispatches"
    assert kwargs["json"]["inputs"] == {
        "video_name": "v.mp4", "platform": "youtube", "status": "OK", "video_id": "abc123",
    }
    assert kwargs["headers"]["Authorization"] == "Bearer tok"


@patch("vidgen.publish_common.requests.post")
def test_notify_github_nonfatal_on_non_204(mock_post, capsys):
    mock_post.return_value = MagicMock(status_code=500, text="boom")
    notify_github("v.mp4", "youtube", "FAIL: x", github_repo="me/repo", github_token="tok")
    assert "non-fatal" in capsys.readouterr().out


@patch("vidgen.publish_common.requests.post", side_effect=Exception("network down"))
def test_notify_github_swallows_request_exceptions(mock_post, capsys):
    notify_github("v.mp4", "youtube", "OK", github_repo="me/repo", github_token="tok")
    assert "non-fatal" in capsys.readouterr().out


def test_poll_until_returns_data_when_done_immediately():
    result = poll_until(lambda: (True, False, {"status": "ok"}), interval=0, max_attempts=3)
    assert result == {"status": "ok"}


def test_poll_until_retries_until_done():
    calls = {"n": 0}

    def check():
        calls["n"] += 1
        if calls["n"] < 3:
            return False, False, {"status": "processing"}
        return True, False, {"status": "ok"}

    result = poll_until(check, interval=0, max_attempts=5)
    assert result == {"status": "ok"}
    assert calls["n"] == 3


def test_poll_until_raises_on_terminal_failure():
    with pytest.raises(RuntimeError, match="Polling failed"):
        poll_until(lambda: (False, True, {"error": "bad"}), interval=0, max_attempts=3)


def test_poll_until_raises_after_max_attempts():
    with pytest.raises(RuntimeError, match="did not complete"):
        poll_until(lambda: (False, False, {}), interval=0, max_attempts=2)


def test_chunked_resumable_upload_single_chunk_success(tmp_path):
    video = tmp_path / "v.mp4"
    video.write_bytes(b"x" * 100)

    with patch("vidgen.publish_common.requests.put") as mock_put:
        mock_put.return_value = MagicMock(status_code=200, json=lambda: {"id": "vid1"})
        resp = chunked_resumable_upload("http://upload", video, chunk_size=1000, put_headers_fn=lambda s, e, t: {})

    assert resp.json() == {"id": "vid1"}
    assert mock_put.call_count == 1
    _, kwargs = mock_put.call_args
    assert kwargs["data"] == b"x" * 100


def test_chunked_resumable_upload_follows_308_then_completes(tmp_path):
    video = tmp_path / "v.mp4"
    video.write_bytes(b"a" * 10 + b"b" * 10)  # 20 bytes, chunk_size=10 -> 2 chunks

    resp_308 = MagicMock(status_code=308, headers={"Range": "bytes=0-9"})
    resp_200 = MagicMock(status_code=200, json=lambda: {"id": "vid2"})

    with patch("vidgen.publish_common.requests.put", side_effect=[resp_308, resp_200]) as mock_put:
        resp = chunked_resumable_upload("http://upload", video, chunk_size=10, put_headers_fn=lambda s, e, t: {})

    assert resp.json() == {"id": "vid2"}
    assert mock_put.call_count == 2
    first_call_data = mock_put.call_args_list[0].kwargs["data"]
    second_call_data = mock_put.call_args_list[1].kwargs["data"]
    assert first_call_data == b"a" * 10
    assert second_call_data == b"b" * 10  # retried chunk starts right after byte 9, not re-sent


def test_chunked_resumable_upload_raises_on_error_status(tmp_path):
    video = tmp_path / "v.mp4"
    video.write_bytes(b"x" * 10)

    with patch("vidgen.publish_common.requests.put") as mock_put:
        mock_put.return_value = MagicMock(status_code=500, text="server error")
        with pytest.raises(RuntimeError, match="Chunk upload failed"):
            chunked_resumable_upload("http://upload", video, chunk_size=10, put_headers_fn=lambda s, e, t: {})
