#!/usr/bin/env python3
"""
audit_audio.py

Heuristic support tool for vidgen-audio-audit. Analyzes 16-bit PCM .wav files produced
by vidgen's tts_speed.py (per-scene <scene_id>.wav) and reports raw signal metrics:
peak amplitude, RMS/loudness, clipping ratio, leading/trailing silence, internal silence
gaps > 120ms, and (if a script JSON is given) duration mismatch against durationInFrames.

This script does NOT judge pass/fail — it surfaces numbers for Claude/a human to compare
against thresholds in references/audio-audit-checklist.md. Only 16-bit PCM WAV is
supported (VieNeu/vidgen TTS output). Uses only the Python standard library: wave, array,
math — deliberately avoids the deprecated `audioop` module.

Usage:
  python3 audit_audio.py --dir <output_dir> [--script content/<slug>.json] [--fps 30]
  python3 audit_audio.py --file <path-to-single.wav>
"""
import argparse
import array
import glob
import json
import math
import os
import sys
import wave

WINDOW_MS = 10
SILENCE_DBFS = -40.0   # windows quieter than this are treated as silence
INTERNAL_GAP_MS = 120  # matches vidgen's own "collapse pauses > 120ms" target
CLIP_THRESHOLD = 32760  # near the 16-bit signed max (32767)


def read_wav(path):
    with wave.open(path, "rb") as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        n_frames = wf.getnframes()
        raw = wf.readframes(n_frames)
    if sampwidth != 2:
        raise ValueError(f"Only 16-bit PCM WAV supported (got sampwidth={sampwidth} bytes)")
    samples = array.array("h")
    samples.frombytes(raw)
    if sys.byteorder == "big":
        samples.byteswap()
    return samples, n_channels, framerate


def downmix_mono(samples, n_channels):
    if n_channels == 1:
        return list(samples)
    mono = []
    for i in range(0, len(samples) - n_channels + 1, n_channels):
        frame = samples[i:i + n_channels]
        mono.append(sum(frame) / n_channels)
    return mono


def rms(values):
    if not values:
        return 0.0
    return math.sqrt(sum(v * v for v in values) / len(values))


def dbfs(rms_value):
    if rms_value <= 0:
        return -120.0
    return 20 * math.log10(rms_value / 32768.0)


def window_rms_series(mono, framerate):
    window_len = max(1, int(framerate * WINDOW_MS / 1000))
    windows = []
    for i in range(0, len(mono), window_len):
        chunk = mono[i:i + window_len]
        windows.append(rms(chunk))
    return windows, window_len


def analyze_silence(windows, window_len, framerate):
    silence_threshold_linear = 32768.0 * (10 ** (SILENCE_DBFS / 20))
    is_silent = [w < silence_threshold_linear for w in windows]
    window_ms_actual = window_len / framerate * 1000

    leading = 0
    for s in is_silent:
        if s:
            leading += 1
        else:
            break
    trailing = 0
    for s in reversed(is_silent):
        if s:
            trailing += 1
        else:
            break

    internal_gaps = []
    i = leading
    end_idx = len(is_silent) - trailing
    while i < end_idx:
        if is_silent[i]:
            start = i
            while i < end_idx and is_silent[i]:
                i += 1
            gap_len_ms = (i - start) * window_ms_actual
            if gap_len_ms > INTERNAL_GAP_MS:
                start_time_ms = start * window_ms_actual
                internal_gaps.append((round(start_time_ms), round(gap_len_ms)))
        else:
            i += 1

    return {
        "leading_silence_ms": round(leading * window_ms_actual),
        "trailing_silence_ms": round(trailing * window_ms_actual),
        "internal_gaps": internal_gaps,
    }


