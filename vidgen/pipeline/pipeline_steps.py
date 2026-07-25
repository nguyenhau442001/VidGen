"""Step functions for video_pipeline.py, split out of the former monolithic
main() so business logic (job construction, duration math) can be unit
tested independently of I/O (TTS synthesis, file writes, rendering)."""

from __future__ import annotations

import copy
import math
from dataclasses import dataclass

from vidgen.audio.speech_synthesizer import resolve_scene_tts_speed
from vidgen.pipeline.shot_schema import script_shots


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
