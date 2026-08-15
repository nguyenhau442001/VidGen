"""Local VieNeu-TTS provider."""

from __future__ import annotations

import os
import tempfile
from typing import Any

import numpy as np
import soundfile as sf

try:
    from vieneu import Vieneu
except ImportError as exc:
    raise ImportError(
        "VieNeu-TTS is not installed or not on PYTHONPATH.\n"
        "See: https://github.com/pnnbao97/VieNeu-TTS"
    ) from exc

DEFAULT_VOICE = "Thanh Bình"
_tts_instance: Vieneu | None = None


def get_tts() -> Vieneu:
    global _tts_instance
    if _tts_instance is None:
        _tts_instance = Vieneu()
    return _tts_instance


def _audio_from_spec(audio_spec: Any, tts: Vieneu) -> tuple[np.ndarray, int]:
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        tts.save(audio_spec, tmp_path)
        return sf.read(tmp_path, dtype="float32", always_2d=False)
    finally:
        os.unlink(tmp_path)


def synthesize(text: str, voice: Any = None) -> tuple[np.ndarray, int]:
    tts = get_tts()
    infer_kwargs: dict[str, Any] = {
        "text": text,
        "voice": DEFAULT_VOICE if voice is None else voice,
    }
    return _audio_from_spec(tts.infer(**infer_kwargs), tts)
