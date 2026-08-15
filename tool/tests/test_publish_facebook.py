import datetime

import pytest
import requests

from vidgen.publishing import facebook
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
    base = dict(title="Test title", description="desc", tags=[], privacy="public",
                made_for_kids=False, schedule_time=None)
    base.update(overrides)
    return PublishMetadata(**base)


# ── _build_publish_params ────────────────────────────────────────────────────

def test_build_publish_params_valid_schedule_sets_fields():
    schedule = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)).isoformat()
    params = facebook._build_publish_params(_metadata(schedule_time=schedule))

    assert params["published"] == "false"
    assert isinstance(params["scheduled_publish_time"], int)


def test_build_publish_params_too_soon_raises():
    schedule = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=1)).isoformat()
    with pytest.raises(ValueError, match="10 minutes and 6 months"):
        facebook._build_publish_params(_metadata(schedule_time=schedule))


def test_build_publish_params_too_far_raises():
    schedule = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=200)).isoformat()
    with pytest.raises(ValueError, match="10 minutes and 6 months"):
        facebook._build_publish_params(_metadata(schedule_time=schedule))


def test_build_publish_params_warns_but_still_builds_for_ignored_fields(capsys):
    params = facebook._build_publish_params(_metadata(tags=["a"], privacy="private", made_for_kids=True))

    out = capsys.readouterr().out
    assert "ignored" in out
    assert params["title"] == "Test title"


# ── _get_page_token ──────────────────────────────────────────────────────────

def test_get_page_token_env_var_takes_priority(monkeypatch, tmp_path):
    monkeypatch.setattr(facebook, "FACEBOOK_PAGE_ACCESS_TOKEN", "env-token")
    monkeypatch.setattr(facebook, "TOKENS_FILE", tmp_path / "tokens.json")

    assert facebook._get_page_token() == "env-token"


def test_get_page_token_falls_back_to_file(monkeypatch, tmp_path):
    monkeypatch.setattr(facebook, "FACEBOOK_PAGE_ACCESS_TOKEN", "")
    tokens_file = tmp_path / "tokens.json"
    monkeypatch.setattr(facebook, "TOKENS_FILE", tokens_file)
    facebook.save_tokens(tokens_file, {"page_access_token": "file-token"})

    assert facebook._get_page_token() == "file-token"


def test_get_page_token_neither_set_raises(monkeypatch, tmp_path):
    monkeypatch.setattr(facebook, "FACEBOOK_PAGE_ACCESS_TOKEN", "")
    monkeypatch.setattr(facebook, "TOKENS_FILE", tmp_path / "tokens.json")

    with pytest.raises(RuntimeError, match="No Facebook Page access token"):
        facebook._get_page_token()


# ── _upload_video ─────────────────────────────────────────────────────────────

def test_upload_video_empty_file_raises_before_request(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"")

    def fail_if_called(*a, **k):
        raise AssertionError("should not make a request for an empty file")

    monkeypatch.setattr(requests, "post", fail_if_called)

    with pytest.raises(RuntimeError, match="empty file"):
        facebook._upload_video("tok", video, _metadata())


