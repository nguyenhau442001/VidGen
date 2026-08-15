"""Canonical filesystem locations for the VidGen repository."""

from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
RESOURCES_DIR = REPO_ROOT / "input" / "references" / "config"
CONTENT_DIR = REPO_ROOT / "input" / "content"
CONTENT_JSON_DIR = CONTENT_DIR / "json"
CONTENT_TEXT_DIR = CONTENT_DIR / "text"
CONTENT_MEDIA_DIR = REPO_ROOT / "output" / "content" / "media"
OUTPUT_DIR = REPO_ROOT / "output" / "build" / "pipeline"
REMOTION_DIR = REPO_ROOT / "tool" / "remotion"
REMOTION_PUBLIC_VIDEO = REMOTION_DIR / "public" / "video"
REMOTION_PUBLIC_IMAGES = REMOTION_DIR / "public" / "images"
