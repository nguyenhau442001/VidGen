import datetime

import pytest
import requests

from vidgen.publishing import youtube
from vidgen.publishing.common import PublishMetadata


class FakeResponse:
    def __init__(self, status_code=200, json_data=None, text="", headers=None):
        self.status_code = status_code
        self._json_data = json_data if json_data is not None else {}
        self.text = text
        self.headers = headers or {}

    def json(self):
        return self._json_data

    def raise_for_status(self):
        if not (200 <= self.status_code < 300):
            raise requests.HTTPError(f"HTTP {self.status_code}")


def _metadata(**overrides):
    base = dict(title="Test title", description="desc", tags=["a"], privacy="public",
                made_for_kids=False, schedule_time=None)
    base.update(overrides)
    return PublishMetadata(**base)


# ── _build_video_resource ────────────────────────────────────────────────────

def test_build_video_resource_appends_shorts_suffix_and_truncates():
    long_title = "x" * 120
    body = youtube._build_video_resource(_metadata(title=long_title))

    title = body["snippet"]["title"]
    assert title.endswith(" #Shorts")
    assert len(title) == 100


def test_build_video_resource_leaves_existing_shorts_tag_case_insensitive():
    body = youtube._build_video_resource(_metadata(title="My video #SHORTS"))
    assert body["snippet"]["title"] == "My video #SHORTS"


def test_build_video_resource_naive_schedule_treated_as_utc():
    body = youtube._build_video_resource(_metadata(schedule_time="2026-08-01T10:00:00"))

    assert body["status"]["privacyStatus"] == "private"
    assert body["status"]["publishAt"] == "2026-08-01T10:00:00Z"


# ── _refresh_access_token ────────────────────────────────────────────────────

def test_refresh_access_token_builds_correct_request(monkeypatch):
    captured = {}

    def fake_post(url, data=None):
        captured["url"] = url
        captured["data"] = data
        return FakeResponse(status_code=200, json_data={"access_token": "new", "expires_in": 3600})

    monkeypatch.setattr(requests, "post", fake_post)

    result = youtube._refresh_access_token("refresh-tok")

    assert captured["url"] == youtube.TOKEN_URL
    assert captured["data"]["refresh_token"] == "refresh-tok"
    assert captured["data"]["grant_type"] == "refresh_token"
    assert result == {"access_token": "new", "refresh_token": "refresh-tok", "expires_in": 3600}


def test_refresh_access_token_non_200_raises(monkeypatch):
    monkeypatch.setattr(requests, "post", lambda *a, **k: FakeResponse(status_code=400, json_data={"error": "bad"}))

    with pytest.raises(RuntimeError, match="Token refresh failed"):
        youtube._refresh_access_token("refresh-tok")


# ── _get_valid_token ──────────────────────────────────────────────────────────

def test_get_valid_token_no_token_raises(monkeypatch, tmp_path):
    monkeypatch.setattr(youtube, "TOKENS_FILE", tmp_path / "tokens.json")

    with pytest.raises(RuntimeError, match="No YouTube access token"):
        youtube._get_valid_token()


def test_get_valid_token_refreshes_on_401(monkeypatch, tmp_path):
    tokens_file = tmp_path / "tokens.json"
    monkeypatch.setattr(youtube, "TOKENS_FILE", tokens_file)
    youtube.save_tokens(tokens_file, {"access_token": "expired", "refresh_token": "refresh-tok"})

    monkeypatch.setattr(requests, "get", lambda *a, **k: FakeResponse(status_code=401))
    monkeypatch.setattr(youtube, "_refresh_access_token",
                         lambda rt: {"access_token": "fresh", "refresh_token": rt, "expires_in": 3600})

    token = youtube._get_valid_token()

    assert token == "fresh"
    assert youtube.load_tokens(tokens_file)["access_token"] == "fresh"


def test_get_valid_token_401_without_refresh_token_raises(monkeypatch, tmp_path):
    tokens_file = tmp_path / "tokens.json"
    monkeypatch.setattr(youtube, "TOKENS_FILE", tokens_file)
    youtube.save_tokens(tokens_file, {"access_token": "expired"})

    monkeypatch.setattr(requests, "get", lambda *a, **k: FakeResponse(status_code=401))

    with pytest.raises(RuntimeError, match="No refresh token available"):
        youtube._get_valid_token()


