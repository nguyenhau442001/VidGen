"""Helpers for VidGen's shot-first authoring contract."""

from __future__ import annotations

from copy import deepcopy

SHOT_CONTAINER_KEYS = ("shots",)


def script_shots(script: dict) -> list[dict]:
    """Return the authored shot list from a script dict."""
    return script.get("shots") or []


def manifest_shots(manifest: dict) -> list[dict]:
    """Return the rendered shot list from a manifest dict."""
    return manifest.get("shots") or []


def normalize_script_shots(script: dict) -> dict:
    """Return a shallow copy with a `shots` key present."""
    shots = script_shots(script)
    normalized = dict(script)
    if shots:
        normalized["shots"] = shots
    elif "shots" not in normalized:
        normalized["shots"] = []
    return normalized


def normalize_manifest_shots(manifest: dict) -> dict:
    """Return a shallow copy with a `shots` key present."""
    shots = manifest_shots(manifest)
    normalized = dict(manifest)
    if shots:
        normalized["shots"] = shots
    elif "shots" not in normalized:
        normalized["shots"] = []
    return normalized


def copy_shot_list(script: dict) -> list[dict]:
    """Deep-copy the shot list when a caller needs a private mutable list."""
    return deepcopy(script_shots(script))
