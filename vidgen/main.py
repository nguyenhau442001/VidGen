import argparse
import json
import math
import os
import shutil
import socket
import subprocess
import sys
import time
import wave
import webbrowser
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from time import time as now

from vidgen.chunked_render import render_video_chunked
from vidgen.karaoke_align import align_words
from vidgen.shot_api import normalize_script_shots, script_shots
from vidgen.tts_speed_adjustor import (
    DEFAULT_VIENEU_VOICE,
    fit_wav_to_duration,
    normalize_tts_provider,
    resolve_scene_tts_speed,
    synthesize as tts_synthesize,
)
from vidgen.manifest import (
    MAP_REF_H,
    MAP_REF_W,
    MAX_DEAD_AIR_FRAMES,
    PRESET_MAP_DOTS_GATHERING,
    PRESET_PHONE_LOADING_TEXT,
    build_render_manifest,
    copy_audio_to_remotion_public,
    detect_dead_air,
    detect_transition_silence,
    wav_filename,
    write_render_manifest,
)

# ── GATE IMPORTS ─────────────────────────────────────────────────────────────
from vidgen.gate1 import gate1_assert, format_report as gate1_report
from vidgen.gate1_llm import gate1_llm_assert
from vidgen.gate2_visual import gate2_assert
from vidgen.beatmap import score_beatmap, write_beatmap, format_report as beatmap_report
# ─────────────────────────────────────────────────────────────────────────────

WAV_DIR = "output/audio/wav"
REMOTION_PUBLIC_AUDIO = "remotion/public/audio"
MANIFEST_PATH = "output/render_manifest.json"
BEATMAP_PATH = "output/beatmap.json"
VIDEO_OUT_DIR = "remotion/out"
STUDIO_PORT = 3000

MAX_GATE1_RETRIES = 3    # abort pipeline after this many Gate 1 failures
MAX_GATE1_LLM_RETRIES = 2  # abort pipeline after this many LLM rewrite retries
MAX_GATE2_CYCLES = 2     # abort pipeline after this many Gate 2 fix cycles
GATE1_LLM_REWRITE_SUFFIX = ".gate1_llm.json"

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


MIN_FRAMES_PER_WORD = 8


def validate_manifest(manifest: dict) -> None:
    rows = []
    errors = []
    warnings = []
    for shot in script_shots(manifest):
        narration = shot.get("narration")
        timing = shot.get("narration_timing_frames")
        duration_frames = shot.get("duration_frames")
        if not narration or timing is None or duration_frames is None:
            continue
        scene_id = shot.get("id")
        words = len(narration.split())
        if not isinstance(timing, list) or len(timing) != 2:
            raise ValueError(f"{scene_id}: invalid narration_timing_frames = {timing}")
        start, end = timing
        alloc_frames = end - start
        transition_delay = shot.get("transition_out_delay_frames", 0)
        safe_end = duration_frames - transition_delay
        dead_air = duration_frames - end - transition_delay
        statuses = []
        frames_per_word = alloc_frames / words if words else None
        if frames_per_word is not None and frames_per_word < MIN_FRAMES_PER_WORD:
            errors.append(
                f"{scene_id}: word-count drift ({frames_per_word:.1f} f/word < "
                f"{MIN_FRAMES_PER_WORD} threshold — {words} words in {alloc_frames} frames)"
            )
            statuses.append("ERROR word-count")
        if end > safe_end:
            errors.append(f"{scene_id}: narration overflow (ends frame {end}, safe end {safe_end})")
            statuses.append("ERROR overflow")
        if dead_air > MAX_DEAD_AIR_FRAMES:
            warnings.append(f"{scene_id}: {dead_air} frames of dead air after narration ends")
            statuses.append("WARNING dead-air")
        rows.append((scene_id, words, alloc_frames, frames_per_word, ", ".join(statuses) or "OK"))

    print(f"{'scene_id':<15}{'words':>6}{'alloc_f':>9}{'f/word':>9} status")
    for scene_id, words, alloc_frames, frames_per_word, status in rows:
        f_per_word_str = f"{frames_per_word:.1f}" if frames_per_word is not None else "n/a"
        print(f"{str(scene_id):<15}{words:>6}{alloc_frames:>9}{f_per_word_str:>9} {status}")

    transition_findings = detect_transition_silence(manifest)
    for tf in transition_findings:
        warnings.append(
            f"{tf['from_scene']} -> {tf['to_scene']}: {tf['gap_frames']} frames "
            f"({tf['gap_seconds']}s) of silence across the scene boundary"
        )

    if warnings:
        print("\nWarnings:")
        for w in warnings:
            print(f"  - {w}")
    if errors:
        raise ValueError("Manifest validation failed:\n" + "\n".join(f"  - {e}" for e in errors))


