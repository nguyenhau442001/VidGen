"""Audio decoding and signal processing shared by TTS providers."""

from __future__ import annotations

import os
import subprocess
import tempfile
import warnings
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

def suffix_for_content_type(content_type: str | None) -> str:
    if not content_type:
        return ".bin"
    base_type = content_type.split(";", 1)[0].strip().lower()
    if base_type in {"audio/wav", "audio/x-wav"}:
        return ".wav"
    if base_type in {"audio/mpeg", "audio/mp3"}:
        return ".mp3"
    if base_type in {"audio/flac"}:
        return ".flac"
    if base_type in {"audio/ogg", "audio/opus", "audio/ogg_opus"}:
        return ".ogg"
    if base_type in {"audio/pcm", "audio/l16", "application/octet-stream"}:
        return ".bin"
    return ".bin"


def suffix_for_audio_bytes(raw: bytes) -> str:
    if raw.startswith(b"RIFF"):
        return ".wav"
    if raw.startswith(b"fLaC"):
        return ".flac"
    if raw.startswith(b"OggS"):
        return ".ogg"
    if raw.startswith(b"ID3") or raw[:2] == b"\xff\xfb":
        return ".mp3"
    return ".bin"


def read_audio_file(path: str | Path) -> tuple[np.ndarray, int]:
    try:
        samples, sr = sf.read(str(path), dtype="float32", always_2d=False)
        if np.size(samples) == 0:
            raise ValueError("decoded audio was empty")
        return samples, sr
    except Exception:
        converted_path = f"{path}.wav"
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(path), "-vn", converted_path],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        try:
            samples, sr = sf.read(converted_path, dtype="float32", always_2d=False)
            return samples, sr
        finally:
            try:
                os.unlink(converted_path)
            except FileNotFoundError:
                pass


def content_type_params(content_type: str | None) -> dict[str, str]:
    if not content_type:
        return {}
    params = {}
    for raw_part in content_type.split(";")[1:]:
        key, _, value = raw_part.strip().partition("=")
        if key and value:
            params[key.lower()] = value.strip().strip('"')
    return params


