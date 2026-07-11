# Facebook Reels Auto-Publish (GAP 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `vidgen/publisher_facebook.py`, a Facebook Graph API Reels publisher that uploads the pipeline's rendered vertical video to a Facebook Page via Facebook Login OAuth + a long-lived Page access token + chunked resumable upload, matching the design in `docs/superpowers/specs/2026-07-12-facebook-publisher-design.md`.

**Architecture:** Reuses `vidgen/publish_common.py` unmodified (`run_oauth_local_server`, `load_tokens`/`save_tokens`, `poll_until`, `notify_github`). `publisher_facebook.py` is Facebook-specific glue: Facebook Login OAuth endpoints, `/me/accounts` Page-token lookup, the Reels `video_reels` start/finish calls, a local offset-based chunked-upload loop (Facebook's resumable-upload protocol doesn't fit `publish_common.chunked_resumable_upload`'s Content-Range/308 shape), and the CLI.

**Tech Stack:** Python 3.13, `requests` (already a dependency), stdlib otherwise (`argparse`, `datetime`, `urllib.parse`) — no new third-party deps. Tests: `pytest` + `unittest.mock`, following `tests/test_publisher_youtube.py`'s conventions.

## Global Constraints

- No new third-party dependencies. Raw REST via `requests` only.
- Graph API version pinned: `v25.0` (`API_VERSION` constant), used in every endpoint URL.
- Chunk size for the upload loop: `10 * 1024 * 1024` (10 MB), matching TikTok/YouTube's `CHUNK_SIZE`.
- OAuth redirect URI: `http://localhost:8080/callback` (same port as TikTok/YouTube; never run concurrently).
- Scope: `pages_show_list,pages_read_engagement,pages_manage_posts`.
- Token file: `.facebook_tokens.json` at repo root, shape `{"page_access_token": str, "page_id": str}`. No refresh logic — Page tokens derived from a long-lived user token are treated as permanent.
- Schedule window: `scheduled_publish_time` must be 10 minutes to 29 days from now (`SCHEDULE_MIN_SECONDS` / `SCHEDULE_MAX_SECONDS`), validated client-side before any API call.
- Env vars: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_PAGE_ID` (reuses existing `GITHUB_REPO`/`GITHUB_TOKEN`/`GITHUB_WORKFLOW` for notify).
- Run tests with `/Users/haunguyen/miniconda3/bin/python -m pytest ...` (repo's base Python).
- No live network calls in tests — every `requests` call is mocked via `unittest.mock.patch`.
- `vidgen/publish_common.py`, `vidgen/publisher.py` (TikTok), and `vidgen/publisher_youtube.py` are NOT modified in this plan.

---

## File Structure

- Create: `vidgen/publisher_facebook.py` — Page-token loading, metadata→Reels-params mapping, upload-session init, chunked upload, finish/publish, status polling, `publish_video_on_facebook`, `delete_video_on_facebook`, CLI (`--setup-guide`, `--oauth`, `--delete`, upload).
- Create: `tests/test_publisher_facebook.py`
- Modify: `README.md` — flip GAP 5 Facebook row to done and add a quick-start line.
- `.gitignore` already covers `.facebook_tokens.json`? No — only `.tiktok_tokens.json` and `.youtube_tokens.json` are listed. Add `.facebook_tokens.json` (Task 1).

---

### Task 1: Module scaffolding + `_get_page_token`

**Files:**
- Create: `vidgen/publisher_facebook.py`
- Test: `tests/test_publisher_facebook.py`
- Modify: `.gitignore` (add `.facebook_tokens.json`)

**Interfaces:**
- Consumes: `PublishMetadata`, `load_tokens`, `save_tokens`, `notify_github`, `poll_until`, `run_oauth_local_server` from `vidgen.publish_common` (all exist today, unmodified).
- Produces: module constants `TOKENS_FILE`, `GRAPH_BASE`, `API_VERSION`; `_get_page_token() -> str`.

- [ ] **Step 1: Add `.facebook_tokens.json` to `.gitignore`**

Run: `grep -n "facebook_tokens" /Users/haunguyen/GitHub/VidGen/.gitignore`

If no match, add a line `.facebook_tokens.json` next to the existing `.youtube_tokens.json` entry in `.gitignore`.

- [ ] **Step 2: Write the failing tests**

```python
# tests/test_publisher_facebook.py
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_facebook.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'vidgen.publisher_facebook'`

- [ ] **Step 4: Write the implementation**

```python
# vidgen/publisher_facebook.py
"""
vidgen/publisher_facebook.py — Auto-publish to Facebook Page Reels (Graph API)

Flow:
    1. Load the Page access token (long-lived, no refresh needed)
    2. Init Reels upload session               -> video_id, upload_url
    3. Upload video in chunks (offset protocol) -> uploaded
    4. Finish phase: publish (or schedule) the Reel
    5. Poll publishing_phase until "complete"
    6. GitHub Actions notification -> trigger workflow, email on failure

Setup (one-time):
    python -m vidgen.publisher_facebook --setup-guide

Usage:
    python -m vidgen.publisher_facebook out/my-topic.mp4 --title "Tieu de"
"""

from __future__ import annotations

import argparse
import datetime
import os
import sys
import time
import urllib.parse
from pathlib import Path

import requests

from vidgen.publish_common import (
    PublishMetadata,
    load_tokens,
    notify_github,
    poll_until,
    run_oauth_local_server,
    save_tokens,
)


def _load_env_file() -> None:
    """Load KEY=VALUE pairs from a .env file at the repo root, if present."""
    env_file = Path(__file__).parent.parent / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            v = v.split("#", 1)[0].strip().strip('"').strip("'")
            os.environ.setdefault(k.strip(), v)


_load_env_file()

# -- Config (set via env vars or .env file) -----------------------------------
FACEBOOK_APP_ID     = os.getenv("FACEBOOK_APP_ID", "")
FACEBOOK_APP_SECRET = os.getenv("FACEBOOK_APP_SECRET", "")
FACEBOOK_PAGE_ID    = os.getenv("FACEBOOK_PAGE_ID", "")

GITHUB_REPO     = os.getenv("GITHUB_REPO", "")
GITHUB_TOKEN    = os.getenv("GITHUB_TOKEN", "")
GITHUB_WORKFLOW = os.getenv("GITHUB_WORKFLOW", "notify.yml")

TOKENS_FILE = Path(__file__).parent.parent / ".facebook_tokens.json"

# -- Facebook Graph API constants ----------------------------------------------
API_VERSION  = "v25.0"
GRAPH_BASE   = f"https://graph.facebook.com/{API_VERSION}"
AUTH_URL     = f"https://www.facebook.com/{API_VERSION}/dialog/oauth"
TOKEN_URL    = f"{GRAPH_BASE}/oauth/access_token"
REDIRECT_URI = "http://localhost:8080/callback"
SCOPE        = "pages_show_list,pages_read_engagement,pages_manage_posts"

CHUNK_SIZE    = 10 * 1024 * 1024
POLL_INTERVAL = 5
POLL_MAX      = 60

SCHEDULE_MIN_SECONDS = 10 * 60
SCHEDULE_MAX_SECONDS = 29 * 24 * 60 * 60


# -- Token management -----------------------------------------------------------

def _get_page_token() -> str:
    """
    Return the saved Page access token. No refresh flow: Page tokens
    derived from a long-lived user token are effectively permanent.
    """
    tokens = load_tokens(TOKENS_FILE)
    page_token = tokens.get("page_access_token", "")
    if not page_token:
        raise RuntimeError(
            "No Facebook Page access token found.\n"
            "Run: python -m vidgen.publisher_facebook --setup-guide"
        )
    return page_token
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_facebook.py -v`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add vidgen/publisher_facebook.py tests/test_publisher_facebook.py .gitignore
git commit -m "feat: scaffold Facebook publisher module with page token loading"
```

---

### Task 2: `_build_finish_params` (metadata mapping + schedule validation)

**Files:**
- Modify: `vidgen/publisher_facebook.py`
- Test: `tests/test_publisher_facebook.py`

**Interfaces:**
- Consumes: `PublishMetadata` (from `publish_common`).
- Produces: `_build_finish_params(metadata: PublishMetadata, video_id: str) -> dict` — the query params for the `upload_phase=finish` call. Raises `ValueError` if `schedule_time` is outside the 10min–29day window.

- [ ] **Step 1: Write the failing tests**

```python
# append to tests/test_publisher_facebook.py
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_facebook.py -v -k build_finish_params`
Expected: FAIL with `AttributeError: module 'vidgen.publisher_facebook' has no attribute '_build_finish_params'`

- [ ] **Step 3: Write the implementation**

Add to `vidgen/publisher_facebook.py`:

```python
# -- Metadata mapping ------------------------------------------------------------

def _build_finish_params(metadata: PublishMetadata, video_id: str) -> dict:
    """Build the upload_phase=finish query params from PublishMetadata."""
    if metadata.tags:
        print("[publisher_facebook] Warning: --tags is ignored on Facebook Reels (no tags field; put hashtags in the description).")
    if metadata.privacy and metadata.privacy != "public":
        print(f"[publisher_facebook] Warning: --privacy={metadata.privacy} is ignored; Reels visibility follows the Page's own settings.")
    if metadata.made_for_kids:
        print("[publisher_facebook] Warning: --made-for-kids is ignored; Facebook Reels has no equivalent flag.")

    params: dict = {
        "video_id": video_id,
        "upload_phase": "finish",
        "title": metadata.title,
        "description": metadata.description or metadata.title,
    }

    if metadata.schedule_time:
        dt = datetime.datetime.fromisoformat(metadata.schedule_time)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=datetime.timezone.utc)
        delta = (dt - datetime.datetime.now(datetime.timezone.utc)).total_seconds()
        if delta < SCHEDULE_MIN_SECONDS or delta > SCHEDULE_MAX_SECONDS:
            raise ValueError(
                f"schedule_time must be between 10 minutes and 29 days from now (got {delta:.0f}s)"
            )
        params["video_state"] = "SCHEDULED"
        params["scheduled_publish_time"] = int(dt.timestamp())
    else:
        params["video_state"] = "PUBLISHED"

    return params
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_facebook.py -v -k build_finish_params`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add vidgen/publisher_facebook.py tests/test_publisher_facebook.py
git commit -m "feat: map PublishMetadata to Facebook Reels finish params"
```

---

### Task 3: `_init_upload_session`

**Files:**
- Modify: `vidgen/publisher_facebook.py`
- Test: `tests/test_publisher_facebook.py`

**Interfaces:**
- Produces: `_init_upload_session(page_token: str) -> tuple[str, str]` — `(video_id, upload_url)`.

- [ ] **Step 1: Write the failing tests**

```python
# append to tests/test_publisher_facebook.py
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_facebook.py -v -k init_upload_session`
Expected: FAIL with `AttributeError: module 'vidgen.publisher_facebook' has no attribute '_init_upload_session'`

- [ ] **Step 3: Write the implementation**

Add to `vidgen/publisher_facebook.py`:

```python
def _init_upload_session(page_token: str) -> tuple[str, str]:
    """Start a Reels upload session. Returns (video_id, upload_url)."""
    resp = requests.post(
        f"{GRAPH_BASE}/{FACEBOOK_PAGE_ID}/video_reels",
        params={"upload_phase": "start", "access_token": page_token},
    )
    data = resp.json()
    if resp.status_code != 200 or "video_id" not in data or "upload_url" not in data:
        raise RuntimeError(f"Upload init failed (HTTP {resp.status_code}): {resp.text[:200]}")
    print(f"[publisher_facebook] Upload session initialized - video_id={data['video_id']}")
    return data["video_id"], data["upload_url"]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_facebook.py -v -k init_upload_session`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add vidgen/publisher_facebook.py tests/test_publisher_facebook.py
git commit -m "feat: add Facebook Reels upload session init"
```

---

### Task 4: `_upload_video_chunks`

**Files:**
- Modify: `vidgen/publisher_facebook.py`
- Test: `tests/test_publisher_facebook.py`

**Interfaces:**
- Produces: `_upload_video_chunks(upload_url: str, video_path: Path, page_token: str) -> None`. Not built on `publish_common.chunked_resumable_upload` — Facebook's protocol uses `offset`/`file_size` headers and a flat `{"success": true}` response per chunk, not Google's `Content-Range`/308 shape.

- [ ] **Step 1: Write the failing tests**

```python
# append to tests/test_publisher_facebook.py
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_facebook.py -v -k upload_video_chunks`
Expected: FAIL with `AttributeError: module 'vidgen.publisher_facebook' has no attribute '_upload_video_chunks'`

- [ ] **Step 3: Write the implementation**

Add to `vidgen/publisher_facebook.py`:

```python
def _upload_video_chunks(upload_url: str, video_path: Path, page_token: str) -> None:
    """
    Uploads video_path to upload_url using Facebook's offset-based resumable
    protocol: each chunk is POSTed with offset/file_size headers and a flat
    {"success": true} response (unlike Google's Content-Range/308 protocol) -
    start advances by the chunk's length after each success.
    """
    total_size = video_path.stat().st_size
    if total_size == 0:
        raise RuntimeError(f"Cannot upload empty file: {video_path}")

    start = 0
    with open(video_path, "rb") as f:
        while start < total_size:
            end = min(start + CHUNK_SIZE, total_size)
            f.seek(start)
            chunk = f.read(end - start)

            resp = requests.post(
                upload_url,
                headers={
                    "Authorization": f"OAuth {page_token}",
                    "offset": str(start),
                    "file_size": str(total_size),
                },
                data=chunk,
            )
            if resp.status_code != 200 or not resp.json().get("success"):
                raise RuntimeError(
                    f"Chunk upload failed at offset {start} (HTTP {resp.status_code}): {resp.text[:200]}"
                )
            start = end

    print("[publisher_facebook] Upload complete")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_facebook.py -v -k upload_video_chunks`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add vidgen/publisher_facebook.py tests/test_publisher_facebook.py
git commit -m "feat: add Facebook offset-based chunked upload loop"
```

---

### Task 5: `_finish_upload` + `_check_publishing_status`

**Files:**
- Modify: `vidgen/publisher_facebook.py`
- Test: `tests/test_publisher_facebook.py`

**Interfaces:**
- Consumes: `_build_finish_params` (Task 2).
- Produces: `_finish_upload(page_token: str, video_id: str, metadata: PublishMetadata) -> None`; `_check_publishing_status(page_token: str, video_id: str) -> tuple[bool, bool, dict]` (the `check_fn` shape `poll_until` expects: `(done, terminal_failure, data)`).

- [ ] **Step 1: Write the failing tests**

```python
# append to tests/test_publisher_facebook.py
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_facebook.py -v -k "finish_upload or check_publishing_status"`
Expected: FAIL with `AttributeError` for both new names

- [ ] **Step 3: Write the implementation**

Add to `vidgen/publisher_facebook.py`:

```python
def _finish_upload(page_token: str, video_id: str, metadata: PublishMetadata) -> None:
    """Calls upload_phase=finish to publish (or schedule) the Reel."""
    params = _build_finish_params(metadata, video_id)
    params["access_token"] = page_token
    resp = requests.post(f"{GRAPH_BASE}/{FACEBOOK_PAGE_ID}/video_reels", params=params)
    data = resp.json()
    if resp.status_code != 200 or data.get("success") is not True:
        raise RuntimeError(f"Publish finish failed (HTTP {resp.status_code}): {resp.text[:200]}")


def _check_publishing_status(page_token: str, video_id: str):
    """check_fn for poll_until: polls publishing_phase.status."""
    resp = requests.get(
        f"{GRAPH_BASE}/{video_id}",
        params={"fields": "status", "access_token": page_token},
    )
    resp.raise_for_status()
    status = resp.json().get("status", {})
    phase_status = status.get("publishing_phase", {}).get("status", "in_progress")
    print(f"[publisher_facebook] Publishing status: {phase_status}")
    if phase_status == "complete":
        return True, False, status
    if phase_status == "error":
        return False, True, status
    return False, False, status
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_facebook.py -v -k "finish_upload or check_publishing_status"`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add vidgen/publisher_facebook.py tests/test_publisher_facebook.py
git commit -m "feat: add Facebook Reels publish-finish call and status polling"
```

---

### Task 6: `publish_video_on_facebook` orchestration

**Files:**
- Modify: `vidgen/publisher_facebook.py`
- Test: `tests/test_publisher_facebook.py`

**Interfaces:**
- Consumes: `_get_page_token` (Task 1), `_init_upload_session` (Task 3), `_upload_video_chunks` (Task 4), `_finish_upload`/`_check_publishing_status` (Task 5), `poll_until`/`notify_github` (from `publish_common`).
- Produces: `publish_video_on_facebook(video_path: str | Path, metadata: PublishMetadata) -> dict` returning `{"video_id": str, "status": "succeeded", "url": str}`.

- [ ] **Step 1: Write the failing tests**

```python
# append to tests/test_publisher_facebook.py
def test_publish_video_on_facebook_raises_for_missing_file(tmp_path):
    with pytest.raises(FileNotFoundError):
        pub.publish_video_on_facebook(tmp_path / "missing.mp4", PublishMetadata(title="T"))


def test_publish_video_on_facebook_happy_path(tmp_path, monkeypatch):
    video = tmp_path / "v.mp4"
    video.write_bytes(b"x" * 100)

    monkeypatch.setattr(pub, "_get_page_token", lambda: "page-tok")
    monkeypatch.setattr(pub, "_init_upload_session", lambda token: ("vid42", "http://rupload/vid42"))
    monkeypatch.setattr(pub, "_upload_video_chunks", lambda url, path, token: None)
    monkeypatch.setattr(pub, "_finish_upload", lambda token, vid, meta: None)
    monkeypatch.setattr(
        pub, "_check_publishing_status",
        lambda token, vid: (True, False, {"publishing_phase": {"status": "complete"}}),
    )

    with patch("vidgen.publisher_facebook.notify_github") as mock_notify:
        result = pub.publish_video_on_facebook(video, PublishMetadata(title="T"))

    assert result == {"video_id": "vid42", "status": "succeeded", "url": "https://www.facebook.com/reel/vid42"}
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_facebook.py -v -k publish_video_on_facebook`
Expected: FAIL with `AttributeError: module 'vidgen.publisher_facebook' has no attribute 'publish_video_on_facebook'`

- [ ] **Step 3: Write the implementation**

Add to `vidgen/publisher_facebook.py`:

```python
def publish_video_on_facebook(video_path, metadata: PublishMetadata) -> dict:
    """
    Full pipeline: page token -> init session -> chunked upload -> finish ->
    poll -> notify.

    Args:
        video_path: Path to the rendered .mp4
        metadata:   PublishMetadata (title/description used; tags/privacy/
                    made_for_kids are ignored with a warning - see
                    _build_finish_params)

    Returns:
        dict with video_id, status, and url.
    """
    video_path = Path(video_path)
    if not video_path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    print("\n-- Facebook Reels Publish -----------------------------")
    print(f"   File:  {video_path.name} ({video_path.stat().st_size // 1024 // 1024} MB)")
    print(f"   Title: {metadata.title[:60]}")

    _start_time = time.time()

    try:
        page_token = _get_page_token()
        video_id, upload_url = _init_upload_session(page_token)
        _upload_video_chunks(upload_url, video_path, page_token)
        _finish_upload(page_token, video_id, metadata)

        poll_until(
            lambda: _check_publishing_status(page_token, video_id),
            interval=POLL_INTERVAL,
            max_attempts=POLL_MAX,
        )

        duration = str(int(time.time() - _start_time))
        url = f"https://www.facebook.com/reel/{video_id}"
        print(f"\n[publisher_facebook] DONE in {duration}s: {url}")

        notify_github(
            video_name=video_path.name,
            platform="facebook",
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
            platform="facebook",
            status=f"FAIL: {e}",
            github_repo=GITHUB_REPO,
            github_token=GITHUB_TOKEN,
            github_workflow=GITHUB_WORKFLOW,
            extra={"duration": str(int(time.time() - _start_time))},
        )
        raise
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_facebook.py -v -k publish_video_on_facebook`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the full test suite so far**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_facebook.py -v`
Expected: PASS (all tests from Tasks 1-6)

- [ ] **Step 6: Commit**

```bash
git add vidgen/publisher_facebook.py tests/test_publisher_facebook.py
git commit -m "feat: wire full publish_video_on_facebook orchestration"
```

---

### Task 7: `delete_video_on_facebook`

**Files:**
- Modify: `vidgen/publisher_facebook.py`
- Test: `tests/test_publisher_facebook.py`

**Interfaces:**
- Consumes: `_get_page_token` (Task 1).
- Produces: `delete_video_on_facebook(video_id: str) -> None`.

- [ ] **Step 1: Write the failing tests**

```python
# append to tests/test_publisher_facebook.py
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_facebook.py -v -k delete_video_on_facebook`
Expected: FAIL with `AttributeError: module 'vidgen.publisher_facebook' has no attribute 'delete_video_on_facebook'`

- [ ] **Step 3: Write the implementation**

Add to `vidgen/publisher_facebook.py`:

```python
def delete_video_on_facebook(video_id: str) -> None:
    """Delete a Reel/video from the Page by its video ID."""
    page_token = _get_page_token()
    resp = requests.delete(f"{GRAPH_BASE}/{video_id}", params={"access_token": page_token})
    data = resp.json()
    if resp.status_code != 200 or data.get("success") is not True:
        raise RuntimeError(f"Delete failed (HTTP {resp.status_code}): {resp.text[:200]}")
    print(f"[publisher_facebook] Deleted video_id={video_id}")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_facebook.py -v -k delete_video_on_facebook`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add vidgen/publisher_facebook.py tests/test_publisher_facebook.py
git commit -m "feat: add Facebook video delete"
```

---

### Task 8: CLI, `--oauth` flow, setup guide, README

**Files:**
- Modify: `vidgen/publisher_facebook.py`
- Modify: `README.md`
- Test: `tests/test_publisher_facebook.py`

**Interfaces:**
- Consumes: everything from Tasks 1-7.
- Produces: `SETUP_GUIDE` (str), `_run_oauth_flow() -> None`, `main() -> None`, module runnable as `python -m vidgen.publisher_facebook`.

- [ ] **Step 1: Write the failing tests**

```python
# append to tests/test_publisher_facebook.py
import json
import subprocess
import sys
from pathlib import Path


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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_facebook.py -v -k "setup_guide_flag or cli_without_video or run_oauth_flow"`
Expected: FAIL (no `--setup-guide` flag, no `_run_oauth_flow`, no `__main__` entry point yet)

- [ ] **Step 3: Write the implementation**

Add to `vidgen/publisher_facebook.py`:

```python
SETUP_GUIDE = """
=== Facebook Reels Publisher - One-time Setup Guide =======================

  STEP 1 - Create a Meta for Developers app
  -------------------------------------------
  1. Go to https://developers.facebook.com/apps/
  2. Create App -> type: Business
  3. Add Product -> "Facebook Login for Business" -> Set Up
  4. App Roles -> Roles -> confirm your account is listed as Admin
     (Development-mode apps only work for accounts with a role on the
     app - fine for a single-operator channel; publishing to Pages you
     don't administer needs App Review, which is out of scope here)

  STEP 2 - Find your Page ID
  ------------------------------
  Facebook Page -> About -> Page transparency -> Page ID
  (or query GET /me/accounts once you have a user token)

  STEP 3 - Add credentials to .env
  -----------------------------------
  Create/edit .env at your repo root:

    FACEBOOK_APP_ID=your_app_id_here
    FACEBOOK_APP_SECRET=your_app_secret_here
    FACEBOOK_PAGE_ID=your_page_id_here
    GITHUB_REPO=you/VidGen        # optional, for notify.yml
    GITHUB_TOKEN=ghp_xxxxxxxxxxxx  # optional, for notify.yml

  STEP 4 - Run OAuth flow to get a Page access token
  -------------------------------------------------------
    python -m vidgen.publisher_facebook --oauth

  This exchanges your login for a long-lived Page access token and
  saves it to .facebook_tokens.json. Page tokens derived this way don't
  expire, so this is a one-time step (re-run only if access is revoked).

  STEP 5 - Test
  -----------------
    python -m vidgen.publisher_facebook out/test.mp4 --title "Test"

============================================================================
"""


def _run_oauth_flow() -> None:
    """Interactive OAuth flow: Facebook Login -> long-lived user token -> Page token."""
    if not FACEBOOK_APP_ID or not FACEBOOK_APP_SECRET:
        print("ERROR: FACEBOOK_APP_ID/FACEBOOK_APP_SECRET not set. Add them to your .env file first.")
        sys.exit(1)
    if not FACEBOOK_PAGE_ID:
        print("ERROR: FACEBOOK_PAGE_ID not set. Add it to your .env file first.")
        sys.exit(1)

    auth_url = (
        f"{AUTH_URL}?client_id={FACEBOOK_APP_ID}"
        f"&redirect_uri={urllib.parse.quote(REDIRECT_URI)}"
        "&response_type=code"
        f"&scope={urllib.parse.quote(SCOPE)}"
    )
    code = run_oauth_local_server(auth_url, port=8080)

    print("Auth code received. Exchanging for a user access token...")
    resp = requests.get(TOKEN_URL, params={
        "client_id": FACEBOOK_APP_ID,
        "client_secret": FACEBOOK_APP_SECRET,
        "redirect_uri": REDIRECT_URI,
        "code": code,
    })
    data = resp.json()
    if resp.status_code != 200 or "access_token" not in data:
        print(f"ERROR: Code exchange failed: {data}")
        sys.exit(1)
    short_lived_token = data["access_token"]

    print("Exchanging for a long-lived user access token...")
    resp = requests.get(TOKEN_URL, params={
        "grant_type": "fb_exchange_token",
        "client_id": FACEBOOK_APP_ID,
        "client_secret": FACEBOOK_APP_SECRET,
        "fb_exchange_token": short_lived_token,
    })
    data = resp.json()
    if resp.status_code != 200 or "access_token" not in data:
        print(f"ERROR: Long-lived token exchange failed: {data}")
        sys.exit(1)
    long_lived_user_token = data["access_token"]

    print(f"Looking up Page access token for page {FACEBOOK_PAGE_ID}...")
    resp = requests.get(f"{GRAPH_BASE}/me/accounts", params={"access_token": long_lived_user_token})
    data = resp.json()
    if resp.status_code != 200:
        print(f"ERROR: Fetching pages failed: {data}")
        sys.exit(1)

    page = next((p for p in data.get("data", []) if p["id"] == FACEBOOK_PAGE_ID), None)
    if not page:
        print(f"ERROR: Page {FACEBOOK_PAGE_ID} not found in /me/accounts. Check that your account has a role on that Page.")
        sys.exit(1)

    save_tokens(TOKENS_FILE, {"page_access_token": page["access_token"], "page_id": FACEBOOK_PAGE_ID})
    print("Setup complete! You can now run:")
    print("  python -m vidgen.publisher_facebook out/video.mp4 --title 'Your title'")


def main() -> None:
    parser = argparse.ArgumentParser(description="VidGen Facebook Reels publisher")
    parser.add_argument("video", nargs="?", help="Path to .mp4 file")
    parser.add_argument("--title", default="", help="Reel title")
    parser.add_argument("--description", default="", help="Reel description (default: title)")
    parser.add_argument("--tags", default="", help="Ignored on Facebook (no tags field on Reels)")
    parser.add_argument("--privacy", default="public", choices=["public", "unlisted", "private"], help="Ignored on Facebook (Reels follow the Page's own visibility)")
    parser.add_argument("--made-for-kids", action="store_true", help="Ignored on Facebook (no equivalent flag)")
    parser.add_argument("--schedule", default=None, metavar="ISO_DATETIME", help="e.g. '2026-07-20T20:00:00' (must be 10min-29days out)")
    parser.add_argument("--setup-guide", action="store_true", help="Print setup instructions")
    parser.add_argument("--oauth", action="store_true", help="Run OAuth flow to get a Page access token")
    parser.add_argument("--delete", metavar="VIDEO_ID", help="Delete a video by ID instead of uploading")

    args = parser.parse_args()

    if args.setup_guide:
        print(SETUP_GUIDE)
        return

    if args.oauth:
        _run_oauth_flow()
        return

    if args.delete:
        try:
            delete_video_on_facebook(args.delete)
        except Exception as e:
            print(f"\n[publisher_facebook] FAILED: {e}")
            sys.exit(1)
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
        result = publish_video_on_facebook(args.video, metadata)
        print(f"\nResult: {result}")
    except Exception as e:
        print(f"\n[publisher_facebook] FAILED: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_facebook.py -v -k "setup_guide_flag or cli_without_video or run_oauth_flow"`
Expected: PASS (4 tests)

- [ ] **Step 5: Run the entire new test suite**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_publisher_facebook.py -v`
Expected: PASS (all tests from Tasks 1-8)

- [ ] **Step 6: Run the whole repo test suite to confirm no regressions**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest -v`
Expected: PASS (every test in `tests/`, including the untouched `test_publish_common.py`/`test_publisher_youtube.py`)

- [ ] **Step 7: Manual smoke test of the setup guide (no live OAuth required)**

Run: `/Users/haunguyen/miniconda3/bin/python -m vidgen.publisher_facebook --setup-guide`
Expected: prints the guide, exits 0.

- [ ] **Step 8: Update README.md**

Edit the roadmap table row (currently `| GAP 5 | Auto-publish — Facebook Graph API (Reels) | 🔲 Planned | — |`):

```markdown
| GAP 5 | Auto-publish — Facebook Graph API (Reels) | ✅ Done | `vidgen/publisher_facebook.py`, `vidgen/publish_common.py` |
```

Add a quick-start line near the existing YouTube one:

```markdown
# Publish to Facebook Reels (after OAuth setup)
python -m vidgen.publisher_facebook out/video.mp4 --title "Tiêu đề"
```

- [ ] **Step 9: Commit**

```bash
git add vidgen/publisher_facebook.py README.md tests/test_publisher_facebook.py
git commit -m "feat: add Facebook Reels publisher CLI, OAuth flow, and setup guide"
```

---

## Self-Review Notes

- **Spec coverage:** long-lived Page token via `/me/accounts` (Task 1, 8), metadata mapping incl. warnings for unsupported fields and schedule-window validation (Task 2), upload session init (Task 3), offset-based chunked upload distinct from `chunked_resumable_upload` (Task 4), finish/publish call + status polling reusing `poll_until` unmodified (Task 5), full orchestration + `notify_github` on both paths (Task 6), delete (Task 7), CLI/`--oauth`/setup guide/README (Task 8) — every section of the design spec has a task. `publish_common.py`, TikTok, and YouTube modules are untouched, matching "Out of scope."
- **Placeholder scan:** no TBDs; every step has complete, runnable code.
- **Type consistency:** `_build_finish_params(metadata, video_id) -> dict` (Task 2) is called identically in `_finish_upload` (Task 5). `_init_upload_session(page_token) -> (video_id, upload_url)` (Task 3) return shape matches its unpacking in `publish_video_on_facebook` (Task 6). `_check_publishing_status(page_token, video_id) -> (done, terminal_failure, data)` (Task 5) matches `poll_until`'s existing `check_fn` contract, called via a zero-arg lambda in Task 6. `notify_github(video_name, platform, status, github_repo, github_token, github_workflow, extra)` calls in Task 6 match `publish_common.notify_github`'s existing signature.
