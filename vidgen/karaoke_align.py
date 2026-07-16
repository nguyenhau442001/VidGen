"""
vidgen/karaoke_align.py
────────────────────────
Word-level forced alignment for karaoke-style caption highlighting.

Given a synthesized narration WAV and the exact text that was spoken,
returns per-word start/end frames so Caption.tsx can highlight the word
currently being spoken as playback reaches it.

Uses stable-whisper's forced alignment (Aligner), which times a KNOWN
transcript against audio rather than transcribing from scratch — faster
and more accurate than plain ASR since the words are never in doubt, only
their timing.
"""

from __future__ import annotations

from typing import Any, Optional

_model: Optional[Any] = None


def _get_model(name: str = "base") -> Any:
    global _model
    if _model is None:
        import stable_whisper

        _model = stable_whisper.load_model(name)
    return _model


def align_words(
    wav_path: str,
    text: str,
    language: str = "vi",
    fps: int = 30,
    frame_offset: int = 0,
) -> list[dict]:
    """
    Force-align `text` against `wav_path` and return word timings in frames.

    Parameters
    ----------
    wav_path : str
        Path to the synthesized narration WAV (post speed-adjust/trim — the
        actual audio that will play, so timings match what's heard).
    text : str
        The exact narration text that was synthesized.
    language : str
        Whisper language code.
    fps : int
        Composition frame rate, for converting seconds to frames.
    frame_offset : int
        Frames to add to every timestamp — the scene-local frame at which
        this audio clip starts playing (e.g. narration_timing_frames[0]).

    Returns
    -------
    list[dict]
        ``[{"text": "Vào!", "startFrame": 2, "endFrame": 11}, ...]``
        Empty list if alignment fails or the text has no words.
    """
    words = text.split()
    if not words:
        return []

    model = _get_model()
    try:
        result = model.align(wav_path, text, language=language)
    except Exception as exc:
        print(f"[karaoke_align] alignment failed for {wav_path!r}: {exc}")
        return []

    if result is None:
        return []

    timings: list[dict] = []
    for segment in result.segments:
        for word in segment.words:
            timings.append(
                {
                    "text": word.word.strip(),
                    "startFrame": frame_offset + round(word.start * fps),
                    "endFrame": frame_offset + round(word.end * fps),
                }
            )
    return timings