def audio_from_pcm_bytes(raw: bytes, content_type: str | None) -> tuple[np.ndarray, int]:
    params = content_type_params(content_type)
    sr = int(params.get("rate") or params.get("sample_rate") or "24000")
    channels = int(params.get("channels") or "1")
    base_type = (content_type or "").split(";", 1)[0].strip().lower()
    endian = ">i2" if base_type == "audio/l16" else "<i2"
    samples = np.frombuffer(raw, dtype=np.dtype(endian)).astype(np.float32) / 32768.0
    if channels > 1:
        usable = (len(samples) // channels) * channels
        samples = samples[:usable].reshape(-1, channels)
    return samples, sr


def audio_from_bytes(raw: bytes, content_type: str | None = None) -> tuple[np.ndarray, int]:
    base_type = (content_type or "").split(";", 1)[0].strip().lower()
    if base_type in {"audio/pcm", "audio/l16"}:
        return audio_from_pcm_bytes(raw, content_type)

    suffix = suffix_for_content_type(content_type)
    if suffix == ".bin":
        suffix = suffix_for_audio_bytes(raw)
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(raw)
        tmp_path = tmp.name
    try:
        return read_audio_file(tmp_path)
    finally:
        try:
            os.unlink(tmp_path)
        except FileNotFoundError:
            pass


def time_stretch(samples: np.ndarray, sr: int, speed: float) -> np.ndarray:
    """
    Pitch-preserving time-stretch using librosa's WSOLA implementation.

    rate > 1.0  → faster (shorter duration, same pitch)
    rate < 1.0  → slower (longer duration, same pitch)
    """
    if abs(speed - 1.0) < 0.01:
        return samples  # no-op
    if speed > 1.35:
        warnings.warn(
            f"speed={speed} exceeds recommended maximum of 1.3. "
            "Vietnamese tonal quality may degrade.",
            UserWarning,
            stacklevel=3,
        )
    try:
        # librosa.effects.time_stretch takes rate as the stretch factor
        # rate=1.2 → play 20% faster (output is shorter)
        stretched = librosa.effects.time_stretch(y=samples, rate=speed)

        # The phase-vocoder stretch attenuates energy (~5 dB RMS at 1.2×),
        # leaving the sped clip audibly quieter than unprocessed ones — restore
        # the input's RMS, backing gain off if that would clip peaks.
        in_rms = float(np.sqrt(np.mean(samples**2)))
        out_rms = float(np.sqrt(np.mean(stretched**2)))
        if out_rms > 0.0 and in_rms > 0.0:
            gain = in_rms / out_rms
            peak = float(np.max(np.abs(stretched))) * gain
            if peak > 0.99:
                gain *= 0.99 / peak
            stretched = stretched * gain
        return stretched
    except Exception as exc:
        warnings.warn(
            f"librosa time_stretch failed ({exc}); falling back to ffmpeg atempo.",
            UserWarning,
            stacklevel=3,
        )
        return time_stretch_ffmpeg(samples, sr, speed)


def time_stretch_ffmpeg(samples: np.ndarray, sr: int, speed: float) -> np.ndarray:
    """
    Pitch-preserving fallback using ffmpeg's atempo filter.

    This avoids librosa/numba cache issues in constrained environments while
    keeping the output usable for the render pipeline.
    """
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as src:
        src_path = src.name
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as dst:
        dst_path = dst.name
    try:
        sf.write(src_path, samples, sr)
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                src_path,
                "-filter:a",
                f"atempo={speed}",
                "-vn",
                dst_path,
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        stretched, out_sr = sf.read(dst_path, dtype="float32", always_2d=False)
        if out_sr != sr:
            warnings.warn(
                f"ffmpeg atempo returned sample rate {out_sr} instead of {sr}; using original.",
                UserWarning,
                stacklevel=3,
            )
            return samples
        return stretched
    finally:
        for path in (src_path, dst_path):
            try:
                os.unlink(path)
            except FileNotFoundError:
                pass


def trim_silence(
    samples: np.ndarray,
    sr: int,
    top_db: int = 30,
    max_silence_ms: int = 120,
) -> np.ndarray:
    """
    1. Strip leading and trailing silence (librosa.effects.trim).
    2. Collapse any internal silence runs longer than max_silence_ms
       down to max_silence_ms.

    top_db: threshold in dB below reference — increase to be more aggressive.
    max_silence_ms: maximum allowed internal pause length.
    """
    try:
        # Step 1: trim edges
        trimmed, _ = librosa.effects.trim(samples, top_db=top_db)

        # Step 2: collapse long internal silences
        max_silence_samples = int(sr * max_silence_ms / 1000)
        silence_threshold = librosa.db_to_amplitude(-top_db)

        result_chunks: list[np.ndarray] = []
        i = 0
        n = len(trimmed)

        while i < n:
          # find start of a silence run
            if abs(trimmed[i]) < silence_threshold:
                silence_start = i
                while i < n and abs(trimmed[i]) < silence_threshold:
                    i += 1
                silence_len = i - silence_start
                # keep up to max_silence_samples of the silence
                keep = min(silence_len, max_silence_samples)
                result_chunks.append(trimmed[silence_start: silence_start + keep])
            else:
                chunk_start = i
                while i < n and abs(trimmed[i]) >= silence_threshold:
                    i += 1
                result_chunks.append(trimmed[chunk_start:i])

        return np.concatenate(result_chunks) if result_chunks else trimmed
    except Exception as exc:
        warnings.warn(
            f"librosa trim failed ({exc}); falling back to numpy silence trim.",
            UserWarning,
            stacklevel=3,
        )
        return trim_silence_numpy(samples, sr, top_db=top_db, max_silence_ms=max_silence_ms)


def trim_silence_numpy(
    samples: np.ndarray,
    sr: int,
    top_db: int = 30,
    max_silence_ms: int = 120,
) -> np.ndarray:
    """Lightweight fallback that trims leading/trailing silence and caps long pauses."""
    silence_threshold = 10 ** (-top_db / 20)
    max_silence_samples = int(sr * max_silence_ms / 1000)

    mono = samples if samples.ndim == 1 else np.max(np.abs(samples), axis=1)
    active = np.where(np.abs(mono) >= silence_threshold)[0]
    if active.size == 0:
        return samples

    start = max(0, active[0] - 1)
    end = min(len(samples), active[-1] + 2)
    trimmed = samples[start:end]

    mono_trimmed = mono[start:end]
    chunks: list[np.ndarray] = []
    i = 0
    n = len(trimmed)
    while i < n:
        if abs(mono_trimmed[i]) < silence_threshold:
            silence_start = i
            while i < n and abs(mono_trimmed[i]) < silence_threshold:
                i += 1
            silence_len = i - silence_start
            keep = min(silence_len, max_silence_samples)
            chunks.append(trimmed[silence_start:silence_start + keep])
        else:
            chunk_start = i
            while i < n and abs(mono_trimmed[i]) >= silence_threshold:
                i += 1
            chunks.append(trimmed[chunk_start:i])

    return np.concatenate(chunks) if chunks else trimmed


def apply_gain(samples: np.ndarray, gain_db: float, ceiling: float = 0.99) -> np.ndarray:
    """
    Boost (or cut) by gain_db, soft-limiting anything the boost pushes past
    `ceiling` instead of hard-clipping. The limiter is a tanh knee that only
    touches samples above 0.95 — speech below the knee passes through linear.
    """
    if abs(gain_db) < 0.01:
        return samples
    y = samples * (10.0 ** (gain_db / 20.0))
    knee = 0.95
    over = np.abs(y) > knee
    if np.any(over):
        span = ceiling - knee
        y[over] = np.sign(y[over]) * (knee + span * np.tanh((np.abs(y[over]) - knee) / span))
    return y


# ── public API ────────────────────────────────────────────────────────────────

