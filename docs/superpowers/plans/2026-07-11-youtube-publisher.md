# YouTube Auto-Publish (GAP 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shared publish library (`vidgen/publish_common.py`) and a YouTube Data API v3 publisher (`vidgen/publisher_youtube.py`) that uploads the pipeline's rendered vertical video as a YouTube Short via OAuth 2.0 + resumable upload, matching the design in `docs/superpowers/specs/2026-07-11-youtube-publisher-design.md`.

**Architecture:** `publish_common.py` holds platform-agnostic primitives (metadata shape, token file I/O, OAuth local-server callback, chunked resumable-upload loop, generic polling loop, GitHub Actions failure notification). `publisher_youtube.py` is YouTube-specific glue: Google OAuth endpoints, the YouTube video-resource JSON shape, and the CLI. TikTok's existing `vidgen/publisher.py` is untouched in this pass.

**Tech Stack:** Python 3.13, `requests` (already a transitive dep via `vieneu`/used by `publisher.py`), stdlib only otherwise (`http.server`, `webbrowser`, `argparse`, `dataclasses`) — no `google-api-python-client` / `google-auth-oauthlib`. Tests: `pytest` + `unittest.mock` (no new test dependency — no `requests_mock`/`responses`, neither is installed and the repo's existing tests don't use them).

## Global Constraints

- No new third-party dependencies. Raw REST via `requests` only; stdlib for everything else.
- Chunk size for resumable upload: `10 * 1024 * 1024` (10 MB), matching `publisher.py`'s existing `CHUNK_SIZE`.
- YouTube category is hardcoded: `categoryId = "28"` ("Science & Technology").
- OAuth redirect URI: `http://localhost:8080/callback` (same port as TikTok's flow; they're never run concurrently).
- Scope: `https://www.googleapis.com/auth/youtube.upload`.
- Token file: `.youtube_tokens.json` at repo root (sibling to `.tiktok_tokens.json`, both already gitignored via the existing `.tiktok_tokens.json` gitignore entry pattern — verify `.youtube_tokens.json` is covered or add it).
- Env vars: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` (reuses existing `GITHUB_REPO`/`GITHUB_TOKEN`/`GITHUB_WORKFLOW` for notify).
- Run tests with `/Users/haunguyen/miniconda3/bin/python -m pytest ...` (repo's base Python, not any tool-specific env).
- No live network calls in tests — every `requests` call is mocked via `unittest.mock.patch`.
- TikTok's `publisher.py` is NOT modified in this plan.

---

## File Structure

- Create: `vidgen/publish_common.py` — shared `PublishMetadata`, token I/O, OAuth local-server helper, chunked resumable upload, generic poller, generalized GitHub notify.
- Create: `vidgen/publisher_youtube.py` — YouTube OAuth/token refresh, video-resource body builder, resumable-session init, `publish_video_on_youtube`, CLI (`--setup-guide`, `--oauth`, upload).
- Create: `tests/test_publish_common.py`
- Create: `tests/test_publisher_youtube.py`
- Modify: `README.md` — flip GAP 5 YouTube row to in-progress/done and add a quick-start line (Task 10).
- Modify: `.gitignore` — ensure `.youtube_tokens.json` is ignored (Task 6, only if not already covered).

---

### Task 1: `PublishMetadata` + token file I/O

**Files:**
- Create: `vidgen/publish_common.py`
- Test: `tests/test_publish_common.py`

**Interfaces:**
- Produces: `PublishMetadata(title: str, description: str = "", tags: list[str] = [], privacy: str = "public", made_for_kids: bool = False, schedule_time: str | None = None)`, `load_tokens(path: Path) -> dict`, `save_tokens(path: Path, tokens: dict) -> None`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_publish_common.py
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publish_common.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'vidgen.publish_common'`

- [ ] **Step 3: Write the implementation**

```python
# vidgen/publish_common.py
"""
vidgen/publish_common.py — shared primitives for platform publishers
(TikTok/YouTube/Facebook): metadata shape, OAuth local-server callback,
token file I/O, chunked resumable upload, generic status polling, and a
generalized GitHub Actions failure notification.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class PublishMetadata:
    title: str
    description: str = ""
    tags: list[str] = field(default_factory=list)
    privacy: str = "public"
    made_for_kids: bool = False
    schedule_time: Optional[str] = None  # ISO-8601, e.g. "2026-07-11T20:00:00"


def load_tokens(path: Path) -> dict:
    """Load a token dict from a JSON file, or {} if it doesn't exist yet."""
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return {}


def save_tokens(path: Path, tokens: dict) -> None:
    """Persist a token dict to a JSON file."""
    with open(path, "w") as f:
        json.dump(tokens, f, indent=2)
    print(f"[publish_common] Tokens saved to {path}")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publish_common.py -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add vidgen/publish_common.py tests/test_publish_common.py
git commit -m "feat: add PublishMetadata and token file I/O to shared publish library"
```

---

### Task 2: `notify_github`

**Files:**
- Modify: `vidgen/publish_common.py`
- Test: `tests/test_publish_common.py`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `notify_github(video_name: str, platform: str, status: str, github_repo: str, github_token: str, github_workflow: str = "notify.yml", extra: dict | None = None) -> None`.

- [ ] **Step 1: Write the failing tests**

```python
# append to tests/test_publish_common.py
from unittest.mock import MagicMock, patch

from vidgen.publish_common import notify_github


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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publish_common.py -v -k notify_github`
Expected: FAIL with `ImportError: cannot import name 'notify_github'`

