"""Viettel AI HTTP TTS provider."""

from __future__ import annotations

import base64
import binascii
import json
import os
from typing import Any
from urllib import error as urllib_error
from urllib import request as urllib_request

import numpy as np

from vidgen.audio.audio_processing import audio_from_bytes
from vidgen.audio.providers.common import coerce_voice_name

def _decode_base64_string(value: str) -> bytes | None:
    compact = "".join(value.split())
    if len(compact) < 16:
        return None
    try:
        return base64.b64decode(compact, validate=True)
    except (binascii.Error, ValueError):
        return None


def _extract_remote_audio_source(payload: Any) -> tuple[str, str | bytes] | None:
    if isinstance(payload, dict):
        for key in ("audio_url", "download_url", "url", "file_url", "audioUri"):
            value = payload.get(key)
            if isinstance(value, str) and value.startswith(("http://", "https://")):
                return ("url", value)

        for key in ("audio", "audio_base64", "base64", "data", "result", "content"):
            value = payload.get(key)
            if isinstance(value, str):
                if value.startswith("data:"):
                    _, _, encoded = value.partition(",")
                    decoded = _decode_base64_string(encoded)
                    if decoded is not None:
                        return ("bytes", decoded)
                decoded = _decode_base64_string(value)
                if decoded is not None:
                    return ("bytes", decoded)

        for value in payload.values():
            nested = _extract_remote_audio_source(value)
            if nested is not None:
                return nested

    if isinstance(payload, list):
        for item in payload:
            nested = _extract_remote_audio_source(item)
            if nested is not None:
                return nested

    return None


def _download_url_audio(url: str) -> tuple[np.ndarray, int]:
    with urllib_request.urlopen(url, timeout=120) as resp:
        raw = resp.read()
        content_type = resp.headers.get_content_type()
    return audio_from_bytes(raw, content_type)


def audio_from_response(raw: bytes, content_type: str | None) -> tuple[np.ndarray, int]:
    if content_type and content_type.startswith("audio/"):
        return audio_from_bytes(raw, content_type)

    stripped = raw.lstrip()
    if stripped.startswith((b"{", b"[")):
        payload = json.loads(raw.decode("utf-8"))
        source = _extract_remote_audio_source(payload)
        if source is None:
            raise RuntimeError(
                "Viettel AI TTS response did not contain audio. "
                f"Top-level keys: {list(payload)[:8] if isinstance(payload, dict) else type(payload).__name__}"
            )
        kind, value = source
        if kind == "url":
            return _download_url_audio(value)
        return audio_from_bytes(value, content_type)

    return audio_from_bytes(raw, content_type)


def synthesize(text: str, voice: Any = None) -> tuple[np.ndarray, int]:
    endpoint = os.getenv("VIETTEL_AI_TTS_URL", "https://viettelai.vn/tts/speech_synthesis")

    payload: dict[str, Any] = {
        "text": text,
        "speed": 1.0,
        "tts_return_option": int(os.getenv("VIETTEL_AI_RETURN_OPTION", "3")),
        "without_filter": os.getenv("VIETTEL_AI_WITHOUT_FILTER", "false").lower() == "true",
    }
    voice_name = coerce_voice_name(voice, "VIETTEL_AI_VOICE")
    if voice_name:
        payload["voice"] = voice_name

    token = os.getenv("VIETTEL_AI_TOKEN") or os.getenv("VIETTEL_AI_API_KEY")
    if token:
        payload["token"] = token

    extra_body = os.getenv("VIETTEL_AI_EXTRA_BODY_JSON")
    if extra_body:
        payload.update(json.loads(extra_body))

    headers: dict[str, str] = {
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "audio/*, application/json",
    }

    extra_headers = os.getenv("VIETTEL_AI_EXTRA_HEADERS_JSON")
    if extra_headers:
        headers.update(json.loads(extra_headers))

    request = urllib_request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    timeout_s = float(os.getenv("VIETTEL_AI_TIMEOUT_SECONDS", "120"))
    try:
        with urllib_request.urlopen(request, timeout=timeout_s) as resp:
            raw = resp.read()
            content_type = resp.headers.get_content_type()
    except urllib_error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"Viettel AI TTS failed with HTTP {exc.code}: {body[:500]}"
        ) from exc

    return audio_from_response(raw, content_type)



