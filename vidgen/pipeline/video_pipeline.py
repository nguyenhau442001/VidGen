import argparse
import logging
import os
import socket
import subprocess
import time
import webbrowser
from pathlib import Path

from vidgen.config.project_paths import (
    CONTENT_JSON_DIR, CONTENT_MEDIA_DIR, OUTPUT_DIR, REMOTION_DIR,
    REMOTION_PUBLIC_IMAGES, REMOTION_PUBLIC_VIDEO,
)
from vidgen.audio.speech_synthesizer import DEFAULT_VIENEU_VOICE
from vidgen.pipeline import pipeline_steps as steps
from vidgen.pipeline.pipeline_state import compute_input_hash, load_state, save_state
from vidgen.pipeline.render_manifest_builder import wav_filename

WAV_DIR = OUTPUT_DIR / "audio" / "wav"
REMOTION_PUBLIC_AUDIO = REMOTION_DIR / "public" / "audio"
MANIFEST_PATH = OUTPUT_DIR / "render_manifest.json"
BEATMAP_PATH = OUTPUT_DIR / "beatmap.json"
VIDEO_OUT_DIR = REMOTION_DIR / "out"
STATE_PATH = OUTPUT_DIR / "pipeline_state.json"
STUDIO_PORT = 3000

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)


def _port_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex(("localhost", port)) == 0


def launch_studio(port: int = STUDIO_PORT) -> None:
    if not _port_open(port):
        studio_env = {**os.environ, "REMOTION_BEAT_MAP": "1"}
        subprocess.Popen(
            ["npx", "remotion", "studio"],
            cwd=REMOTION_DIR,
            env=studio_env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        logger.info("Starting Remotion Studio (beat map overlay on)...")
        while not _port_open(port):
            time.sleep(1)
    webbrowser.open(f"http://localhost:{port}")
    logger.info("Opened Remotion Studio at http://localhost:%d", port)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("script", nargs="?", default=str(CONTENT_JSON_DIR / "sample_script.json"))
    parser.add_argument("--skip-validation", action="store_true",
                         help="Skip pre-render manifest validation (emergency use only)")
    parser.add_argument("--speed", type=float, default=1.0,
                         help="Voiceover speed multiplier, pitch-preserved (1.0 = VieNeu native pace)")
    parser.add_argument("--tts-voice", default=None, help="VieNeu preset voice name")
    parser.add_argument("--reuse-tts", action="store_true",
                         help="Reuse existing WAV files instead of synthesizing them again")
    parser.add_argument("--prebuilt-audio-dir", default=None,
                         help=("Directory of prebuilt per-scene WAV files (e.g. input/audio/wav). "
                               "Each scene's audio is looked up by filename — scene_01_shout_through_wall "
                               "uses scene_01_shout_through_wall.wav. When set, no TTS is synthesized for "
                               "any scene that has a matching file in this directory."))
    parser.add_argument("--no-trim", action="store_true",
                         help="Keep TTS silence (leading/trailing and long internal pauses)")
    parser.add_argument("--target-dbfs", type=float, default=-15.0,
                         help="Normalize every voiceover clip to this RMS level in dBFS (soft-limited)")
    args = parser.parse_args()

    state = load_state(STATE_PATH)

    load_result = steps.load_and_validate_script(args.script, args.skip_validation)
    script = load_result.script

    tts_voice = args.tts_voice or os.getenv("VIDGEN_TTS_VOICE") or DEFAULT_VIENEU_VOICE
    logger.info("[TTS] provider=vieneu, voice=%s", tts_voice)

    script_stem = Path(args.script).stem
    if script_stem.startswith("script_"):
        script_stem = script_stem[len("script_"):]
    video_output = os.path.abspath(f"{VIDEO_OUT_DIR}/{script_stem}.mp4")

    media_dir = str(CONTENT_MEDIA_DIR / script_stem)
    steps.check_footage_fit(script, media_dir)

    jobs = steps.build_tts_jobs(script, args.speed)

    tts_hash = compute_input_hash(
        [(j.id, j.text, j.speed) for j in jobs], tts_voice, args.reuse_tts,
        args.prebuilt_audio_dir, args.no_trim, args.target_dbfs,
    )
    tts_entry = state.get("synthesize_tts")
    wav_files_present = all(
        os.path.exists(f"{WAV_DIR}/{wav_filename(j.id)}") for j in jobs
    )
    if steps.should_skip_tts(tts_entry, tts_hash, wav_files_present):
        # Safe to skip: fit_durations() below re-runs fit_wav_to_duration() on every
        # WAV regardless, but that call is a no-op once a WAV is already within its
        # duration window (see speech_synthesizer.fit_wav_to_duration's early return).
        logger.info("synthesize_tts: skipped (checkpoint match)")
    else:
        steps.synthesize_tts(
            jobs, str(WAV_DIR), tts_voice, args.reuse_tts, args.prebuilt_audio_dir,
            args.no_trim, args.target_dbfs,
        )
        state.set("synthesize_tts", tts_hash, {"job_ids": [j.id for j in jobs]})
        save_state(state, STATE_PATH)

    fps = script.get("fps", 30)
    fit_result = steps.fit_durations(script, str(WAV_DIR), fps)
    logger.info("Fitted %d narration, %d dialogue WAVs",
                fit_result.narration_fitted, fit_result.dialogue_fitted)

    audio_durations = steps.measure_audio_durations(jobs, str(WAV_DIR))
    audio_durations.update(steps.measure_media_durations(script, media_dir))
    logger.info("Total audio duration: %.2fs", sum(audio_durations.values()))

    if not args.no_trim or any(abs(j.speed - 1.0) > 1e-9 for j in jobs):
        script, changes = steps.tighten_scene_durations(script, audio_durations, fps, jobs)
        for c in changes:
            logger.info("%s: duration %d -> %d frames", c.scene_id, c.old_frames, c.new_frames)

    audio_ids = [j.id for j in jobs]
    manifest_result = steps.write_manifest_step(
        script, audio_durations, str(MANIFEST_PATH), str(WAV_DIR),
        str(REMOTION_PUBLIC_AUDIO), audio_ids,
        media_dir=media_dir,
        remotion_public_video=str(REMOTION_PUBLIC_VIDEO),
        remotion_public_images=str(REMOTION_PUBLIC_IMAGES),
    )
    manifest = manifest_result.manifest

    steps.score_and_write_beatmap(script, manifest, str(BEATMAP_PATH))
    steps.check_dead_air(script, manifest, audio_durations)

    steps.render_video(manifest, video_output)
    steps.generate_thumbnail_step(args.script, video_output)

    save_state(state, STATE_PATH)
    launch_studio(STUDIO_PORT)


if __name__ == "__main__":
    main()
