"""Resolve authored VidGen scripts into the canonical flat shot schema."""

from __future__ import annotations

from vidgen.pipeline.render_manifest_builder import (
    MAP_REF_H,
    MAP_REF_W,
    PRESET_MAP_DOTS_GATHERING,
    PRESET_PHONE_LOADING_TEXT,
)
from vidgen.pipeline.shot_schema import normalize_script_shots



def _anims(shot):
    return shot.get("animations", [])


def _first_asset_of_type(shot, assets, asset_type):
    for aid in shot.get("asset_ids", []):
        asset = assets.get(aid)
        if asset and asset.get("type") == asset_type:
            return asset
    return {}


def _resolve_map_dot_ids(shot, assets):
    ids, seen = [], set()

    def add(aid):
        if aid and aid not in seen and assets.get(aid, {}).get("type") == "map_dot":
            seen.add(aid)
            ids.append(aid)

    for aid in shot.get("asset_ids", []):
        add(aid)
    for anim in _anims(shot):
        if anim.get("type") == "dot_fade_out":
            continue
        add(anim.get("target"))
        add(anim.get("from_asset"))
        add(anim.get("to_asset"))
        for t in anim.get("targets") or []:
            add(t)
    return ids


def _resolve_label(shot, asset_id, asset):
    updates = [
        a for a in _anims(shot)
        if a.get("type") == "label_update" and a.get("target") == asset_id
    ]
    if updates:
        updates.sort(key=lambda a: a.get("frame_start", 0))
        return updates[-1]["new_label"]
    return asset.get("distance_label") or asset.get("label") or ""


def _resolve_highlight(shot, dot_ids, assets):
    candidates = []
    for a in _anims(shot):
        t = a.get("type")
        if t == "dot_color_set" and a.get("target") in dot_ids:
            target, color = a["target"], a.get("color")
            asset = assets.get(target, {})
            if color and color not in (asset.get("color_rejected"), asset.get("color_default")):
                candidates.append((a.get("frame_start", 0), target, color))
        elif t == "dot_pulse_ring" and a.get("target") in dot_ids:
            candidates.append((a.get("frame_start", 0), a["target"], a.get("color")))
        elif t == "highlight_travel" and a.get("to_asset") in dot_ids:
            candidates.append((a.get("frame_start", 0), a["to_asset"], a.get("color_to")))
    if not candidates:
        return None, None
    candidates.sort(key=lambda c: c[0])
    _, target, color = candidates[-1]
    return target, color


def _resolve_accent_color(shot, assets, default="#22C55E"):
    for a in _anims(shot):
        color = a.get("color") or a.get("color_to")
        if color:
            return color
    for aid in shot.get("asset_ids", []):
        asset = assets.get(aid, {})
        color = asset.get("color_selected") or asset.get("color_bait")
        if color:
            return color
        attached = asset.get("attached_to")
        if attached in assets:
            color = assets[attached].get("color_selected") or assets[attached].get("color_bait")
            if color:
                return color
    return default


def _build_map_ping_props(shot, assets, highlight_state):
    dot_ids = _resolve_map_dot_ids(shot, assets)
    dots = []
    for did in dot_ids:
        asset = assets[did]
        pos = asset["position"]
        dots.append({
            "x": round(pos["x"] * MAP_REF_W, 1),
            "y": round(pos["y"] * MAP_REF_H, 1),
            "label": _resolve_label(shot, did, asset),
        })
    props = {"drivers": dots}
    target, color = _resolve_highlight(shot, dot_ids, assets)
    if target is None and highlight_state.get("id") in dot_ids:
        target, color = highlight_state["id"], highlight_state["color"]
    if target is not None:
        highlight_state["id"], highlight_state["color"] = target, color
        props["highlightedDriverIndex"] = dot_ids.index(target)
        if color:
            props["accentColor"] = color
    return props


def _build_phone_mockup_props(shot, assets):
    phone = _first_asset_of_type(shot, assets, "phone_mockup")
    state = phone.get("initial_state", "idle")
    state_anims = sorted(
        (a for a in _anims(shot) if a.get("type") in ("state_set", "state_transition")),
        key=lambda a: a.get("frame_start", 0),
    )
    for a in state_anims:
        state = a.get("state") or a.get("to_state") or state
    props = {"screenState": state}
    if phone.get("accent_color"):
        props["accentColor"] = phone["accent_color"]
    card_anims = [a for a in _anims(shot) if a.get("type") == "card_spring_up"]
    if card_anims:
        card = card_anims[-1]
        if "driver_name" in card:
            props["driverName"] = card["driver_name"]
        if "eta" in card:
            props["driverEta"] = card["eta"]
    return props


def _build_character_icon_props(shot, assets):
    char = _first_asset_of_type(shot, assets, "character_icon")
    props = {"pose": char.get("initial_pose", "idle")}
    if char.get("phone_asset_id"):
        props["accompanyingIcon"] = "phone"
    if char.get("accent_color"):
        props["accentColor"] = char["accent_color"]
    return props


