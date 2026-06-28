import json
import math
import os
import subprocess
import wave
from time import time

from vieneu import Vieneu  # type: ignore

from vidgen.manifest import (
    build_render_manifest,
    copy_audio_to_remotion_public,
    write_render_manifest,
)

WAV_DIR = "output/wav"
REMOTION_PUBLIC_AUDIO = "remotion/public/audio"
MANIFEST_PATH = "output/render_manifest.json"
VIDEO_OUTPUT = os.path.abspath("output/video/video.mp4")

tts = Vieneu()

with open("content/sample_script.json", encoding="utf-8") as f:
    script = json.load(f)

# --- Audio synthesis ---
start_time = time()
for scene in script["scenes"]:
    output_path = f"{WAV_DIR}/scene_{scene['id']}.wav"
    audio = tts.infer(scene["narration"], voice="Xuân Vĩnh")  # type: ignore
    tts.save(audio, output_path)  # type: ignore
    print(f"Scene {scene['id']} saved to {output_path}")

end_time = time()
print(f"Total generation time: {end_time - start_time:.2f}s")

# --- Audio durations ---
audio_durations: dict[int, float] = {}
total_audio = 0.0
for scene in script["scenes"]:
    wav_path = f"{WAV_DIR}/scene_{scene['id']}.wav"
    with wave.open(wav_path) as wf:
        duration = wf.getnframes() / wf.getframerate()
    print(f"Scene {scene['id']} audio duration: {duration:.2f}s")
    audio_durations[scene["id"]] = duration
    total_audio += duration
print(f"Total audio duration: {total_audio:.2f}s")

# --- Copy audio to Remotion public/ ---
scene_ids = [s["id"] for s in script["scenes"]]
copy_audio_to_remotion_public(scene_ids, WAV_DIR, REMOTION_PUBLIC_AUDIO)
print(f"Copied {len(scene_ids)} WAV file(s) to {REMOTION_PUBLIC_AUDIO}/")

# --- Write render manifest ---
manifest = build_render_manifest(script, audio_durations)
write_render_manifest(manifest, MANIFEST_PATH)
print(f"Render manifest written to {MANIFEST_PATH}")

# --- Render video ---
os.makedirs("output/video", exist_ok=True)
manifest_props = json.dumps({"manifest": manifest})
result = subprocess.run(
    [
        "npx", "remotion", "render", "TikTokVideo", VIDEO_OUTPUT,
        f"--props={manifest_props}",
    ],
    cwd="remotion",
    check=True,
)
print(f"Video rendered to {VIDEO_OUTPUT}")
