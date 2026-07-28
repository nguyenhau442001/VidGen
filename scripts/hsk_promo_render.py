"""Rebuild output/hsk_flashcards_promo_with_text.mp4 from the untouched
rawcut with a corrected ffmpeg drawtext filtergraph.

Root cause of the bug being fixed: the previous (lost, never-committed)
generation script centered every line with x=(w-text_w)/2 without ever
measuring text_w against the actual rendered width at the chosen fontsize,
and used a single hardcoded bottom-Y for the subtitle layer regardless of
line length or scene. Long lines ran past both frame edges, and the
subtitle Y sat close enough to 1920 that some lines were cut by the frame
edge and collided with buttons in the source footage.

Fix strategy:
  - Every text line is measured against the real font file (PIL) before
    being handed to ffmpeg, and font size / wrapping is chosen so the
    rendered width never exceeds SAFE_WIDTH (see hsk_promo_textfit.py).
  - MAIN_OVERLAY and SUBTITLE occupy two fixed, non-overlapping Y bands
    with a guaranteed gap between them and the frame edges.
  - All positions are computed in Python (not ffmpeg expressions) so the
    values written into the filtergraph are already safe.
"""
from __future__ import annotations

import subprocess
from dataclasses import dataclass, field
from pathlib import Path

from hsk_promo_textfit import (
    FONT_EXTRABOLD,
    FONT_SEMIBOLD,
    FRAME_H,
    FRAME_W,
    fit_text,
)

REPO_ROOT = Path(__file__).resolve().parent.parent
RAWCUT = REPO_ROOT / "output" / "hsk_flashcards_promo_rawcut.mp4"
OUTPUT = REPO_ROOT / "output" / "hsk_flashcards_promo_with_text.mp4"

# Safe horizontal margin: never let text extend past these x-bounds.
SIDE_MARGIN = 72
SAFE_WIDTH = FRAME_W - 2 * SIDE_MARGIN  # 936px

# Two fixed, non-overlapping vertical bands.
OVERLAY_BAND_TOP = 560     # main headline band starts here
OVERLAY_BAND_MAX_BOTTOM = 800   # never allowed past this Y
SUBTITLE_BAND_BOTTOM_MARGIN = 140  # distance from frame bottom (1920) to subtitle baseline zone
SUBTITLE_BAND_MAX_TOP = 1660  # subtitle block must never start above this (keeps gap from overlay)

OVERLAY_FONTSIZE = 60
OVERLAY_MIN_FONTSIZE = 40
OVERLAY_MAX_LINES = 2

SUBTITLE_FONTSIZE = 40
SUBTITLE_MIN_FONTSIZE = 28
SUBTITLE_MAX_LINES = 2

BOX_BORDER = 18


@dataclass
class TextCue:
    lines: list[str]
    start: float
    end: float
    layer: str  # "overlay" | "subtitle"


def _escape(text: str) -> str:
    return (
        text.replace("\\", "\\\\")
        .replace(":", "\\:")
        .replace("'", "’")
        .replace("%", "\\%")
    )


def build_drawtext_filters(cues: list[TextCue]) -> list[str]:
    filters = []
    for cue in cues:
        font = FONT_EXTRABOLD if cue.layer == "overlay" else FONT_SEMIBOLD
        start_size = OVERLAY_FONTSIZE if cue.layer == "overlay" else SUBTITLE_FONTSIZE
        min_size = OVERLAY_MIN_FONTSIZE if cue.layer == "overlay" else SUBTITLE_MIN_FONTSIZE
        max_lines = OVERLAY_MAX_LINES if cue.layer == "overlay" else SUBTITLE_MAX_LINES

        fit = fit_text(
            cue.lines,
            font,
            max_width=SAFE_WIDTH,
            start_fontsize=start_size,
            min_fontsize=min_size,
            max_lines=max_lines,
        )

        n = len(fit.lines)
        block_height = fit.line_height * n

        if cue.layer == "overlay":
            top = OVERLAY_BAND_TOP
            # keep block within the overlay band regardless of 1 vs 2 lines
            if top + block_height > OVERLAY_BAND_MAX_BOTTOM:
                top = OVERLAY_BAND_MAX_BOTTOM - block_height
        else:
            bottom = FRAME_H - SUBTITLE_BAND_BOTTOM_MARGIN
            top = bottom - block_height
            if top < SUBTITLE_BAND_MAX_TOP:
                top = SUBTITLE_BAND_MAX_TOP

        enable = f"between(t\\,{cue.start:.3f}\\,{cue.end:.3f})"

        for i, line in enumerate(fit.lines):
            y = top + i * fit.line_height
            escaped = _escape(line)
            filt = (
                "drawtext="
                f"fontfile='{font}':"
                f"text='{escaped}':"
                f"fontsize={fit.fontsize}:"
                "fontcolor=white:"
                f"borderw={BOX_BORDER if cue.layer == 'overlay' else 12}:"
                "bordercolor=black@0.9:"
                "x=(w-text_w)/2:"
                f"y={y}:"
                f"enable='{enable}'"
            )
            filters.append(filt)
    return filters


def render(cues: list[TextCue], dry_run: bool = False) -> None:
    filters = build_drawtext_filters(cues)
    filtergraph = ",".join(filters)

    filter_script = REPO_ROOT / "output" / ".hsk_promo_filter.txt"
    filter_script.write_text(filtergraph)

    cmd = [
        "ffmpeg", "-y",
        "-i", str(RAWCUT),
        "-filter_script:v", str(filter_script),
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "copy",
        str(OUTPUT),
    ]
    print(" ".join(cmd))
    if dry_run:
        return
    subprocess.run(cmd, check=True)


if __name__ == "__main__":
    import sys
    dry = "--dry-run" in sys.argv
    from hsk_promo_scenes import CUES
    render(CUES, dry_run=dry)
