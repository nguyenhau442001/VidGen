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
SCOPE        = (
    "https://www.googleapis.com/auth/youtube.upload "
    "https://www.googleapis.com/auth/youtube.force-ssl"
)
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
        suffix = " #Shorts"
        # Truncate the base title first so the suffix always survives intact.
        title = title[: 100 - len(suffix)] + suffix
    else:
        title = title[:100]

    body: dict = {
        "snippet": {
            "title":       title,
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
            # A naive schedule_time is treated as already being UTC, not the
            # host machine's local timezone (which would be non-deterministic).
            dt = dt.replace(tzinfo=datetime.timezone.utc)
        body["status"]["privacyStatus"] = "private"
        body["status"]["publishAt"] = (
            dt.astimezone(datetime.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
        )

    return body


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


def delete_video_on_youtube(video_id: str) -> None:
    """Delete a video from the authenticated channel by its video ID."""
    access_token = _get_valid_token()
    resp = requests.delete(
        f"{API_BASE}/videos",
        params={"id": video_id},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    if resp.status_code != 204:
        raise RuntimeError(f"Delete failed (HTTP {resp.status_code}): {resp.text[:200]}")
    print(f"[publisher_youtube] Deleted video_id={video_id}")


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
            delete_video_on_youtube(args.delete)
        except Exception as e:
            print(f"\n[publisher_youtube] FAILED: {e}")
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
        result = publish_video_on_youtube(args.video, metadata)
        print(f"\nResult: {result}")
    except Exception as e:
        print(f"\n[publisher_youtube] FAILED: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
