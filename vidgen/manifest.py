import json
import math
import os
import re
import shutil

from vidgen.shot_api import manifest_shots, normalize_manifest_shots, script_shots

FPS = 30
FRAME_PADDING = 10

# Reading-speed ceiling for the on-screen caption, chars/sec with spaces
# counted (standard subtitle guideline). Scene duration is clamped up so the
# caption never leaves the screen before a viewer at this speed finishes it —
# short TTS audio or an authored duration_frames can otherwise cut it early.
MAX_CAPTION_CPS = 17

MAX_DEAD_AIR_FRAMES = 30  # 1s @ 30fps

# Shot ids follow "<scene>_<letter>" (e.g. "shot_01a", "shot_01b", "shot_01c"
# all belong to scene "shot_01"). Ids without a trailing shot letter (plain
# "shot_01", numeric legacy ids) aren't part of a multi-shot scene.
SCENE_GROUP_RE = re.compile(r"^(.+\d)[a-zA-Z]+$")


def scene_name_for(scene_id) -> str | None:
    match = SCENE_GROUP_RE.match(str(scene_id))
    return match.group(1) if match else None

# Script "type" values may be either the old snake_case manifest keys
# (explanation, terminal, ...) or the newer PascalCase Remotion component
# names (MapPingScene, ...). Anything not listed here passes through as-is.
TYPE_MAP = {
    "ExplanationScene": "explanation",
    "TerminalScene": "terminal",
    "CodeScene": "code",
    "ErrorLogScene": "error_log",
    "CharacterIconScene": "character_icon",
    "PhoneMockupScene": "phone_mockup",
    "MapPingScene": "map_ping",
    "GeohashRevealScene": "geohash_reveal",
    "DemandHeatmapScene": "demand_heatmap",
    "SignalFlowScene": "signal_flow",
    "RippleAggregateScene": "ripple_aggregate",
    "DriverSwarmScene": "driver_swarm",
    "CounterBlastScene": "counter_blast",
    "ScoreCardScene": "score_card",
    "SplitViewScene": "split_view",
    "QuoteCalloutScene": "quote_callout",
    "ZoomRevealScene": "zoom_reveal",
    "SplitRevealScene": "split_reveal",
    "RadarHookScene": "radar_hook",
    "AttackScene": "attack_hook",
    "EventScanScene": "event_scan",
    "DriverHeatmapScene": "driver_heatmap",
    "StatComparatorScene": "stat_comparator",
    "NetworkFlowScene": "network_flow",
    "RouteTimelineScene": "route_timeline",
    "CorridorSweepScene": "corridor_sweep",
    "BatchDecisionTreeScene": "batch_decision_tree",
    "DeltaArrowScene": "delta_arrow",
    "DriverConsentScene": "driver_consent",
    "SystemLayerScene": "system_layer",
    "HSKHookScene": "hsk_hook",
    "HSKExplanationScene": "hsk_explanation",
    "HSKCTAScene": "hsk_cta",
    "HSKScreenshotScene": "hsk_screenshot",
    "HSKFlashCardThumbnailScene": "hsk_flashcard",
    "IconThreatScene": "icon_threat",
    "StoryCardScene": "story_card",
    "HookScene": "comparison",
    "ComparisonScene": "comparison",
    "PipelineVerticalScene": "pipeline_vertical",
    "DiagramFlowScene": "diagram_flow",
    "TimelineStagesScene": "timeline_stages",
    "ScanAnimationScene": "scan_animation",
    "ExceptionCardScene": "exception_card",
    "VerdictListScene": "verdict_list",
    "CTAScene": "preview_teaser",
    "PreviewTeaserScene": "preview_teaser",
    "GoogleMapsRevealScene": "google_maps_reveal",
}

# MapPingScene driver dots are placed as fractions (0-1) of the 1080x1920
# canvas. Scripts author driver x/y as pixel-ish positions on a conceptual
# 750x1000 reference box; normalize + clamp so dots always land on-canvas.
MAP_REF_W = 750
MAP_REF_H = 1000

# leftContent/rightContent in split_view scenes are semantic preset keys
# (the script doesn't know SplitViewScene's exact SplitPanelContent shape).
# Scripts authored in the nested motion-pipeline-1.0 schema pick these same
# keys in main.py's _build_split_view_props — import the constants rather
# than retyping the strings there, so the two stay in sync.
PRESET_PHONE_LOADING_TEXT = "phone_loading_text"
PRESET_MAP_DOTS_GATHERING = "map_dots_gathering"
PRESET_ROAD_CONSTRAINT_DIAGRAM = "road_constraint_diagram"
PRESET_ETA_COMPARISON = "eta_comparison"

SPLIT_CONTENT_PRESETS = {
    PRESET_PHONE_LOADING_TEXT: {"kind": "loading", "text": "Đang tìm tài xế..."},
    PRESET_MAP_DOTS_GATHERING: {"kind": "dots", "count": 18},
}