- [ ] **Step 3: Write the implementation**

Add to `vidgen/publish_common.py` (add `import requests` to the top-of-file imports):

```python
import requests
```

```python
def notify_github(
    video_name: str,
    platform: str,
    status: str,
    github_repo: str,
    github_token: str,
    github_workflow: str = "notify.yml",
    extra: Optional[dict] = None,
) -> None:
    """
    Trigger a GitHub Actions workflow_dispatch for publish success/failure
    notification. Silently no-ops if repo/token aren't configured.
    """
    if not github_repo or not github_token:
        print("[publish_common] GitHub notify skipped (repo/token not set)")
        return

    url = (
        f"https://api.github.com/repos/{github_repo}"
        f"/actions/workflows/{github_workflow}/dispatches"
    )
    inputs = {"video_name": video_name, "platform": platform, "status": status}
    inputs.update(extra or {})

    try:
        resp = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {github_token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            json={"ref": "main", "inputs": inputs},
            timeout=10,
        )
        if resp.status_code == 204:
            print("[publish_common] GitHub notification triggered")
        else:
            print(f"[publish_common] GitHub notify failed (non-fatal): HTTP {resp.status_code} {resp.text[:100]}")
    except Exception as e:
        print(f"[publish_common] GitHub notify error (non-fatal): {e}")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publish_common.py -v -k notify_github`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add vidgen/publish_common.py tests/test_publish_common.py
git commit -m "feat: add generalized GitHub notify to shared publish library"
```

---

### Task 3: `poll_until`

**Files:**
- Modify: `vidgen/publish_common.py`
- Test: `tests/test_publish_common.py`

**Interfaces:**
- Produces: `poll_until(check_fn: Callable[[], tuple[bool, bool, dict]], interval: int = 5, max_attempts: int = 60) -> dict`. `check_fn` returns `(done, terminal_failure, data)`.

- [ ] **Step 1: Write the failing tests**

```python
# append to tests/test_publish_common.py
import pytest

from vidgen.publish_common import poll_until


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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publish_common.py -v -k poll_until`
Expected: FAIL with `ImportError: cannot import name 'poll_until'`

- [ ] **Step 3: Write the implementation**

Add to `vidgen/publish_common.py` (add `import time` and `Callable`/`Tuple` to imports: `from typing import Callable, Optional, Tuple`):

```python
def poll_until(
    check_fn: Callable[[], Tuple[bool, bool, dict]],
    interval: int = 5,
    max_attempts: int = 60,
) -> dict:
    """
    Calls check_fn() repeatedly until it reports done or a terminal failure.
    check_fn() -> (done, terminal_failure, data).
    """
    for attempt in range(1, max_attempts + 1):
        done, terminal_failure, data = check_fn()
        if done:
            return data
        if terminal_failure:
            raise RuntimeError(f"Polling failed: {data}")
        time.sleep(interval)

    raise RuntimeError(f"Polling did not complete after {max_attempts * interval}s")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publish_common.py -v -k poll_until`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add vidgen/publish_common.py tests/test_publish_common.py
git commit -m "feat: add generic poll_until to shared publish library"
```

---

### Task 4: `chunked_resumable_upload`

**Files:**
- Modify: `vidgen/publish_common.py`
- Test: `tests/test_publish_common.py`

**Interfaces:**
- Produces: `chunked_resumable_upload(upload_url: str, file_path: Path | str, chunk_size: int, put_headers_fn: Callable[[int, int, int], dict]) -> requests.Response`. Follows the resumable-upload protocol: a `308` response's `Range` header (`"bytes=0-N"`) gives the next start offset and the loop continues; any other 2xx response ends the loop and that response is returned; anything else raises.

- [ ] **Step 1: Write the failing tests**

```python
# append to tests/test_publish_common.py
from vidgen.publish_common import chunked_resumable_upload


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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publish_common.py -v -k chunked_resumable_upload`
Expected: FAIL with `ImportError: cannot import name 'chunked_resumable_upload'`

- [ ] **Step 3: Write the implementation**

Add to `vidgen/publish_common.py`:

```python
def chunked_resumable_upload(
    upload_url: str,
    file_path,
    chunk_size: int,
    put_headers_fn: Callable[[int, int, int], dict],
):
    """
    PUTs file_path to upload_url following the resumable-upload protocol:
    a 308 response's Range header gives the next start offset (retry only
    the unsent remainder, not the whole file); any other 2xx response ends
    the loop and is returned to the caller.

    put_headers_fn(start, end, total_size) -> headers dict for that PUT.
    """
    file_path = Path(file_path)
    total_size = file_path.stat().st_size
    start = 0
    last_resp = None

    with open(file_path, "rb") as f:
        while start < total_size:
            end = min(start + chunk_size, total_size) - 1
            f.seek(start)
            chunk = f.read(end - start + 1)

            resp = requests.put(upload_url, headers=put_headers_fn(start, end, total_size), data=chunk)
            last_resp = resp

            if resp.status_code == 308:
                range_header = resp.headers.get("Range")
                start = int(range_header.split("-")[1]) + 1 if range_header else end + 1
                continue

            if not (200 <= resp.status_code < 300):
                raise RuntimeError(
                    f"Chunk upload failed at offset {start} (HTTP {resp.status_code}): {resp.text[:200]}"
                )

            start = end + 1

    return last_resp
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publish_common.py -v -k chunked_resumable_upload`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add vidgen/publish_common.py tests/test_publish_common.py
git commit -m "feat: add chunked resumable upload helper to shared publish library"
```

---

### Task 5: `run_oauth_local_server`

**Files:**
- Modify: `vidgen/publish_common.py`
- Test: `tests/test_publish_common.py`

**Interfaces:**
- Produces: `run_oauth_local_server(auth_url: str, port: int = 8080) -> str` — opens `auth_url` in the browser, blocks until one HTTP GET hits `localhost:{port}/...?code=...`, returns the `code` value. Raises `RuntimeError` if no code was received.

- [ ] **Step 1: Write the failing test**

```python
# append to tests/test_publish_common.py
import threading
import time as time_module
import urllib.request

