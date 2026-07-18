import numpy as np

from vidgen.audio import audio_processing
from vidgen.audio import speech_synthesizer as tts


def test_default_vieneu_voice_is_thanh_binh():
    assert tts.DEFAULT_VIENEU_VOICE == "Thanh Bình"


def test_audio_from_pcm_bytes_uses_mime_rate_and_channels():
    raw = np.array([0, 32767, -32768, 0], dtype="<i2").tobytes()

    samples, sr = audio_processing.audio_from_bytes(
        raw, "audio/pcm;rate=16000;channels=2"
    )

    assert sr == 16_000
    assert samples.shape == (2, 2)
    np.testing.assert_allclose(samples[0], [0.0, 32767 / 32768], atol=1e-6)


def test_synthesize_uses_vieneu(monkeypatch, tmp_path):
    calls = {}

    def fake_vieneu(text, voice):
        calls["text"] = text
        calls["voice"] = voice
        return np.array([0.05, 0.05], dtype=np.float32), 8_000

    monkeypatch.setattr(tts.vieneu_tts, "synthesize", fake_vieneu)

    output = tts.synthesize(
        "xin chào",
        tmp_path / "vieneu.wav",
        voice="Thanh Bình",
        speed=1.0,
        trim_silence=False,
        target_dbfs=None,
    )

    assert calls == {"text": "xin chào", "voice": "Thanh Bình"}
    assert output.exists()


def test_synthesize_scenes_uses_scene_tts_speed_over_global(monkeypatch, tmp_path):
    calls = []

    def fake_synthesize(
        text,
        output_path,
        voice=None,
        speed=1.2,
        trim_silence=True,
        max_silence_ms=120,
        top_db=30,
        target_dbfs=-15.0,
    ):
        calls.append((text, output_path.name, speed))
        return output_path

    monkeypatch.setattr(tts, "synthesize", fake_synthesize)

    results = tts.synthesize_scenes(
        scenes=[
            {"id": "hook", "narration": "mở bài", "tts_speed": 1.25},
            {"id": "cta", "narration": "kết bài"},
        ],
        output_dir=tmp_path,
        speed=1.1,
        trim_silence=False,
        target_dbfs=None,
    )

    assert calls == [
        ("mở bài", "hook.wav", 1.25),
        ("kết bài", "cta.wav", 1.1),
    ]
    assert results["hook"] == tmp_path / "hook.wav"
    assert results["cta"] == tmp_path / "cta.wav"