def analyze_file(path):
    samples, n_channels, framerate = read_wav(path)
    n_total = len(samples)
    duration_s = (n_total / n_channels) / framerate if n_channels else 0

    peak = max((abs(s) for s in samples), default=0)
    clip_count = sum(1 for s in samples if abs(s) >= CLIP_THRESHOLD)
    clip_ratio = clip_count / n_total if n_total else 0

    mono = downmix_mono(samples, n_channels)
    overall_rms = rms(mono)

    windows, window_len = window_rms_series(mono, framerate)
    silence_info = analyze_silence(windows, window_len, framerate)

    return {
        "path": path,
        "duration_s": round(duration_s, 2),
        "channels": n_channels,
        "framerate": framerate,
        "peak": peak,
        "rms": round(overall_rms, 1),
        "rms_dbfs": round(dbfs(overall_rms), 1),
        "clip_ratio_pct": round(clip_ratio * 100, 3),
        **silence_info,
    }


def load_duration_frames(script_path):
    """Best-effort: find durationInFrames per scene_id-like key in a VidGen script JSON."""
    try:
        with open(script_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

    result = {}

    def walk(obj):
        if isinstance(obj, dict):
            scene_id = obj.get("id") or obj.get("scene_id") or obj.get("sceneId")
            duration = obj.get("durationInFrames")
            if scene_id and duration is not None:
                result[str(scene_id)] = duration
            for v in obj.values():
                walk(v)
        elif isinstance(obj, list):
            for item in obj:
                walk(item)

    walk(data)
    return result


def main():
    parser = argparse.ArgumentParser(description="Audit TTS .wav files for vidgen-audio-audit")
    parser.add_argument("--dir", help="Directory of per-scene .wav files")
    parser.add_argument("--file", help="Single .wav file to analyze")
    parser.add_argument("--script", default=None, help="Optional script JSON for duration cross-check")
    parser.add_argument("--fps", type=int, default=30)
    args = parser.parse_args()

    if args.file:
        paths = [args.file]
    elif args.dir:
        paths = sorted(glob.glob(os.path.join(args.dir, "*.wav")))
    else:
        parser.error("Provide --dir or --file")

    if not paths:
        print("No .wav files found.", file=sys.stderr)
        sys.exit(1)

    duration_frames_by_scene = load_duration_frames(args.script) if args.script else {}

    print(f"=== Audio Audit — Extraction Report ===\n")
    for path in paths:
        try:
            info = analyze_file(path)
        except (wave.Error, ValueError) as e:
            print(f"--- {path} ---\n  ✗ could not analyze: {e}\n")
            continue

        scene_id = os.path.splitext(os.path.basename(path))[0]
        print(f"--- {path} ---")
        print(f"  duration: {info['duration_s']}s  channels: {info['channels']}  "
              f"framerate: {info['framerate']}Hz")
        print(f"  peak: {info['peak']} / 32767   rms: {info['rms']} ({info['rms_dbfs']} dBFS)")
        clip_flag = "⚠" if info["clip_ratio_pct"] > 0.1 else "OK"
        print(f"  clip_ratio: {info['clip_ratio_pct']}% [{clip_flag}]")
        print(f"  leading_silence: {info['leading_silence_ms']}ms   "
              f"trailing_silence: {info['trailing_silence_ms']}ms")
        if info["internal_gaps"]:
            print(f"  ⚠ internal_gaps (>{INTERNAL_GAP_MS}ms): {info['internal_gaps']}")
        else:
            print(f"  internal_gaps: none found")

        if scene_id in duration_frames_by_scene:
            expected_s = duration_frames_by_scene[scene_id] / args.fps
            diff = info["duration_s"] - expected_s
            flag = "⚠ MISMATCH" if abs(diff) > 0.3 else "OK"
            print(f"  durationInFrames match: expected {expected_s:.2f}s, "
                  f"actual {info['duration_s']}s, diff {diff:+.2f}s [{flag}]")
        elif args.script:
            print(f"  (no matching scene_id '{scene_id}' found in {args.script})")
        print()


if __name__ == "__main__":
    main()
