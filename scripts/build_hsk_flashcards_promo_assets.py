"""Prepare the approved real-footage cut and restrained sound bed for HSK promo."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
FOOTAGE = ROOT / "input" / "footage" / "hsk_flashcards_promo"
SCREEN = FOOTAGE / "01_screen"
VOICEOVER = FOOTAGE / "02_voiceover"
BROLL = FOOTAGE / "03_broll"
MEDIA_OUT = ROOT / "content" / "media" / "hsk_flashcards_promo"
BED_OUT = ROOT / "remotion" / "public" / "audio" / "hsk_flashcards_promo_bed.wav"
TOTAL_SECONDS = 90.0

VIDEO_FILTER = (
    "scale=1080:1920:force_original_aspect_ratio=increase,"
    "crop=1080:1920,fps=30,format=yuv420p"
)


def run(command: list[str]) -> None:
    print(" ".join(command))
    subprocess.run(command, check=True)


def render_simple(source: Path, output: Path, duration: float, start: float = 0.0) -> None:
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-ss",
            str(start),
            "-i",
            str(source),
            "-t",
            str(duration),
            "-vf",
            VIDEO_FILTER,
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-r",
            "30",
            "-movflags",
            "+faststart",
            str(output),
        ]
    )


def render_hook_with_broll(output: Path) -> None:
    hands = VOICEOVER / "scene03_punchline_broll.mov"
    flashcards = SCREEN / "scene01_flashcard_hook.mov"
    graph = (
        f"[0:v]{VIDEO_FILTER},trim=start=0:duration=4.8,"
        "setpts=PTS-STARTPTS[v0];"
        f"[1:v]{VIDEO_FILTER},trim=start=0.8:duration=4.2,"
        "setpts=PTS-STARTPTS[v1];"
        "[v0][v1]concat=n=2:v=1:a=0[v]"
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(flashcards),
            "-i",
            str(hands),
            "-filter_complex",
            graph,
            "-map",
            "[v]",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-r",
            "30",
            "-t",
            "9",
            "-movflags",
            "+faststart",
            str(output),
        ]
    )


def render_why_with_broll(output: Path) -> None:
    pain_points = SCREEN / "scene04_pain_points.mov"
    hands = BROLL / "broll_hands_laptop_01.mov"
    next_word = SCREEN / "scene02_next_word_decisive.mov"
    graph = (
        f"[0:v]{VIDEO_FILTER},trim=start=0:duration=3.5,"
        "setpts=PTS-STARTPTS[v0];"
        f"[1:v]{VIDEO_FILTER},trim=start=3.0:duration=3.0,"
        "setpts=PTS-STARTPTS[v1];"
        f"[2:v]{VIDEO_FILTER},trim=start=0.5:duration=3.5,"
        "setpts=PTS-STARTPTS[v2];"
        "[v0][v1][v2]concat=n=3:v=1:a=0[v]"
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(pain_points),
            "-i",
            str(hands),
            "-i",
            str(next_word),
            "-filter_complex",
            graph,
            "-map",
            "[v]",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-r",
            "30",
            "-t",
            "10",
            "-movflags",
            "+faststart",
            str(output),
        ]
    )


def render_card_with_broll(output: Path) -> None:
    cards = SCREEN / "scene06_hsk_montage.mov"
    click = BROLL / "broll_hand_click_01.mov"
    graph = (
        f"[0:v]{VIDEO_FILTER},trim=start=0:duration=3.0,"
        "setpts=PTS-STARTPTS[v0];"
        f"[1:v]{VIDEO_FILTER},trim=start=2.2:duration=4.0,"
        "setpts=PTS-STARTPTS[v1];"
        f"[0:v]{VIDEO_FILTER},trim=start=8.0:duration=3.0,"
        "setpts=PTS-STARTPTS[v2];"
        "[v0][v1][v2]concat=n=3:v=1:a=0[v]"
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(cards),
            "-i",
            str(click),
            "-filter_complex",
            graph,
            "-map",
            "[v]",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-r",
            "30",
            "-t",
            "10",
            "-movflags",
            "+faststart",
            str(output),
        ]
    )


def render_levels(output: Path) -> None:
    phone = SCREEN / "iphone_screen_recording.MP4"
    cards = SCREEN / "scene06_hsk_montage.mov"
    graph = (
        f"[0:v]{VIDEO_FILTER},trim=start=95.0:duration=3.5,"
        "setpts=PTS-STARTPTS[v0];"
        f"[1:v]{VIDEO_FILTER},trim=start=0:duration=4.5,"
        "setpts=PTS-STARTPTS[v1];"
        f"[1:v]{VIDEO_FILTER},trim=start=8.0:duration=4.0,"
        "setpts=PTS-STARTPTS[v2];"
        "[v0][v1][v2]concat=n=3:v=1:a=0[v]"
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(phone),
            "-i",
            str(cards),
            "-filter_complex",
            graph,
            "-map",
            "[v]",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-r",
            "30",
            "-t",
            "12",
            "-movflags",
            "+faststart",
            str(output),
        ]
    )


def render_review_with_broll(output: Path) -> None:
    review = SCREEN / "scene08_review_flow.mov"
    click = BROLL / "broll_hand_click_01.mov"
    graph = (
        f"[0:v]{VIDEO_FILTER},trim=start=0:duration=6.5,"
        "setpts=PTS-STARTPTS[v0];"
        f"[1:v]{VIDEO_FILTER},trim=start=7.0:duration=3.5,"
        "setpts=PTS-STARTPTS[v1];"
        "[v0][v1]concat=n=2:v=1:a=0[v]"
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(review),
            "-i",
            str(click),
            "-filter_complex",
            graph,
            "-map",
            "[v]",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-r",
            "30",
            "-t",
            "10",
            "-movflags",
            "+faststart",
            str(output),
        ]
    )


def render_goal_overview(output: Path) -> None:
    overview = SCREEN / "scene07_vocab_overview.mov"
    goal = SCREEN / "scene09_daily_goal.mov"
    graph = (
        f"[0:v]{VIDEO_FILTER},trim=start=21.0:duration=3.5,"
        "setpts=PTS-STARTPTS[v0];"
        f"[1:v]{VIDEO_FILTER},trim=start=0:duration=7.5,"
        "setpts=PTS-STARTPTS[v1];"
        "[v0][v1]concat=n=2:v=1:a=0[v]"
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(overview),
            "-i",
            str(goal),
            "-filter_complex",
            graph,
            "-map",
            "[v]",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-r",
            "30",
            "-t",
            "11",
            "-movflags",
            "+faststart",
            str(output),
        ]
    )


def render_proof_cta(output: Path) -> None:
    hands = BROLL / "broll_hands_laptop_01.mov"
    analytics = SCREEN / "dashboard_analytic.mov"
    phone = SCREEN / "iphone_screen_recording.MP4"
    graph = (
        f"[0:v]{VIDEO_FILTER},trim=start=9.0:duration=3.0,"
        "setpts=PTS-STARTPTS[v0];"
        f"[1:v]{VIDEO_FILTER},trim=start=0:duration=4.5,"
        "setpts=PTS-STARTPTS[v1];"
        f"[2:v]{VIDEO_FILTER},trim=start=96.5:duration=4.5,"
        "setpts=PTS-STARTPTS[v2];"
        "[v0][v1][v2]concat=n=3:v=1:a=0[v]"
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(hands),
            "-i",
            str(analytics),
            "-i",
            str(phone),
            "-filter_complex",
            graph,
            "-map",
            "[v]",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-r",
            "30",
            "-t",
            "12",
            "-movflags",
            "+faststart",
            str(output),
        ]
    )


def render_persistence(output: Path) -> None:
    progress = SCREEN / "scene07_vocab_overview.mov"
    reopen = SCREEN / "scene_11.MP4"
    graph = (
        f"[0:v]{VIDEO_FILTER},trim=start=0:duration=3.0,"
        "setpts=PTS-STARTPTS[v0];"
        f"[1:v]{VIDEO_FILTER},trim=start=0:duration=2.0,"
        "setpts=PTS-STARTPTS[v1];"
        f"[0:v]{VIDEO_FILTER},trim=start=20.5:duration=4.0,"
        "setpts=PTS-STARTPTS[v2];"
        "[v0][v1][v2]concat=n=3:v=1:a=0[v]"
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(progress),
            "-i",
            str(reopen),
            "-filter_complex",
            graph,
            "-map",
            "[v]",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-r",
            "30",
            "-t",
            "9",
            "-movflags",
            "+faststart",
            str(output),
        ]
    )


def render_dark_mode(output: Path) -> None:
    toggle = SCREEN / "scene10_dark_toggle_start.mov"
    desk = VOICEOVER / "scene10_dark_room.mov"
    graph = (
        f"[0:v]{VIDEO_FILTER},trim=duration=3.0,reverse,"
        "setpts=PTS-STARTPTS[v0];"
        f"[1:v]{VIDEO_FILTER},trim=start=0.5:duration=4.0,"
        "setpts=PTS-STARTPTS[v1];"
        "[v0][v1]concat=n=2:v=1:a=0[v]"
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(toggle),
            "-i",
            str(desk),
            "-filter_complex",
            graph,
            "-map",
            "[v]",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-r",
            "30",
            "-t",
            "7",
            "-movflags",
            "+faststart",
            str(output),
        ]
    )


def render_sound_bed() -> None:
    source_bed = ROOT / "remotion" / "public" / "audio" / "maps_p3_cinematic_bed.wav"
    hook = SCREEN / "scene01_flashcard_hook.mov"
    effect_specs = [
        ("900", "0.08"),
        ("1050", "0.08"),
        ("220", "0.14"),
        ("1046", "0.22"),
        ("520", "0.10"),
    ]

    command = [
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        str(source_bed),
        "-ss",
        "2.396667",
        "-t",
        "0.40",
        "-i",
        str(hook),
    ]
    for frequency, duration in effect_specs:
        command.extend(
            [
                "-f",
                "lavfi",
                "-i",
                f"sine=frequency={frequency}:duration={duration}:sample_rate=48000",
            ]
        )

    graph = (
        "[0:a]asplit=2[bedmain_src][bedloop_src];"
        "[bedmain_src]atrim=0:87,asetpts=PTS-STARTPTS[bedmain];"
        "[bedloop_src]atrim=0:4,asetpts=PTS-STARTPTS[bedloop];"
        "[bedmain][bedloop]acrossfade=d=1:c1=tri:c2=tri,"
        "volume='if(between(t,2.0,2.9),0.02,"
        "if(between(t,54,55),0.04,"
        "if(between(t,71,71.8),0.04,"
        "if(between(t,82,83),0.04,0.085))))':eval=frame,"
        "aformat=sample_rates=48000:channel_layouts=stereo[bed];"
        "[1:a]atrim=0:0.40,asetpts=PTS-STARTPTS,volume=1.25,"
        "aformat=sample_rates=48000:channel_layouts=stereo[pron];"
        "[2:a]afade=t=out:st=0.04:d=0.04,volume=0.12,"
        "aformat=sample_rates=48000:channel_layouts=stereo,"
        "adelay=2150|2150[click];"
        "[3:a]afade=t=out:st=0.04:d=0.04,volume=0.11,"
        "aformat=sample_rates=48000:channel_layouts=stereo,"
        "adelay=43500|43500[remember];"
        "[4:a]afade=t=out:st=0.07:d=0.07,volume=0.09,"
        "aformat=sample_rates=48000:channel_layouts=stereo,"
        "adelay=45700|45700[forget];"
        "[5:a]afade=t=out:st=0.12:d=0.10,volume=0.10,"
        "aformat=sample_rates=48000:channel_layouts=stereo,"
        "adelay=66500|66500[chime];"
        "[6:a]afade=t=out:st=0.05:d=0.05,volume=0.10,"
        "aformat=sample_rates=48000:channel_layouts=stereo,"
        "adelay=71500|71500[switch];"
        "[pron]adelay=2397|2397[pron_delayed];"
        "[bed][pron_delayed][click][remember][forget][chime][switch]"
        "amix=inputs=7:normalize=0:duration=first,"
        f"alimiter=limit=0.95,atrim=0:{TOTAL_SECONDS}[out]"
    )
    command.extend(
        [
            "-filter_complex",
            graph,
            "-map",
            "[out]",
            "-ar",
            "48000",
            "-ac",
            "2",
            "-c:a",
            "pcm_s16le",
            str(BED_OUT),
        ]
    )
    run(command)


def main() -> None:
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg is required to prepare HSK promo assets")

    MEDIA_OUT.mkdir(parents=True, exist_ok=True)
    BED_OUT.parent.mkdir(parents=True, exist_ok=True)

    render_hook_with_broll(MEDIA_OUT / "scene_01_hook_v3.mp4")
    render_why_with_broll(MEDIA_OUT / "scene_02_why_v3.mp4")
    render_card_with_broll(MEDIA_OUT / "scene_03_card_v3.mp4")
    render_levels(MEDIA_OUT / "scene_04_levels_v2.mp4")
    render_review_with_broll(MEDIA_OUT / "scene_05_review_v2.mp4")
    render_persistence(MEDIA_OUT / "scene_06_persistence_v3.mp4")
    render_goal_overview(MEDIA_OUT / "scene_07_goal_v2.mp4")
    render_dark_mode(MEDIA_OUT / "scene_08_dark_v4.mp4")
    render_proof_cta(MEDIA_OUT / "scene_09_proof_cta_v2.mp4")
    render_sound_bed()


if __name__ == "__main__":
    main()
