import json
import math
import os
import shutil

FPS = 30
FRAME_PADDING = 10

# Script "type" values may be either the old snake_case manifest keys
# (explanation, terminal, ...) or the newer PascalCase Remotion component
# names (MapPingScene, ...). Anything not listed here passes through as-is.
TYPE_MAP = {
    "CharacterIconScene": "character_icon",
    "PhoneMockupScene": "phone_mockup",
    "MapPingScene": "map_ping",
    "ScoreCardScene": "score_card",
    "SplitViewScene": "split_view",
    "QuoteCalloutScene": "quote_callout",
    "ZoomRevealScene": "zoom_reveal",
}

# MapPingScene driver dots are placed as fractions (0-1) of the 1080x1920
# canvas. Scripts author driver x/y as pixel-ish positions on a conceptual
# 750x1000 reference box; normalize + clamp so dots always land on-canvas.
MAP_REF_W = 750
MAP_REF_H = 1000

# leftContent/rightContent in split_view scenes are semantic preset keys
# (the script doesn't know SplitViewScene's exact SplitPanelContent shape).
SPLIT_CONTENT_PRESETS = {
    "phone_loading_text": {"kind": "loading", "text": "Đang tìm tài xế..."},
    "map_dots_gathering": {"kind": "dots", "count": 18},
}


def wav_filename(scene_id) -> str:
    """Filesystem-safe WAV stem for a scene id (old int ids or new "scene_xxx" ids)."""
    sid = str(scene_id)
    stem = sid if sid.startswith("scene_") else f"scene_{sid}"
    return f"{stem}.wav"


def _resolve_split_panel(value):
    if value is None:
        return None
    if isinstance(value, dict):
        return value
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
        if "leftContent" in visual:
            visual["leftPanel"] = _resolve_split_panel(visual.pop("leftContent"))
        if "rightContent" in visual:
            visual["rightPanel"] = _resolve_split_panel(visual.pop("rightContent"))
        if "leftCaption" in visual:
            visual["leftLabel"] = visual.pop("leftCaption")
        if "rightCaption" in visual:
            visual["rightLabel"] = visual.pop("rightCaption")
        return visual

    if scene_type == "phone_mockup":
        visual = dict(props)
        visual.setdefault("driverName", "")
        visual.setdefault("driverEta", "")
        return visual

    return dict(props)


def build_render_manifest(script: dict, audio_durations: dict) -> dict:
    fps = script.get("fps", FPS)
    scenes = []
    for i, scene in enumerate(script["scenes"], start=1):
        sid = scene["id"]
        scene_type = TYPE_MAP.get(scene["type"], scene["type"])
        raw_props = scene.get("props", scene.get("visual", {}))
        visual = _translate_visual(scene_type, raw_props)

        narration = scene.get("narration")
        has_audio = sid in audio_durations and narration

        if "duration_frames" in scene:
            duration_frames = scene["duration_frames"]
        elif has_audio:
            duration_frames = math.ceil(audio_durations[sid] * fps) + FRAME_PADDING
        else:
            duration_frames = fps * 3  # fallback for silent, un-authored-duration scenes

        audio_offset = 0
        timing = scene.get("narration_timing_frames")
        if timing:
            audio_offset = timing[0]

        caption = scene.get("on_screen_text") or narration or ""

        scenes.append(
            {
                "id": i,
                "type": scene_type,
                "audioPath": f"audio/{wav_filename(sid)}" if has_audio else "",
                "audioOffsetFrames": audio_offset,
                "durationInFrames": duration_frames,
                "caption": caption,
                "visual": visual,
            }
        )
    return {"fps": fps, "width": 1080, "height": 1920, "scenes": scenes}


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
