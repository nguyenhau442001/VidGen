"""Safe text measurement/wrapping for the HSK promo ffmpeg drawtext overlay.

Measures against the real font file so every line is guaranteed to fit within
the safe width at the chosen font size before it is handed to ffmpeg -
avoiding the x=(w-text_w)/2 blind-centering bug that let long lines run past
the 1080px frame edge.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import ImageFont

FONT_DIR = Path(__file__).resolve().parent.parent / "output" / ".fonts_cache"
FONT_BOLD = FONT_DIR / "BeVietnamPro-Bold.ttf"
FONT_EXTRABOLD = FONT_DIR / "BeVietnamPro-ExtraBold.ttf"
FONT_SEMIBOLD = FONT_DIR / "BeVietnamPro-SemiBold.ttf"

FRAME_W = 1080
FRAME_H = 1920


@dataclass
class FitResult:
    lines: list[str]
    fontsize: int
    line_height: int


def _measure(text: str, font_path: Path, fontsize: int) -> int:
    font = ImageFont.truetype(str(font_path), fontsize)
    bbox = font.getbbox(text)
    return bbox[2] - bbox[0]


def _wrap_greedy(text: str, font_path: Path, fontsize: int, max_width: int) -> list[str]:
    """Greedy word-wrap that never lets a line exceed max_width at fontsize."""
    words = text.split()
    lines: list[str] = []
    current: list[str] = []
    for word in words:
        trial = " ".join(current + [word])
        if _measure(trial, font_path, fontsize) <= max_width or not current:
            current.append(word)
        else:
            lines.append(" ".join(current))
            current = [word]
    if current:
        lines.append(" ".join(current))
    return lines


def fit_text(
    raw_lines: list[str],
    font_path: Path,
    max_width: int,
    start_fontsize: int,
    min_fontsize: int,
    max_lines: int,
    line_height_ratio: float = 1.25,
) -> FitResult:
    """Shrink fontsize until every authored line (and any forced re-wrap of an
    over-long line) fits max_width, without exceeding max_lines total.

    raw_lines are authored semantic lines (already broken at sentence/clause
    boundaries) - we never merge or reflow across an authored line break, we
    only shrink fontsize or, as a last resort, wrap a single overlong line
    into two.
    """
    fontsize = start_fontsize
    while fontsize >= min_fontsize:
        out_lines: list[str] = []
        ok = True
        for raw in raw_lines:
            if _measure(raw, font_path, fontsize) <= max_width:
                out_lines.append(raw)
                continue
            wrapped = _wrap_greedy(raw, font_path, fontsize, max_width)
            out_lines.extend(wrapped)
        if len(out_lines) <= max_lines and all(
            _measure(l, font_path, fontsize) <= max_width for l in out_lines
        ):
            ok = True
        else:
            ok = False
        if ok:
            line_height = int(fontsize * line_height_ratio)
            return FitResult(lines=out_lines, fontsize=fontsize, line_height=line_height)
        fontsize -= 2
    # Fell through: return smallest size, force-wrapped, even if it exceeds max_lines
    out_lines = []
    for raw in raw_lines:
        out_lines.extend(_wrap_greedy(raw, font_path, min_fontsize, max_width))
    return FitResult(
        lines=out_lines,
        fontsize=min_fontsize,
        line_height=int(min_fontsize * line_height_ratio),
    )


if __name__ == "__main__":
    # quick self-test
    samples = [
        ["ĐÂY LÀ THÀNH QUẢ", "CỦA NHỮNG NGÀY ĐAU KHỔ"],
        ["NÊN TÔI TỰ CODE LUÔN."],
        ["Tôi chỉ cần một bộ flashcard đơn giản, đúng cách mình học."],
    ]
    for lines in samples:
        r = fit_text(lines, FONT_EXTRABOLD, max_width=960, start_fontsize=64, min_fontsize=36, max_lines=2)
        print(lines, "->", r)
