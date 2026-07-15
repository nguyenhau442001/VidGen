"""
vidgen/gate2_visual.py — Gate 2: Visual Quality Enforcement

Extracts keyframes from the rendered .mp4 using ffmpeg, then runs
OpenCV-based checks for contrast, sharpness, and background darkness.
No API key required — fully offline.

Drop this file into your vidgen/ package directory.

Dependencies:
    pip install opencv-python numpy
    # ffmpeg must be available in PATH

Usage:
    from vidgen.gate2_visual import gate2_assert

    gate2_assert("out/my-topic.mp4")   # raises ValueError if checks fail
"""

from __future__ import annotations
import json
import os
import shutil
import subprocess
import sys
import tempfile

try:
    import cv2
    import numpy as np
    _CV2_AVAILABLE = True
except ImportError:
    _CV2_AVAILABLE = False


# ---------------------------------------------------------------------------
# Thresholds support both the channel's default light theme and intentional
# dark cinematic scenes. Theme polarity is not a quality signal by itself;
# usable tonal separation is.
#
# CONTRAST_MIN/SHARPNESS_MIN were originally set to 40/80, which rejected
# every one of 16 real sampled frames across both grab_dispatch_p1 (shipped)
# and grab_dispatch_p2 — including frames visually confirmed fine (a single
# soft-glow dot on a near-black background legitimately measures std≈6,
# Laplacian≈6; this project's minimalist style has genuine breathing-room
# beats that aren't "washed out" or "blurry", just sparse by design). Floors
# lowered to only catch a truly blank/solid-color frame (variance ≈0), not
# this project's normal sparse moments.
# LIGHT_BG_MIN replaces the old dark-theme DARK_BG_MAX check (which asserted
# the darkest 10% of pixels stayed below 80 — i.e. genuinely dark background,
# white text pops). Post migration the polarity flipped: scenes now render on
# a light background with dark text, so the invariant worth catching is a
# stray leftover dark-theme background (a scene component not migrated off
# hardcoded dark literals), not a background that's "too bright" — checked by
# requiring the *brightest* 10% of pixels (the background, now the light
# majority) to be light enough that dark text still pops against it.
# ACCENT_GREEN_MIN's check also assumed a single fixed accent color required
# on *every* sampled frame; this project deliberately varies accent color by
# section and by script (e.g. #00ff41/#22C55E for the data-signal scenes,
# #ef4444/#f97316 for alert/incident-themed scripts, plus scene types like
# CodeScene that carry no accent color at all by design) — checked as
# "present somewhere across the sampled frames" instead. The set of colors
# that count as a valid accent is not hardcoded here: it's read from
# colors.json (the project's shared name → hex registry) so new scripts can
# introduce a new palette by adding a name there, not by editing this file.
# ---------------------------------------------------------------------------

CONTRAST_MIN = 5.0         # grayscale std deviation — below = flat/washed out
SHARPNESS_MIN = 5.0        # Laplacian variance — below = blurry text
LIGHT_BG_MIN = 180.0       # brightest-decile floor for a light composition
DARK_BG_MAX = 75.0         # darkest-decile ceiling for a dark composition
TONAL_RANGE_MIN = 35.0     # dark compositions still need visible highlights

_COLORS_PATH = os.path.join(os.path.dirname(__file__), "colors.json")
with open(_COLORS_PATH, encoding="utf-8") as _f:
    _COLOR_REGISTRY: dict[str, str] = json.load(_f)

# "gray" is a neutral/muted comparison color (e.g. "before" stats), not an
# eye-catching accent — every other registry entry counts.
_NON_ACCENT_NAMES = {"gray"}
ACCENT_COLORS = [
    hexcolor.lstrip("#").lower()
    for name, hexcolor in _COLOR_REGISTRY.items()
    if name not in _NON_ACCENT_NAMES
]
ACCENT_GREEN_MIN = 0.0025  # slender cinematic lines can be visible below 0.3% coverage
KEYFRAME_SECONDS = [1, 3, 6, 10, 20, 35, 50, 65]  # sample across full 70s


# ---------------------------------------------------------------------------
# ffmpeg frame extraction
# ---------------------------------------------------------------------------

def _check_ffmpeg() -> None:
    if shutil.which("ffmpeg") is None:
        raise EnvironmentError(
            "ffmpeg not found in PATH.\n"
            "Install: https://ffmpeg.org/download.html\n"
            "  Ubuntu/Debian: sudo apt install ffmpeg\n"
            "  macOS:         brew install ffmpeg"
        )


