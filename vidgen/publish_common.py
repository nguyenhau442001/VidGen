"""
vidgen/publish_common.py — shared primitives for platform publishers
(TikTok/YouTube/Facebook): metadata shape, OAuth local-server callback,
token file I/O, chunked resumable upload, generic status polling, and a
generalized GitHub Actions failure notification.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class PublishMetadata:
    title: str
    description: str = ""
    tags: list[str] = field(default_factory=list)
    privacy: str = "public"
    made_for_kids: bool = False
    schedule_time: Optional[str] = None  # ISO-8601, e.g. "2026-07-11T20:00:00"


def load_tokens(path: Path) -> dict:
    """Load a token dict from a JSON file, or {} if it doesn't exist yet."""
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return {}


def save_tokens(path: Path, tokens: dict) -> None:
    """Persist a token dict to a JSON file."""
    with open(path, "w") as f:
        json.dump(tokens, f, indent=2)
    print(f"[publish_common] Tokens saved to {path}")
