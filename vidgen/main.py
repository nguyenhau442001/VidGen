from vieneu import Vieneu
from time import time
import json

# Load the default TTS engine (v3 Turbo) — picks ONNX on CPU, PyTorch on GPU automatically
tts = Vieneu()

with open("content/sample_script.json", encoding="utf-8") as f:
    script = json.load(f)

text = " ".join(scene["narration"] for scene in script["scenes"])

output_wav_file_name = "output/wav/test_output.wav"

start_time = time()
# Synthesize speech using the built-in preset voice "Xuân Vĩnh"
audio = tts.infer(text, voice="Xuân Vĩnh") # type: ignore
# Write the generated waveform to disk as a .wav file
tts.save(audio, output_wav_file_name) # type: ignore
end_time = time()

print(f"Audio has been generated and saved to {output_wav_file_name}")
print(f"Audio generation time: {end_time - start_time:.2f} seconds")
