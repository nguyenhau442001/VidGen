import argparse
import json
import os
import socket
import subprocess
import time
import wave
import webbrowser
from concurrent.futures import ThreadPoolExecutor, as_completed
from time import time as now

from vieneu import Vieneu  # type: ignore

from vidgen.manifest import (
    MAP_REF_H,
    MAP_REF_W,
    PRESET_MAP_DOTS_GATHERING,
    PRESET_PHONE_LOADING_TEXT,
    build_render_manifest,
    copy_audio_to_remotion_public,
    wav_filename,
    write_render_manifest,
)

WAV_DIR = "output/audio/wav"
REMOTION_PUBLIC_AUDIO = "remotion/public/audio"
MANIFEST_PATH = "output/render_manifest.json"
STUDIO_PORT = 3000

# Animation types that mark a map dot as the shot's "highlighted" one, in the
# sense MapPingVisual.highlightedDriverIndex expects (at most one at a time).
HIGHLIGHT_ANIM_TYPES = {"dot_color_set", "dot_pulse_ring"}


def _anims(shot):
    return shot.get("animations", [])


def _first_asset_of_type(shot, assets, asset_type):
    for aid in shot.get("asset_ids", []):
        asset = assets.get(aid)
        if asset and asset.get("type") == asset_type:
            return asset
    return {}


def _resolve_map_dot_ids(shot, assets):
    """Map dots (drivers or batch customers) referenced by this shot, either
    directly via asset_ids or as an animation target, in first-appearance
    order. MapPingScene renders both roles identically (colored dot + label),
    so both are included."""
    ids, seen = [], set()

    def add(aid):
        if aid and aid not in seen and assets.get(aid, {}).get("type") == "map_dot":
            seen.add(aid)
            ids.append(aid)

    for aid in shot.get("asset_ids", []):
        add(aid)
    for anim in _anims(shot):
        if anim.get("type") == "dot_fade_out":
            continue  # a removal cue, not a reason to show a dot
        add(anim.get("target"))
        add(anim.get("from_asset"))
        add(anim.get("to_asset"))
        for t in anim.get("targets") or []:
            add(t)
    return ids


def _resolve_label(shot, asset_id, asset):
    updates = [
        a for a in _anims(shot) if a.get("type") == "label_update" and a.get("target") == asset_id
    ]
    if updates:
        updates.sort(key=lambda a: a.get("frame_start", 0))
        return updates[-1]["new_label"]
    return asset.get("distance_label") or asset.get("label") or ""


def _resolve_highlight(shot, dot_ids, assets):
    """Find the most recent (by frame_start) animation in this shot that
    marks one of this shot's dots as highlighted, returning (dot_id, color).
    A dot_color_set that merely dims a dot back to its own rejected/default
    color is not a highlight."""
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
    """Fall back chain for a shot's accent color when no dot highlight
    supplies one: any explicit color on an animation in the shot, then any
    asset directly (or via attached_to) referenced by the shot, then a
    global default."""
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
        dots.append(
            {
                "x": round(pos["x"] * MAP_REF_W, 1),
                "y": round(pos["y"] * MAP_REF_H, 1),
                "label": _resolve_label(shot, did, asset),
            }
        )
    props = {"drivers": dots}

    target, color = _resolve_highlight(shot, dot_ids, assets)
    if target is None and highlight_state.get("id") in dot_ids:
        # Nothing re-colored in this shot — carry forward the last known
        # highlight from earlier in this sequence (a static snapshot fact,
        # not fabricated narrative knowledge).
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
    # A permanent fade to black (the world ending) reads as "dark"; a
    # temporary translucent overlay over still-live content reads as the
    # lighter "gradient-subtle" style.
    props["backgroundStyle"] = "dark" if "map_fade_to_black" in types_present else "gradient-subtle"
    return props


def _build_zoom_reveal_props(shot, assets):
    # focusElement/revealContent only have one real preset each today (see
    # TikTokVideo.tsx's resolveFocusElement/resolveRevealContent) so there's
    # nothing shot-specific to derive. zoomStartScale/zoomEndScale describe
    # ZoomRevealScene's own internal dot-field zoom, a different coordinate
    # space from the sequence's outer map camera keyframes, so they're left
    # at the component's defaults rather than guessed.
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
    "MapPingScene": lambda shot, assets, hl: _build_map_ping_props(shot, assets, hl),
    "PhoneMockupScene": lambda shot, assets, hl: _build_phone_mockup_props(shot, assets),
    "CharacterIconScene": lambda shot, assets, hl: _build_character_icon_props(shot, assets),
    "ScoreCardScene": lambda shot, assets, hl: _build_score_card_props(shot, assets),
    "SplitViewScene": lambda shot, assets, hl: _build_split_view_props(shot, assets),
    "QuoteCalloutScene": lambda shot, assets, hl: _build_quote_callout_props(shot, assets),
    "ZoomRevealScene": lambda shot, assets, hl: _build_zoom_reveal_props(shot, assets),
    "SplitRevealScene": lambda shot, assets, hl: _build_split_reveal_props(shot, assets, hl),
}