def _port_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex(("localhost", port)) == 0


# ── GATE 1 HELPER ────────────────────────────────────────────────────────────
def _run_gate1(script: dict, script_path: str) -> None:
    """Run Gate 1. Exits the process with a clear message if score fails.
    No auto-rewrite (no Claude API) — user fixes the JSON manually."""
    print("\n── Gate 1: Content Quality ──────────────────────────")
    attempt = 0
    while True:
        try:
            audit = gate1_assert(script)
            print(gate1_report(audit))
            break
        except ValueError as e:
            attempt += 1
            print(e)
            if attempt >= MAX_GATE1_RETRIES:
                print(
                    f"\n[Gate 1] Script at '{script_path}' failed {attempt} time(s).\n"
                    "Fix the JSON manually and re-run the pipeline."
                )
                sys.exit(1)
            # No auto-rewrite — just fail fast so user can edit
            sys.exit(1)
    print()
# ─────────────────────────────────────────────────────────────────────────────


# ── GATE 1 LLM HELPER ────────────────────────────────────────────────────────
def _run_gate1_llm(script: dict, script_path: str) -> dict:
    """Run Gate 1 LLM. Returns a possibly rewritten script that passed."""
    print("\n── Gate 1 LLM ───────────────────────────────────────")
    try:
        gate1_result = gate1_llm_assert(
            script,
            max_retries=MAX_GATE1_LLM_RETRIES,
            auto_rewrite=True,
            verbose=False,
            return_metadata=True,
        )
        rewritten = gate1_result["script"]
        scores = gate1_result["result"]["scores"]
        total = gate1_result["result"]["total"]
        print(
            f"[Gate 1 LLM] PASS {total}/40 | "
            f"hook={scores.get('hook', 0)} arc={scores.get('arc', 0)} "
            f"emotion={scores.get('emotion', 0)} cta={scores.get('cta', 0)}"
        )
        if gate1_result.get("rewrote"):
            out_path = _gate1_llm_rewrite_path(script_path)
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(rewritten, f, ensure_ascii=False, indent=2)
            print(f"[Gate 1 LLM] Auto-saved rewritten script → {out_path}")
        print()
        return rewritten
    except ValueError as e:
        print(e)
        print(
            f"\n[Gate 1 LLM] Script at '{script_path}' failed viral quality checks.\n"
            "Fix the script manually or inspect the rewrite issues above, then re-run."
        )
        sys.exit(1)
    except RuntimeError as e:
        print(f"[Gate 1 LLM] API error: {e}")
        sys.exit(2)
# ─────────────────────────────────────────────────────────────────────────────


def _gate1_llm_rewrite_path(script_path: str) -> Path:
    path = Path(script_path)
    return path.with_name(f"{path.stem}{GATE1_LLM_REWRITE_SUFFIX}")


# ── GATE 2 HELPER ────────────────────────────────────────────────────────────
def _run_gate2(video_output: str) -> None:
    """Run Gate 2. Exits the process with a clear message if visual checks fail.
    No auto-re-render cycle (would need user to know which JSON props to fix).
    """
    print("\n── Gate 2: Visual Quality ───────────────────────────")
    for cycle in range(1, MAX_GATE2_CYCLES + 1):
        try:
            result = gate2_assert(video_output)
            print(result["report"])
            break
        except (FileNotFoundError, RuntimeError, EnvironmentError) as e:
            # Hard infrastructure failures — no point retrying
            print(f"[Gate 2] Infrastructure error: {e}")
            sys.exit(1)
        except ValueError as e:
            print(e)
            if cycle >= MAX_GATE2_CYCLES:
                print(
                    f"\n[Gate 2] Video '{video_output}' failed visual checks after "
                    f"{cycle} inspection(s).\n"
                    "Inspect the frame issues above, fix the scene JSON, and re-run."
                )
                sys.exit(1)
            # Future: could trigger a targeted re-render here.
            # For now, exit so the user can act on the specific issues.
            sys.exit(1)
    print()