def test_upload_video_success_returns_id(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x" * 10)

    monkeypatch.setattr(requests, "post",
                         lambda *a, **k: FakeResponse(status_code=200, json_data={"id": "vid123"}))

    assert facebook._upload_video("tok", video, _metadata()) == "vid123"


def test_upload_video_missing_id_raises(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x" * 10)

    monkeypatch.setattr(requests, "post", lambda *a, **k: FakeResponse(status_code=200, json_data={}))

    with pytest.raises(RuntimeError, match="Publish failed"):
        facebook._upload_video("tok", video, _metadata())


def test_upload_video_non_200_raises(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x" * 10)

    monkeypatch.setattr(requests, "post", lambda *a, **k: FakeResponse(status_code=500, text="err"))

    with pytest.raises(RuntimeError, match="Publish failed"):
        facebook._upload_video("tok", video, _metadata())


# ── _check_publishing_status ─────────────────────────────────────────────────

def test_check_publishing_status_ready(monkeypatch):
    monkeypatch.setattr(requests, "get",
                         lambda *a, **k: FakeResponse(status_code=200, json_data={"status": {"video_status": "ready"}}))

    done, terminal, data = facebook._check_publishing_status("tok", "vid123")
    assert done is True
    assert terminal is False


def test_check_publishing_status_failed_is_terminal(monkeypatch):
    monkeypatch.setattr(requests, "get",
                         lambda *a, **k: FakeResponse(status_code=200, json_data={"status": {"video_status": "error"}}))

    done, terminal, data = facebook._check_publishing_status("tok", "vid123")
    assert done is False
    assert terminal is True


def test_check_publishing_status_processing_is_not_terminal(monkeypatch):
    monkeypatch.setattr(requests, "get",
                         lambda *a, **k: FakeResponse(status_code=200, json_data={"status": {"video_status": "processing"}}))

    done, terminal, data = facebook._check_publishing_status("tok", "vid123")
    assert done is False
    assert terminal is False


# ── publish_video_on_facebook ────────────────────────────────────────────────

def test_publish_video_on_facebook_missing_file_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        facebook.publish_video_on_facebook(tmp_path / "missing.mp4", _metadata())


def test_publish_video_on_facebook_happy_path(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x" * 10)

    monkeypatch.setattr(facebook, "_get_page_token", lambda: "tok")
    monkeypatch.setattr(facebook, "_upload_video", lambda tok, path, meta: "vid123")
    monkeypatch.setattr(facebook, "_check_publishing_status", lambda tok, vid: (True, False, {}))

    notify_calls = []
    monkeypatch.setattr(facebook, "notify_github", lambda **kwargs: notify_calls.append(kwargs))

    result = facebook.publish_video_on_facebook(video, _metadata())

    assert result["video_id"] == "vid123"
    assert result["status"] == "succeeded"
    assert notify_calls[-1]["status"] == "OK"


def test_publish_video_on_facebook_failure_notifies_then_reraises(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x" * 10)

    def boom():
        raise RuntimeError("no page token")

    monkeypatch.setattr(facebook, "_get_page_token", boom)

    notify_calls = []
    monkeypatch.setattr(facebook, "notify_github", lambda **kwargs: notify_calls.append(kwargs))

    with pytest.raises(RuntimeError, match="no page token"):
        facebook.publish_video_on_facebook(video, _metadata())

    assert "FAIL" in notify_calls[-1]["status"]


# ── delete_video_on_facebook ─────────────────────────────────────────────────

def test_delete_video_on_facebook_success(monkeypatch):
    monkeypatch.setattr(facebook, "_get_page_token", lambda: "tok")
    monkeypatch.setattr(requests, "delete",
                         lambda *a, **k: FakeResponse(status_code=200, json_data={"success": True}))

    facebook.delete_video_on_facebook("vid123")  # should not raise


def test_delete_video_on_facebook_failure_raises(monkeypatch):
    monkeypatch.setattr(facebook, "_get_page_token", lambda: "tok")
    monkeypatch.setattr(requests, "delete",
                         lambda *a, **k: FakeResponse(status_code=200, json_data={"success": False}))

    with pytest.raises(RuntimeError, match="Delete failed"):
        facebook.delete_video_on_facebook("vid123")


# ── _run_oauth_flow ───────────────────────────────────────────────────────────

def test_run_oauth_flow_missing_app_id_exits(monkeypatch):
    monkeypatch.setattr(facebook, "FACEBOOK_APP_ID", "")
    monkeypatch.setattr(facebook, "FACEBOOK_APP_SECRET", "")

    with pytest.raises(SystemExit):
        facebook._run_oauth_flow()


def test_run_oauth_flow_missing_page_id_exits(monkeypatch):
    monkeypatch.setattr(facebook, "FACEBOOK_APP_ID", "app-id")
    monkeypatch.setattr(facebook, "FACEBOOK_APP_SECRET", "app-secret")
    monkeypatch.setattr(facebook, "FACEBOOK_PAGE_ID", "")

    with pytest.raises(SystemExit):
        facebook._run_oauth_flow()


def test_run_oauth_flow_happy_path_chains_three_requests(monkeypatch, tmp_path):
    monkeypatch.setattr(facebook, "FACEBOOK_APP_ID", "app-id")
    monkeypatch.setattr(facebook, "FACEBOOK_APP_SECRET", "app-secret")
    monkeypatch.setattr(facebook, "FACEBOOK_PAGE_ID", "page-id")
    tokens_file = tmp_path / "tokens.json"
    monkeypatch.setattr(facebook, "TOKENS_FILE", tokens_file)
    monkeypatch.setattr(facebook, "run_oauth_local_server", lambda auth_url, port: "auth-code-123")

    calls = []

    def fake_get(url, params=None):
        calls.append((url, params))
        if len(calls) == 1:
            # code -> short-lived token
            assert params["code"] == "auth-code-123"
            return FakeResponse(status_code=200, json_data={"access_token": "short-lived"})
        if len(calls) == 2:
            # short-lived -> long-lived token
            assert params["fb_exchange_token"] == "short-lived"
            return FakeResponse(status_code=200, json_data={"access_token": "long-lived"})
        # long-lived -> page token lookup
        assert params["access_token"] == "long-lived"
        return FakeResponse(status_code=200, json_data={
            "data": [{"id": "page-id", "access_token": "page-tok"}]
        })

    monkeypatch.setattr(requests, "get", fake_get)

    facebook._run_oauth_flow()

    assert len(calls) == 3
    saved = facebook.load_tokens(tokens_file)
    assert saved == {"page_access_token": "page-tok", "page_id": "page-id"}


def test_run_oauth_flow_page_not_found_exits(monkeypatch, tmp_path):
    monkeypatch.setattr(facebook, "FACEBOOK_APP_ID", "app-id")
    monkeypatch.setattr(facebook, "FACEBOOK_APP_SECRET", "app-secret")
    monkeypatch.setattr(facebook, "FACEBOOK_PAGE_ID", "page-id")
    monkeypatch.setattr(facebook, "TOKENS_FILE", tmp_path / "tokens.json")
    monkeypatch.setattr(facebook, "run_oauth_local_server", lambda auth_url, port: "auth-code-123")

    responses = [
        FakeResponse(status_code=200, json_data={"access_token": "short-lived"}),
        FakeResponse(status_code=200, json_data={"access_token": "long-lived"}),
        FakeResponse(status_code=200, json_data={"data": [{"id": "other-page", "access_token": "tok"}]}),
    ]
    monkeypatch.setattr(requests, "get", lambda *a, **k: responses.pop(0))

    with pytest.raises(SystemExit):
        facebook._run_oauth_flow()


# ── main() argparse wiring ───────────────────────────────────────────────────

def test_main_setup_guide_prints_and_returns(monkeypatch, capsys):
    monkeypatch.setattr("sys.argv", ["facebook.py", "--setup-guide"])

    facebook.main()

    out = capsys.readouterr().out
    assert "Setup Guide" in out


def test_main_delete_calls_delete_not_publish(monkeypatch):
    monkeypatch.setattr("sys.argv", ["facebook.py", "--delete", "vid123"])
    deleted = []
    monkeypatch.setattr(facebook, "delete_video_on_facebook", lambda vid: deleted.append(vid))
    monkeypatch.setattr(facebook, "publish_video_on_facebook", lambda *a, **k: (_ for _ in ()).throw(
        AssertionError("should not publish")))

    facebook.main()

    assert deleted == ["vid123"]


def test_main_normal_invocation_builds_metadata_from_args(monkeypatch, tmp_path):
    video = tmp_path / "my_cool_video.mp4"
    video.write_bytes(b"x")
    monkeypatch.setattr("sys.argv", [
        "facebook.py", str(video), "--tags", "a, b ,c", "--privacy", "unlisted",
    ])

    captured = {}

    def fake_publish(path, metadata):
        captured["path"] = path
        captured["metadata"] = metadata
        return {"video_id": "x", "status": "succeeded", "url": "http://x"}

    monkeypatch.setattr(facebook, "publish_video_on_facebook", fake_publish)

    facebook.main()

    meta = captured["metadata"]
    assert meta.title == "my cool video"
    assert meta.tags == ["a", "b", "c"]
    assert meta.privacy == "unlisted"
