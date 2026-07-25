"""Step functions for video_pipeline.py, split out of the former monolithic
main() so business logic (job construction, duration math) can be unit
tested independently of I/O (TTS synthesis, file writes, rendering)."""

from __future__ import annotations

import copy
import json
import logging
import math
import os
import shutil
import wave
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from time import time as now

from vidgen.audio.speech_synthesizer import (
    fit_wav_to_duration,
    resolve_scene_tts_speed,
    synthesize as tts_synthesize,
)
from vidgen.pipeline.render_manifest_builder import wav_filename
from vidgen.pipeline.script_resolver import resolve_script
from vidgen.pipeline.script_validator import validate_manifest
from vidgen.pipeline.shot_schema import script_shots

logger = logging.getLogger(__name__)


@dataclass
class TTSJob:
    id: str
    text: str
    speed: float


def build_tts_jobs(script: dict, base_speed: float) -> list[TTSJob]:
    jobs: list[TTSJob] = []
    for shot in script_shots(script):
        scene_speed = resolve_scene_tts_speed(shot, base_speed)
        if shot.get("narration"):
            jobs.append(TTSJob(id=shot["id"], text=shot["narration"], speed=scene_speed))
        for i, seg in enumerate(shot.get("narration_per_criterion", [])):
            jobs.append(TTSJob(id=f"{shot['id']}_seg{i}", text=seg["text"], speed=scene_speed))
        for i, line in enumerate(shot.get("props", {}).get("dialogue", [])):
            if line.get("text") and not line.get("mute"):
                jobs.append(TTSJob(id=f"{shot['id']}_dlg{i}", text=line["text"], speed=scene_speed))
    return jobs


@dataclass
class DurationChange:
    scene_id: str
    old_frames: int
    new_frames: int


def tighten_scene_durations(
    script: dict,
    audio_durations: dict,
    fps: int,
    jobs: list[TTSJob],
) -> tuple[dict, list[DurationChange]]:
    new_script = copy.deepcopy(script)
    changes: list[DurationChange] = []
    for shot in script_shots(new_script):
        sid = shot["id"]
        if (
            sid not in audio_durations
            or "duration_frames" not in shot
            or shot.get("narration_per_criterion")
            or shot.get("props", {}).get("dialogue")
        ):
            continue
        offset = (shot.get("narration_timing_frames") or [0])[0]
        tail = shot.get("transition_out_delay_frames", 15)
        tightened = offset + math.ceil(audio_durations[sid] * fps) + tail
        if tightened < shot["duration_frames"]:
            changes.append(DurationChange(sid, shot["duration_frames"], tightened))
            shot["duration_frames"] = tightened
    return new_script, changes


@dataclass
class LoadResult:
    script: dict


def load_and_validate_script(script_path: str, skip_validation: bool) -> LoadResult:
    with open(script_path, encoding="utf-8") as f:
        script = json.load(f)
    script = resolve_script(script)

    shots = script_shots(script)
    if shots and shots[0]["type"] == "HSKFlashCardThumbnailScene":
        script["shots"] = shots[1:]

    if not skip_validation:
        validate_manifest(script)
    return LoadResult(script=script)


@dataclass
class TTSResult:
    job_ids: list
    elapsed_seconds: float


def synthesize_tts(
    jobs: list[TTSJob],
    wav_dir: str,
    tts_voice: str,
    reuse_tts: bool,
    prebuilt_audio_dir: str | None,
    no_trim: bool,
    target_dbfs: float,
) -> TTSResult:
    def synthesize_job(job: TTSJob) -> str:
        output_path = f"{wav_dir}/{wav_filename(job.id)}"
        if prebuilt_audio_dir:
            prebuilt_path = os.path.join(prebuilt_audio_dir, wav_filename(job.id))
            if not os.path.exists(prebuilt_path):
                raise FileNotFoundError(
                    f"--prebuilt-audio-dir set but no prebuilt WAV found for "
                    f"'{job.id}' (expected {prebuilt_path})"
                )
            shutil.copyfile(prebuilt_path, output_path)
            logger.info("%s using prebuilt %s", job.id, prebuilt_path)
            return job.id
        if reuse_tts and os.path.exists(output_path):
            logger.info("%s reusing existing %s", job.id, output_path)
            return job.id
        tts_synthesize(
            job.text,
            output_path,
            voice=tts_voice,
            speed=job.speed,
            trim_silence=not no_trim,
            target_dbfs=target_dbfs,
        )
        return job.id

    os.makedirs(wav_dir, exist_ok=True)
    start_time = now()
    job_ids = []
    with ThreadPoolExecutor(max_workers=min(3, max(1, len(jobs)))) as executor:
        futures = {executor.submit(synthesize_job, job): job for job in jobs}
        for future in as_completed(futures):
            job_id = future.result()
            job_ids.append(job_id)
            logger.info("%s saved to %s/%s", job_id, wav_dir, wav_filename(job_id))
    elapsed = now() - start_time
    logger.info("Total generation time: %.2fs", elapsed)
    return TTSResult(job_ids=job_ids, elapsed_seconds=elapsed)


@dataclass
class FitResult:
    narration_fitted: int
    dialogue_fitted: int


def fit_durations(script: dict, wav_dir: str, fps: int) -> FitResult:
    narration_fitted = 0
    for shot in script_shots(script):
        sid = shot["id"]
        if not shot.get("narration") or "duration_frames" not in shot:
            continue
        offset = (shot.get("narration_timing_frames") or [0])[0]
        tail = shot.get("transition_out_delay_frames", 0)
        available_frames = shot["duration_frames"] - offset - tail
        wav_path = f"{wav_dir}/{wav_filename(sid)}"
        if os.path.exists(wav_path):
            fit_wav_to_duration(wav_path, max_duration_seconds=available_frames / fps)
            narration_fitted += 1

    dialogue_fitted = 0
    for shot in script_shots(script):
        sid = shot["id"]
        dialogue = shot.get("props", {}).get("dialogue", [])
        if not dialogue or "duration_frames" not in shot:
            continue
        starts = [line.get("start_frame", line.get("frame", 0)) for line in dialogue]
        tail = shot.get("transition_out_delay_frames", 0)
        for i, start in enumerate(starts):
            dlg_id = f"{sid}_dlg{i}"
            wav_path = f"{wav_dir}/{wav_filename(dlg_id)}"
            if not os.path.exists(wav_path):
                continue
            next_start = starts[i + 1] if i + 1 < len(starts) else shot["duration_frames"] - tail
            available_frames = next_start - start
            if available_frames > 0:
                fit_wav_to_duration(wav_path, max_duration_seconds=available_frames / fps)
                dialogue_fitted += 1
    return FitResult(narration_fitted=narration_fitted, dialogue_fitted=dialogue_fitted)


def measure_audio_durations(jobs: list[TTSJob], wav_dir: str) -> dict:
    audio_durations = {}
    for job in jobs:
        wav_path = f"{wav_dir}/{wav_filename(job.id)}"
        with wave.open(wav_path) as wf:
            duration = wf.getnframes() / wf.getframerate()
            logger.info("%s audio duration: %.2fs", job.id, duration)
            audio_durations[job.id] = duration
    return audio_durations
