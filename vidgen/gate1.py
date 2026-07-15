"""
vidgen/gate1.py — Gate 1: Content Quality Enforcement

Rule-based script scorer. No API key required.
Drop this file into your vidgen/ package directory.

Usage:
    from vidgen.gate1 import gate1_assert, score_script

    script = json.load(open("content/my-topic.json"))
    gate1_assert(script)          # raises ValueError if score too low
    report = score_script(script) # returns dict with per-dimension scores
"""

from __future__ import annotations
import json
import re
import sys

from vidgen.manifest import TYPE_MAP
from vidgen.shot_api import script_shots

# ---------------------------------------------------------------------------
# Thresholds
#
# Calibrated against this project's actual shipped scripts (Vietnamese
# narration, the 24-shot component library in remotion/src/types.ts, snake_case
# `duration_frames`) rather than a generic English script template — scripts
# here never use "HookScene"/"CTAScene" types, and Vietnamese on-screen text
# is written with multi-syllable words (space-separated syllables), so raw
# whitespace word counts run higher than an English equivalent.
# ---------------------------------------------------------------------------

MIN_TOTAL_SCORE = 16        # out of 20 (4 dimensions × 5 max each)
MIN_DIMENSION_SCORE = 3     # every dimension must be at least this
VALID_FRAME_RANGE = (90, 390)  # 3s–13s per scene @ 30fps
MAX_HOOK_WORDS = 20         # hook narration word count ceiling
IDEAL_HOOK_WORDS = 14       # word count for full hook score
MAX_HEADLINE_WORDS = 12     # on-screen headline word count ceiling
FILLER_WORDS = {            # Vietnamese filler/padding words to penalise
    "ừm", "thì", "là", "nhé", "ạ", "vậy", "thôi", "nào", "đây",
    "tiếp theo", "chúng ta", "hôm nay", "bắt đầu",
}
# Scripts author a scene's `type` as either the PascalCase Remotion component
# name or the snake_case manifest key (see vidgen/manifest.py's TYPE_MAP and
# remotion/src/types.ts's ManifestScene union).
VALID_SCENE_TYPES = set(TYPE_MAP.keys()) | set(TYPE_MAP.values()) | {
    "animated_flow", "bubble_comparator", "phone_map",
    "conversation", "before_after", "grid_heatmap",
}
ACCENT_COLOR = "#00ff41"


def _tokens(text: str) -> list[str]:
    return re.findall(r"[^\s.,!?—\-]+", text.lower())


def _filler_hits(text: str) -> list[str]:
    tokens = _tokens(text)
    joined = " " + " ".join(tokens) + " "
    return [w for w in FILLER_WORDS if f" {w} " in joined]


# ---------------------------------------------------------------------------
# Scorer
# ---------------------------------------------------------------------------

