"""Canonical filesystem locations for the VidGen repository."""

from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
RESOURCES_DIR = REPO_ROOT / "resources"
CONTENT_DIR = REPO_ROOT / "content"
CONTENT_JSON_DIR = CONTENT_DIR / "json"
CONTENT_TEXT_DIR = CONTENT_DIR / "text"
CONTENT_MEDIA_DIR = CONTENT_DIR / "media"
OUTPUT_DIR = REPO_ROOT / "output"
REMOTION_DIR = REPO_ROOT / "remotion"
REMOTION_PUBLIC_VIDEO = REMOTION_DIR / "public" / "video"
REMOTION_PUBLIC_IMAGES = REMOTION_DIR / "public" / "images"
