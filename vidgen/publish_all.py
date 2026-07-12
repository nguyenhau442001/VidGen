"""
vidgen/publish_all.py — Publish one video to every ready platform in a single command.

Currently: Facebook + YouTube (both live). TikTok is wired in publisher.py but
excluded here until its Direct Post API access is approved — add it back to
PLATFORMS once GAP 5 / TikTok flips to done in the README.

Usage:
    python -m vidgen.publish_all out/video.mp4 --title "Tiêu đề video"
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from vidgen.publish_common import PublishMetadata
from vidgen.publisher_facebook import publish_video_on_facebook
from vidgen.publisher_youtube import publish_video_on_youtube

PLATFORMS = {
    "facebook": publish_video_on_facebook,
    "youtube": publish_video_on_youtube,
}


def publish_to_all(video_path, metadata: PublishMetadata) -> dict:
    """Publishes to every platform in PLATFORMS. Runs all even if one fails."""
    results = {}
    for name, publish_fn in PLATFORMS.items():
        try:
            results[name] = publish_fn(video_path, metadata)
        except Exception as e:
            results[name] = {"status": "failed", "error": str(e)}
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish a video to all ready platforms (Facebook + YouTube)")
    parser.add_argument("video", help="Path to .mp4 file")
    parser.add_argument("--title", default="", help="Video title")
    parser.add_argument("--description", default="", help="Video description (default: title)")
    parser.add_argument("--tags", default="", help="Comma-separated tags (YouTube only)")
    parser.add_argument("--privacy", default="public", choices=["public", "unlisted", "private"])
    parser.add_argument("--made-for-kids", action="store_true")
    parser.add_argument("--schedule", default=None, metavar="ISO_DATETIME", help="e.g. '2026-07-20T20:00:00'")

    args = parser.parse_args()

    title = args.title or Path(args.video).stem.replace("_", " ")
    metadata = PublishMetadata(
        title=title,
        description=args.description or title,
        tags=[t.strip() for t in args.tags.split(",") if t.strip()],
        privacy=args.privacy,
        made_for_kids=args.made_for_kids,
        schedule_time=args.schedule,
    )

    results = publish_to_all(args.video, metadata)

    print("\n== Publish summary ==========================================")
    failed = False
    for platform, result in results.items():
        if result.get("status") == "succeeded":
            print(f"  {platform:9s} OK   {result['url']}")
        else:
            failed = True
            print(f"  {platform:9s} FAIL {result.get('error', result)}")

    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
