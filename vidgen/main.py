from vieneu import Vieneu
from time import time
import json
import wave

# Load the default TTS engine (v3 Turbo) — picks ONNX on CPU, PyTorch on GPU automatically
tts = Vieneu()

with open("content/sample_script.json", encoding="utf-8") as f:
    script = json.load(f)

start_time = time()

for scene in script["scenes"]:
    output_wav_file_name = f"output/wav/scene_{scene['id']}.wav"
    audio = tts.infer(scene["narration"], voice="Xuân Vĩnh") # type: ignore
    tts.save(audio, output_wav_file_name) # type: ignore
    print(f"Scene {scene['id']} saved to {output_wav_file_name}")

end_time = time()
print(f"Total generation time: {end_time - start_time:.2f} seconds")

total_audio_duration = 0.0
for scene in script["scenes"]:
    wav_path = f"output/wav/scene_{scene['id']}.wav"
    with wave.open(wav_path) as wf:
        duration = wf.getnframes() / wf.getframerate()
    print(f"Scene {scene['id']} audio duration: {duration:.2f}s")
    total_audio_duration += duration

print(f"Total audio duration: {total_audio_duration:.2f}s")
