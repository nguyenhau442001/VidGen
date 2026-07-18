import numpy as np

from vidgen import tts_speed_adjustor as tts


def test_normalize_tts_provider_accepts_aliases(monkeypatch):
    monkeypatch.delenv("VIDGEN_TTS_PROVIDER", raising=False)

    assert tts.normalize_tts_provider(None) == "vieneu"
    assert tts.normalize_tts_provider("VieNeu") == "vieneu"
    assert tts.normalize_tts_provider("viettel") == "viettel_ai"
    assert tts.normalize_tts_provider("viettel_ai") == "viettel_ai"
    assert tts.normalize_tts_provider("gemini") == "gemini"
    assert tts.normalize_tts_provider("Gemini-2.5-Flash-TTS") == "gemini"
    assert tts.normalize_tts_provider("google_gemini") == "gemini"


def test_default_vieneu_voice_is_thanh_binh():
    assert tts.DEFAULT_VIENEU_VOICE == "Thanh Bình"


def test_audio_from_gemini_response_extracts_inline_audio(monkeypatch):
    calls = {}

    def fake_audio_from_bytes(raw, content_type):
        calls["raw"] = raw
        calls["content_type"] = content_type
        return np.array([0.05, 0.05], dtype=np.float32), 8_000

    monkeypatch.setattr(tts, "_audio_from_bytes", fake_audio_from_bytes)

    response = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "inline_data": {
                                "data": b"RIFFdemo",
                                "mime_type": "audio/wav",
                            }
                        }
                    ]
                }
            }
        ]
    }

    samples, sr = tts._audio_from_gemini_response(response)

    assert calls == {
        "raw": b"RIFFdemo",
        "content_type": "audio/wav",
    }
    assert sr == 8_000
    np.testing.assert_allclose(samples, np.array([0.05, 0.05], dtype=np.float32))


def test_audio_from_gemini_response_reports_non_audio_response():
    response = {
        "prompt_feedback": {"block_reason": "OTHER"},
        "candidates": [
            {
                "finish_reason": "STOP",
                "content": {
                    "parts": [
                        {
                            "text": "I cannot synthesize audio for that request."
                        }
                    ]
                },
            }
        ],
    }

    try:
        tts._audio_from_gemini_response(response)
    except RuntimeError as exc:
        message = str(exc)
    else:
        raise AssertionError("Expected Gemini response without audio to fail")

    assert "Response summary" in message
    assert "finish_reason=STOP" in message
    assert "I cannot synthesize audio" in message


def test_gemini_tts_prompt_wraps_text_for_exact_speech(monkeypatch):
    monkeypatch.delenv("GEMINI_TTS_PROMPT_TEMPLATE", raising=False)

    prompt = tts._gemini_tts_prompt("Vàoooooooooooooooooo!")

    assert "Say the following Vietnamese text exactly as written" in prompt
    assert "native Vietnamese speaker" in prompt
    assert "Vàoooooooooooooooooo!" in prompt


def test_gemini_shout_prompt_handles_long_vao(monkeypatch):
    monkeypatch.delenv("GEMINI_TTS_SHOUT_PROMPT_TEMPLATE", raising=False)

    assert tts._is_gemini_shout_text("Vàoooooooooooooooooo!")
    assert not tts._is_gemini_shout_text("Tại sao hàng xóm hét VÀO trước mình?")
    assert "native Vietnamese speaker" in tts._gemini_shout_prompt("Vàoooooooooooooooooo!")
    assert "about two seconds" in tts._gemini_shout_prompt("Vàoooooooooooooooooo!")


def test_audio_from_pcm_bytes_uses_mime_rate_and_channels():
    raw = np.array([0, 32767, -32768, 0], dtype="<i2").tobytes()

    samples, sr = tts._audio_from_bytes(raw, "audio/pcm;rate=16000;channels=2")

    assert sr == 16_000
    assert samples.shape == (2, 2)
    np.testing.assert_allclose(samples[0], [0.0, 32767 / 32768], atol=1e-6)


def test_synthesize_dispatches_to_viettel_ai_when_requested(monkeypatch, tmp_path):
    calls = {}

    def fake_viettel(text, voice):
        calls["provider"] = "viettel_ai"
        calls["text"] = text
        calls["voice"] = voice
        return np.array([0.05, 0.05], dtype=np.float32), 8_000

    monkeypatch.setattr(tts, "_synthesize_with_viettel_ai", fake_viettel)

    output = tts.synthesize(
        "xin chào",
        tmp_path / "viettel.wav",
        voice="Giọng test",
        speed=1.0,
        trim_silence=False,
        target_dbfs=None,
        provider="viettel_ai",
    )

    assert calls == {
        "provider": "viettel_ai",
        "text": "xin chào",
        "voice": "Giọng test",
    }
    assert output.exists()


def test_synthesize_dispatches_to_gemini_when_requested(monkeypatch, tmp_path):
    calls = {}

    def fake_gemini(text, voice):
        calls["provider"] = "gemini"
        calls["text"] = text
        calls["voice"] = voice
        return np.array([0.05, 0.05], dtype=np.float32), 8_000

    monkeypatch.setattr(tts, "_synthesize_with_gemini", fake_gemini)

    output = tts.synthesize(
        "xin chào",
        tmp_path / "gemini.wav",
        voice=None,
        speed=1.0,
        trim_silence=False,
        target_dbfs=None,
        provider="gemini",
    )

    assert calls == {
        "provider": "gemini",
        "text": "xin chào",
        "voice": None,
    }
    assert output.exists()


def test_synthesize_dispatches_to_vieneu_by_default(monkeypatch, tmp_path):
    calls = {}

    def fake_vieneu(text, voice):
        calls["provider"] = "vieneu"
        calls["text"] = text
        calls["voice"] = voice
        return np.array([0.05, 0.05], dtype=np.float32), 8_000

    def fake_viettel(*args, **kwargs):
        raise AssertionError("Viettel backend should not be used by default")

    monkeypatch.setattr(tts, "_synthesize_with_vieneu", fake_vieneu)
    monkeypatch.setattr(tts, "_synthesize_with_viettel_ai", fake_viettel)

    output = tts.synthesize(
        "xin chào",
        tmp_path / "vieneu.wav",
        voice="Minh Đức",
        speed=1.0,
        trim_silence=False,
        target_dbfs=None,
    )

    assert calls == {
        "provider": "vieneu",
        "text": "xin chào",
        "voice": "Minh Đức",
    }
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
        provider="vieneu",
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
