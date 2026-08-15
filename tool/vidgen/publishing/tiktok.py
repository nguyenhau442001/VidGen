"""VidGen-to-Publisher handoff for TikTok.

This module deliberately does not publish to TikTok. It sends a completed render and
proposed metadata to the creator-facing VidGen Publisher, where a creator must review,
choose TikTok settings, explicitly confirm, and press Publish.
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path

import requests

from vidgen.publishing.common import PublishMetadata


def build_publisher_handoff(
    video_path: str | Path,
    *,
    title: str = "",
    caption: str = "",
    hashtags: list[str] | None = None,
    metadata: dict | None = None,
) -> dict:
    """Build the review-draft contract without initiating any platform upload."""
    path = Path(video_path).resolve()
    if not path.is_file():
        raise FileNotFoundError(f"Video not found: {path}")
    normalized_tags = []
    for tag in hashtags or []:
        clean = str(tag).strip().lstrip("#")
        if clean and clean not in normalized_tags:
            normalized_tags.append(clean)
    return {
        "video_path": str(path),
        "title": title.strip(),
        "caption": caption.strip(),
        "hashtags": normalized_tags[:5],
        "metadata": {"source": "vidgen", **(metadata or {})},
    }


def send_to_publisher(
    video_path: str | Path,
    *,
    title: str = "",
    caption: str = "",
    hashtags: list[str] | None = None,
    metadata: dict | None = None,
    app_url: str | None = None,
    handoff_secret: str | None = None,
) -> dict:
    """Create a Publisher review draft and return its creator-facing URL."""
    base_url = (app_url or os.getenv("APP_URL", "")).rstrip("/")
    secret = handoff_secret or os.getenv("VIDGEN_HANDOFF_SECRET", "")
    if not base_url:
        raise RuntimeError("APP_URL is required")
    if not secret:
        raise RuntimeError("VIDGEN_HANDOFF_SECRET is required")
    response = requests.post(
        f"{base_url}/api/vidgen/handoff",
        headers={"X-VidGen-Handoff-Secret": secret, "Content-Type": "application/json"},
        json=build_publisher_handoff(
            video_path, title=title, caption=caption, hashtags=hashtags, metadata=metadata
        ),
        timeout=30,
    )
    if not response.ok:
        raise RuntimeError(f"Publisher handoff failed ({response.status_code}): {response.text[:300]}")
    return response.json()


def publish_tiktok(*args, **kwargs):
    """Block the former unattended CLI publishing path."""
    raise RuntimeError(
        "Direct CLI publishing is disabled. Send a draft to VidGen Publisher so the "
        "creator can review, configure, confirm, and press Publish."
    )


def publish_video_on_tiktok(video_path: str | Path, metadata: PublishMetadata) -> dict:
    """Compatibility adapter that creates a review draft; it never reports success as a post."""
    result = send_to_publisher(
        video_path,
        title=metadata.title,
        caption=metadata.description,
        hashtags=metadata.tags,
        metadata={"schedule_time": metadata.schedule_time, "requested_privacy": metadata.privacy},
    )
    return {
        "status": "awaiting_creator_review",
        "draft_id": result["draft_id"],
        "url": result["publisher_url"],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Send a VidGen render to creator review")
    parser.add_argument("video", help="Path to a completed video")
    parser.add_argument("--title", default="")
    parser.add_argument("--caption", default="")
    parser.add_argument("--hashtag", action="append", default=[])
    args = parser.parse_args()
    result = send_to_publisher(
        args.video, title=args.title, caption=args.caption, hashtags=args.hashtag
    )
    print(f"Creator review required: {result['publisher_url']}")


if __name__ == "__main__":
    main()
