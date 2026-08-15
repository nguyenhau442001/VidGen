import json
import threading
import urllib.request

import pytest
import requests

from vidgen.publishing import common


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


# ── chunked_resumable_upload ────────────────────────────────────────────────

def test_chunked_resumable_upload_single_chunk_success(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x" * 100)

    calls = []

    def fake_put(url, headers=None, data=None):
        calls.append((url, headers, data))
        return FakeResponse(status_code=200)

    monkeypatch.setattr(requests, "put", fake_put)

    resp = common.chunked_resumable_upload(
        "http://upload", video, chunk_size=1000,
        put_headers_fn=lambda start, end, total: {"start": start, "end": end, "total": total},
    )

    assert resp.status_code == 200
    assert len(calls) == 1
    assert calls[0][1] == {"start": 0, "end": 99, "total": 100}


def test_chunked_resumable_upload_308_continuation_uses_range_header(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x" * 30)

    calls = []

    def fake_put(url, headers=None, data=None):
        calls.append(headers)
        if len(calls) == 1:
            # Server reports it already has bytes 0-19, skip ahead of naive end+1.
            return FakeResponse(status_code=308, headers={"Range": "bytes=0-19"})
        return FakeResponse(status_code=200)

    monkeypatch.setattr(requests, "put", fake_put)

    common.chunked_resumable_upload(
        "http://upload", video, chunk_size=10,
        put_headers_fn=lambda start, end, total: {"start": start, "end": end},
    )

    assert calls[0]["start"] == 0
    assert calls[1]["start"] == 20


def test_chunked_resumable_upload_non_2xx_raises(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x" * 10)

    monkeypatch.setattr(requests, "put", lambda *a, **k: FakeResponse(status_code=500, text="boom"))

    with pytest.raises(RuntimeError, match="Chunk upload failed"):
        common.chunked_resumable_upload(
            "http://upload", video, chunk_size=100,
            put_headers_fn=lambda s, e, t: {},
        )


def test_chunked_resumable_upload_empty_file_raises_before_request(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"")

    def fail_if_called(*a, **k):
        raise AssertionError("should not make a request for an empty file")

    monkeypatch.setattr(requests, "put", fail_if_called)

    with pytest.raises(RuntimeError, match="empty file"):
        common.chunked_resumable_upload(
            "http://upload", video, chunk_size=100,
            put_headers_fn=lambda s, e, t: {},
        )


# ── poll_until ───────────────────────────────────────────────────────────────

def test_poll_until_returns_on_done():
    def check_fn():
        return True, False, {"status": "ok"}

    assert common.poll_until(check_fn, interval=0, max_attempts=5) == {"status": "ok"}


def test_poll_until_raises_on_terminal_failure(monkeypatch):
    monkeypatch.setattr(common.time, "sleep", lambda s: None)

    def check_fn():
        return False, True, {"error": "bad"}

    with pytest.raises(RuntimeError, match="Polling failed"):
        common.poll_until(check_fn, interval=0, max_attempts=5)


def test_poll_until_raises_after_max_attempts(monkeypatch):
    monkeypatch.setattr(common.time, "sleep", lambda s: None)
    calls = []

    def check_fn():
        calls.append(1)
        return False, False, {}

    with pytest.raises(RuntimeError, match="did not complete"):
        common.poll_until(check_fn, interval=0, max_attempts=3)

    assert len(calls) == 3


# ── load_tokens / save_tokens ───────────────────────────────────────────────

def test_save_and_load_tokens_round_trip(tmp_path):
    path = tmp_path / "tokens.json"
    common.save_tokens(path, {"access_token": "abc"})

    assert common.load_tokens(path) == {"access_token": "abc"}


def test_load_tokens_missing_file_returns_empty_dict(tmp_path):
    path = tmp_path / "does_not_exist.json"
    assert common.load_tokens(path) == {}


# ── notify_github ────────────────────────────────────────────────────────────

def test_notify_github_skips_when_unconfigured(monkeypatch):
    def fail_if_called(*a, **k):
        raise AssertionError("should not send a request when repo/token unset")

    monkeypatch.setattr(requests, "post", fail_if_called)

    common.notify_github("video.mp4", "youtube", "OK", github_repo="", github_token="")


def test_notify_github_swallows_non_204_response(monkeypatch):
    monkeypatch.setattr(requests, "post", lambda *a, **k: FakeResponse(status_code=500, text="err"))

    # Should not raise.
    common.notify_github("video.mp4", "youtube", "OK", github_repo="r/repo", github_token="tok")


def test_notify_github_swallows_exception(monkeypatch):
    def raise_error(*a, **k):
        raise requests.ConnectionError("network down")

    monkeypatch.setattr(requests, "post", raise_error)

    # Should not raise.
    common.notify_github("video.mp4", "youtube", "OK", github_repo="r/repo", github_token="tok")


# ── run_oauth_local_server ──────────────────────────────────────────────────

def test_run_oauth_local_server_returns_code(monkeypatch):
    monkeypatch.setattr(common.webbrowser, "open", lambda url: None)

    port = 8765
    result = {}

    def call_server():
        result["code"] = common.run_oauth_local_server("http://fake-auth", port=port)

    t = threading.Thread(target=call_server)
    t.start()

    # Give the server a moment to bind before firing the callback request.
    import time as _time
    for _ in range(50):
        try:
            urllib.request.urlopen(f"http://localhost:{port}/callback?code=xyz123", timeout=0.1)
            break
        except Exception:
            _time.sleep(0.05)
    else:
        pytest.fail("OAuth local server never became reachable")

    t.join(timeout=5)
    assert result["code"] == "xyz123"


def test_run_oauth_local_server_no_code_raises(monkeypatch):
    monkeypatch.setattr(common.webbrowser, "open", lambda url: None)

    port = 8766
    result = {}

    def call_server():
        try:
            common.run_oauth_local_server("http://fake-auth", port=port)
        except RuntimeError as e:
            result["error"] = e

    t = threading.Thread(target=call_server)
    t.start()

    import time as _time
    for _ in range(50):
        try:
            urllib.request.urlopen(f"http://localhost:{port}/callback", timeout=0.1)
            break
        except urllib.error.HTTPError:
            break
        except Exception:
            _time.sleep(0.05)
    else:
        pytest.fail("OAuth local server never became reachable")

    t.join(timeout=5)
    assert "No auth code received" in str(result["error"])
