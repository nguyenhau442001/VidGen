"""Standalone test for VieNeu-TTS zero-shot voice cloning (not wired into the pipeline).

Installed vieneu SDK (v3.2.3, default mode "v3turbo") clones via
tts.infer(text=..., ref_audio=<path>, denoise=True) -- zero-shot, no ref_text
parameter exists on this mode (confirmed against vieneu.v3turbo.V3TurboVieNeuTTS.infer
and the package's own README). ref_text only exists on the older "standard"/"remote"
modes (VieNeu-TTS-v2 backbone), which this test does not use.
"""

from __future__ import annotations

import argparse
import time
from pathlib import Path

import soundfile as sf

from vieneu import Vieneu

TEST_SENTENCES = {
    "short": "Xin chào các bạn nhé.",
    "medium": "Hôm nay mình sẽ thử giọng đọc mới cho kênh này.",
    "long": (
        "Đây là một câu test dài hơn để kiểm tra xem giọng đọc "
        "có ổn định hay không khi đọc nhiều từ liên tục trong một câu."
    ),
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Test VieNeu-TTS voice cloning")
    parser.add_argument("--ref-audio", required=True, help="Path to 3-10s reference WAV")
    parser.add_argument(
        "--output-dir", default="output", help="Directory for output WAV files"
    )
    parser.add_argument(
        "--denoise", action="store_true", default=True, help="Denoise reference audio"
    )
    args = parser.parse_args()

    ref_audio = Path(args.ref_audio)
    if not ref_audio.exists():
        raise FileNotFoundError(f"ref_audio not found: {ref_audio}")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"[test] Loading VieNeu-TTS (v3turbo)...")
    tts = Vieneu()

    for label, text in TEST_SENTENCES.items():
        word_count = len(text.split())
        print(f"\n[test] === {label} ({word_count} words) ===")
        print(f"[test] text: {text!r}")

        t0 = time.time()
        audio = tts.infer(text=text, ref_audio=str(ref_audio), denoise=args.denoise)
        elapsed = time.time() - t0

        sr = tts.sample_rate
        duration = len(audio) / sr

        out_path = output_dir / f"voice_clone_test_{label}.wav"
        tts.save(audio, str(out_path))

        print(f"[test] infer time:   {elapsed:.2f}s")
        print(f"[test] sample rate:  {sr} Hz")
        print(f"[test] audio dur:    {duration:.2f}s")
        print(f"[test] saved:        {out_path}")


if __name__ == "__main__":
    main()
