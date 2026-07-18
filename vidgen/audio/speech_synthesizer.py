"""Provider-agnostic speech synthesis orchestration for VidGen."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import soundfile as sf

from vidgen.audio import audio_processing
from vidgen.audio import vieneu_tts
from vidgen.pipeline.shot_schema import script_shots

DEFAULT_VIENEU_VOICE = vieneu_tts.DEFAULT_VOICE


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
    """Synthesize, pace, normalize, and save one narration clip as WAV."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    samples, sr = vieneu_tts.synthesize(text, voice)
    samples = audio_processing.time_stretch(samples, sr, speed)
    if trim_silence:
        samples = audio_processing.trim_silence(
            samples,
            sr,
            top_db=top_db,
            max_silence_ms=max_silence_ms,
        )

    if target_dbfs is not None:
        rms = float(np.sqrt(np.mean(samples**2)))
        if rms > 0.0:
            samples = audio_processing.apply_gain(
                samples,
                target_dbfs - 20.0 * np.log10(rms),
            )

    sf.write(str(output_path), samples, sr, subtype="PCM_16")
    duration_s = len(samples) / sr
    print(f"[tts] {output_path.name} {duration_s:.2f}s (speed={speed}x)")
    return output_path.resolve()


def resolve_scene_tts_speed(scene: dict, default_speed: float) -> float:
    """Return the per-scene TTS speed, falling back to the global default."""
    raw_speed = scene.get("tts_speed", default_speed)
    if raw_speed is None:
        raw_speed = default_speed
    try:
        speed = float(raw_speed)
    except (TypeError, ValueError) as exc:
        raise ValueError(
            f"Invalid tts_speed for scene {scene.get('id', '?')}: {raw_speed!r}"
        ) from exc
    if speed <= 0:
        raise ValueError(f"Invalid tts_speed for scene {scene.get('id', '?')}: {speed}")
    return speed


def fit_wav_to_duration(
    wav_path: str | Path,
    max_duration_seconds: float,
    max_speed: float = 1.3,
) -> tuple[float, float]:
    """Pitch-preserve a WAV so it cannot overrun its shot window."""
    if max_duration_seconds <= 0:
        raise ValueError(f"max_duration_seconds must be positive, got {max_duration_seconds}")

    wav_path = Path(wav_path)
    samples, sr = sf.read(str(wav_path), dtype="float32", always_2d=False)
    duration = len(samples) / sr
    if duration <= max_duration_seconds:
        return duration, 1.0

    required_speed = duration / max_duration_seconds
    if required_speed > max_speed:
        raise ValueError(
            f"{wav_path.name} needs {required_speed:.2f}x to fit "
            f"{max_duration_seconds:.2f}s (maximum {max_speed:.2f}x); shorten narration"
        )

    samples = audio_processing.time_stretch(samples, sr, required_speed)
    max_samples = int(max_duration_seconds * sr)
    if len(samples) > max_samples:
        samples = samples[:max_samples]
    sf.write(str(wav_path), samples, sr, subtype="PCM_16")
    final_duration = len(samples) / sr
    print(
        f"[tts] fit {wav_path.name}: {duration:.2f}s -> "
        f"{final_duration:.2f}s ({required_speed:.2f}x)"
    )
    return final_duration, required_speed


def synthesize_scenes(
    scenes: list[dict],
    output_dir: str | Path,
    voice: Any = None,
    speed: float = 1.2,
    trim_silence: bool = True,
    max_silence_ms: int = 120,
    target_dbfs: float | None = -15.0,
) -> dict[str, Path]:
    """Synthesize every narrated shot in a VidGen script."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    results: dict[str, Path] = {}
    for scene in scenes:
        scene_id = scene.get("id", "unknown")
        narration = scene.get("narration", "").strip()
        if not narration:
            print(f"[tts] Shot '{scene_id}' has no narration; skipping")
            continue

        out_path = output_dir / f"{scene_id}.wav"
        synthesize(
            text=narration,
            output_path=out_path,
            voice=voice,
            speed=resolve_scene_tts_speed(scene, speed),
            trim_silence=trim_silence,
            max_silence_ms=max_silence_ms,
            target_dbfs=target_dbfs,
        )
        results[scene_id] = out_path

    print(f"[tts] {len(results)}/{len(scenes)} shots synthesized -> {output_dir}")
    return results


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(
        description="Synthesize narration for a VidGen script JSON"
    )
    parser.add_argument("script", help="Path to VidGen script JSON")
    parser.add_argument("--output-dir", default="audio")
    parser.add_argument("--speed", type=float, default=1.2)
    parser.add_argument("--voice", default=None)
    parser.add_argument("--no-trim", action="store_true")
    parser.add_argument("--max-silence-ms", type=int, default=120)
    args = parser.parse_args()

    script = json.loads(Path(args.script).read_text(encoding="utf-8"))
    voice: Any = args.voice
    if args.voice:
        voice = vieneu_tts.get_tts().get_preset_voice(args.voice)
        print(f"[tts] Using VieNeu preset voice: {args.voice}")

    synthesize_scenes(
        scenes=script_shots(script),
        output_dir=args.output_dir,
        voice=voice,
        speed=args.speed,
        trim_silence=not args.no_trim,
        max_silence_ms=args.max_silence_ms,
    )


if __name__ == "__main__":
    main()
