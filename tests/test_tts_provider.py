import numpy as np

from vidgen import tts_speed_adjustor as tts


def test_normalize_tts_provider_accepts_aliases(monkeypatch):
    monkeypatch.delenv("VIDGEN_TTS_PROVIDER", raising=False)

    assert tts.normalize_tts_provider(None) == "vieneu"
    assert tts.normalize_tts_provider("VieNeu") == "vieneu"
    assert tts.normalize_tts_provider("viettel") == "viettel_ai"
    assert tts.normalize_tts_provider("viettel_ai") == "viettel_ai"


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
