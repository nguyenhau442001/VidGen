"""Small helpers shared by provider adapters."""

from __future__ import annotations

import os
from typing import Any


def coerce_voice_name(voice: Any, env_var: str) -> str | None:
    if voice is None:
        value = os.getenv(env_var)
        return value.strip() if value and value.strip() else None
    if isinstance(voice, str):
        return voice.strip() or None
    for attr in ("name", "display_name", "voice_id", "id"):
        value = getattr(voice, attr, None)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return str(voice).strip() or None
