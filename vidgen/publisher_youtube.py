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
import datetime
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
