import math
import threading
import urllib.request

import pytest
import requests

from vidgen.publishing import tiktok
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


# ── Pure helpers ──────────────────────────────────────────────────────────────

def test_strip_markdown_fences_removes_json_fence():
    text = "```json\n{\"a\": 1}\n```"
    assert tiktok._strip_markdown_fences(text) == '{"a": 1}'


def test_strip_markdown_fences_leaves_plain_text():
    assert tiktok._strip_markdown_fences("plain text") == "plain text"


def test_normalize_hashtag_strips_hash_and_whitespace():
    assert tiktok._normalize_hashtag("# công nghệ ") == "#côngnghệ"


def test_normalize_hashtag_empty_input_returns_empty_string():
    assert tiktok._normalize_hashtag("   ") == ""


def test_dedupe_preserve_order():
    assert tiktok._dedupe_preserve_order(["a", "b", "a", "", "c", "b"]) == ["a", "b", "c"]


def test_topic_from_path_strips_script_prefix_and_underscores():
    assert tiktok._topic_from_path("content/json/script_my_cool_topic.json") == "my cool topic"


def test_topic_from_path_render_manifest_returns_empty():
    assert tiktok._topic_from_path("output/render_manifest.json") == ""


def test_topic_from_path_none_returns_empty():
    assert tiktok._topic_from_path(None) == ""


def test_scene_signal_score_counts_narration_words_and_visual_fields():
    scene = {"narration": "hai ba bon", "props": {"headline": "x", "body": "y"}}
    assert tiktok._scene_signal_score(scene) == 3 + 2 + 2


def test_compose_caption_respects_limit_and_appends_hashtags():
    caption = "x" * 2300
    result = tiktok._compose_caption(caption, ["tag1", "tag2", "tag3"], limit=2200)

    assert len(result) <= 2200
    assert "#tag1" in result
    assert result.count("#tag1") == 1


def test_compose_caption_fills_missing_hashtags_with_fallback():
    result = tiktok._compose_caption("hello", ["onlyone"])
    tag_line = result.splitlines()[-1]
    assert len(tag_line.split()) == 3


# ── _get_valid_token (tiktok's own token helpers) ───────────────────────────

def test_get_valid_token_refreshes_on_401(monkeypatch, tmp_path):
    tokens_file = tmp_path / "tokens.json"
    monkeypatch.setattr(tiktok, "TOKENS_FILE", tokens_file)
    tiktok._save_tokens({"access_token": "expired", "refresh_token": "refresh-tok"})

    monkeypatch.setattr(requests, "post", lambda *a, **k: FakeResponse(status_code=401))
    monkeypatch.setattr(tiktok, "_refresh_access_token",
                         lambda rt: {"access_token": "fresh", "refresh_token": rt, "expires_in": 86400})

    token = tiktok._get_valid_token()

    assert token == "fresh"
    assert tiktok._load_tokens()["access_token"] == "fresh"


def test_get_valid_token_no_access_token_raises(monkeypatch, tmp_path):
    monkeypatch.setattr(tiktok, "TOKENS_FILE", tmp_path / "tokens.json")
    monkeypatch.setattr(tiktok, "TIKTOK_ACCESS_TOKEN", "")

    with pytest.raises(RuntimeError, match="No TikTok access token"):
        tiktok._get_valid_token()


def test_get_valid_token_401_without_refresh_token_raises(monkeypatch, tmp_path):
    tokens_file = tmp_path / "tokens.json"
    monkeypatch.setattr(tiktok, "TOKENS_FILE", tokens_file)
    tiktok._save_tokens({"access_token": "expired"})

    monkeypatch.setattr(requests, "post", lambda *a, **k: FakeResponse(status_code=401))

    with pytest.raises(RuntimeError, match="No refresh token available"):
        tiktok._get_valid_token()


# ── _get_creator_info ────────────────────────────────────────────────────────