def score_script(script: dict) -> dict:
    """
    Score a VidGen script JSON across 4 dimensions.
    Returns a dict: {dimension: score, ..., "total": int, "issues": [str]}
    Each dimension is scored 1–5.  Total max = 20.
    """
    scenes: list[dict] = script_shots(script)
    issues: list[str] = []
    scores: dict[str, int] = {}

    if not scenes:
        return {"hook": 1, "pacing": 1, "visual": 1, "arc": 1,
                "total": 4, "issues": ["No shots found in script"]}

    # ------------------------------------------------------------------
    # Dimension 1: Hook strength
    # ------------------------------------------------------------------
    hook = scenes[0]
    hook_narration = hook.get("narration") or ""
    hook_word_count = len(hook_narration.split())

    hook_score = 5
    if hook_word_count > IDEAL_HOOK_WORDS:
        hook_score -= 1
        issues.append(f"hook: narration is {hook_word_count} words (ideal ≤ {IDEAL_HOOK_WORDS})")
    if hook_word_count > MAX_HOOK_WORDS:
        hook_score -= 1
        issues.append(f"hook: narration too long ({hook_word_count} words, max {MAX_HOOK_WORDS})")
    filler_hits = _filler_hits(hook_narration)
    if filler_hits:
        hook_score -= 1
        issues.append(f"hook: filler words detected — {filler_hits}")
    scores["hook"] = max(1, hook_score)

    # ------------------------------------------------------------------
    # Dimension 2: Pacing (durationInFrames validity)
    # ------------------------------------------------------------------
    bad_pacing: list[str] = []
    for s in scenes:
        dur = s.get("duration_frames", 0)
        sid = s.get("id", "?")
        lo, hi = VALID_FRAME_RANGE
        if dur < lo:
            bad_pacing.append(f"shot '{sid}': {dur} frames < {lo} (too fast)")
        elif dur > hi:
            bad_pacing.append(f"shot '{sid}': {dur} frames > {hi} (too slow)")

    if not bad_pacing:
        scores["pacing"] = 5
    elif len(bad_pacing) == 1:
        scores["pacing"] = 3
        issues.extend(bad_pacing)
    else:
        scores["pacing"] = 1
        issues.extend(bad_pacing)

    # ------------------------------------------------------------------
    # Dimension 3: Visual / schema integrity
    # ------------------------------------------------------------------
    visual_score = 5
    for s in scenes:
        sid = s.get("id", "?")
        props = s.get("props", {})
        scene_type = s.get("type", "")

        # accentWord must be exact substring of headline
        accent = props.get("accentWord", "")
        headline = props.get("headline", "")
        if accent and headline and accent not in headline:
            visual_score -= 1
            issues.append(
                f"shot '{sid}': accentWord '{accent}' not found in headline '{headline}'"
            )

        # Scene type must be registered
        if scene_type and scene_type not in VALID_SCENE_TYPES:
            visual_score -= 1
            issues.append(f"shot '{sid}': unknown scene type '{scene_type}'")

        # Headline word count ceiling
        if headline and len(headline.split()) > MAX_HEADLINE_WORDS:
            visual_score -= 1
            issues.append(
                f"shot '{sid}': headline too long ({len(headline.split())} words, "
                f"max {MAX_HEADLINE_WORDS})"
            )

    scores["visual"] = max(1, visual_score)

    # ------------------------------------------------------------------
    # Dimension 4: Narrative arc (shot count + structure)
    # ------------------------------------------------------------------
    arc_score = 5
    n = len(scenes)

    # Target shot count scales with total video length, derived from the
    # same per-scene duration bounds used by the pacing dimension — a fixed
    # "5-8 shots" range doesn't generalize across a 30s explainer and a
    # 2-minute deep-dive like this project's multi-part scripts.
    total_frames = sum(s.get("duration_frames", 0) for s in scenes)
    lo_frame, hi_frame = VALID_FRAME_RANGE
    if total_frames > 0:
        lo_arc = max(3, total_frames // hi_frame)
        hi_arc = max(lo_arc, total_frames // lo_frame)
    else:
        lo_arc, hi_arc = 3, 8

    if not (lo_arc <= n <= hi_arc):
        arc_score -= 2
        issues.append(f"arc: {n} shots (target {lo_arc}–{hi_arc} given {total_frames} total frames)")

    # Narration must be present on every shot
    missing_narration = [
        s.get("id", "?") for s in scenes
        if not (s.get("narration") or "").strip() and not s.get("narration_per_criterion")
    ]
    if missing_narration:
        arc_score -= 1
        issues.append(f"arc: missing narration on shots: {missing_narration}")

    scores["arc"] = max(1, arc_score)

    # ------------------------------------------------------------------
    # Total
    # ------------------------------------------------------------------
    scores["total"] = scores["hook"] + scores["pacing"] + scores["visual"] + scores["arc"]
    scores["issues"] = issues
    return scores


# ---------------------------------------------------------------------------
# Assertion gate
# ---------------------------------------------------------------------------

def gate1_assert(
    script: dict,
    min_total: int = MIN_TOTAL_SCORE,
    min_dimension: int = MIN_DIMENSION_SCORE,
) -> dict:
    """
    Run Gate 1 quality check. Raises ValueError with details if the script
    fails. Returns the score dict on success.

    Args:
        script:        Parsed VidGen script JSON (dict with "shots" or legacy "scenes" key).
        min_total:     Minimum total score to pass (default 16/20).
        min_dimension: Minimum score for any single dimension (default 3).

    Raises:
        ValueError: with a human-readable report if the script fails Gate 1.
    """
    audit = score_script(script)
    dim_scores = {k: v for k, v in audit.items() if k not in ("total", "issues")}

    failed_dims = {k: v for k, v in dim_scores.items() if v < min_dimension}
    total_fail = audit["total"] < min_total

    if total_fail or failed_dims:
        lines = [
            "╔══ GATE 1 FAIL ══════════════════════════════════",
            f"║  Total:  {audit['total']}/20  (min {min_total})"
              + ("  ❌" if total_fail else "  ✅"),
        ]
        for dim, score in dim_scores.items():
            flag = "  ❌" if score < min_dimension else "  ✅"
            lines.append(f"║  {dim:<8} {score}/5{flag}")
        if audit["issues"]:
            lines.append("║")
            lines.append("║  Issues:")
            for issue in audit["issues"]:
                lines.append(f"║    • {issue}")
        lines.append("╚════════════════════════════════════════════════")
        raise ValueError("\n".join(lines))

    return audit


def format_report(audit: dict) -> str:
    """Format a passing Gate 1 audit as a readable scorecard."""
    dim_scores = {k: v for k, v in audit.items() if k not in ("total", "issues")}
    lines = [
        "╔══ GATE 1 PASS ══════════════════════════════════",
        f"║  Total:  {audit['total']}/20  ✅",
    ]
    for dim, score in dim_scores.items():
        bar = "█" * score + "░" * (5 - score)
        lines.append(f"║  {dim:<8} {bar}  {score}/5")
    lines.append("╚════════════════════════════════════════════════")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# CLI usage: python -m vidgen.gate1 content/my-topic.json
# ---------------------------------------------------------------------------

def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python gate1.py <path-to-script.json>")
        sys.exit(1)

    path = sys.argv[1]
    try:
        with open(path, encoding="utf-8") as f:
            script = json.load(f)
    except FileNotFoundError:
        print(f"Error: file not found — {path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: invalid JSON — {e}")
        sys.exit(1)

    try:
        audit = gate1_assert(script)
        print(format_report(audit))
        sys.exit(0)
    except ValueError as e:
        print(e)
        sys.exit(1)


if __name__ == "__main__":
    main()
