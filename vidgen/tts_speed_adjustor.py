"""
vidgen/tts_speed.py
───────────────────
Speed wrapper for VieNeu-TTS.

VieNeu's `tts.infer()` has no built-in speed/rate parameter.
This module adds a post-processing step: WSOLA time-stretch via
librosa, which changes playback speed while preserving pitch
(pitch-corrected / "robot-free" speedup).

Usage (drop-in replacement for raw tts.infer + tts.save):
    from vidgen.tts_speed import synthesize

    synthesize(
        text="Grab chọn tài xế theo score, không phải khoảng cách.",
        output_path="audio/scene_01.wav",
        voice=my_voice,          # optional: VieNeu voice object
        speed=1.2,               # 1.0 = normal, 1.2 = 20% faster (recommended)
        trim_silence=True,       # strip leading/trailing silence
        max_silence_ms=120,      # max internal silence allowed (ms)
    )

Dependencies:
    pip install librosa soundfile numpy
    (vieneu is already installed in the VidGen env)

Speed guidance:
    1.0  → normal tempo
    1.15 → slightly faster, still sounds natural
    1.2  → recommended for short-form video (podcast host pace)
    1.25 → aggressive, acceptable for dense technical content
    1.3+ → do NOT exceed — Vietnamese tones degrade above this
"""

from __future__ import annotations

import os
import tempfile
import warnings
from pathlib import Path
from typing import Optional, Any

import numpy as np

# ── optional heavy deps (fail loudly with helpful message) ────────────────────
try:
    import librosa
    import soundfile as sf
except ImportError as e:
    raise ImportError(
        "tts_speed requires librosa and soundfile.\n"
        "Install with: pip install librosa soundfile"
    ) from e

try:
    from vieneu import Vieneu
except ImportError as e:
    raise ImportError(
        "VieNeu-TTS is not installed or not on PYTHONPATH.\n"
        "See: https://github.com/pnnbao97/VieNeu-TTS"
    ) from e

# ── module-level singleton — reuse across calls to avoid re-loading model ─────
_tts_instance: Optional[Vieneu] = None


def _get_tts() -> Vieneu:
    global _tts_instance
    if _tts_instance is None:
        _tts_instance = Vieneu()
    return _tts_instance


# ── core helpers ──────────────────────────────────────────────────────────────

def _audio_from_vieneu(audio_spec: Any, tts: Vieneu) -> tuple[np.ndarray, int]:
    """
    Convert whatever tts.infer() returns into (samples: np.ndarray, sample_rate: int).

    VieNeu returns an AudioSpec object. Its save() only accepts a filesystem
    path (a file-like object gets stringified and soundfile rejects it), so
    round-trip through a temp WAV and re-read with soundfile to get a clean
    numpy float32 array + sample rate. This avoids any assumption about the
    internal AudioSpec format.
    """
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        tts.save(audio_spec, tmp_path)
        samples, sr = sf.read(tmp_path, dtype="float32", always_2d=False)
    finally:
        os.unlink(tmp_path)
    return samples, sr


def _time_stretch(samples: np.ndarray, sr: int, speed: float) -> np.ndarray:
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