def test_get_creator_info_success(monkeypatch):
    monkeypatch.setattr(requests, "post",
                         lambda *a, **k: FakeResponse(status_code=200, json_data={
                             "error": {"code": "ok"}, "data": {"creator_username": "me"}
                         }))

    assert tiktok._get_creator_info("tok") == {"creator_username": "me"}


def test_get_creator_info_error_raises(monkeypatch):
    monkeypatch.setattr(requests, "post",
                         lambda *a, **k: FakeResponse(status_code=200, json_data={
                             "error": {"code": "invalid_token"}
                         }))

    with pytest.raises(RuntimeError, match="Creator info failed"):
        tiktok._get_creator_info("tok")


# ── _init_upload ──────────────────────────────────────────────────────────────

def test_init_upload_computes_chunk_count_exact_multiple(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x" * 20)

    captured = {}

    def fake_post(url, headers=None, json=None):
        captured["json"] = json
        return FakeResponse(status_code=200, json_data={
            "error": {"code": "ok"},
            "data": {"publish_id": "pub123", "upload_url": "http://upload"},
        })

    monkeypatch.setattr(requests, "post", fake_post)

    publish_id, upload_url = tiktok._init_upload("tok", video, chunk_size=10)

    assert publish_id == "pub123"
    assert upload_url == "http://upload"
    assert captured["json"]["source_info"]["total_chunk_count"] == 2


def test_init_upload_non_exact_multiple_rounds_up(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x" * 25)

    captured = {}

    def fake_post(url, headers=None, json=None):
        captured["json"] = json
        return FakeResponse(status_code=200, json_data={
            "error": {"code": "ok"},
            "data": {"publish_id": "pub123", "upload_url": "http://upload"},
        })

    monkeypatch.setattr(requests, "post", fake_post)

    tiktok._init_upload("tok", video, chunk_size=10)
    assert captured["json"]["source_info"]["total_chunk_count"] == 3


def test_init_upload_error_raises(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x" * 10)

    monkeypatch.setattr(requests, "post",
                         lambda *a, **k: FakeResponse(status_code=200, json_data={"error": {"code": "fail"}}))

    with pytest.raises(RuntimeError, match="Upload init failed"):
        tiktok._init_upload("tok", video, chunk_size=10)


# ── _upload_chunks ────────────────────────────────────────────────────────────

def test_upload_chunks_sends_correct_number_of_chunks(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x" * 25)

    calls = []

    def fake_put(url, headers=None, data=None):
        calls.append(headers)
        return FakeResponse(status_code=200)

    monkeypatch.setattr(requests, "put", fake_put)

    tiktok._upload_chunks(video, "http://upload", chunk_size=10)

    assert len(calls) == 3
    assert calls[0]["Content-Range"] == "bytes 0-9/25"
    assert calls[2]["Content-Range"] == "bytes 20-24/25"


def test_upload_chunks_failure_raises_with_chunk_index(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x" * 25)

    monkeypatch.setattr(requests, "put", lambda *a, **k: FakeResponse(status_code=500, text="err"))

    with pytest.raises(RuntimeError, match=r"Chunk 1/3"):
        tiktok._upload_chunks(video, "http://upload", chunk_size=10)


# ── _publish ──────────────────────────────────────────────────────────────────

def test_publish_success(monkeypatch):
    captured = {}

    def fake_post(url, headers=None, json=None):
        captured["json"] = json
        return FakeResponse(status_code=200, json_data={"error": {"code": "ok"}})

    monkeypatch.setattr(requests, "post", fake_post)

    tiktok._publish("tok", "pub123", "my caption", tiktok.PRIVACY_PUBLIC)
    assert captured["json"]["post_info"]["title"] == "my caption"


def test_publish_with_schedule_converts_to_timestamp(monkeypatch):
    captured = {}

    def fake_post(url, headers=None, json=None):
        captured["json"] = json
        return FakeResponse(status_code=200, json_data={"error": {"code": "ok"}})

    monkeypatch.setattr(requests, "post", fake_post)

    tiktok._publish("tok", "pub123", "caption", tiktok.PRIVACY_PUBLIC, schedule_time="2026-08-01T10:00:00")
    assert isinstance(captured["json"]["post_info"]["scheduled_publish_time"], int)


def test_publish_error_raises(monkeypatch):
    monkeypatch.setattr(requests, "post",
                         lambda *a, **k: FakeResponse(status_code=200, json_data={"error": {"code": "fail"}}))

    with pytest.raises(RuntimeError, match="Publish step failed"):
        tiktok._publish("tok", "pub123", "caption")


# ── _poll_status ──────────────────────────────────────────────────────────────

def test_poll_status_returns_on_complete(monkeypatch):
    monkeypatch.setattr(tiktok.time, "sleep", lambda s: None)
    monkeypatch.setattr(requests, "post",
                         lambda *a, **k: FakeResponse(status_code=200, json_data={
                             "data": {"status": "PUBLISH_COMPLETE", "share_url": "http://x"}
                         }))

    result = tiktok._poll_status("tok", "pub123")
    assert result["status"] == "PUBLISH_COMPLETE"


def test_poll_status_failed_raises_with_reason(monkeypatch):
    monkeypatch.setattr(tiktok.time, "sleep", lambda s: None)
    monkeypatch.setattr(requests, "post",
                         lambda *a, **k: FakeResponse(status_code=200, json_data={
                             "data": {"status": "FAILED", "fail_reason": "policy_violation"}
                         }))

    with pytest.raises(RuntimeError, match="policy_violation"):
        tiktok._poll_status("tok", "pub123")


def test_poll_status_exhausts_max_attempts(monkeypatch):
    monkeypatch.setattr(tiktok.time, "sleep", lambda s: None)
    monkeypatch.setattr(tiktok, "POLL_MAX", 3)
    monkeypatch.setattr(requests, "post",
                         lambda *a, **k: FakeResponse(status_code=200, json_data={
                             "data": {"status": "PROCESSING"}
                         }))

    with pytest.raises(RuntimeError, match="did not complete"):
        tiktok._poll_status("tok", "pub123")


# ── _notify_github (tiktok's own copy) ──────────────────────────────────────

def test_notify_github_skips_when_unconfigured(monkeypatch):
    monkeypatch.setattr(tiktok, "GITHUB_REPO", "")
    monkeypatch.setattr(tiktok, "GITHUB_TOKEN", "")

    def fail_if_called(*a, **k):
        raise AssertionError("should not send a request")

    monkeypatch.setattr(requests, "post", fail_if_called)
    tiktok._notify_github("video.mp4", "OK")


def test_notify_github_swallows_non_204(monkeypatch):
    monkeypatch.setattr(tiktok, "GITHUB_REPO", "r/repo")
    monkeypatch.setattr(tiktok, "GITHUB_TOKEN", "tok")
    monkeypatch.setattr(requests, "post", lambda *a, **k: FakeResponse(status_code=500, text="err"))

    tiktok._notify_github("video.mp4", "OK")  # should not raise


def test_notify_github_swallows_exception(monkeypatch):
    monkeypatch.setattr(tiktok, "GITHUB_REPO", "r/repo")
    monkeypatch.setattr(tiktok, "GITHUB_TOKEN", "tok")

    def raise_error(*a, **k):
        raise requests.ConnectionError("down")

    monkeypatch.setattr(requests, "post", raise_error)
    tiktok._notify_github("video.mp4", "OK")  # should not raise


# ── publish_tiktok (full orchestration) ─────────────────────────────────────

def test_publish_tiktok_missing_file_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        tiktok.publish_tiktok(tmp_path / "missing.mp4", title="hello")


def test_publish_tiktok_happy_path(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x" * 10)

    monkeypatch.setattr(tiktok, "_get_valid_token", lambda: "tok")
    monkeypatch.setattr(tiktok, "_get_creator_info",
                         lambda tok: {"creator_username": "me", "privacy_level_options": [tiktok.PRIVACY_PUBLIC]})
    monkeypatch.setattr(tiktok, "_init_upload", lambda tok, path, size: ("pub123", "http://upload"))
    monkeypatch.setattr(tiktok, "_upload_chunks", lambda *a, **k: None)
    monkeypatch.setattr(tiktok, "_publish", lambda *a, **k: None)
    monkeypatch.setattr(tiktok, "_poll_status", lambda tok, pid: {"share_url": "http://share"})

    notify_calls = []
    monkeypatch.setattr(tiktok, "_notify_github", lambda **kwargs: notify_calls.append(kwargs))

    result = tiktok.publish_tiktok(video, title="my caption")

    assert result == {"publish_id": "pub123", "status": "PUBLISH_COMPLETE", "share_url": "http://share"}
    assert notify_calls[-1]["status"] == "OK"


def test_publish_tiktok_falls_back_to_self_only_when_privacy_unavailable(tmp_path, monkeypatch, capsys):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x" * 10)

    monkeypatch.setattr(tiktok, "_get_valid_token", lambda: "tok")
    monkeypatch.setattr(tiktok, "_get_creator_info",
                         lambda tok: {"creator_username": "me", "privacy_level_options": []})
    captured = {}

    def fake_init_upload(tok, path, size):
        return "pub123", "http://upload"

    monkeypatch.setattr(tiktok, "_init_upload", fake_init_upload)
    monkeypatch.setattr(tiktok, "_upload_chunks", lambda *a, **k: None)

    def fake_publish(tok, publish_id, caption, privacy, schedule_time=None):
        captured["privacy"] = privacy

    monkeypatch.setattr(tiktok, "_publish", fake_publish)
    monkeypatch.setattr(tiktok, "_poll_status", lambda tok, pid: {"share_url": "http://share"})
    monkeypatch.setattr(tiktok, "_notify_github", lambda **kwargs: None)

    tiktok.publish_tiktok(video, title="caption", privacy=tiktok.PRIVACY_PUBLIC)

    assert captured["privacy"] == tiktok.PRIVACY_SELF


def test_publish_tiktok_auto_generates_caption_when_title_blank(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x" * 10)

    monkeypatch.setattr(tiktok, "_get_valid_token", lambda: "tok")
    monkeypatch.setattr(tiktok, "_get_creator_info",
                         lambda tok: {"creator_username": "me", "privacy_level_options": [tiktok.PRIVACY_PUBLIC]})
    monkeypatch.setattr(tiktok, "_init_upload", lambda tok, path, size: ("pub123", "http://upload"))
    monkeypatch.setattr(tiktok, "_upload_chunks", lambda *a, **k: None)
    monkeypatch.setattr(tiktok, "_generate_tiktok_caption", lambda path, source: "auto caption")

    captured = {}

    def fake_publish(tok, publish_id, caption, privacy, schedule_time=None):
        captured["caption"] = caption

    monkeypatch.setattr(tiktok, "_publish", fake_publish)
    monkeypatch.setattr(tiktok, "_poll_status", lambda tok, pid: {"share_url": ""})
    monkeypatch.setattr(tiktok, "_notify_github", lambda **kwargs: None)

    tiktok.publish_tiktok(video, title="")

    assert captured["caption"] == "auto caption"


def test_publish_tiktok_failure_notifies_then_reraises(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x" * 10)

    def boom():
        raise RuntimeError("token error")

    monkeypatch.setattr(tiktok, "_get_valid_token", boom)

    notify_calls = []
    monkeypatch.setattr(tiktok, "_notify_github", lambda **kwargs: notify_calls.append(kwargs))

    with pytest.raises(RuntimeError, match="token error"):
        tiktok.publish_tiktok(video, title="hello")

    assert "FAIL" in notify_calls[-1]["status"]


# ── publish_video_on_tiktok adapter ─────────────────────────────────────────

def test_publish_video_on_tiktok_adapts_metadata(monkeypatch):
    captured = {}

    def fake_publish_tiktok(video_path, title, privacy, schedule_time, source_path=None, auto_caption=False):
        captured["title"] = title
        captured["privacy"] = privacy
        return {"publish_id": "pub123", "status": "PUBLISH_COMPLETE", "share_url": "http://share"}

    monkeypatch.setattr(tiktok, "publish_tiktok", fake_publish_tiktok)

    metadata = PublishMetadata(title="fallback title", description="the desc", privacy="public")
    result = tiktok.publish_video_on_tiktok("video.mp4", metadata)

    assert captured["title"] == "the desc"
    assert captured["privacy"] == tiktok.PRIVACY_PUBLIC
    assert result == {"publish_id": "pub123", "status": "succeeded", "url": "http://share"}


# ── _run_oauth_flow ───────────────────────────────────────────────────────────

def test_run_oauth_flow_missing_client_key_exits(monkeypatch):
    monkeypatch.setattr(tiktok, "TIKTOK_CLIENT_KEY", "")

    with pytest.raises(SystemExit):
        tiktok._run_oauth_flow()


def test_run_oauth_flow_happy_path(monkeypatch, tmp_path):
    import webbrowser as _webbrowser

    monkeypatch.setattr(tiktok, "TIKTOK_CLIENT_KEY", "client-key")
    monkeypatch.setattr(tiktok, "TIKTOK_CLIENT_SECRET", "client-secret")
    tokens_file = tmp_path / "tokens.json"
    monkeypatch.setattr(tiktok, "TOKENS_FILE", tokens_file)
    monkeypatch.setattr(_webbrowser, "open", lambda url: None)

    captured = {}

    def fake_post(url, headers=None, data=None):
        captured["data"] = data
        return FakeResponse(status_code=200, json_data={
            "access_token": "at", "refresh_token": "rt", "expires_in": 86400, "open_id": "oid",
        })

    monkeypatch.setattr(requests, "post", fake_post)

    port = 8767

    def fire_callback():
        import time as _time
        for _ in range(50):
            try:
                urllib.request.urlopen(f"http://localhost:{port}/callback?code=auth-code-xyz", timeout=0.1)
                return
            except Exception:
                _time.sleep(0.05)

    monkeypatch.setattr(tiktok.sys, "exit", lambda *a: (_ for _ in ()).throw(SystemExit()))

    # tiktok._run_oauth_flow hardcodes port 8080 via its inline HTTPServer;
    # patch http.server.HTTPServer construction to use our test port instead.
    import http.server as _http_server
    real_http_server = _http_server.HTTPServer

    def patched_http_server(address, handler):
        host, _ = address
        return real_http_server((host, port), handler)

    monkeypatch.setattr(_http_server, "HTTPServer", patched_http_server)

    t = threading.Thread(target=fire_callback)
    t.start()

    tiktok._run_oauth_flow()
    t.join(timeout=5)

    assert captured["data"]["code"] == "auth-code-xyz"
    saved = tiktok._load_tokens()
    assert saved["access_token"] == "at"
    assert saved["refresh_token"] == "rt"


# ── main() argparse wiring ───────────────────────────────────────────────────

def test_main_setup_guide_prints_and_returns(monkeypatch, capsys):
    monkeypatch.setattr("sys.argv", ["tiktok.py", "--setup-guide"])

    tiktok.main()

    out = capsys.readouterr().out
    assert "Setup Guide" in out


def test_main_normal_invocation_calls_publish_tiktok_with_args(monkeypatch, tmp_path):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x")
    monkeypatch.setattr("sys.argv", [
        "tiktok.py", str(video), "--title", "my title", "--privacy", tiktok.PRIVACY_SELF,
    ])

    captured = {}

    def fake_publish(**kwargs):
        captured.update(kwargs)
        return {"publish_id": "pub123", "status": "PUBLISH_COMPLETE", "share_url": ""}

    monkeypatch.setattr(tiktok, "publish_tiktok", fake_publish)

    tiktok.main()

    assert captured["title"] == "my title"
    assert captured["privacy"] == tiktok.PRIVACY_SELF


def test_main_no_video_prints_help_and_exits(monkeypatch):
    monkeypatch.setattr("sys.argv", ["tiktok.py"])

    with pytest.raises(SystemExit):
        tiktok.main()