def test_get_valid_token_valid_token_returned_as_is(monkeypatch, tmp_path):
    tokens_file = tmp_path / "tokens.json"
    monkeypatch.setattr(youtube, "TOKENS_FILE", tokens_file)
    youtube.save_tokens(tokens_file, {"access_token": "still-good"})

    monkeypatch.setattr(requests, "get", lambda *a, **k: FakeResponse(status_code=200))

    assert youtube._get_valid_token() == "still-good"


# ── _init_resumable_session ──────────────────────────────────────────────────

def test_init_resumable_session_success(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x" * 10)

    monkeypatch.setattr(requests, "post",
                         lambda *a, **k: FakeResponse(status_code=200, headers={"Location": "http://upload-url"}))

    url = youtube._init_resumable_session("tok", video, _metadata())
    assert url == "http://upload-url"


def test_init_resumable_session_missing_location_raises(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x" * 10)

    monkeypatch.setattr(requests, "post", lambda *a, **k: FakeResponse(status_code=200, headers={}))

    with pytest.raises(RuntimeError, match="Upload init failed"):
        youtube._init_resumable_session("tok", video, _metadata())


def test_init_resumable_session_non_200_raises(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x" * 10)

    monkeypatch.setattr(requests, "post", lambda *a, **k: FakeResponse(status_code=500, text="err"))

    with pytest.raises(RuntimeError, match="Upload init failed"):
        youtube._init_resumable_session("tok", video, _metadata())


# ── publish_video_on_youtube ─────────────────────────────────────────────────

def test_publish_video_on_youtube_missing_file_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        youtube.publish_video_on_youtube(tmp_path / "missing.mp4", _metadata())


def test_publish_video_on_youtube_happy_path(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x" * 10)

    monkeypatch.setattr(youtube, "_get_valid_token", lambda: "tok")
    monkeypatch.setattr(youtube, "_init_resumable_session", lambda tok, path, meta: "http://upload-url")
    monkeypatch.setattr(youtube, "chunked_resumable_upload",
                         lambda *a, **k: FakeResponse(status_code=200, json_data={"id": "vid123"}))
    monkeypatch.setattr(requests, "get",
                         lambda *a, **k: FakeResponse(status_code=200, json_data={
                             "items": [{"processingDetails": {"processingStatus": "succeeded"}}]
                         }))

    notify_calls = []
    monkeypatch.setattr(youtube, "notify_github", lambda **kwargs: notify_calls.append(kwargs))
    monkeypatch.setattr(youtube.time, "sleep", lambda s: None)

    result = youtube.publish_video_on_youtube(video, _metadata())

    assert result == {"video_id": "vid123", "status": "succeeded", "url": "https://youtu.be/vid123"}
    assert notify_calls[-1]["status"] == "OK"


def test_publish_video_on_youtube_failure_notifies_then_reraises(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x" * 10)

    def boom():
        raise RuntimeError("token refresh failed")

    monkeypatch.setattr(youtube, "_get_valid_token", boom)

    notify_calls = []
    monkeypatch.setattr(youtube, "notify_github", lambda **kwargs: notify_calls.append(kwargs))

    with pytest.raises(RuntimeError, match="token refresh failed"):
        youtube.publish_video_on_youtube(video, _metadata())

    assert "FAIL" in notify_calls[-1]["status"]


# ── delete_video_on_youtube ──────────────────────────────────────────────────

def test_delete_video_on_youtube_success(monkeypatch):
    monkeypatch.setattr(youtube, "_get_valid_token", lambda: "tok")
    monkeypatch.setattr(requests, "delete", lambda *a, **k: FakeResponse(status_code=204))

    youtube.delete_video_on_youtube("vid123")  # should not raise


def test_delete_video_on_youtube_failure_raises(monkeypatch):
    monkeypatch.setattr(youtube, "_get_valid_token", lambda: "tok")
    monkeypatch.setattr(requests, "delete", lambda *a, **k: FakeResponse(status_code=404, text="not found"))

    with pytest.raises(RuntimeError, match="Delete failed"):
        youtube.delete_video_on_youtube("vid123")


# ── _run_oauth_flow ───────────────────────────────────────────────────────────

def test_run_oauth_flow_missing_client_id_exits(monkeypatch, capsys):
    monkeypatch.setattr(youtube, "YOUTUBE_CLIENT_ID", "")

    with pytest.raises(SystemExit):
        youtube._run_oauth_flow()


def test_run_oauth_flow_happy_path_exchanges_code(monkeypatch, tmp_path):
    monkeypatch.setattr(youtube, "YOUTUBE_CLIENT_ID", "client-id")
    monkeypatch.setattr(youtube, "YOUTUBE_CLIENT_SECRET", "client-secret")
    tokens_file = tmp_path / "tokens.json"
    monkeypatch.setattr(youtube, "TOKENS_FILE", tokens_file)
    monkeypatch.setattr(youtube, "run_oauth_local_server", lambda auth_url, port: "auth-code-123")

    captured = {}

    def fake_post(url, data=None):
        captured["url"] = url
        captured["data"] = data
        return FakeResponse(status_code=200, json_data={
            "access_token": "at", "refresh_token": "rt", "expires_in": 3600,
        })

    monkeypatch.setattr(requests, "post", fake_post)

    youtube._run_oauth_flow()

    assert captured["data"]["code"] == "auth-code-123"
    assert captured["data"]["grant_type"] == "authorization_code"
    saved = youtube.load_tokens(tokens_file)
    assert saved == {"access_token": "at", "refresh_token": "rt", "expires_in": 3600}


def test_run_oauth_flow_exchange_failure_exits(monkeypatch, tmp_path):
    monkeypatch.setattr(youtube, "YOUTUBE_CLIENT_ID", "client-id")
    monkeypatch.setattr(youtube, "YOUTUBE_CLIENT_SECRET", "client-secret")
    monkeypatch.setattr(youtube, "TOKENS_FILE", tmp_path / "tokens.json")
    monkeypatch.setattr(youtube, "run_oauth_local_server", lambda auth_url, port: "auth-code-123")
    monkeypatch.setattr(requests, "post", lambda *a, **k: FakeResponse(status_code=400, json_data={"error": "bad"}))

    with pytest.raises(SystemExit):
        youtube._run_oauth_flow()


# ── main() argparse wiring ───────────────────────────────────────────────────

def test_main_setup_guide_prints_and_returns(monkeypatch, capsys):
    monkeypatch.setattr("sys.argv", ["youtube.py", "--setup-guide"])
    monkeypatch.setattr(youtube, "publish_video_on_youtube", lambda *a, **k: (_ for _ in ()).throw(
        AssertionError("should not publish")))

    youtube.main()

    out = capsys.readouterr().out
    assert "Setup Guide" in out


def test_main_delete_calls_delete_not_publish(monkeypatch):
    monkeypatch.setattr("sys.argv", ["youtube.py", "--delete", "vid123"])
    deleted = []
    monkeypatch.setattr(youtube, "delete_video_on_youtube", lambda vid: deleted.append(vid))
    monkeypatch.setattr(youtube, "publish_video_on_youtube", lambda *a, **k: (_ for _ in ()).throw(
        AssertionError("should not publish")))

    youtube.main()

    assert deleted == ["vid123"]


def test_main_normal_invocation_builds_metadata_from_args(monkeypatch, tmp_path):
    video = tmp_path / "my_cool_video.mp4"
    video.write_bytes(b"x")
    monkeypatch.setattr("sys.argv", [
        "youtube.py", str(video), "--tags", "a, b ,c", "--privacy", "unlisted",
    ])

    captured = {}

    def fake_publish(path, metadata):
        captured["path"] = path
        captured["metadata"] = metadata
        return {"video_id": "x", "status": "succeeded", "url": "http://x"}

    monkeypatch.setattr(youtube, "publish_video_on_youtube", fake_publish)

    youtube.main()

    meta = captured["metadata"]
    assert meta.title == "my cool video"
    assert meta.tags == ["a", "b", "c"]
    assert meta.privacy == "unlisted"
