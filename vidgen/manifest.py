import json
import math
import os
import shutil

FPS = 30
FRAME_PADDING = 10


def build_render_manifest(script: dict, audio_durations: dict[int, float]) -> dict:
    scenes = []
    for scene in script["scenes"]:
        sid = scene["id"]
        duration_secs = audio_durations[sid]
        duration_frames = math.ceil(duration_secs * FPS) + FRAME_PADDING
        scenes.append(
            {
                "id": sid,
                "type": scene["type"],
                "audioPath": f"audio/scene_{sid}.wav",
                "durationInFrames": duration_frames,
                "visual": scene["visual"],
            }
        )
    return {"fps": FPS, "width": 1080, "height": 1920, "scenes": scenes}


def write_render_manifest(manifest: dict, output_path: str) -> None:
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)


def copy_audio_to_remotion_public(scene_ids: list[int], wav_dir: str, public_audio_dir: str) -> None:
    os.makedirs(public_audio_dir, exist_ok=True)
    for sid in scene_ids:
        src = os.path.join(wav_dir, f"scene_{sid}.wav")
        dst = os.path.join(public_audio_dir, f"scene_{sid}.wav")
        shutil.copy2(src, dst)