def _trim_silence(
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


def _apply_gain(samples: np.ndarray, gain_db: float, ceiling: float = 0.99) -> np.ndarray:
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

def synthesize(
    text: str,
    output_path: str | Path,
    voice: Any = None,
    speed: float = 1.2,
    trim_silence: bool = True,
    max_silence_ms: int = 120,
    top_db: int = 30,
    target_dbfs: float | None = -15.0,
) -> Path:
    """
    Synthesize text with VieNeu-TTS, apply speed-up and silence trimming,
    then save to output_path as a WAV file.

    Parameters
    ----------
    text : str
        Vietnamese narration text. English terms are OK inline.
    output_path : str | Path
        Destination .wav file. Parent directory is created if needed.
    voice : Any, optional
        VieNeu voice object from tts.get_preset_voice() or tts.encode_reference().
        If None, uses VieNeu's default voice.
    speed : float
        Playback speed multiplier. Default 1.2 (20% faster, pitch-preserved).
        Recommended range: 1.0–1.3. Do NOT exceed 1.3 for Vietnamese.
    trim_silence : bool
        Whether to trim leading/trailing silence and collapse long internal pauses.
    max_silence_ms : int
        Maximum internal pause duration in milliseconds (default 120ms ≈ 3 frames @25fps).
    top_db : int
        Silence detection threshold. Higher = more aggressive trimming.
    target_dbfs : float | None
        Normalize the finished clip to this RMS level (dBFS), soft-limited
        near full scale so it never hard-clips. Fixed target = every scene
        lands at the same loudness regardless of TTS take variation, near
        the ~-14 LUFS platforms normalize to. None disables normalization
        (clip keeps the model's native level, RMS-restored after stretch).

    Returns
    -------
    Path
        Absolute path to the saved audio file.
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    tts = _get_tts()

    # ── 1. Synthesize ──────────────────────────────────────────────────────────
    infer_kwargs: dict[str, Any] = {"text": text}
    if voice is not None:
        infer_kwargs["voice"] = voice

    audio_spec = tts.infer(**infer_kwargs)
    samples, sr = _audio_from_vieneu(audio_spec, tts)

    # ── 2. Time-stretch (pitch-corrected speedup) ──────────────────────────────
    samples = _time_stretch(samples, sr, speed)

    # ── 3. Silence trimming ────────────────────────────────────────────────────
    if trim_silence:
        samples = _trim_silence(samples, sr, top_db=top_db, max_silence_ms=max_silence_ms)

    # ── 3b. Target loudness normalization (soft-limited) ───────────────────────
    # Measured after trim so the level reflects actual speech content.
    if target_dbfs is not None:
        rms = float(np.sqrt(np.mean(samples**2)))
        if rms > 0.0:
            samples = _apply_gain(samples, target_dbfs - 20.0 * np.log10(rms))

    # ── 4. Save ────────────────────────────────────────────────────────────────
    sf.write(str(output_path), samples, sr, subtype="PCM_16")

    duration_s = len(samples) / sr
    print(f"[tts_speed] ✅ {output_path.name}  {duration_s:.2f}s  (speed={speed}×)")

    return output_path.resolve()


def synthesize_scenes(
    scenes: list[dict],
    output_dir: str | Path,
    voice: Any = None,
    speed: float = 1.2,
    trim_silence: bool = True,
    max_silence_ms: int = 120,
    target_dbfs: float | None = -15.0,
) -> dict[str, Path]:
    """
    Batch synthesize all scenes from a VidGen script dict.

    Parameters
    ----------
    scenes : list[dict]
        List of scene objects from script JSON (each must have 'id' and 'narration').
    output_dir : str | Path
        Directory where per-scene .wav files are saved.
        Files are named: <scene_id>.wav
    voice : Any, optional
        Shared VieNeu voice for all scenes.
    speed, trim_silence, max_silence_ms :
        Forwarded to synthesize().

    Returns
    -------
    dict[str, Path]
        Mapping of scene_id → output WAV path.
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    results: dict[str, Path] = {}
    for scene in scenes:
        scene_id = scene.get("id", "unknown")
        narration = scene.get("narration", "").strip()
        if not narration:
            print(f"[tts_speed] ⚠️  Scene '{scene_id}' has no narration — skipping.")
            continue

        out_path = output_dir / f"{scene_id}.wav"
        synthesize(
            text=narration,
            output_path=out_path,
            voice=voice,
            speed=speed,
            trim_silence=trim_silence,
            max_silence_ms=max_silence_ms,
            target_dbfs=target_dbfs,
        )
        results[scene_id] = out_path

    print(f"[tts_speed] 🎙  {len(results)}/{len(scenes)} scenes synthesized → {output_dir}")
    return results


# ── CLI entry point ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(
        description="VieNeu-TTS speed wrapper — synthesize a VidGen script JSON"
    )
    parser.add_argument("script", help="Path to VidGen script JSON (content/*.json)")
    parser.add_argument("--output-dir", default="audio", help="Output directory for WAV files")
    parser.add_argument("--speed", type=float, default=1.2, help="Speed multiplier (default 1.2)")
    parser.add_argument("--voice", default=None, help="Preset voice ID (e.g. 'Binh')")
    parser.add_argument("--no-trim", action="store_true", help="Disable silence trimming")
    parser.add_argument("--max-silence-ms", type=int, default=120)
    args = parser.parse_args()

    script_path = Path(args.script)
    script = json.loads(script_path.read_text(encoding="utf-8"))
    scenes = script.get("scenes", [])

    voice_obj = None
    if args.voice:
        tts_instance = _get_tts()
        voice_obj = tts_instance.get_preset_voice(args.voice)
        print(f"[tts_speed] 🎤 Using preset voice: {args.voice}")

    synthesize_scenes(
        scenes=scenes,
        output_dir=args.output_dir,
        voice=voice_obj,
        speed=args.speed,
        trim_silence=not args.no_trim,
        max_silence_ms=args.max_silence_ms,
    )