# ─────────────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("script", nargs="?", default="content/sample_script.json")
    parser.add_argument(
        "--skip-validation",
        action="store_true",
        help="Skip pre-render manifest validation (emergency use only)",
    )
    parser.add_argument(
        "--skip-gate1",
        action="store_true",
        help="Skip Gate 1 content quality check (emergency use only)",
    )
    parser.add_argument(
        "--skip-gate1-llm",
        action="store_true",
        help="Skip the Gate 1 LLM viral-quality check (use when ANTHROPIC_API_KEY is unavailable)",
    )
    parser.add_argument(
        "--skip-gate2",
        action="store_true",
        help="Skip Gate 2 visual quality check (emergency use only)",
    )
    parser.add_argument(
        "--speed",
        type=float,
        default=1.1,
        help="Voiceover speed multiplier, pitch-preserved (1.0 = VieNeu native pace)",
    )
    parser.add_argument(
        "--tts-provider",
        default=None,
        help="TTS provider: vieneu, viettel_ai, say, or gemini (defaults to VIDGEN_TTS_PROVIDER)",
    )
    parser.add_argument(
        "--tts-voice",
        default=None,
        help="Voice name/ID for the selected TTS provider",
    )
    parser.add_argument(
        "--reuse-tts",
        action="store_true",
        help="Reuse existing WAV files instead of synthesizing them again",
    )
    parser.add_argument(
        "--prebuilt-audio-dir",
        default=None,
        help=(
            "Directory of prebuilt per-scene WAV files (e.g. input/audio/wav). "
            "Each scene's audio is looked up by filename — scene_01_shout_through_wall "
            "uses scene_01_shout_through_wall.wav. When set, no TTS is synthesized for "
            "any scene that has a matching file in this directory."
        ),
    )
    parser.add_argument(
        "--no-trim",
        action="store_true",
        help="Keep TTS silence (leading/trailing and long internal pauses)",
    )
    parser.add_argument(
        "--target-dbfs",
        type=float,
        default=-15.0,
        help="Normalize every voiceover clip to this RMS level in dBFS (soft-limited)",
    )
    parser.add_argument(
        "--no-karaoke",
        action="store_true",
        help="Skip word-level forced alignment (karaoke caption highlighting)",
    )
    args = parser.parse_args()

    with open(args.script, encoding="utf-8") as f:
        script = json.load(f)

    script = resolve_script(script)

    # shots[0] is reserved for generate_thumbnail(), which always reads that
    # index directly from args.script — it's a static cover shot, never part
    # of the video timeline. Strip only that slot (not every scene of the
    # same type — HSKFlashCardThumbnailScene's visual is also reused as a
    # regular in-video scene elsewhere, e.g. the HSK flashcard "hook" beat).
    shots = script_shots(script)
    if shots and shots[0]["type"] == "HSKFlashCardThumbnailScene":
        script["shots"] = shots[1:]

    # ── GATE 1: Content quality — runs before any TTS or render work ─────────
    if not args.skip_gate1:
        _run_gate1(script, args.script)
        if not args.skip_gate1_llm:
            script = _run_gate1_llm(script, args.script)
        else:
            print("[Gate 1 LLM] SKIPPED (--skip-gate1-llm flag set)")
    else:
        print("[Gate 1] SKIPPED (--skip-gate1 flag set)")
        print("[Gate 1 LLM] SKIPPED (--skip-gate1 flag set)")
    # ─────────────────────────────────────────────────────────────────────────

    if not args.skip_validation:
        validate_manifest(script)

    tts_provider = normalize_tts_provider(args.tts_provider)
    tts_voice = args.tts_voice or os.getenv("VIDGEN_TTS_VOICE")
    if not tts_voice and tts_provider == "vieneu":
        tts_voice = DEFAULT_VIENEU_VOICE
    if not tts_voice and tts_provider == "viettel_ai":
        tts_voice = os.getenv("VIETTEL_AI_VOICE")
    if not tts_voice and tts_provider == "say":
        tts_voice = os.getenv("MACOS_SAY_VOICE", "Linh")
    if not tts_voice and tts_provider == "gemini":
        tts_voice = os.getenv("GEMINI_TTS_VOICE")
    print(f"[TTS] provider={tts_provider}, voice={tts_voice or '(default)'}")

    script_stem = Path(args.script).stem
    if script_stem.startswith("script_"):
        script_stem = script_stem[len("script_"):]
    video_filename = script_stem + ".mp4"
    video_output = os.path.abspath(f"{VIDEO_OUT_DIR}/{video_filename}")

    tts_jobs = []
    for shot in script_shots(script):
        scene_speed = resolve_scene_tts_speed(shot, args.speed)
        if shot.get("narration"):
            tts_jobs.append({"id": shot["id"], "text": shot["narration"], "speed": scene_speed})
        for i, seg in enumerate(shot.get("narration_per_criterion", [])):
            tts_jobs.append({"id": f"{shot['id']}_seg{i}", "text": seg["text"], "speed": scene_speed})
        for i, line in enumerate(shot.get("props", {}).get("dialogue", [])):
            if line.get("text") and not line.get("mute"):
                tts_jobs.append({"id": f"{shot['id']}_dlg{i}", "text": line["text"], "speed": scene_speed})

    # --- Audio synthesis (parallel) ---
    def synthesize_job(job: dict) -> str:
        output_path = f"{WAV_DIR}/{wav_filename(job['id'])}"
        if args.prebuilt_audio_dir:
            prebuilt_path = os.path.join(args.prebuilt_audio_dir, wav_filename(job["id"]))
            if not os.path.exists(prebuilt_path):
                raise FileNotFoundError(
                    f"--prebuilt-audio-dir set but no prebuilt WAV found for "
                    f"'{job['id']}' (expected {prebuilt_path})"
                )
            shutil.copyfile(prebuilt_path, output_path)
            print(f"{job['id']} using prebuilt {prebuilt_path}")
            return job["id"]
        if args.reuse_tts and os.path.exists(output_path):
            print(f"{job['id']} reusing existing {output_path}")
            return job["id"]
        tts_synthesize(
            job["text"],
            output_path,
            voice=tts_voice,
            speed=job["speed"],
            trim_silence=not args.no_trim,
            target_dbfs=args.target_dbfs,
            provider=tts_provider,
        )
        return job["id"]

    os.makedirs(WAV_DIR, exist_ok=True)
    start_time = now()

    with ThreadPoolExecutor(max_workers=min(3, max(1, len(tts_jobs)))) as executor:
        futures = {executor.submit(synthesize_job, job): job for job in tts_jobs}
        for future in as_completed(futures):
            job_id = future.result()
            print(f"{job_id} saved to {WAV_DIR}/{wav_filename(job_id)}")

    end_time = now()
    print(f"Total generation time: {end_time - start_time:.2f}s")

    # VieNeu output duration varies between otherwise identical takes. Fit
    # each real WAV to its authored narration window before measuring or
    # muxing so speech can never be clipped at a shot boundary.
    fps = script.get("fps", 30)
    for shot in script_shots(script):
        sid = shot["id"]
        if not shot.get("narration") or "duration_frames" not in shot:
            continue
        offset = (shot.get("narration_timing_frames") or [0])[0]
        tail = shot.get("transition_out_delay_frames", 0)
        available_frames = shot["duration_frames"] - offset - tail
        fit_wav_to_duration(
            f"{WAV_DIR}/{wav_filename(sid)}",
            max_duration_seconds=available_frames / fps,
        )

    # Same fit pass for dialogue lines (e.g. WallPortalScene commentary):
    # each line's window runs to the next line's start_frame, or scene end
    # for the last line, so overlapping TTS takes never bleed into each other.
    for shot in script_shots(script):
        sid = shot["id"]
        dialogue = shot.get("props", {}).get("dialogue", [])
        if not dialogue or "duration_frames" not in shot:
            continue
        starts = [line.get("start_frame", line.get("frame", 0)) for line in dialogue]
        tail = shot.get("transition_out_delay_frames", 0)
        for i, start in enumerate(starts):
            dlg_id = f"{sid}_dlg{i}"
            wav_path = f"{WAV_DIR}/{wav_filename(dlg_id)}"
            if not os.path.exists(wav_path):
                continue
            next_start = starts[i + 1] if i + 1 < len(starts) else shot["duration_frames"] - tail
            available_frames = next_start - start
            if available_frames > 0:
                fit_wav_to_duration(wav_path, max_duration_seconds=available_frames / fps)

    # --- Audio durations ---
    audio_durations: dict = {}
    total_audio = 0.0
    for job in tts_jobs:
        wav_path = f"{WAV_DIR}/{wav_filename(job['id'])}"
        with wave.open(wav_path) as wf:
            duration = wf.getnframes() / wf.getframerate()
            print(f"{job['id']} audio duration: {duration:.2f}s")
            audio_durations[job["id"]] = duration
            total_audio += duration
    print(f"Total audio duration: {total_audio:.2f}s")

    # --- Tighten scene durations to the adjusted audio ---
    if not args.no_trim or any(abs(job["speed"] - 1.0) > 1e-9 for job in tts_jobs):
        fps = script.get("fps", 30)
        for shot in script_shots(script):
            sid = shot["id"]
            if (
                sid not in audio_durations
                or "duration_frames" not in shot
                or shot.get("narration_per_criterion")
                # Dialogue lines (e.g. WallPortalScene commentary) are timed
                # against the scene's own frame grid independently of the
                # main narration track — tightening to narration length alone
                # can shrink the scene shorter than a late dialogue line's
                # start, which then produces a negative ffmpeg atrim window.
                or shot.get("props", {}).get("dialogue")
            ):
                continue
            offset = (shot.get("narration_timing_frames") or [0])[0]
            tail = shot.get("transition_out_delay_frames", 15)
            tightened = offset + math.ceil(audio_durations[sid] * fps) + tail
            if tightened < shot["duration_frames"]:
                print(f"{sid}: duration {shot['duration_frames']} -> {tightened} frames")
                shot["duration_frames"] = tightened

    # --- Word-level alignment for karaoke caption highlighting ---
    word_timings: dict = {}
    if not args.no_karaoke:
        fps = script.get("fps", 30)
        for shot in script_shots(script):
            sid = shot["id"]
            narration = shot.get("narration")
            if not narration or sid not in audio_durations:
                continue
            wav_path = f"{WAV_DIR}/{wav_filename(sid)}"
            offset = (shot.get("narration_timing_frames") or [0])[0]
            timings = align_words(wav_path, narration, fps=fps, frame_offset=offset)
            if timings:
                word_timings[sid] = timings
                print(f"[karaoke_align] {sid}: {len(timings)} words aligned")

    # --- Copy audio to Remotion public/ ---
    audio_ids = [job["id"] for job in tts_jobs]
    copy_audio_to_remotion_public(audio_ids, WAV_DIR, REMOTION_PUBLIC_AUDIO)
    print(f"Copied {len(audio_ids)} WAV file(s) to {REMOTION_PUBLIC_AUDIO}/")

    # --- Write render manifest ---
    manifest = build_render_manifest(script, audio_durations, word_timings=word_timings)
    write_render_manifest(manifest, MANIFEST_PATH)
    print(f"Render manifest written to {MANIFEST_PATH}")

    # ── BEAT MAP: predicted-replay heuristic — advisory only, never blocks ───
    beatmap = score_beatmap(script, manifest)
    write_beatmap(beatmap, BEATMAP_PATH)
    print(f"\n{beatmap_report(beatmap)}")
    print(
        f"Beat map written to {BEATMAP_PATH} — view it in Studio with "
        f"REMOTION_BEAT_MAP=1 npx remotion studio (run from remotion/)"
    )
    # ─────────────────────────────────────────────────────────────────────────

    # --- Detect dead air ---
    dead_air_findings = detect_dead_air(script, manifest, audio_durations)
    if dead_air_findings:
        print("\nDead air warnings:")
        for f in dead_air_findings:
            print(
                f"  - {f['scene_id']}: {f['dead_air_frames']} frames "
                f"({f['dead_air_seconds']}s) of dead air after audio ends"
            )

    # --- Render video ---
    os.makedirs(VIDEO_OUT_DIR, exist_ok=True)
    if os.path.exists(video_output):
        os.remove(video_output)
        print(f"Deleted old video: {video_output}")

    render_video_chunked(manifest, video_output)
    print(f"Video rendered to {video_output}")

    # ── GATE 2: Visual quality — runs after render, before Studio launch ─────
    if not args.skip_gate2:
        _run_gate2(video_output)
    else:
        print("[Gate 2] SKIPPED (--skip-gate2 flag set)")
    # ─────────────────────────────────────────────────────────────────────────

    try:
        from vidgen.thumbnail import generate_thumbnail

        generate_thumbnail(args.script, video_output.replace(".mp4", "_thumb.png"))
    except Exception as e:
        print(f"⚠️  Thumbnail generation failed (non-fatal): {e}")

    # --- Open Remotion Studio in browser (beat map overlay on by default —
    # this is the pre-publish review step the beat map exists for) ---
    if not _port_open(STUDIO_PORT):
        studio_env = {**os.environ, "REMOTION_BEAT_MAP": "1"}
        subprocess.Popen(
            ["npx", "remotion", "studio"],
            cwd="remotion",
            env=studio_env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        print("Starting Remotion Studio (beat map overlay on)...")
        while not _port_open(STUDIO_PORT):
            time.sleep(1)

    webbrowser.open(f"http://localhost:{STUDIO_PORT}")
    print(f"Opened Remotion Studio at http://localhost:{STUDIO_PORT}")


if __name__ == "__main__":
    main()
