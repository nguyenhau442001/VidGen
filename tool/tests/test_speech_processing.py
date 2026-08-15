import numpy as np
import soundfile as sf

from vidgen.audio.speech_synthesizer import fit_wav_to_duration


def test_fit_wav_to_duration_leaves_short_audio_unchanged(tmp_path):
    path = tmp_path / "short.wav"
    samples = np.sin(np.linspace(0, 20, 8_000)).astype(np.float32)
    sf.write(path, samples, 8_000, subtype="PCM_16")

    duration, speed = fit_wav_to_duration(path, max_duration_seconds=1.2)

    assert duration == 1.0
    assert speed == 1.0


def test_fit_wav_to_duration_stretches_audio_into_window(tmp_path):
    path = tmp_path / "long.wav"
    samples = np.sin(np.linspace(0, 40, 16_000)).astype(np.float32)
    sf.write(path, samples, 8_000, subtype="PCM_16")

    duration, speed = fit_wav_to_duration(path, max_duration_seconds=1.6)

    assert 1.24 < speed < 1.26
    assert duration <= 1.6
    fitted, sr = sf.read(path)
    assert sr == 8_000
    assert len(fitted) <= 12_800
