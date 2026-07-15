"""Helpers for VidGen's shot-first authoring contract.

The pipeline now treats `shots` as the canonical public container while still
accepting legacy `scenes` input and output aliases for compatibility. This
module centralizes that normalization so the rest of the codebase can prefer
shots without duplicating fallback logic everywhere.
"""

from __future__ import annotations

from copy import deepcopy

SHOT_CONTAINER_KEYS = ("shots", "scenes")


def script_shots(script: dict) -> list[dict]:
    """Return the authored shot list from a script dict.

    Accepts the new public `shots` key first, then falls back to legacy
    `scenes`, then to the nested motion-pipeline schema after it has been
    flattened.
    """
    shots = script.get("shots")
    if shots is None:
        shots = script.get("scenes")
    return shots or []


def manifest_shots(manifest: dict) -> list[dict]:
    """Return the rendered shot list from a manifest dict."""
    shots = manifest.get("shots")
    if shots is None:
        shots = manifest.get("scenes")
    return shots or []


def normalize_script_shots(script: dict) -> dict:
    """Return a shallow copy with both `shots` and `scenes` aliases present."""
    shots = script_shots(script)
    normalized = dict(script)
    if shots:
        normalized["shots"] = shots
        normalized["scenes"] = shots
    elif "shots" not in normalized and "scenes" not in normalized:
        normalized["shots"] = []
        normalized["scenes"] = []
    return normalized


def normalize_manifest_shots(manifest: dict) -> dict:
    """Return a shallow copy with both `shots` and `scenes` aliases present."""
    shots = manifest_shots(manifest)
    normalized = dict(manifest)
    if shots:
        normalized["shots"] = shots
        normalized["scenes"] = shots
    elif "shots" not in normalized and "scenes" not in normalized:
        normalized["shots"] = []
        normalized["scenes"] = []
    return normalized


def copy_shot_list(script: dict) -> list[dict]:
    """Deep-copy the shot list when a caller needs a private mutable list."""
    return deepcopy(script_shots(script))