from vidgen.publish_common import run_oauth_local_server


def test_run_oauth_local_server_returns_code_from_redirect():
    def fire_redirect():
        time_module.sleep(0.3)
        urllib.request.urlopen("http://localhost:8099/callback?code=abc123")

    threading.Thread(target=fire_redirect, daemon=True).start()

    with patch("vidgen.publish_common.webbrowser.open"):
        code = run_oauth_local_server("http://example.com/auth", port=8099)

    assert code == "abc123"


def test_run_oauth_local_server_raises_when_no_code_param():
    def fire_bad_redirect():
        time_module.sleep(0.3)
        try:
            urllib.request.urlopen("http://localhost:8098/callback?error=access_denied")
        except Exception:
            pass  # server responds 400, urlopen raises HTTPError - expected

    threading.Thread(target=fire_bad_redirect, daemon=True).start()

    with patch("vidgen.publish_common.webbrowser.open"):
        with pytest.raises(RuntimeError, match="No auth code"):
            run_oauth_local_server("http://example.com/auth", port=8098)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publish_common.py -v -k run_oauth_local_server`
Expected: FAIL with `ImportError: cannot import name 'run_oauth_local_server'`

- [ ] **Step 3: Write the implementation**

Add imports to the top of `vidgen/publish_common.py`: `import urllib.parse`, `import webbrowser`, `from http.server import BaseHTTPRequestHandler, HTTPServer`.

```python
def run_oauth_local_server(auth_url: str, port: int = 8080) -> str:
    """
    Opens auth_url in the browser, waits for the OAuth redirect to
    localhost:{port}/..., and returns the `code` query param.
    """
    auth_code: list[str] = []

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            parsed = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            if "code" in params:
                auth_code.append(params["code"][0])
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"<h2>Auth successful! You can close this tab.</h2>")
            else:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"<h2>Auth failed - no code received.</h2>")

        def log_message(self, *args):
            pass  # suppress server logs

    print("\nOpening auth page in browser...")
    print(f"If it doesn't open, visit:\n{auth_url}\n")
    webbrowser.open(auth_url)

    print(f"Waiting for redirect to localhost:{port} ...")
    server = HTTPServer(("localhost", port), Handler)
    server.handle_request()

    if not auth_code:
        raise RuntimeError("No auth code received.")
    return auth_code[0]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publish_common.py -v -k run_oauth_local_server`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add vidgen/publish_common.py tests/test_publish_common.py
git commit -m "feat: add OAuth local-server callback helper to shared publish library"
```

---

### Task 6: `publisher_youtube.py` scaffolding + token refresh

