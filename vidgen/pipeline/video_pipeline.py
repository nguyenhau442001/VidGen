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

from vidgen.audio.karaoke_aligner import align_words
from vidgen.audio.speech_synthesizer import (
    DEFAULT_VIENEU_VOICE,
    fit_wav_to_duration,
    resolve_scene_tts_speed,
    synthesize as tts_synthesize,
)
from vidgen.pipeline.chunked_video_renderer import render_video_chunked
from vidgen.pipeline.render_manifest_builder import (
    build_render_manifest,
    copy_audio_to_remotion_public,
    detect_dead_air,
    wav_filename,
    write_render_manifest,
)

# ── GATE IMPORTS ─────────────────────────────────────────────────────────────
from vidgen.pipeline.script_resolver import resolve_script
from vidgen.pipeline.script_validator import validate_manifest
from vidgen.pipeline.shot_schema import script_shots
from vidgen.quality.rendered_video_audit import gate2_assert
from vidgen.quality.retention_beatmap import score_beatmap, write_beatmap, format_report as beatmap_report
from vidgen.quality.script_quality_gate import gate1_assert, format_report as gate1_report
# ─────────────────────────────────────────────────────────────────────────────

WAV_DIR = "output/audio/wav"
REMOTION_PUBLIC_AUDIO = "remotion/public/audio"
MANIFEST_PATH = "output/render_manifest.json"
BEATMAP_PATH = "output/beatmap.json"
VIDEO_OUT_DIR = "remotion/out"
STUDIO_PORT = 3000

MAX_GATE1_RETRIES = 3    # abort pipeline after this many Gate 1 failures
MAX_GATE2_CYCLES = 2     # abort pipeline after this many Gate 2 fix cycles


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
        "--tts-voice",
        default=None,
        help="VieNeu preset voice name",
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
    else:
        print("[Gate 1] SKIPPED (--skip-gate1 flag set)")
    # ─────────────────────────────────────────────────────────────────────────

    if not args.skip_validation:
        validate_manifest(script)

    tts_voice = args.tts_voice or os.getenv("VIDGEN_TTS_VOICE")
    if not tts_voice:
        tts_voice = DEFAULT_VIENEU_VOICE
    print(f"[TTS] provider=vieneu, voice={tts_voice}")

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
        from vidgen.presentation.thumbnail_renderer import generate_thumbnail

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
