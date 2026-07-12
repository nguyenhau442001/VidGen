"""
vidgen/publisher_facebook.py — Auto-publish to Facebook Page video feed (Graph API)

Flow:
    1. Load the Page access token (long-lived, no refresh needed)
    2. Init resumable upload session (/{APP_ID}/uploads) -> upload_session_id
    3. Upload video in chunks (file_offset protocol)     -> file handle ("h")
    4. Publish: POST /{PAGE_ID}/videos with the file handle (or schedule)
    5. Poll status.video_status until "ready"
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
SCHEDULE_MAX_SECONDS = 180 * 24 * 60 * 60  # ~6 months, per Page videos API limit

FAILED_VIDEO_STATUSES = {"error", "upload_failed", "transcode_failed", "invalid", "expired"}


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

def _build_publish_params(metadata: PublishMetadata) -> dict:
    """Build the /{PAGE_ID}/videos publish params from PublishMetadata."""
    if metadata.tags:
        print("[publisher_facebook] Warning: --tags is ignored on Facebook videos (no tags field; put hashtags in the description).")
    if metadata.privacy and metadata.privacy != "public":
        print(f"[publisher_facebook] Warning: --privacy={metadata.privacy} is ignored; Page video visibility follows the Page's own settings.")
    if metadata.made_for_kids:
        print("[publisher_facebook] Warning: --made-for-kids is ignored; Facebook Page videos have no equivalent flag.")

    params: dict = {
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
                f"schedule_time must be between 10 minutes and 6 months from now (got {delta:.0f}s)"
            )
        params["published"] = "false"
        params["scheduled_publish_time"] = int(dt.timestamp())

    return params


def _init_upload_session(page_token: str, video_path: Path) -> str:
    """Start a resumable upload session. Returns the upload session id ("upload:...")."""
    resp = requests.post(
        f"{GRAPH_BASE}/{FACEBOOK_APP_ID}/uploads",
        params={
            "file_name": video_path.name,
            "file_length": video_path.stat().st_size,
            "file_type": "video/mp4",
            "access_token": page_token,
        },
    )
    data = resp.json()
    if resp.status_code != 200 or "id" not in data:
        raise RuntimeError(f"Upload init failed (HTTP {resp.status_code}): {resp.text[:200]}")
    print(f"[publisher_facebook] Upload session initialized - {data['id']}")
    return data["id"]


def _upload_video_chunks(upload_session_id: str, video_path: Path, page_token: str) -> str:
    """
    Uploads video_path using Facebook's resumable upload protocol: each chunk
    is POSTed to /{upload_session_id} with a file_offset header. The final
    chunk's response carries the uploaded file handle ("h") needed to publish.
    """
    total_size = video_path.stat().st_size
    if total_size == 0:
        raise RuntimeError(f"Cannot upload empty file: {video_path}")

    file_handle = None
    start = 0
    with open(video_path, "rb") as f:
        while start < total_size:
            end = min(start + CHUNK_SIZE, total_size)
            f.seek(start)
            chunk = f.read(end - start)

            resp = requests.post(
                f"{GRAPH_BASE}/{upload_session_id}",
                headers={
                    "Authorization": f"OAuth {page_token}",
                    "file_offset": str(start),
                },
                data=chunk,
            )
            data = resp.json()
            if resp.status_code != 200:
                raise RuntimeError(
                    f"Chunk upload failed at offset {start} (HTTP {resp.status_code}): {resp.text[:200]}"
                )
            if "h" in data:
                file_handle = data["h"]
            start = end

    if not file_handle:
        raise RuntimeError("Upload finished but no file handle ('h') was returned")

    print("[publisher_facebook] Upload complete")
    return file_handle


def _finish_upload(page_token: str, file_handle: str, metadata: PublishMetadata) -> str:
    """Publishes (or schedules) the uploaded video to the Page. Returns the new video_id."""
    params = _build_publish_params(metadata)
    params["fbuploader_video_file_chunk"] = file_handle
    params["access_token"] = page_token
    resp = requests.post(f"{GRAPH_BASE}/{FACEBOOK_PAGE_ID}/videos", params=params)
    data = resp.json()
    if resp.status_code != 200 or "id" not in data:
        raise RuntimeError(f"Publish failed (HTTP {resp.status_code}): {resp.text[:200]}")
    return data["id"]


def _check_publishing_status(page_token: str, video_id: str):
    """check_fn for poll_until: polls status.video_status."""
    resp = requests.get(
        f"{GRAPH_BASE}/{video_id}",
        params={"fields": "status", "access_token": page_token},
    )
    resp.raise_for_status()
    status = resp.json().get("status", {})
    video_status = status.get("video_status", "processing")
    print(f"[publisher_facebook] Publishing status: {video_status}")
    if video_status == "ready":
        return True, False, status
    if video_status in FAILED_VIDEO_STATUSES:
        return False, True, status
    return False, False, status


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

    print("\n-- Facebook Page Video Publish -----------------------------")
    print(f"   File:  {video_path.name} ({video_path.stat().st_size // 1024 // 1024} MB)")
    print(f"   Title: {metadata.title[:60]}")

    _start_time = time.time()

    try:
        page_token = _get_page_token()
        upload_session_id = _init_upload_session(page_token, video_path)
        file_handle = _upload_video_chunks(upload_session_id, video_path, page_token)
        video_id = _finish_upload(page_token, file_handle, metadata)

        poll_until(
            lambda: _check_publishing_status(page_token, video_id),
            interval=POLL_INTERVAL,
            max_attempts=POLL_MAX,
        )

        duration = str(int(time.time() - _start_time))
        url = f"https://www.facebook.com/watch/?v={video_id}"
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


def delete_video_on_facebook(video_id: str) -> None:
    """Delete a video from the Page by its video ID."""
    page_token = _get_page_token()
    resp = requests.delete(f"{GRAPH_BASE}/{video_id}", params={"access_token": page_token})
    data = resp.json()
    if resp.status_code != 200 or data.get("success") is not True:
        raise RuntimeError(f"Delete failed (HTTP {resp.status_code}): {resp.text[:200]}")
    print(f"[publisher_facebook] Deleted video_id={video_id}")


SETUP_GUIDE = """
=== Facebook Page Video Publisher - One-time Setup Guide ===================

  STEP 1 - Create a Meta for Developers app
  -------------------------------------------
  1. Go to https://developers.facebook.com/apps/
  2. Create App -> type: Business
  3. Use cases -> Add -> "Manage Pages" -> Set Up
     (NOT "Facebook Login for Business" - that product doesn't expose
     the pages_* permissions video publishing needs)
  4. In Manage Pages -> Permissions and features, click "+ Add" for:
       - pages_show_list
       - pages_read_engagement
       - pages_manage_posts
     Leave them on Standard Access (no App Review needed - Standard
     Access already works for accounts with a role on the app).
  5. App Roles -> Roles -> confirm your account is listed as Admin
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
    parser = argparse.ArgumentParser(description="VidGen Facebook Page video publisher")
    parser.add_argument("video", nargs="?", help="Path to .mp4 file")
    parser.add_argument("--title", default="", help="Video title")
    parser.add_argument("--description", default="", help="Video description (default: title)")
    parser.add_argument("--tags", default="", help="Ignored on Facebook (no tags field on Page videos)")
    parser.add_argument("--privacy", default="public", choices=["public", "unlisted", "private"], help="Ignored on Facebook (Page videos follow the Page's own visibility)")
    parser.add_argument("--made-for-kids", action="store_true", help="Ignored on Facebook (no equivalent flag)")
    parser.add_argument("--schedule", default=None, metavar="ISO_DATETIME", help="e.g. '2026-07-20T20:00:00' (must be 10min-6months out)")
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
