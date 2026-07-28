"""Build the final HSK flashcards promo video: real footage + TTS narration,
no text overlay.

Fixes applied vs. the previous (broken) cut:
  1. Audio corruption: the old build concatenated per-scene segments with
     `ffmpeg -f concat -c copy`, mixing mono (TTS-driven) and stereo
     (anullsrc) AAC segments in one stream-copied container. AAC streams
     with different channel layouts cannot be safely concatenated via
     stream copy. Every segment here is normalized to stereo/48kHz/AAC
     and the final concat is a full re-encode, not a stream copy.
  2. Runtime too short: the old build trimmed each scene's visual to the
     bare TTS duration (~40s total). This build holds each scene for its
     originally scripted visual duration (content/text/hsk_flashcards_promo.txt,
     "CẬP NHẬT v2" timeline) with narration placed at the start of the
     scene and silence padding the rest, capped by how much real footage
     is actually available per scene.
"""
from __future__ import annotations

import subprocess
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path("/Users/haunguyen/GitHub/VidGen")
SCREEN = ROOT / "input/footage/hsk_flashcards_promo/01_screen"
VO = ROOT / "input/footage/hsk_flashcards_promo/02_voiceover"
AUDIO = ROOT / "public/audio/hsk_flashcards_promo"
WORK = ROOT / "output/.hsk_promo_work"
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
    src_offset: float = 0.0
    audio_wav: Path | None = None
    audio_offset: float = 0.0  # where the wav starts within this segment


def build_simple(seg: Segment) -> Path:
    """One clip + at most one narration wav, wav starts at audio_offset, rest silent."""
    out = WORK / f"{seg.name}.mp4"
    v_in = ["-ss", f"{seg.src_offset}", "-i", str(seg.src)]

    if seg.audio_wav is not None:
        delay_ms = int(seg.audio_offset * 1000)
        filt = (
            f"[0:v]{VF_NORM}[v];"
            f"[1:a]adelay=delays={delay_ms}:all=1,"
            f"apad=whole_dur={seg.dur},atrim=0:{seg.dur},"
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


def build_scene03(dur: float) -> Path:
    """Continuous punchline broll: part1 wav at t=0, ~0.32s gap, part2 wav, then silence."""
    out = WORK / "s03.mp4"
    part1 = AUDIO / "scene03_part1.wav"
    part2 = AUDIO / "scene03_part2.wav"
    p1_dur = 0.757333
    gap = 0.32
    p2_start_ms = int((p1_dur + gap) * 1000)

    filt = (
        f"[0:v]{VF_NORM}[v];"
        f"[1:a]adelay=delays=0:all=1[a1];"
        f"[2:a]adelay=delays={p2_start_ms}:all=1[a2];"
        f"[a1][a2]amix=inputs=2:duration=longest:normalize=0,"
        f"apad=whole_dur={dur},atrim=0:{dur},"
        f"aformat=sample_rates=48000:channel_layouts=stereo[a]"
    )
    cmd = (
        ["ffmpeg", "-y", "-i", str(VO / "scene03_punchline_broll.mov"),
         "-i", str(part1), "-i", str(part2)]
        + ["-filter_complex", filt, "-map", "[v]", "-map", "[a]"]
        + ["-t", f"{dur}"] + VCODEC + ACODEC + [str(out)]
    )
    run(cmd)
    return out


def build_scene05(dur_a: float, dur_b: float, audio_dur: float) -> tuple[Path, Path]:
    """Split scene05.wav proportionally across using_tool (a) and dashboard (b)."""
    wav = AUDIO / "scene05.wav"
    split = audio_dur * dur_a / (dur_a + dur_b)

    out_a = WORK / "s05a.mp4"
    filt_a = (
        f"[0:v]{VF_NORM}[v];"
        f"[1:a]atrim=0:{split},asetpts=PTS-STARTPTS,"
        f"apad=whole_dur={dur_a},atrim=0:{dur_a},"
        f"aformat=sample_rates=48000:channel_layouts=stereo[a]"
    )
    run(
        ["ffmpeg", "-y", "-i", str(SCREEN / "scene05_using_tool.mov"), "-i", str(wav)]
        + ["-filter_complex", filt_a, "-map", "[v]", "-map", "[a]"]
        + ["-t", f"{dur_a}"] + VCODEC + ACODEC + [str(out_a)]
    )

    out_b = WORK / "s05b.mp4"
    filt_b = (
        f"[0:v]{VF_NORM}[v];"
        f"[1:a]atrim={split}:{audio_dur},asetpts=PTS-STARTPTS,"
        f"apad=whole_dur={dur_b},atrim=0:{dur_b},"
        f"aformat=sample_rates=48000:channel_layouts=stereo[a]"
    )
    run(
        ["ffmpeg", "-y", "-i", str(SCREEN / "scene05_dashboard.mov"), "-i", str(wav)]
        + ["-filter_complex", filt_b, "-map", "[v]", "-map", "[a]"]
        + ["-t", f"{dur_b}"] + VCODEC + ACODEC + [str(out_b)]
    )
    return out_a, out_b


def main() -> None:
    segments: list[Path] = []

    segments.append(build_simple(Segment(
        "s01", SCREEN / "scene01_flashcard_hook.mov", dur=2.5,
        audio_wav=AUDIO / "scene01.wav",
    )))

    segments.append(build_simple(Segment(
        "s02", SCREEN / "scene02_next_word_decisive.mov", dur=2.5,
    )))

    segments.append(build_scene03(dur=6.0))

    segments.append(build_simple(Segment(
        "s04", SCREEN / "scene04_pain_points.mov", dur=9.0,
        audio_wav=AUDIO / "scene04.wav",
    )))

    s05a, s05b = build_scene05(dur_a=4.5, dur_b=5.5, audio_dur=4.491021)
    segments.append(s05a)
    segments.append(s05b)

    segments.append(build_simple(Segment(
        "s06", SCREEN / "scene06_hsk_montage.mov", dur=13.0,
        audio_wav=AUDIO / "scene06.wav",
    )))

    segments.append(build_simple(Segment(
        "s07", SCREEN / "scene07_vocab_overview.mov", dur=6.0,
        audio_wav=AUDIO / "scene07.wav",
    )))

    segments.append(build_simple(Segment(
        "s08", SCREEN / "scene08_review_flow.mov", dur=8.0,
        audio_wav=AUDIO / "scene08.wav",
    )))

    segments.append(build_simple(Segment(
        "s09", SCREEN / "scene09_daily_goal.mov", dur=7.0,
        audio_wav=AUDIO / "scene09.wav",
    )))

    segments.append(build_simple(Segment(
        "s10", SCREEN / "scene10_dark_toggle_start.mov", dur=4.0,
        audio_wav=AUDIO / "scene10.wav",
    )))

    segments.append(build_simple(Segment(
        "s11", SCREEN / "scene_11.MP4", dur=7.0,
        audio_wav=AUDIO / "scene11.wav",
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
