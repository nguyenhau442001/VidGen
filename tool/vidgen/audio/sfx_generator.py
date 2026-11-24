"""Procedural Micro-SFX Generator for VidGen Sound Design Engine.

Generates clean, tactile micro-sound effects (paper slide, marker stroke,
rubber stamp thud, whoosh, mechanical clicks, bass drops) for video transitions.
"""

from pathlib import Path
import numpy as np
import soundfile as sf

SAMPLE_RATE = 44100


def generate_whoosh(duration=0.32, sr=SAMPLE_RATE) -> np.ndarray:
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    noise = np.random.uniform(-1, 1, len(t))
    # Gaussian envelope
    env = np.exp(-((t - duration * 0.45) ** 2) / (2 * (duration * 0.16) ** 2))
    # Frequency modulation filter sweep
    sweep = np.sin(2 * np.pi * (180 + 320 * (t / duration) ** 2) * t)
    signal = noise * 0.35 + sweep * 0.25
    signal = signal * env
    return signal / np.max(np.abs(signal) + 1e-6) * 0.65


def generate_paper_slide(duration=0.28, sr=SAMPLE_RATE) -> np.ndarray:
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # Filtered tactile friction noise
    noise = np.random.uniform(-1, 1, len(t))
    env = (t / duration) * (1 - t / duration) * 4
    # Lowpass-like subtle rustle
    sine = np.sin(2 * np.pi * 320 * t) * 0.2
    signal = (noise * 0.6 + sine) * env
    return signal / np.max(np.abs(signal) + 1e-6) * 0.55


def generate_marker_stroke(duration=0.35, sr=SAMPLE_RATE) -> np.ndarray:
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    noise = np.random.uniform(-1, 1, len(t))
    # Felt-tip drag profile: ramp up, steady drag, soft tail
    env = np.clip(t / (duration * 0.15), 0, 1) * np.clip((duration - t) / (duration * 0.2), 0, 1)
    tone = np.sin(2 * np.pi * (450 + 80 * np.sin(2 * np.pi * 12 * t)) * t) * 0.15
    signal = (noise * 0.5 + tone) * env
    return signal / np.max(np.abs(signal) + 1e-6) * 0.5


def generate_stamp_impact(duration=0.3, sr=SAMPLE_RATE) -> np.ndarray:
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # Heavy mechanical impact: initial transient spike + low body thud
    click_len = int(sr * 0.015)
    click = np.zeros_like(t)
    click[:click_len] = np.random.uniform(-1, 1, click_len) * np.linspace(1, 0, click_len)
    # 85Hz decaying sub thud
    thud = np.sin(2 * np.pi * 85 * np.exp(-14 * t) * t) * np.exp(-22 * t)
    signal = click * 0.5 + thud * 0.9
    return signal / np.max(np.abs(signal) + 1e-6) * 0.85


def generate_camera_shutter(duration=0.22, sr=SAMPLE_RATE) -> np.ndarray:
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    signal = np.zeros_like(t)
    # Snap 1 (mirror up)
    t1 = int(sr * 0.01)
    signal[:t1] = np.random.uniform(-1, 1, t1) * np.linspace(1, 0, t1)
    # Snap 2 (curtain curtain close)
    offset = int(sr * 0.065)
    t2 = int(sr * 0.02)
    if offset + t2 < len(signal):
        signal[offset:offset + t2] += np.random.uniform(-1, 1, t2) * np.linspace(1, 0, t2) * 1.2
    return signal / np.max(np.abs(signal) + 1e-6) * 0.7


def generate_typewriter_key(duration=0.12, sr=SAMPLE_RATE) -> np.ndarray:
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # Sharp metal strike
    click = np.random.uniform(-1, 1, len(t)) * np.exp(-65 * t)
    ping = np.sin(2 * np.pi * 1800 * t) * np.exp(-80 * t) * 0.4
    signal = click + ping
    return signal / np.max(np.abs(signal) + 1e-6) * 0.65


def generate_bass_drop(duration=0.8, sr=SAMPLE_RATE) -> np.ndarray:
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # Deep sub-bass drop from 90Hz to 38Hz
    freq = np.linspace(90, 38, len(t))
    phase = 2 * np.pi * np.cumsum(freq) / sr
    sub = np.sin(phase) * np.exp(-3.5 * t)
    return sub / np.max(np.abs(sub) + 1e-6) * 0.85


def generate_all_sfx(output_dir: Path) -> dict[str, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    registry = {
        "whoosh_subtle": generate_whoosh(),
        "paper_slide": generate_paper_slide(),
        "paper_rustle": generate_paper_slide(),
        "marker_stroke": generate_marker_stroke(),
        "stamp_impact": generate_stamp_impact(),
        "camera_shutter": generate_camera_shutter(),
        "camera_click": generate_camera_shutter(),
        "typewriter_key": generate_typewriter_key(),
        "mechanical_click": generate_typewriter_key(),
        "bass_drop": generate_bass_drop(),
    }
    paths = {}
    for name, audio_data in registry.items():
        out_path = output_dir / f"{name}.wav"
        sf.write(str(out_path), audio_data.astype(np.float32), SAMPLE_RATE)
        paths[name] = out_path
    return paths


if __name__ == "__main__":
    remotion_sfx = Path(__file__).resolve().parents[3] / "tool" / "remotion" / "public" / "sfx"
    paths = generate_all_sfx(remotion_sfx)
    print(f"Generated {len(paths)} SFX assets into {remotion_sfx}")