# road_constraint_diagram/eta_comparison aren't static presets like the ones
# above — they render the shot's own axis/roadConstraint data (the same
# MapPingAxis shape MapPingScene's axis-comparison mode consumes), so they
# need those sibling props threaded through rather than a fixed dict.
AXIS_SPLIT_PRESETS = {PRESET_ROAD_CONSTRAINT_DIAGRAM: "road_diagram", PRESET_ETA_COMPARISON: "eta_comparison"}


def wav_filename(scene_id) -> str:
    """Filesystem-safe WAV stem for a scene id (old int ids or new "scene_xxx" ids)."""
    sid = str(scene_id)
    stem = sid if sid.startswith("scene_") else f"scene_{sid}"
    return f"{stem}.wav"


def _resolve_split_panel(value, axis_shared=None):
    if value is None:
        return None
    if isinstance(value, dict):
        return value
    if value in AXIS_SPLIT_PRESETS:
        axis_shared = axis_shared or {}
        panel = {"kind": AXIS_SPLIT_PRESETS[value], "axis": axis_shared.get("axis")}
        if value == PRESET_ROAD_CONSTRAINT_DIAGRAM:
            panel["roadConstraint"] = axis_shared.get("roadConstraint")
        return panel
    return SPLIT_CONTENT_PRESETS.get(value, {"kind": "text", "body": str(value)})


def _normalize_map_drivers(drivers: list[dict]) -> list[dict]:
    normalized = []
    for d in drivers:
        nx = min(0.9, max(0.1, d["x"] / MAP_REF_W))
        ny = min(0.9, max(0.1, d["y"] / MAP_REF_H))
        normalized.append({"x": nx, "y": ny, "label": d["label"]})
    return normalized


def _translate_visual(scene_type: str, props: dict) -> dict:
    """Translate a script scene's authored `props` into the exact shape each
    Remotion scene component expects, resolving semantic placeholders along
    the way. Unknown scene types pass their props through unchanged."""
    if scene_type == "map_ping":
        visual = dict(props)
        if "drivers" in visual:
            visual["drivers"] = _normalize_map_drivers(visual["drivers"])
        visual.pop("phase", None)  # authoring-only narrative label, not a component prop
        return visual

    if scene_type == "split_view":
        visual = dict(props)
        # Only road_constraint_diagram/eta_comparison need these — popped
        # either way so they don't leak into SplitViewVisual's top level
        # alongside the resolved leftPanel/rightPanel.
        axis_shared = {"axis": visual.pop("axis", None), "roadConstraint": visual.pop("roadConstraint", None)}
        if "leftContent" in visual:
            visual["leftPanel"] = _resolve_split_panel(visual.pop("leftContent"), axis_shared)
        if "rightContent" in visual:
            visual["rightPanel"] = _resolve_split_panel(visual.pop("rightContent"), axis_shared)
        if "leftCaption" in visual:
            visual["leftLabel"] = visual.pop("leftCaption")
        if "rightCaption" in visual:
            visual["rightLabel"] = visual.pop("rightCaption")
        # `left`/`right` is the authoring-friendly shorthand for a plain
        # bulleted-list panel: {label, lines, highlight_last?} on each side.
        for side in ("left", "right"):
            if side in visual:
                panel = visual.pop(side)
                visual[f"{side}Panel"] = {"kind": "list", "items": panel["lines"], "highlightLast": panel.get("highlight_last", False)}
                if panel.get("label"):
                    visual[f"{side}Label"] = panel["label"]
        return visual

    if scene_type == "phone_mockup":
        visual = dict(props)
        visual.setdefault("driverName", "")
        visual.setdefault("driverEta", "")
        return visual

    if scene_type == "split_reveal":
        visual = dict(props)
        left_map = visual.get("leftMapPing")
        if left_map and "drivers" in left_map:
            left_map = dict(left_map)
            left_map["drivers"] = _normalize_map_drivers(left_map["drivers"])
            visual["leftMapPing"] = left_map
        return visual

    return dict(props)


