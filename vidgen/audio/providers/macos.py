"""Offline macOS `say` TTS provider."""

from __future__ import annotations

import os
import subprocess
import tempfile
from typing import Any

import numpy as np

from vidgen.audio.audio_processing import read_audio_file
from vidgen.audio.providers.common import coerce_voice_name


def synthesize(text: str, voice: Any = None) -> tuple[np.ndarray, int]:
    voice_name = coerce_voice_name(voice, "MACOS_SAY_VOICE") or "Linh"
    with tempfile.NamedTemporaryFile(suffix=".aiff", delete=False) as tmp:
        out_path = tmp.name
    try:
        subprocess.run(
            ["say", "-v", voice_name, "-o", out_path, text],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return read_audio_file(out_path)
    finally:
        try:
            os.unlink(out_path)
        except FileNotFoundError:
            pass
