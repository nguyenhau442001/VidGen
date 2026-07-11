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