def _build_score_card_props(shot, assets):
    panel = _first_asset_of_type(shot, assets, "score_panel")
    criteria = [
        {"label": c["label"], "score": c["score"], "maxScore": c["max_score"]}
        for c in panel.get("criteria", [])
    ]
    props = {"criteria": criteria}
    reveals = sorted(
        (a for a in _anims(shot) if a.get("type") == "score_row_reveal"),
        key=lambda a: a.get("frame_start", 0),
    )
    if len(reveals) >= 2:
        props["staggerFrames"] = reveals[1]["frame_start"] - reveals[0]["frame_start"]
    props["accentColor"] = _resolve_accent_color(shot, assets)
    return props


def _build_split_view_props(shot, assets):
    types_present = {a.get("type") for a in _anims(shot)}
    props = {}
    if "phone_slide_to_left_half" in types_present:
        props["leftContent"] = PRESET_PHONE_LOADING_TEXT
    if "map_reveal_right_half" in types_present:
        props["rightContent"] = PRESET_MAP_DOTS_GATHERING
    for a in _anims(shot):
        if a.get("type") != "caption_fade_in":
            continue
        if a.get("target") == "left_panel" and a.get("text"):
            props["leftCaption"] = a["text"]
        elif a.get("target") == "right_panel" and a.get("text"):
            props["rightCaption"] = a["text"]
    props["accentColor"] = _resolve_accent_color(shot, assets)
    return props


def _build_quote_callout_props(shot, assets):
    props = {"text": shot.get("narration") or ""}
    accent_anims = [a for a in _anims(shot) if a.get("type") == "accent_word_delay"]
    if accent_anims and accent_anims[-1].get("accent_word"):
        props["accentWord"] = accent_anims[-1]["accent_word"]
    types_present = {a.get("type") for a in _anims(shot)}
    props["backgroundStyle"] = "dark" if "map_fade_to_black" in types_present else "gradient-subtle"
    return props


def _build_zoom_reveal_props(shot, assets):
    return {
        "focusElement": "selected_driver_dot",
        "revealContent": "city_dot_field",
        "accentColor": _resolve_accent_color(shot, assets),
    }


def _build_split_reveal_props(shot, assets, highlight_state):
    left_map_props = _build_map_ping_props(shot, assets, highlight_state)
    props = {"leftMapPing": left_map_props}
    split_open = [a for a in _anims(shot) if a.get("type") == "split_open"]
    if split_open and "duration_frames" in split_open[-1]:
        props["revealDurationFrames"] = split_open[-1]["duration_frames"]
    props["accentColor"] = _resolve_accent_color(shot, assets)
    return props


PROP_BUILDERS = {
    "MapPingScene":       lambda shot, assets, hl: _build_map_ping_props(shot, assets, hl),
    "PhoneMockupScene":   lambda shot, assets, hl: _build_phone_mockup_props(shot, assets),
    "CharacterIconScene": lambda shot, assets, hl: _build_character_icon_props(shot, assets),
    "ScoreCardScene":     lambda shot, assets, hl: _build_score_card_props(shot, assets),
    "SplitViewScene":     lambda shot, assets, hl: _build_split_view_props(shot, assets),
    "QuoteCalloutScene":  lambda shot, assets, hl: _build_quote_callout_props(shot, assets),
    "ZoomRevealScene":    lambda shot, assets, hl: _build_zoom_reveal_props(shot, assets),
    "SplitRevealScene":   lambda shot, assets, hl: _build_split_reveal_props(shot, assets, hl),
}


def flatten_script(script: dict) -> dict:
    assets = script.get("assets", {})
    fps = script.get("fps", 30)
    flat_shots = []
    for seq in script["sequences"]:
        highlight_state = {"id": None, "color": None}
        for shot in seq["shots"]:
            component = shot["component"]
            start, end = shot.get("frame_range", [0, 90])
            duration_frames = end - start
            builder = PROP_BUILDERS.get(component)
            if builder is None:
                print(f"warning: no prop mapping for component {component!r} (shot {shot['id']}); using empty props")
                props = {}
            else:
                props = builder(shot, assets, highlight_state)
            flat_shot = {
                "id": shot["id"],
                "type": component,
                "duration_frames": duration_frames,
                "props": props,
                "narration": shot.get("narration"),
            }
            timing = shot.get("narration_timing_frames")
            if timing:
                flat_shot["narration_timing_frames"] = [f - start for f in timing]
            if shot.get("on_screen_text"):
                flat_shot["on_screen_text"] = shot["on_screen_text"]
            if shot.get("on_screen_text_style"):
                flat_shot["on_screen_text_style"] = shot["on_screen_text_style"]
            if shot.get("sound_design"):
                flat_shot["sound_design"] = shot["sound_design"]
            if "tts_speed" in shot:
                flat_shot["tts_speed"] = shot["tts_speed"]
            flat_shots.append(flat_shot)
    return normalize_script_shots({
        "video_id": script["video_id"],
        "fps": fps,
        "aspect_ratio": script.get("aspect_ratio"),
        "narration_language": script.get("narration_language"),
        "shots": flat_shots,
    })


def resolve_script(script: dict) -> dict:
    if "scenes" in script:
        raise ValueError("Legacy 'scenes' schema is no longer supported; rename it to 'shots'.")
    if "sequences" in script:
        return flatten_script(script)
    if "shots" in script:
        return script
    return script