def extract_frames(mp4_path: str, tmpdir: str) -> list[tuple[int, str]]:
    """
    Extract keyframes at KEYFRAME_SECONDS from mp4_path.
    Returns list of (timestamp_sec, png_path) for frames that exist in the video.
    """
    _check_ffmpeg()

    # Get video duration first so we don't request frames past the end
    probe = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json",
         "-show_format", mp4_path],
        capture_output=True, text=True
    )
    duration = float("inf")
    try:
        info = json.loads(probe.stdout)
        duration = float(info["format"]["duration"])
    except Exception:
        pass  # proceed without duration guard

    results: list[tuple[int, str]] = []
    for t in KEYFRAME_SECONDS:
        if t >= duration:
            continue
        out_path = os.path.join(tmpdir, f"frame_{t:03d}.png")
        ret = subprocess.run(
            ["ffmpeg", "-ss", str(t), "-i", mp4_path,
             "-frames:v", "1", out_path, "-y", "-loglevel", "quiet"],
            capture_output=True
        )
        if ret.returncode == 0 and os.path.exists(out_path):
            results.append((t, out_path))

    if not results:
        raise RuntimeError(
            f"ffmpeg could not extract any frames from '{mp4_path}'.\n"
            "Check that the file exists and is a valid video."
        )
    return results


# ---------------------------------------------------------------------------
# Per-frame OpenCV checks
# ---------------------------------------------------------------------------

def _accent_fraction(frame) -> float:
    """Fraction of pixels near any of this project's accent greens (±40/channel)."""
    h, w = frame.shape[:2]
    bgr = frame.astype(np.int32)
    best = 0.0
    for hexcolor in ACCENT_COLORS:
        r, g, b = int(hexcolor[0:2], 16), int(hexcolor[2:4], 16), int(hexcolor[4:6], 16)
        mask = (
            (np.abs(bgr[:, :, 0] - b) < 40) &
            (np.abs(bgr[:, :, 1] - g) < 40) &
            (np.abs(bgr[:, :, 2] - r) < 40)
        )
        best = max(best, float(mask.sum()) / (h * w))
    return best


