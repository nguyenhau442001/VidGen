from vieneu import Vieneu
from time import time
import json

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
