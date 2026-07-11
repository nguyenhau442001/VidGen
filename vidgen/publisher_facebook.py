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


def delete_video_on_facebook(video_id: str) -> None:
    """Delete a Reel/video from the Page by its video ID."""
    page_token = _get_page_token()
    resp = requests.delete(f"{GRAPH_BASE}/{video_id}", params={"access_token": page_token})
    data = resp.json()
    if resp.status_code != 200 or data.get("success") is not True:
        raise RuntimeError(f"Delete failed (HTTP {resp.status_code}): {resp.text[:200]}")
    print(f"[publisher_facebook] Deleted video_id={video_id}")


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
