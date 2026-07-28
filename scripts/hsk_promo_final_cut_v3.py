"""Build the v3 (feature-first, no-joke) HSK flashcards promo video.

Same real footage + TTS narration + no text overlay approach as the v2 cut
(scripts/hsk_promo_final_cut.py), but reordered per the v3 script
(content/text/hsk_flashcards_promo.txt): the "đau khổ" misdirect hook (old
Cảnh 1-3) is removed, the opening scene introduces the flashcard feature
directly, and the traffic/social-proof scene (old Cảnh 5) moves to Cảnh 8,
right before the CTA.
"""
from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path

ROOT = Path("/Users/haunguyen/GitHub/VidGen")
SCREEN = ROOT / "input/footage/hsk_flashcards_promo/01_screen"
AUDIO = ROOT / "public/audio/hsk_flashcards_promo"
WORK = ROOT / "output/.hsk_promo_work_v3"
WORK.mkdir(parents=True, exist_ok=True)

VF_NORM = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p"

VCODEC = ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30"]
ACODEC = ["-c:a", "aac", "-ar", "48000", "-ac", "2"]


def run(cmd: list[str]) -> None:
    print(" ".join(str(c) for c in cmd))
    subprocess.run([str(c) for c in cmd], check=True)


@dataclass
class Segment:
    name: str
    src: Path
    dur: float
    audio_wav: Path | None = None
    src_offset: float = 0.0


def build_simple(seg: Segment) -> Path:
    """One clip + at most one narration wav, wav starts at t=0, rest silent."""
    out = WORK / f"{seg.name}.mp4"
    v_in = (["-ss", f"{seg.src_offset}"] if seg.src_offset else []) + ["-i", str(seg.src)]

    if seg.audio_wav is not None:
        filt = (
            f"[0:v]{VF_NORM}[v];"
            f"[1:a]apad=whole_dur={seg.dur},atrim=0:{seg.dur},"
            f"aformat=sample_rates=48000:channel_layouts=stereo[a]"
        )
        cmd = (
            ["ffmpeg", "-y"] + v_in + ["-i", str(seg.audio_wav)]
            + ["-filter_complex", filt, "-map", "[v]", "-map", "[a]"]
            + ["-t", f"{seg.dur}"] + VCODEC + ACODEC + [str(out)]
        )
    else:
        filt = f"[0:v]{VF_NORM}[v];anullsrc=r=48000:cl=stereo:d={seg.dur}[a]"
        cmd = (
            ["ffmpeg", "-y"] + v_in
            + ["-filter_complex", filt, "-map", "[v]", "-map", "[a]"]
            + ["-t", f"{seg.dur}"] + VCODEC + ACODEC + [str(out)]
        )
    run(cmd)
    return out


def build_split(
    name: str,
    src_a: Path, dur_a: float,
    src_b: Path, dur_b: float,
    wav: Path, audio_dur: float,
    offset_a: float = 0.0,
    offset_b: float = 0.0,
) -> tuple[Path, Path]:
    """Split one narration wav proportionally across two consecutive clips."""
    split = audio_dur * dur_a / (dur_a + dur_b)

    out_a = WORK / f"{name}a.mp4"
    filt_a = (
        f"[0:v]{VF_NORM}[v];"
        f"[1:a]atrim=0:{split},asetpts=PTS-STARTPTS,"
        f"apad=whole_dur={dur_a},atrim=0:{dur_a},"
        f"aformat=sample_rates=48000:channel_layouts=stereo[a]"
    )
    v_in_a = (["-ss", f"{offset_a}"] if offset_a else []) + ["-i", str(src_a)]
    run(
        ["ffmpeg", "-y"] + v_in_a + ["-i", str(wav)]
        + ["-filter_complex", filt_a, "-map", "[v]", "-map", "[a]"]
        + ["-t", f"{dur_a}"] + VCODEC + ACODEC + [str(out_a)]
    )

    out_b = WORK / f"{name}b.mp4"
    filt_b = (
        f"[0:v]{VF_NORM}[v];"
        f"[1:a]atrim={split}:{audio_dur},asetpts=PTS-STARTPTS,"
        f"apad=whole_dur={dur_b},atrim=0:{dur_b},"
        f"aformat=sample_rates=48000:channel_layouts=stereo[a]"
    )
    v_in_b = (["-ss", f"{offset_b}"] if offset_b else []) + ["-i", str(src_b)]
    run(
        ["ffmpeg", "-y"] + v_in_b + ["-i", str(wav)]
        + ["-filter_complex", filt_b, "-map", "[v]", "-map", "[a]"]
        + ["-t", f"{dur_b}"] + VCODEC + ACODEC + [str(out_b)]
    )
    return out_a, out_b


def main() -> None:
    segments: list[Path] = []

    s01a, s01b = build_split(
        "s01",
        SCREEN / "first_sentence.MP4", 3.5,
        SCREEN / "first_sentence.MP4", 2.5,
        AUDIO / "scene01.wav", 3.981292,
        offset_a=7.3,
        offset_b=10.8,
    )
    segments += [s01a, s01b]

    segments.append(build_simple(Segment(
        "s02", SCREEN / "2nd_sentence.MP4", dur=9.0,
        audio_wav=AUDIO / "scene02.wav",
        src_offset=1.6,
    )))

    segments.append(build_simple(Segment(
        "s03", SCREEN / "scene06_hsk_montage.mov", dur=13.0,
        audio_wav=AUDIO / "scene03.wav",
    )))

    segments.append(build_simple(Segment(
        "s04", SCREEN / "scene07_vocab_overview.mov", dur=6.0,
        audio_wav=AUDIO / "scene04.wav",
    )))

    segments.append(build_simple(Segment(
        "s05", SCREEN / "scene08_review_flow.mov", dur=8.0,
        audio_wav=AUDIO / "scene05.wav",
    )))

    segments.append(build_simple(Segment(
        "s06", SCREEN / "scene09_daily_goal.mov", dur=7.0,
        audio_wav=AUDIO / "scene06.wav",
    )))

    segments.append(build_simple(Segment(
        "s07", SCREEN / "scene10_dark_toggle_start.mov", dur=4.0,
        audio_wav=AUDIO / "scene07.wav",
    )))

    s08a, s08b = build_split(
        "s08",
        SCREEN / "scene05_using_tool.mov", 4.5,
        SCREEN / "scene05_dashboard.mov", 5.5,
        AUDIO / "scene08.wav", 4.528125,
    )
    segments += [s08a, s08b]

    segments.append(build_simple(Segment(
        "s09", SCREEN / "scene_11.MP4", dur=7.0,
        audio_wav=AUDIO / "scene09.wav",
    )))

    concat_list = WORK / "concat_list.txt"
    concat_list.write_text("".join(f"file '{p.name}'\n" for p in segments))

    final_out = ROOT / "output/hsk_flashcards_promo_final.mp4"
    run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_list)]
        + VCODEC + ACODEC + [str(final_out)]
    )
    print(f"=== Final video: {final_out} ===")


if __name__ == "__main__":
    main()
