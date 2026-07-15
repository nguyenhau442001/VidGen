"""
vidgen/beatmap.py — Beat Map: predicted-replay heuristic scorer.

Rule-based, no API key, no real viewer data (the video hasn't published yet
when this runs). Scores each scene 0-100 on signals correlated with
short-form rewatch behavior — numeric payoff, narration density relative to
the video's own pace, pattern interrupts, hook/twist proximity, and brevity
under information load — then flags the top 3 scenes as "hot". Purely
advisory: never raises, never blocks the pipeline (unlike gate1/gate2).

Usage:
    from vidgen.beatmap import score_beatmap, write_beatmap, format_report

    beatmap = score_beatmap(script, manifest)
    write_beatmap(beatmap, "output/beatmap.json")
    print(format_report(beatmap))
"""

from __future__ import annotations
import json

from vidgen.shot_api import manifest_shots, script_shots

# Scene types whose whole point is a number/stat/delta reveal — the moment
# viewers rewind to re-read. Snake_case values from manifest.py's TYPE_MAP.
PAYOFF_TYPES = {"stat_comparator", "counter_blast", "score_card", "delta_arrow"}

# Vietnamese reveal/twist words that signal a "wait, what" beat.
TWIST_WORDS = {"hóa ra", "hoá ra", "sự thật", "không ngờ", "bất ngờ", "thực ra"}

TOP_N_HOT = 3


def score_beatmap(script: dict, manifest: dict) -> dict:
    """Score every shot in a resolved script against its built render
    manifest. Returns {"video_title": str, "scenes": [...]}; empty scenes
    list if script/manifest scene counts don't line up (never raises)."""
    scenes = script_shots(script)
    manifest_scenes = manifest_shots(manifest)
    fps = manifest.get("fps", 30)

    # Matches main.py's own title resolution — scripts may carry the title at
    # the top level or nested under "meta" (motion-pipeline-1.0 style).
    video_title = (
        script.get("title") or script.get("meta", {}).get("title")
        or script.get("meta", {}).get("slug") or ""
    )

    if not scenes or len(scenes) != len(manifest_scenes):
        return {"video_title": video_title, "scenes": []}

    # words-per-second per shot, plus this video's own average — a shot is
    # only "dense" relative to its own video's pace, not some fixed WPS.
    wps_list = []
    for scene, mscene in zip(scenes, manifest_scenes):
        narration = scene.get("narration") or ""
        words = len(narration.split())
        duration_s = mscene.get("durationInFrames", 0) / fps
        wps = (words / duration_s) if words and duration_s > 0 else 0.0
        wps_list.append(wps)
    avg_wps = (sum(wps_list) / len(wps_list)) if wps_list else 0.0

    results = []
    for i, (scene, mscene) in enumerate(zip(scenes, manifest_scenes)):
        reasons: list[str] = []
        score = 0
        narration = scene.get("narration") or ""
        scene_type = mscene.get("type", "")

        # Numeric payoff
        if scene_type in PAYOFF_TYPES:
            score += 30
            reasons.append("numeric payoff")

        # Info rate — scaled relative to this video's own average pace
        wps = wps_list[i]
        if avg_wps > 0 and wps > avg_wps:
            ratio = min(wps / avg_wps, 2.0)  # cap the multiplier
            gained = round(25 * (ratio - 1))
            if gained > 0:
                score += gained
                reasons.append(f"high info-rate ({wps:.1f} wps vs {avg_wps:.1f} avg)")

        # Pattern interrupt — scene type differs from both neighbors
        prev_type = manifest_scenes[i - 1].get("type") if i > 0 else None
        next_type = manifest_scenes[i + 1].get("type") if i < len(manifest_scenes) - 1 else None
        if scene_type not in (prev_type, next_type) and (prev_type or next_type):
            score += 20
            reasons.append("pattern interrupt")

        # Hook/twist proximity
        if i == 0:
            score += 15
            reasons.append("opening hook")
        else:
            hits = [w for w in TWIST_WORDS if w in narration.lower()]
            if hits:
                score += 15
                reasons.append(f"twist language ({hits[0]})")

        # Brevity under load — fast scene that still carries narration
        duration_frames = mscene.get("durationInFrames", 0)
        if narration and duration_frames <= 120:
            score += 10
            reasons.append("fast + information-dense")

        score = max(0, min(100, score))
        results.append({
            "id": mscene.get("label", str(scene.get("id"))),
            "index": i,
            "score": score,
            "reasons": reasons,
        })

    # Flag the top N scenes as "hot" (ties keep original order via stable sort)
    ranked = sorted(range(len(results)), key=lambda idx: -results[idx]["score"])
    hot_indices = set(ranked[:TOP_N_HOT])
    for idx, r in enumerate(results):
        r["hot"] = idx in hot_indices

    return {"video_title": video_title, "scenes": results}


def write_beatmap(beatmap: dict, output_path: str) -> None:
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(beatmap, f, ensure_ascii=False, indent=2)


def format_report(beatmap: dict) -> str:
    """Format a beat map as a readable terminal scorecard (same box style as
    gate1/gate2's reports)."""
    scenes = beatmap.get("scenes", [])
    if not scenes:
        return (
            "╔══ BEAT MAP: no scenes scored ══════════════════════\n"
            "╚═════════════════════════════════════════════════════"
        )

    lines = [
        "╔══ BEAT MAP (predicted replay score) ════════════════",
        f"║  {beatmap.get('video_title', '')}",
        "║",
    ]
    for s in scenes:
        marker = "🔥" if s["hot"] else "  "
        bar_len = round(s["score"] / 5)
        bar = "█" * bar_len + "░" * (20 - bar_len)
        reason_str = ", ".join(s["reasons"]) if s["reasons"] else "-"
        lines.append(f"║ {marker} {s['id']:<14} {bar} {s['score']:>3}/100  {reason_str}")
    lines.append("╚═════════════════════════════════════════════════════")
    return "\n".join(lines)
