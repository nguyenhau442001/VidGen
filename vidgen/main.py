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
    build_render_manifest,
    copy_audio_to_remotion_public,
    write_render_manifest,
)

WAV_DIR = "output/audio/wav"
REMOTION_PUBLIC_AUDIO = "remotion/public/audio"
MANIFEST_PATH = "output/render_manifest.json"

parser = argparse.ArgumentParser()
parser.add_argument("script", nargs="?", default="content/sample_script.json")
args = parser.parse_args()

tts = Vieneu()

with open(args.script, encoding="utf-8") as f:
    script = json.load(f)

video_filename = script["title"].lower().replace(" ", "_") + ".mp4"
VIDEO_OUTPUT = os.path.abspath(f"output/video/mp4/{video_filename}")

# --- Audio synthesis (parallel) ---
def synthesize_scene(scene: dict) -> int:
    output_path = f"{WAV_DIR}/scene_{scene['id']}.wav"
    audio = tts.infer(scene["narration"], voice="Xuân Vĩnh")  # type: ignore
    tts.save(audio, output_path)  # type: ignore
    return scene["id"]

start_time = now()
with ThreadPoolExecutor(max_workers=len(script["scenes"])) as executor:
    futures = {executor.submit(synthesize_scene, scene): scene for scene in script["scenes"]}
    for future in as_completed(futures):
        scene_id = future.result()
        print(f"Scene {scene_id} saved to {WAV_DIR}/scene_{scene_id}.wav")

end_time = now()
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
os.makedirs("output/video/mp4", exist_ok=True)
if os.path.exists(VIDEO_OUTPUT):
    os.remove(VIDEO_OUTPUT)
    print(f"Deleted old video: {VIDEO_OUTPUT}")
manifest_props = json.dumps({"manifest": manifest})
subprocess.run(
    [
        "npx", "remotion", "render", "TikTokVideo", VIDEO_OUTPUT,
        f"--props={manifest_props}",
    ],
    cwd="remotion",
    check=True,
)
print(f"Video rendered to {VIDEO_OUTPUT}")

# --- Open Remotion Studio in browser ---
STUDIO_PORT = 3000

def _port_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex(("localhost", port)) == 0

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
