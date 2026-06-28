from vieneu import Vieneu
from time import time

# Load the default TTS engine (v3 Turbo) — picks ONNX on CPU, PyTorch on GPU automatically
tts = Vieneu()

# [cười] is a non-verbal/emotion cue tag (experimental feature) — VieNeu will
# render it as a laugh sound rather than reading it as literal text
text = """[cười] Nếu AI trả lời sai, bạn sẽ làm gì? Nếu bạn gõ thêm 'ý tôi là...' — sai rồi. 
Đúng phải là: nhấn chỉnh sửa, sửa câu lệnh gốc, tạo lại. 
Cuộc trao đổi sai biến mất, token không cộng dồn thêm."""

output_wav_file_name = "output/audio/wav/test_output.wav"

start_time = time()
# Synthesize speech using the built-in preset voice "Xuân Vĩnh"
audio = tts.infer(text, voice="Xuân Vĩnh") # type: ignore
# Write the generated waveform to disk as a .wav file
tts.save(audio, output_wav_file_name) # type: ignore
end_time = time()

print(f"Audio has been generated and saved to {output_wav_file_name}")
print(f"Audio generation time: {end_time - start_time:.2f} seconds")

# List all built-in preset voices bundled with VieNeu-TTS, as (display_name, voice_id) pairs
print("List of available voices:")
for voice_name, voice_id in tts.list_preset_voices(): # type: ignore
    print(f"- {voice_name} ({voice_id})")