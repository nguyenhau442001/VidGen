"""Canonical filesystem locations for the VidGen repository."""

from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
RESOURCES_DIR = REPO_ROOT / "resources"
CONTENT_DIR = REPO_ROOT / "content"
OUTPUT_DIR = REPO_ROOT / "output"
REMOTION_DIR = REPO_ROOT / "remotion"