def build_render_manifest(script: dict, audio_durations: dict) -> dict:
    fps = script.get("fps", FPS)
    shots = []
    for i, shot in enumerate(script_shots(script), start=1):
        sid = shot["id"]
        scene_type = TYPE_MAP.get(shot["type"], shot["type"])
        raw_props = shot.get("props", shot.get("visual", {}))
        visual = _translate_visual(scene_type, raw_props)

        narration = shot.get("narration")
        has_audio = sid in audio_durations and narration

        if "duration_frames" in shot:
            duration_frames = shot["duration_frames"]
        elif has_audio:
            duration_frames = math.ceil(audio_durations[sid] * fps) + FRAME_PADDING
        else:
            duration_frames = fps * 3  # fallback for silent, un-authored-duration scenes

        audio_offset = 0
        timing = shot.get("narration_timing_frames")
        if timing:
            audio_offset = timing[0]

        # "on_screen_text" explicitly present (even "") means the author made a
        # deliberate caption choice for this shot, including "no caption" —
        # only fall back to narration when the key is absent entirely.
        caption = shot["on_screen_text"] if "on_screen_text" in shot else (narration or "")
        if caption:
            min_reading_frames = math.ceil(len(caption) / MAX_CAPTION_CPS * fps)
            duration_frames = max(duration_frames, min_reading_frames)

        # Staggered voiceover lines (e.g. ScoreCardScene's per-row narration)
        # each got their own TTS pass in main.py, keyed "<id>_seg<i>" — surface
        # them as extra timed clips alongside the shot's single audioPath.
        extra_audio = []
        for seg_i, seg in enumerate(shot.get("narration_per_criterion", [])):
            seg_id = f"{sid}_seg{seg_i}"
            if seg_id in audio_durations:
                extra_audio.append(
                    {"path": f"audio/{wav_filename(seg_id)}", "offsetFrames": seg.get("at_frame", 0)}
                )

        shots.append(
            {
                "id": i,
                "label": str(sid),  # original script shot id, e.g. "shot_01b" — for matching Studio's timeline back to the source JSON
                "sceneName": scene_name_for(sid),
                "type": scene_type,
                "audioPath": f"audio/{wav_filename(sid)}" if has_audio else "",
                "audioOffsetFrames": audio_offset,
                "extraAudio": extra_audio,
                "durationInFrames": duration_frames,
                "caption": caption,
                "captionStyle": shot.get("on_screen_text_style"),
                "visual": visual,
            }
        )
    manifest = {"fps": fps, "width": 1080, "height": 1920, "shots": shots}
    return normalize_manifest_shots(manifest)


def detect_dead_air(
    script: dict, manifest: dict, audio_durations: dict, threshold_frames: int = MAX_DEAD_AIR_FRAMES
) -> list[dict]:
    """Flags scenes where the manifest's final durationInFrames (post-tightening,
    post-caption-clamp) runs threshold_frames or more past the last real audio
    clip's end. Checked against actual synthesized audio rather than authored
    frame math, so it catches trailing silence that a pre-TTS estimate can't:
    narration_per_criterion scenes (kept at authored duration during tightening
    in main.py) and any scene the caption-reading floor stretched back out
    after tightening shrank it. Scenes with no audio at all are skipped — this
    is about silence after speech, not scenes that are silent by design."""
    fps = manifest.get("fps", FPS)
    findings = []
    for script_shot, manifest_shot in zip(script_shots(script), manifest_shots(manifest)):
        sid = script_shot["id"]
        audio_ends = []

        if sid in audio_durations and script_shot.get("narration"):
            offset = (script_shot.get("narration_timing_frames") or [0])[0]
            audio_ends.append(offset + math.ceil(audio_durations[sid] * fps))

        for seg_i, seg in enumerate(script_shot.get("narration_per_criterion", [])):
            seg_id = f"{sid}_seg{seg_i}"
            if seg_id in audio_durations:
                audio_ends.append(seg.get("at_frame", 0) + math.ceil(audio_durations[seg_id] * fps))

        if not audio_ends:
            continue

        dead_air = manifest_shot["durationInFrames"] - max(audio_ends)
        if dead_air > threshold_frames:
            findings.append(
                {
                    "scene_id": sid,
                    "dead_air_frames": dead_air,
                    "dead_air_seconds": round(dead_air / fps, 2),
                }
            )

    return findings


def detect_transition_silence(script: dict, threshold_frames: int = MAX_DEAD_AIR_FRAMES) -> list[dict]:
    """Flags the audible gap spanning a scene boundary: trailing silence at the
    end of one scene (its narration_timing_frames end to its duration_frames
    end) plus the narration lead-in of the next scene (its
    narration_timing_frames start). Scenes render back-to-back in
    TikTokVideo's <Series> with no overlap, so this is the silence a viewer
    actually hears between two lines — validate_manifest's per-scene dead_air
    check only looks at trailing silence within a single scene and would miss
    a short trailing gap that stacks with a slow-starting next line. Scenes
    without narration (visual-only, silent by design) are skipped on either
    side, same carve-out as detect_dead_air."""
    scenes = script_shots(script)
    findings = []
    for cur, nxt in zip(scenes, scenes[1:]):
        cur_timing = cur.get("narration_timing_frames")
        cur_duration = cur.get("duration_frames")
        nxt_timing = nxt.get("narration_timing_frames")
        if not cur.get("narration") or cur_timing is None or cur_duration is None:
            continue
        if not nxt.get("narration") or nxt_timing is None:
            continue

        trailing = cur_duration - cur_timing[1]
        leading = nxt_timing[0]
        gap = trailing + leading
        if gap > threshold_frames:
            findings.append(
                {
                    "from_scene": cur["id"],
                    "to_scene": nxt["id"],
                    "gap_frames": gap,
                    "gap_seconds": round(gap / FPS, 2),
                }
            )
    return findings


def write_render_manifest(manifest: dict, output_path: str) -> None:
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)


def copy_audio_to_remotion_public(scene_ids: list, wav_dir: str, public_audio_dir: str) -> None:
    os.makedirs(public_audio_dir, exist_ok=True)
    for sid in scene_ids:
        filename = wav_filename(sid)
        src = os.path.join(wav_dir, filename)
        if not os.path.exists(src):
            continue
        dst = os.path.join(public_audio_dir, filename)
        shutil.copy2(src, dst)
