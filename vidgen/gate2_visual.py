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
# Thresholds  (tuned for VidGen dark-background style: bg=#0a0a0f)
# ---------------------------------------------------------------------------

CONTRAST_MIN = 40.0        # grayscale std deviation — below = flat/washed out
SHARPNESS_MIN = 80.0       # Laplacian variance — below = blurry text
DARK_BG_MAX = 80.0         # mean of darkest 10% pixels — above = bg too bright
ACCENT_GREEN_MIN = 0.003   # fraction of pixels near #00ff41 — below = accent missing
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

def _check_frame(t: int, path: str) -> list[str]:
    """Run all visual checks on a single frame. Returns list of issue strings."""
    issues: list[str] = []

    frame = cv2.imread(path)
    if frame is None:
        issues.append(f"frame@{t}s: could not read PNG — skipping")
        return issues

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    # ── Check 1: Contrast ────────────────────────────────────────────────
    contrast = float(gray.std())
    if contrast < CONTRAST_MIN:
        issues.append(
            f"frame@{t}s: LOW CONTRAST — std={contrast:.1f} (min {CONTRAST_MIN}). "
            "Scene may appear flat or washed out."
        )

    # ── Check 2: Sharpness / text legibility ─────────────────────────────
    lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if lap_var < SHARPNESS_MIN:
        issues.append(
            f"frame@{t}s: BLURRY TEXT — Laplacian={lap_var:.1f} (min {SHARPNESS_MIN}). "
            "Text may not be legible."
        )

    # ── Check 3: Background darkness ─────────────────────────────────────
    flat = gray.flatten()
    n10 = max(1, len(flat) // 10)
    dark_mean = float(np.sort(flat)[:n10].mean())
    if dark_mean > DARK_BG_MAX:
        issues.append(
            f"frame@{t}s: BACKGROUND TOO BRIGHT — dark_mean={dark_mean:.1f} "
            f"(max {DARK_BG_MAX}). White text will not pop."
        )

    # ── Check 4: Accent green presence ───────────────────────────────────
    # #00ff41 in BGR = (65, 255, 0); tolerance ±40 per channel
    bgr = frame.astype(np.int32)
    mask = (
        (np.abs(bgr[:, :, 0] - 65)  < 40) &
        (np.abs(bgr[:, :, 1] - 255) < 40) &
        (np.abs(bgr[:, :, 2] - 0)   < 40)
    )
    accent_frac = float(mask.sum()) / (h * w)
    if accent_frac < ACCENT_GREEN_MIN:
        issues.append(
            f"frame@{t}s: ACCENT COLOR MISSING — "
            f"#00ff41 covers only {accent_frac*100:.3f}% of pixels "
            f"(min {ACCENT_GREEN_MIN*100:.2f}%). "
            "Check accentWord and color config."
        )

    return issues


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

    with tempfile.TemporaryDirectory(prefix="vidgen_gate2_") as tmpdir:
        frames = extract_frames(mp4_path, tmpdir)

        for t, path in frames:
            frame_issues = _check_frame(t, path)
            all_issues.extend(frame_issues)

    checked = len(frames)

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
            "║    • Low contrast  → check scene background color (#0a0a0f)",
            "║    • Blurry text   → increase font size or reduce headline length",
            "║    • Bright bg     → enforce dark background in scene components",
            "║    • No accent     → verify accentWord in JSON matches #00ff41 in TSX",
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
            f"║  Contrast ✅  Sharpness ✅  Dark BG ✅  Accent ✅\n"
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