**Files:**
- Create: `vidgen/publisher_youtube.py`
- Test: `tests/test_publisher_youtube.py`
- Modify: `.gitignore` (only if `.youtube_tokens.json` isn't already covered by an existing pattern)

**Interfaces:**
- Consumes: `PublishMetadata`, `load_tokens`, `save_tokens` from `vidgen.publish_common` (Task 1).
- Produces: module-level constants `TOKENS_FILE`, `TOKEN_URL`, `API_BASE`; `_refresh_access_token(refresh_token: str) -> dict`; `_get_valid_token() -> str`.

- [ ] **Step 1: Check `.gitignore` coverage**

Run: `grep -n "tiktok_tokens\|youtube_tokens" /Users/haunguyen/GitHub/VidGen/.gitignore`

If `.youtube_tokens.json` is not listed (only `.tiktok_tokens.json` is), add a line `.youtube_tokens.json` next to the existing `.tiktok_tokens.json` entry in `.gitignore`.

- [ ] **Step 2: Write the failing tests**

```python
# tests/test_publisher_youtube.py
from unittest.mock import MagicMock, patch

import pytest

import vidgen.publisher_youtube as pub


def test_refresh_access_token_returns_new_access_token(monkeypatch):
    monkeypatch.setattr(pub, "YOUTUBE_CLIENT_ID", "cid")
    monkeypatch.setattr(pub, "YOUTUBE_CLIENT_SECRET", "csecret")

    with patch("vidgen.publisher_youtube.requests.post") as mock_post:
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {"access_token": "new-access", "expires_in": 3600},
        )
        result = pub._refresh_access_token("refresh-tok")

    assert result == {"access_token": "new-access", "refresh_token": "refresh-tok", "expires_in": 3600}


def test_refresh_access_token_raises_on_failure():
    with patch("vidgen.publisher_youtube.requests.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=400, json=lambda: {"error": "invalid_grant"})
        with pytest.raises(RuntimeError, match="Token refresh failed"):
            pub._refresh_access_token("bad-tok")


def test_get_valid_token_raises_when_no_token_saved(tmp_path, monkeypatch):
    monkeypatch.setattr(pub, "TOKENS_FILE", tmp_path / "none.json")
    with pytest.raises(RuntimeError, match="No YouTube access token"):
        pub._get_valid_token()


def test_get_valid_token_returns_existing_token_when_valid(tmp_path, monkeypatch):
    tokens_file = tmp_path / "tokens.json"
    tokens_file.write_text('{"access_token": "good-tok", "refresh_token": "r"}')
    monkeypatch.setattr(pub, "TOKENS_FILE", tokens_file)

    with patch("vidgen.publisher_youtube.requests.get") as mock_get:
        mock_get.return_value = MagicMock(status_code=200)
        token = pub._get_valid_token()

    assert token == "good-tok"


def test_get_valid_token_refreshes_on_401(tmp_path, monkeypatch):
    tokens_file = tmp_path / "tokens.json"
    tokens_file.write_text('{"access_token": "expired-tok", "refresh_token": "r"}')
    monkeypatch.setattr(pub, "TOKENS_FILE", tokens_file)

    with patch("vidgen.publisher_youtube.requests.get") as mock_get, \
         patch("vidgen.publisher_youtube.requests.post") as mock_post:
        mock_get.return_value = MagicMock(status_code=401)
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"access_token": "fresh-tok", "expires_in": 3600})

        token = pub._get_valid_token()

    assert token == "fresh-tok"
    assert __import__("json").loads(tokens_file.read_text())["access_token"] == "fresh-tok"
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_youtube.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'vidgen.publisher_youtube'`

- [ ] **Step 4: Write the implementation**

```python
# vidgen/publisher_youtube.py
"""
vidgen/publisher_youtube.py — Auto-publish to YouTube (Data API v3, Shorts)

Flow:
    1. Get a valid access token (refresh if expired)
    2. Init resumable upload session -> upload_url
    3. PUT video in chunks (resumable protocol)         -> video_id
    4. Poll processingDetails until "succeeded"
    5. GitHub Actions notification -> trigger workflow, email on failure

Setup (one-time):
    python -m vidgen.publisher_youtube --setup-guide

Usage:
    python -m vidgen.publisher_youtube out/my-topic.mp4 --title "Tieu de #Shorts"
"""

from __future__ import annotations

import argparse
import os
import sys
import time
import urllib.parse
from pathlib import Path

import requests

from vidgen.publish_common import (
    PublishMetadata,
    chunked_resumable_upload,
    load_tokens,
    notify_github,
    poll_until,
    run_oauth_local_server,
    save_tokens,
)

# -- Config (set via env vars or .env file) -----------------------------------
YOUTUBE_CLIENT_ID     = os.getenv("YOUTUBE_CLIENT_ID", "")
YOUTUBE_CLIENT_SECRET = os.getenv("YOUTUBE_CLIENT_SECRET", "")

GITHUB_REPO     = os.getenv("GITHUB_REPO", "")
GITHUB_TOKEN    = os.getenv("GITHUB_TOKEN", "")
GITHUB_WORKFLOW = os.getenv("GITHUB_WORKFLOW", "notify.yml")

TOKENS_FILE = Path(__file__).parent.parent / ".youtube_tokens.json"

# -- Google API constants ------------------------------------------------------
TOKEN_URL    = "https://oauth2.googleapis.com/token"
AUTH_URL     = "https://accounts.google.com/o/oauth2/v2/auth"
UPLOAD_URL   = "https://www.googleapis.com/upload/youtube/v3/videos"
API_BASE     = "https://www.googleapis.com/youtube/v3"
SCOPE        = "https://www.googleapis.com/auth/youtube.upload"
REDIRECT_URI = "http://localhost:8080/callback"

CATEGORY_ID_SCI_TECH = "28"
CHUNK_SIZE    = 10 * 1024 * 1024
POLL_INTERVAL = 5
POLL_MAX      = 60


# -- Token management -----------------------------------------------------------

def _refresh_access_token(refresh_token: str) -> dict:
    """Exchange a refresh token for a new access token."""
    resp = requests.post(
        TOKEN_URL,
        data={
            "client_id":     YOUTUBE_CLIENT_ID,
            "client_secret": YOUTUBE_CLIENT_SECRET,
            "grant_type":    "refresh_token",
            "refresh_token": refresh_token,
        },
    )
    data = resp.json()
    if resp.status_code != 200:
        raise RuntimeError(f"Token refresh failed: {data}")
    return {
        "access_token":  data["access_token"],
        "refresh_token": refresh_token,
        "expires_in":    data.get("expires_in", 3600),
    }


def _get_valid_token() -> str:
    """Return a valid access token, refreshing if needed."""
    tokens = load_tokens(TOKENS_FILE)
    access_token = tokens.get("access_token", "")

    if not access_token:
        raise RuntimeError(
            "No YouTube access token found.\n"
            "Run: python -m vidgen.publisher_youtube --setup-guide"
        )

    resp = requests.get(
        f"{API_BASE}/channels",
        params={"part": "id", "mine": "true"},
        headers={"Authorization": f"Bearer {access_token}"},
    )

    if resp.status_code == 401:
        print("[publisher_youtube] Access token expired - refreshing...")
        refresh_token = tokens.get("refresh_token", "")
        if not refresh_token:
            raise RuntimeError("No refresh token available. Re-run --oauth.")
        new_tokens = _refresh_access_token(refresh_token)
        save_tokens(TOKENS_FILE, new_tokens)
        return new_tokens["access_token"]

    return access_token
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_youtube.py -v`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add vidgen/publisher_youtube.py tests/test_publisher_youtube.py .gitignore
git commit -m "feat: scaffold YouTube publisher module with token refresh"
```

---

### Task 7: `_build_video_resource`

**Files:**
- Modify: `vidgen/publisher_youtube.py`
- Test: `tests/test_publisher_youtube.py`

**Interfaces:**
- Consumes: `PublishMetadata` (Task 1).
- Produces: `_build_video_resource(metadata: PublishMetadata) -> dict` — the `snippet`/`status` JSON body for the resumable-init POST.

- [ ] **Step 1: Write the failing tests**

```python
# append to tests/test_publisher_youtube.py
from vidgen.publish_common import PublishMetadata


def test_build_video_resource_appends_shorts_tag_when_missing():
    body = pub._build_video_resource(PublishMetadata(title="Redis pub/sub"))
    assert body["snippet"]["title"] == "Redis pub/sub #Shorts"


def test_build_video_resource_does_not_duplicate_shorts_tag():
    body = pub._build_video_resource(PublishMetadata(title="Redis pub/sub #Shorts"))
    assert body["snippet"]["title"] == "Redis pub/sub #Shorts"


def test_build_video_resource_maps_fields():
    body = pub._build_video_resource(PublishMetadata(
        title="T", description="D", tags=["redis", "tech"], privacy="unlisted", made_for_kids=True,
    ))
    assert body["snippet"]["description"] == "D"
    assert body["snippet"]["tags"] == ["redis", "tech"]
    assert body["snippet"]["categoryId"] == "28"
    assert body["status"]["privacyStatus"] == "unlisted"
    assert body["status"]["selfDeclaredMadeForKids"] is True


def test_build_video_resource_schedule_forces_private_and_sets_publish_at():
    body = pub._build_video_resource(PublishMetadata(
        title="T", privacy="public", schedule_time="2026-07-20T20:00:00",
    ))
    assert body["status"]["privacyStatus"] == "private"
    assert body["status"]["publishAt"].startswith("2026-07-20T")
    assert body["status"]["publishAt"].endswith("Z")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_youtube.py -v -k build_video_resource`
Expected: FAIL with `AttributeError: module 'vidgen.publisher_youtube' has no attribute '_build_video_resource'`

- [ ] **Step 3: Write the implementation**

Add `import datetime` to the top of `vidgen/publisher_youtube.py`, then:

```python
def _build_video_resource(metadata: PublishMetadata) -> dict:
    """Build the snippet/status JSON body for the resumable-init request."""
    title = metadata.title
    if "#shorts" not in title.lower():
        title = f"{title} #Shorts"

    body: dict = {
        "snippet": {
            "title":       title[:100],
            "description": metadata.description,
            "tags":        metadata.tags,
            "categoryId":  CATEGORY_ID_SCI_TECH,
        },
        "status": {
            "privacyStatus":          metadata.privacy,
            "selfDeclaredMadeForKids": metadata.made_for_kids,
        },
    }

    if metadata.schedule_time:
        dt = datetime.datetime.fromisoformat(metadata.schedule_time)
        if dt.tzinfo is None:
            dt = dt.astimezone()
        body["status"]["privacyStatus"] = "private"
        body["status"]["publishAt"] = (
            dt.astimezone(datetime.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
        )

    return body
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_youtube.py -v -k build_video_resource`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add vidgen/publisher_youtube.py tests/test_publisher_youtube.py
git commit -m "feat: build YouTube video-resource body from PublishMetadata"
```

---

### Task 8: `_init_resumable_session`

**Files:**
- Modify: `vidgen/publisher_youtube.py`
- Test: `tests/test_publisher_youtube.py`

**Interfaces:**
- Consumes: `_build_video_resource` (Task 7).
- Produces: `_init_resumable_session(access_token: str, video_path: Path, metadata: PublishMetadata) -> str` (the resumable upload URL).

- [ ] **Step 1: Write the failing tests**

```python
# append to tests/test_publisher_youtube.py
def test_init_resumable_session_returns_location_header(tmp_path):
    video = tmp_path / "v.mp4"
    video.write_bytes(b"x" * 1000)

    with patch("vidgen.publisher_youtube.requests.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=200, headers={"Location": "http://upload/session1"})
        url = pub._init_resumable_session("tok", video, PublishMetadata(title="T"))

    assert url == "http://upload/session1"
    _, kwargs = mock_post.call_args
    assert kwargs["headers"]["X-Upload-Content-Length"] == "1000"
    assert kwargs["params"] == {"uploadType": "resumable", "part": "snippet,status"}


def test_init_resumable_session_raises_without_location_header(tmp_path):
    video = tmp_path / "v.mp4"
    video.write_bytes(b"x")

    with patch("vidgen.publisher_youtube.requests.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=200, headers={}, text="no location")
        with pytest.raises(RuntimeError, match="Upload init failed"):
            pub._init_resumable_session("tok", video, PublishMetadata(title="T"))
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_youtube.py -v -k init_resumable_session`
Expected: FAIL with `AttributeError: module 'vidgen.publisher_youtube' has no attribute '_init_resumable_session'`

- [ ] **Step 3: Write the implementation**

```python
def _init_resumable_session(access_token: str, video_path: Path, metadata: PublishMetadata) -> str:
    """Initialize a resumable upload session. Returns the upload URL."""
    body = _build_video_resource(metadata)
    resp = requests.post(
        UPLOAD_URL,
        params={"uploadType": "resumable", "part": "snippet,status"},
        headers={
            "Authorization":          f"Bearer {access_token}",
            "Content-Type":           "application/json; charset=UTF-8",
            "X-Upload-Content-Type":  "video/mp4",
            "X-Upload-Content-Length": str(video_path.stat().st_size),
        },
        json=body,
    )
    if resp.status_code != 200 or "Location" not in resp.headers:
        raise RuntimeError(f"Upload init failed (HTTP {resp.status_code}): {resp.text[:200]}")

    upload_url = resp.headers["Location"]
    print("[publisher_youtube] Upload session initialized")
    return upload_url
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_youtube.py -v -k init_resumable_session`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add vidgen/publisher_youtube.py tests/test_publisher_youtube.py
git commit -m "feat: add YouTube resumable-session init"
```

---

### Task 9: `publish_video_on_youtube` orchestration

**Files:**
- Modify: `vidgen/publisher_youtube.py`
- Test: `tests/test_publisher_youtube.py`

**Interfaces:**
- Consumes: `_get_valid_token` (Task 6), `_init_resumable_session` (Task 8), `chunked_resumable_upload`, `poll_until`, `notify_github` (from `publish_common`, Tasks 2-4).
- Produces: `publish_video_on_youtube(video_path: str | Path, metadata: PublishMetadata) -> dict` returning `{"video_id": str, "status": "succeeded", "url": str}`.

- [ ] **Step 1: Write the failing tests**

```python
# append to tests/test_publisher_youtube.py
def test_publish_video_on_youtube_raises_for_missing_file(tmp_path):
    with pytest.raises(FileNotFoundError):
        pub.publish_video_on_youtube(tmp_path / "missing.mp4", PublishMetadata(title="T"))


def test_publish_video_on_youtube_happy_path(tmp_path, monkeypatch):
    video = tmp_path / "v.mp4"
    video.write_bytes(b"x" * 100)

    monkeypatch.setattr(pub, "_get_valid_token", lambda: "tok")
    monkeypatch.setattr(pub, "_init_resumable_session", lambda token, path, meta: "http://upload/1")

    upload_resp = MagicMock(status_code=200, json=lambda: {"id": "vid42"})
    monkeypatch.setattr(pub, "chunked_resumable_upload", lambda *a, **kw: upload_resp)

    status_resp = MagicMock(
        status_code=200,
        json=lambda: {"items": [{"processingDetails": {"processingStatus": "succeeded"}}]},
    )
    with patch("vidgen.publisher_youtube.requests.get", return_value=status_resp), \
         patch("vidgen.publisher_youtube.notify_github") as mock_notify:
        result = pub.publish_video_on_youtube(video, PublishMetadata(title="T"))

    assert result == {"video_id": "vid42", "status": "succeeded", "url": "https://youtu.be/vid42"}
    assert mock_notify.call_args.kwargs["status"] == "OK"
    assert mock_notify.call_args.kwargs["platform"] == "youtube"


def test_publish_video_on_youtube_notifies_and_reraises_on_failure(tmp_path, monkeypatch):
    video = tmp_path / "v.mp4"
    video.write_bytes(b"x" * 10)

    def boom():
        raise RuntimeError("token refresh failed")

    monkeypatch.setattr(pub, "_get_valid_token", boom)

    with patch("vidgen.publisher_youtube.notify_github") as mock_notify:
        with pytest.raises(RuntimeError, match="token refresh failed"):
            pub.publish_video_on_youtube(video, PublishMetadata(title="T"))

    assert "FAIL" in mock_notify.call_args.kwargs["status"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_youtube.py -v -k publish_video_on_youtube`
Expected: FAIL with `AttributeError: module 'vidgen.publisher_youtube' has no attribute 'publish_video_on_youtube'`

- [ ] **Step 3: Write the implementation**

```python
def publish_video_on_youtube(video_path, metadata: PublishMetadata) -> dict:
    """
    Full pipeline: token check -> init -> chunked upload -> poll -> notify.

    Args:
        video_path: Path to the rendered .mp4
        metadata:   PublishMetadata (title/description/tags/privacy/etc.)

    Returns:
        dict with video_id, status, and url.
    """
    video_path = Path(video_path)
    if not video_path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    print("\n-- YouTube Publish ----------------------------------")
    print(f"   File:  {video_path.name} ({video_path.stat().st_size // 1024 // 1024} MB)")
    print(f"   Title: {metadata.title[:60]}")

    _start_time = time.time()

    try:
        access_token = _get_valid_token()
        upload_url = _init_resumable_session(access_token, video_path, metadata)

        final_resp = chunked_resumable_upload(
            upload_url,
            video_path,
            CHUNK_SIZE,
            put_headers_fn=lambda start, end, total: {
                "Content-Range":  f"bytes {start}-{end}/{total}",
                "Content-Length": str(end - start + 1),
                "Content-Type":   "video/mp4",
            },
        )
        video_id = final_resp.json()["id"]
        print(f"[publisher_youtube] Upload complete - video_id={video_id}")

        def _check_status():
            resp = requests.get(
                f"{API_BASE}/videos",
                params={"part": "status,processingDetails", "id": video_id},
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            items = resp.json().get("items", [])
            if not items:
                return False, True, {"error": "video not found"}
            processing = items[0].get("processingDetails", {}).get("processingStatus", "processing")
            print(f"[publisher_youtube] Processing status: {processing}")
            if processing == "succeeded":
                return True, False, items[0]
            if processing in ("failed", "terminated"):
                return False, True, items[0]
            return False, False, items[0]

        poll_until(_check_status, interval=POLL_INTERVAL, max_attempts=POLL_MAX)

        duration = str(int(time.time() - _start_time))
        url = f"https://youtu.be/{video_id}"
        print(f"\n[publisher_youtube] DONE in {duration}s: {url}")

        notify_github(
            video_name=video_path.name,
            platform="youtube",
            status="OK",
            github_repo=GITHUB_REPO,
            github_token=GITHUB_TOKEN,
            github_workflow=GITHUB_WORKFLOW,
            extra={"video_id": video_id, "url": url, "duration": duration},
        )

        return {"video_id": video_id, "status": "succeeded", "url": url}

    except Exception as e:
        notify_github(
            video_name=video_path.name,
            platform="youtube",
            status=f"FAIL: {e}",
            github_repo=GITHUB_REPO,
            github_token=GITHUB_TOKEN,
            github_workflow=GITHUB_WORKFLOW,
            extra={"duration": str(int(time.time() - _start_time))},
        )
        raise
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_youtube.py -v -k publish_video_on_youtube`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the full test suite**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publish_common.py tests/test_publisher_youtube.py -v`
Expected: PASS (all tests from Tasks 1-9)

- [ ] **Step 6: Commit**

```bash
git add vidgen/publisher_youtube.py tests/test_publisher_youtube.py
git commit -m "feat: wire full publish_video_on_youtube orchestration"
```

---

### Task 10: CLI, setup guide, OAuth flow, README

**Files:**
- Modify: `vidgen/publisher_youtube.py`
- Modify: `README.md`
- Test: `tests/test_publisher_youtube.py` (smoke test only — the OAuth flow and CLI's interactive paths are exercised manually per the setup guide, not unit tested, matching how `publisher.py`'s `_run_oauth_flow`/`main` aren't unit tested today)

**Interfaces:**
- Consumes: everything from Tasks 1-9.
- Produces: `SETUP_GUIDE` (str), `_run_oauth_flow() -> None`, `main() -> None`, module runnable as `python -m vidgen.publisher_youtube`.

- [ ] **Step 1: Write the failing test**

```python
# append to tests/test_publisher_youtube.py
import subprocess
import sys


def test_setup_guide_flag_prints_guide_and_exits_zero():
    result = subprocess.run(
        [sys.executable, "-m", "vidgen.publisher_youtube", "--setup-guide"],
        capture_output=True, text=True, cwd=str(Path(__file__).parent.parent),
    )
    assert result.returncode == 0
    assert "YouTube Data API v3" in result.stdout
    assert "YOUTUBE_CLIENT_ID" in result.stdout


def test_cli_without_video_or_flags_prints_help_and_exits_nonzero():
    result = subprocess.run(
        [sys.executable, "-m", "vidgen.publisher_youtube"],
        capture_output=True, text=True, cwd=str(Path(__file__).parent.parent),
    )
    assert result.returncode != 0
    assert "usage" in result.stdout.lower() or "usage" in result.stderr.lower()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_youtube.py -v -k "setup_guide_flag or cli_without_video"`
Expected: FAIL (module has no `__main__` entry point / no `--setup-guide` flag yet, non-zero unexpected exit or "No module named vidgen.publisher_youtube.__main__" style error)

- [ ] **Step 3: Write the implementation**

Add to `vidgen/publisher_youtube.py`:

```python
SETUP_GUIDE = """
=== YouTube Publisher - One-time Setup Guide =============================

  STEP 1 - Create a Google Cloud project + OAuth client
  -------------------------------------------------------
  1. Go to https://console.cloud.google.com/
  2. Create a new project (or pick an existing one)
  3. APIs & Services -> Library -> enable "YouTube Data API v3"
  4. APIs & Services -> OAuth consent screen:
       User type:     External
       Publishing:    Testing  (refresh tokens expire after 7 days until
                      you submit for verification - re-run --oauth weekly
                      until then, same as TikTok's pending-audit fallback)
       Test users:    add your own Google account
  5. APIs & Services -> Credentials -> Create Credentials -> OAuth client ID
       Application type: Desktop app
  6. Save -> copy your CLIENT ID and CLIENT SECRET

  STEP 2 - Add credentials to .env
  -----------------------------------
  Create/edit .env at your repo root:

    YOUTUBE_CLIENT_ID=your_client_id_here
    YOUTUBE_CLIENT_SECRET=your_client_secret_here
    GITHUB_REPO=you/VidGen        # optional, for notify.yml
    GITHUB_TOKEN=ghp_xxxxxxxxxxxx  # optional, for notify.yml

  STEP 3 - Run OAuth flow to get access token
  -----------------------------------------------
    python -m vidgen.publisher_youtube --oauth

  This saves access_token + refresh_token to .youtube_tokens.json

  STEP 4 - Test
  -----------------
    python -m vidgen.publisher_youtube out/test.mp4 --title "Test #Shorts"

============================================================================
"""


def _run_oauth_flow() -> None:
    """Interactive OAuth flow - opens browser, waits for redirect, saves tokens."""
    if not YOUTUBE_CLIENT_ID:
        print("ERROR: YOUTUBE_CLIENT_ID not set. Add it to your .env file first.")
        sys.exit(1)

    auth_url = (
        f"{AUTH_URL}?client_id={YOUTUBE_CLIENT_ID}"
        f"&redirect_uri={urllib.parse.quote(REDIRECT_URI)}"
        "&response_type=code"
        f"&scope={urllib.parse.quote(SCOPE)}"
        "&access_type=offline&prompt=consent"
    )

    code = run_oauth_local_server(auth_url, port=8080)

    print("Auth code received. Exchanging for tokens...")
    resp = requests.post(
        TOKEN_URL,
        data={
            "client_id":     YOUTUBE_CLIENT_ID,
            "client_secret": YOUTUBE_CLIENT_SECRET,
            "code":          code,
            "grant_type":    "authorization_code",
            "redirect_uri":  REDIRECT_URI,
        },
    )
    data = resp.json()
    if resp.status_code != 200:
        print(f"ERROR: Token exchange failed: {data}")
        sys.exit(1)

    tokens = {
        "access_token":  data["access_token"],
        "refresh_token": data["refresh_token"],
        "expires_in":    data.get("expires_in", 3600),
    }
    save_tokens(TOKENS_FILE, tokens)
    print("Setup complete! You can now run:")
    print("  python -m vidgen.publisher_youtube out/video.mp4 --title 'Your title #Shorts'")


def main() -> None:
    env_file = Path(__file__).parent.parent / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

    parser = argparse.ArgumentParser(description="VidGen YouTube publisher")
    parser.add_argument("video", nargs="?", help="Path to .mp4 file")
    parser.add_argument("--title", default="", help="Video title")
    parser.add_argument("--description", default="", help="Video description (default: title)")
    parser.add_argument("--tags", default="", help="Comma-separated tags")
    parser.add_argument("--privacy", default="public", choices=["public", "unlisted", "private"])
    parser.add_argument("--made-for-kids", action="store_true")
    parser.add_argument("--schedule", default=None, metavar="ISO_DATETIME", help="e.g. '2026-07-20T20:00:00'")
    parser.add_argument("--setup-guide", action="store_true", help="Print setup instructions")
    parser.add_argument("--oauth", action="store_true", help="Run OAuth flow to get tokens")

    args = parser.parse_args()

    if args.setup_guide:
        print(SETUP_GUIDE)
        return

    if args.oauth:
        _run_oauth_flow()
        return

    if not args.video:
        parser.print_help()
        sys.exit(1)

    title = args.title or Path(args.video).stem.replace("_", " ")
    metadata = PublishMetadata(
        title=title,
        description=args.description or title,
        tags=[t.strip() for t in args.tags.split(",") if t.strip()],
        privacy=args.privacy,
        made_for_kids=args.made_for_kids,
        schedule_time=args.schedule,
    )

    try:
        result = publish_video_on_youtube(args.video, metadata)
        print(f"\nResult: {result}")
    except Exception as e:
        print(f"\n[publisher_youtube] FAILED: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_youtube.py -v -k "setup_guide_flag or cli_without_video"`
Expected: PASS (2 tests)

- [ ] **Step 5: Run the entire new test suite**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publish_common.py tests/test_publisher_youtube.py -v`
Expected: PASS (all tests from Tasks 1-10)

- [ ] **Step 6: Manual smoke test of the setup guide (no live OAuth required)**

Run: `/Users/haunguyen/miniconda3/bin/python -m vidgen.publisher_youtube --setup-guide`
Expected: prints the guide, exits 0. Confirms the CLI entry point works end-to-end before relying on it.

- [ ] **Step 7: Update README.md**

Edit the roadmap table row (currently `| GAP 5 | Auto-publish — YouTube Data API v3 | 🔲 Planned | — |`):

```markdown
| GAP 5 | Auto-publish — YouTube Data API v3 | 🔧 In progress | `vidgen/publisher_youtube.py`, `vidgen/publish_common.py` |
```

Add a quick-start line near the existing TikTok one:

```markdown
# Publish to YouTube (after OAuth setup)
python -m vidgen.publisher_youtube out/video.mp4 --title "Tiêu đề #Shorts"
```

- [ ] **Step 8: Commit**

```bash
git add vidgen/publisher_youtube.py README.md tests/test_publisher_youtube.py
git commit -m "feat: add YouTube publisher CLI, OAuth flow, and setup guide"
```

---

## Self-Review Notes

- **Spec coverage:** `PublishMetadata` (Task 1), token I/O (Task 1), `notify_github` (Task 2), `poll_until` (Task 3), `chunked_resumable_upload` (Task 4), `run_oauth_local_server` (Task 5), token refresh (Task 6), video-resource body incl. `#Shorts` suffix + schedule/`privacyStatus` rule (Task 7), resumable-session init (Task 8), full orchestration + GitHub notify on both paths (Task 9), CLI/setup-guide/`--oauth`/README (Task 10), tests throughout (mocked `requests`, no live calls) — every section of the spec has a task. TikTok migration and Facebook are explicitly out of scope per the spec and untouched here.
- **Placeholder scan:** no TBDs; every step has complete, runnable code.
- **Type consistency:** `PublishMetadata` fields (`title, description, tags, privacy, made_for_kids, schedule_time`) are used identically in Tasks 1, 7, 9, 10. `chunked_resumable_upload(upload_url, file_path, chunk_size, put_headers_fn)` signature (Task 4) matches its call site in Task 9. `notify_github(video_name, platform, status, github_repo, github_token, github_workflow, extra)` (Task 2) matches both call sites in Task 9.