def flatten_script(script: dict) -> dict:
    """Flattens the nested "motion-pipeline-1.0" authoring schema (assets +
    sequences[].shots[], with declarative animations[] and sequence-level
    camera keyframes) into the flat scenes[] schema the rest of this module
    consumes.

    Each shot becomes one independent flat scene. Cross-shot continuity
    (no_remount, continuous camera across a sequence) is intentionally NOT
    reproduced: TikTokVideo.tsx renders scenes through Remotion's
    Series.Sequence, which remounts a fresh component and resets frame 0 at
    every scene boundary, so that continuity can't render correctly today
    regardless of what this function emits. Per-shot props are instead
    derived generically from each shot's own asset_ids/animations, with a
    couple of narrow exceptions documented inline (e.g. MapPingScene
    "highlight" state is carried forward within a sequence when a shot
    doesn't re-color anything, since that's a static-snapshot fact rather
    than fabricated narrative knowledge)."""
    assets = script.get("assets", {})
    fps = script.get("fps", 30)
    flat_scenes = []

    for seq in script["sequences"]:
        # Reset per sequence: a highlight only carries forward between shots
        # that share the same continuous world.
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

            flat_scene = {
                "id": shot["id"],
                "type": component,
                "duration_frames": duration_frames,
                "props": props,
                "narration": shot.get("narration"),
            }
            timing = shot.get("narration_timing_frames")
            if timing:
                flat_scene["narration_timing_frames"] = [f - start for f in timing]
            if shot.get("on_screen_text"):
                flat_scene["on_screen_text"] = shot["on_screen_text"]
            if shot.get("sound_design"):
                flat_scene["sound_design"] = shot["sound_design"]

            flat_scenes.append(flat_scene)

    return {
        "video_id": script["video_id"],
        "fps": fps,
        "aspect_ratio": script.get("aspect_ratio"),
        "narration_language": script.get("narration_language"),
        "scenes": flat_scenes,
    }


def resolve_script(script: dict) -> dict:
    """Scripts in content/ may be authored in the flat scenes[] schema
    directly, or in the nested motion-pipeline-1.0 schema (assets +
    sequences[].shots[]). Flattens the latter in-memory; the former passes
    through unchanged. Either way, a single content/script_<name>.json is
    the only file this pipeline needs."""
    if "sequences" in script:
        return flatten_script(script)
    return script


def _port_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex(("localhost", port)) == 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("script", nargs="?", default="content/sample_script.json")
    args = parser.parse_args()

    tts = Vieneu()

    with open(args.script, encoding="utf-8") as f:
        script = json.load(f)
    script = resolve_script(script)

    title = script.get("title") or script.get("video_id") or "video"
    video_filename = title.lower().replace(" ", "_") + ".mp4"
    video_output = os.path.abspath(f"output/video/mp4/{video_filename}")

    # Scenes without narration (silent beats) get no TTS pass at all.
    narrated_scenes = [s for s in script["scenes"] if s.get("narration")]

    # --- Audio synthesis (parallel) ---
    def synthesize_scene(scene: dict) -> str:
        output_path = f"{WAV_DIR}/{wav_filename(scene['id'])}"
        audio = tts.infer(scene["narration"], voice="Xuân Vĩnh")  # type: ignore
        tts.save(audio, output_path)  # type: ignore
        return scene["id"]

    os.makedirs(WAV_DIR, exist_ok=True)
    start_time = now()
    with ThreadPoolExecutor(max_workers=max(1, len(narrated_scenes))) as executor:
        futures = {executor.submit(synthesize_scene, scene): scene for scene in narrated_scenes}
        for future in as_completed(futures):
            scene_id = future.result()
            print(f"Scene {scene_id} saved to {WAV_DIR}/{wav_filename(scene_id)}")

    end_time = now()
    print(f"Total generation time: {end_time - start_time:.2f}s")

    # --- Audio durations ---
    audio_durations: dict = {}
    total_audio = 0.0
    for scene in narrated_scenes:
        wav_path = f"{WAV_DIR}/{wav_filename(scene['id'])}"
        with wave.open(wav_path) as wf:
            duration = wf.getnframes() / wf.getframerate()
        print(f"Scene {scene['id']} audio duration: {duration:.2f}s")
        audio_durations[scene["id"]] = duration
        total_audio += duration
    print(f"Total audio duration: {total_audio:.2f}s")

    # --- Copy audio to Remotion public/ ---
    scene_ids = [s["id"] for s in script["scenes"]]
    copy_audio_to_remotion_public(scene_ids, WAV_DIR, REMOTION_PUBLIC_AUDIO)
    print(f"Copied {len(narrated_scenes)} WAV file(s) to {REMOTION_PUBLIC_AUDIO}/")

    # --- Write render manifest ---
    manifest = build_render_manifest(script, audio_durations)
    write_render_manifest(manifest, MANIFEST_PATH)
    print(f"Render manifest written to {MANIFEST_PATH}")

    # --- Render video ---
    os.makedirs("output/video/mp4", exist_ok=True)
    if os.path.exists(video_output):
        os.remove(video_output)
        print(f"Deleted old video: {video_output}")
    manifest_props = json.dumps({"manifest": manifest})
    subprocess.run(
        [
            "npx", "remotion", "render", "TikTokVideo", video_output,
            f"--props={manifest_props}",
            "--concurrency=100%",
        ],
        cwd="remotion",
        check=True,
    )
    print(f"Video rendered to {video_output}")

    # --- Open Remotion Studio in browser ---
    if not _port_open(STUDIO_PORT):
        subprocess.Popen(
            ["npx", "remotion", "studio"],
            cwd="remotion",
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        print("Starting Remotion Studio...")
        while not _port_open(STUDIO_PORT):
            time.sleep(1)

    webbrowser.open(f"http://localhost:{STUDIO_PORT}")
    print(f"Opened Remotion Studio at http://localhost:{STUDIO_PORT}")


if __name__ == "__main__":
    main()
