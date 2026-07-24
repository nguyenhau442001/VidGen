#!/usr/bin/env python3
"""
audit_visual.py

Helper tool for vidgen-visual-audit. Extracts frames from a rendered .mp4 via ffmpeg —
at scene boundaries (if a script JSON with durationInFrames is given) or at a fixed
sampling interval otherwise — then computes basic pixel metrics (mean brightness,
contrast stddev, dominant color) with PIL if it's available in the environment.

This script does NOT judge legibility or aesthetics — those require Claude to actually
view the extracted frames with the `view` tool. It only prepares frames and surfaces
objective numbers to guide which frames deserve closer visual inspection.

Requires: ffmpeg on PATH (already a vidgen dependency, used by its own GATE 2).
Optional: PIL/Pillow for pixel metrics — if unavailable, frames are still extracted and
the script says so explicitly rather than silently skipping the report section.

Usage:
  python3 audit_visual.py --video out/<slug>.mp4 --script content/<slug>.json --out-dir /tmp/visual-audit-frames
  python3 audit_visual.py --video out/<slug>.mp4 --sample-every 2 --out-dir /tmp/visual-audit-frames
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import warnings

try:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        from PIL import Image
    HAVE_PIL = True
except ImportError:
    HAVE_PIL = False


def check_ffmpeg():
    return shutil.which("ffmpeg") is not None


def get_video_duration_s(video_path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", video_path],
        capture_output=True, text=True
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        return None


def scene_boundaries_from_script(script_path, fps):
    """Best-effort: walk the script JSON collecting cumulative scene start times from
    durationInFrames fields, in document order."""
    try:
        with open(script_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None

    starts = []
    cumulative_frames = 0

    def walk(obj):
        nonlocal cumulative_frames
        if isinstance(obj, dict):
            duration = obj.get("durationInFrames")
            if duration is not None:
                starts.append(cumulative_frames / fps)
                cumulative_frames += duration
            else:
                for v in obj.values():
                    walk(v)
        elif isinstance(obj, list):
            for item in obj:
                walk(item)

    walk(data)
    return starts if starts else None


def extract_frame(video_path, time_s, out_path):
    subprocess.run(
        ["ffmpeg", "-y", "-ss", str(time_s), "-i", video_path,
         "-frames:v", "1", "-q:v", "2", out_path],
        capture_output=True
    )
    return os.path.exists(out_path)


def analyze_frame(path):
    if not HAVE_PIL:
        return None
    img = Image.open(path).convert("RGB")
    small = img.resize((80, 45))  # downsample for speed
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        pixels = list(small.getdata())
    n = len(pixels)
    gray_values = [0.299 * r + 0.587 * g + 0.114 * b for r, g, b in pixels]
    mean_brightness = sum(gray_values) / n
    variance = sum((v - mean_brightness) ** 2 for v in gray_values) / n
    contrast_stddev = variance ** 0.5

    avg_r = sum(p[0] for p in pixels) / n
    avg_g = sum(p[1] for p in pixels) / n
    avg_b = sum(p[2] for p in pixels) / n

    return {
        "mean_brightness": round(mean_brightness, 1),
        "contrast_stddev": round(contrast_stddev, 1),
        "dominant_color_approx_rgb": (round(avg_r), round(avg_g), round(avg_b)),
    }


def frange(start, stop, step):
    t = start
    while t < stop:
        yield t
        t += step


def main():
    parser = argparse.ArgumentParser(description="Extract and analyze frames for visual audit")
    parser.add_argument("--video", required=True)
    parser.add_argument("--script", default=None, help="Script JSON for scene-boundary sampling")
    parser.add_argument("--sample-every", type=float, default=2.0,
                         help="Seconds between samples if no script JSON given")
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--out-dir", required=True)
    args = parser.parse_args()

    if not check_ffmpeg():
        print("ffmpeg not found on PATH — cannot extract frames. Install ffmpeg or "
              "run this on a machine where vidgen's own GATE 2 already works.", file=sys.stderr)
        sys.exit(1)

    os.makedirs(args.out_dir, exist_ok=True)

    times = None
    if args.script:
        times = scene_boundaries_from_script(args.script, args.fps)
        if times:
            print(f"Using {len(times)} scene boundaries from {args.script}")
        else:
            print(f"Could not find scene boundaries in {args.script} — "
                  f"falling back to fixed-interval sampling.")

    if not times:
        duration = get_video_duration_s(args.video)
        if duration is None:
            print("Could not read video duration via ffprobe.", file=sys.stderr)
            sys.exit(1)
        times = list(frange(0, duration, args.sample_every))

    if not HAVE_PIL:
        print("\n⚠ PIL/Pillow not available in this environment — frames will be "
              "extracted, but pixel metrics (brightness/contrast/dominant color) will "
              "be skipped. Say so explicitly in the audit report; do not silently omit.\n")

    print(f"\n=== Visual Audit — Frame Extraction Report ({args.video}) ===\n")
    for i, t in enumerate(times):
        frame_path = os.path.join(args.out_dir, f"frame_{i:03d}_t{t:.2f}s.png")
        ok = extract_frame(args.video, t, frame_path)
        if not ok:
            print(f"--- t={t:.2f}s --- ✗ extraction failed")
            continue
        print(f"--- t={t:.2f}s --- saved to {frame_path}")
        metrics = analyze_frame(frame_path)
        if metrics:
            print(f"  mean_brightness: {metrics['mean_brightness']}/255   "
                  f"contrast_stddev: {metrics['contrast_stddev']}   "
                  f"dominant_color_approx_rgb: {metrics['dominant_color_approx_rgb']}")

    print(f"\n{len(times)} frames extracted to {args.out_dir}")
    print("Next: use the `view` tool to actually look at each frame before writing "
          "the audit report — pixel metrics above are supporting data only.")


if __name__ == "__main__":
    main()