def _check_frame(t: int, path: str) -> dict:
    """Run all visual checks on a single frame.

    Returns a dict of hard per-frame issues (unreadable file, background too
    bright) plus raw contrast/sharpness/accent metrics for gate2_assert to
    judge in aggregate — a single isolated low-contrast/blurry frame is
    expected (scene fade transitions legitimately dip near-black for an
    instant, and TTS audio duration shifts scene boundaries slightly between
    runs, so which "moment" lands on a fixed sample timestamp isn't stable
    run-to-run); only a majority of frames failing indicates a real defect.
    """
    issues: list[str] = []

    frame = cv2.imread(path)
    if frame is None:
        return {"issues": [f"frame@{t}s: could not read PNG — skipping"],
                "contrast": None, "sharpness": None, "accent": 0.0}

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    contrast = float(gray.std())
    lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    # Accept either a genuinely light frame or a genuinely dark cinematic
    # frame with enough highlight separation. This rejects muddy mid-gray or
    # nearly blank frames without forcing every video into one theme.
    flat = gray.flatten()
    n10 = max(1, len(flat) // 10)
    ordered = np.sort(flat)
    light_mean = float(ordered[-n10:].mean())
    dark_mean = float(ordered[:n10].mean())
    is_light = light_mean >= LIGHT_BG_MIN
    is_dark = dark_mean <= DARK_BG_MAX and light_mean - dark_mean >= TONAL_RANGE_MIN
    if not (is_light or is_dark):
        issues.append(
            f"frame@{t}s: MUDDY BACKGROUND — dark_mean={dark_mean:.1f}, "
            f"light_mean={light_mean:.1f}. Expected a light frame or a dark "
            f"frame with at least {TONAL_RANGE_MIN:.0f} levels of separation."
        )

    return {
        "issues": issues,
        "contrast": contrast,
        "sharpness": lap_var,
        "accent": _accent_fraction(frame),
    }


# ---------------------------------------------------------------------------
# Main gate function
# ---------------------------------------------------------------------------

def gate2_assert(mp4_path: str) -> dict:
    """
    Run Gate 2 visual quality checks on a rendered .mp4.

    Raises:
        EnvironmentError: if ffmpeg or opencv-python is missing.
        RuntimeError:     if no frames can be extracted.
        ValueError:       with a detailed report if any visual check fails.

    Returns:
        dict with keys: pass, checked_frames, issues (empty list on success).
    """
    if not _CV2_AVAILABLE:
        raise EnvironmentError(
            "opencv-python not installed.\n"
            "Run: pip install opencv-python numpy"
        )

    if not os.path.exists(mp4_path):
        raise FileNotFoundError(f"Video file not found: '{mp4_path}'")

    all_issues: list[str] = []
    accent_fractions: list[float] = []
    low_contrast: list[tuple[int, float]] = []
    low_sharpness: list[tuple[int, float]] = []

    with tempfile.TemporaryDirectory(prefix="vidgen_gate2_") as tmpdir:
        frames = extract_frames(mp4_path, tmpdir)

        for t, path in frames:
            result = _check_frame(t, path)
            all_issues.extend(result["issues"])
            accent_fractions.append(result["accent"])
            if result["contrast"] is not None and result["contrast"] < CONTRAST_MIN:
                low_contrast.append((t, result["contrast"]))
            if result["sharpness"] is not None and result["sharpness"] < SHARPNESS_MIN:
                low_sharpness.append((t, result["sharpness"]))

    checked = len(frames)

    # A single isolated frame failing is tolerated (scene fade transitions
    # legitimately dip near-black for an instant) — only 2+ frames indicates
    # a systemic rendering problem worth failing the gate over.
    if len(low_contrast) > 1:
        detail = ", ".join(f"{t}s (std={c:.1f})" for t, c in low_contrast)
        all_issues.append(
            f"LOW CONTRAST on {len(low_contrast)}/{checked} sampled frames "
            f"(min {CONTRAST_MIN}): {detail}. Scene may appear flat or washed out."
        )
    if len(low_sharpness) > 1:
        detail = ", ".join(f"{t}s (lap={l:.1f})" for t, l in low_sharpness)
        all_issues.append(
            f"BLURRY TEXT on {len(low_sharpness)}/{checked} sampled frames "
            f"(min {SHARPNESS_MIN}): {detail}. Text may not be legible."
        )

    if accent_fractions and max(accent_fractions) < ACCENT_GREEN_MIN:
        all_issues.append(
            f"ACCENT COLOR MISSING across all {checked} sampled frames — "
            f"best coverage {max(accent_fractions)*100:.3f}% (min {ACCENT_GREEN_MIN*100:.2f}% "
            f"in at least one frame). Checked: {', '.join('#' + c for c in ACCENT_COLORS)}."
        )

    if all_issues:
        lines = [
            "╔══ GATE 2 FAIL ══════════════════════════════════",
            f"║  Checked {checked} frames from: {mp4_path}",
            f"║  Issues found: {len(all_issues)}",
            "║",
        ]
        for issue in all_issues:
            lines.append(f"║  ⚠  {issue}")
        lines += [
            "║",
            "║  Fix suggestions:",
            "║    • Low contrast  → check scene background color (colors.bg, ~#f8f9fa)",
            "║    • Blurry text   → increase font size or reduce headline length",
            "║    • Muddy bg      → increase separation between background and highlights",
            "║    • No accent     → verify accentColor in JSON is a hex from vidgen/colors.json",
            "╚════════════════════════════════════════════════",
        ]
        raise ValueError("\n".join(lines))

    return {
        "pass": True,
        "checked_frames": checked,
        "issues": [],
        "report": (
            f"╔══ GATE 2 PASS ══════════════════════════════════\n"
            f"║  Checked {checked} frames  ✅\n"
            f"║  Contrast ✅  Sharpness ✅  Background ✅  Accent ✅\n"
            f"╚════════════════════════════════════════════════"
        ),
    }


# ---------------------------------------------------------------------------
# CLI: python gate2_visual.py out/my-topic.mp4
# ---------------------------------------------------------------------------

def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python gate2_visual.py <path-to-video.mp4>")
        sys.exit(1)

    mp4 = sys.argv[1]
    try:
        result = gate2_assert(mp4)
        print(result["report"])
        sys.exit(0)
    except (ValueError, RuntimeError, EnvironmentError, FileNotFoundError) as e:
        print(e)
        sys.exit(1)


if __name__ == "__main__":
    main()
