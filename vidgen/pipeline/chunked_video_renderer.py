"""Per-scene chunked rendering with an on-disk cache.

Instead of rendering the whole composition monolithically, each manifest
scene is rendered as its own muted MP4 chunk (safe because TikTokVideo is a
pure Series — every visual, caption, and audio tag lives inside its scene's
Series.Sequence, and the only global element, SafeZoneGuide, renders nothing
in production). Chunks are cached by content hash, so re-running the
pipeline only re-renders scenes whose manifest entry or the Remotion code
changed. The full audio track is built directly from the manifest with
ffmpeg every run (~1s, so it is not cached) and muxed onto the losslessly
concatenated video, which sidesteps the AAC encoder-priming gaps that
concatenating per-chunk audio would introduce.
"""

import hashlib
import json
import os
import shutil
import subprocess
import time

from vidgen.config.project_paths import OUTPUT_DIR, REMOTION_DIR
from vidgen.pipeline.shot_schema import manifest_shots

RENDER_CACHE_DIR = OUTPUT_DIR / "render_cache"
CACHE_MAX_AGE_DAYS = 14

# Scene keys that only affect Remotion Studio's timeline labels (the
# Series.Sequence name), never rendered pixels — excluded from the cache key
# so inserting/reordering scenes doesn't invalidate untouched chunks.
NON_VISUAL_SCENE_KEYS = {"id", "label", "sceneName"}


def code_tree_hash(remotion_dir: str = str(REMOTION_DIR)) -> str:
    """Hash of everything besides a scene's manifest entry that can change
    how a chunk renders: component source, dependency lockfile, and the
    Remotion config. Any change invalidates the whole cache — conservative,
    but a code edit legitimately can affect every scene. public/ is
    excluded: chunks render muted, and audio is re-rendered every run."""
    h = hashlib.sha256()
    src_root = os.path.join(remotion_dir, "src")
    for root, dirs, files in os.walk(src_root):
        dirs.sort()
        for fn in sorted(files):
            path = os.path.join(root, fn)
            h.update(os.path.relpath(path, remotion_dir).encode())
            with open(path, "rb") as f:
                h.update(f.read())
    for extra in ("package-lock.json", "remotion.config.ts"):
        path = os.path.join(remotion_dir, extra)
        if os.path.exists(path):
            with open(path, "rb") as f:
                h.update(f.read())
    return h.hexdigest()


def scene_cache_key(scene: dict, manifest: dict, code_hash: str) -> str:
    payload = {k: v for k, v in scene.items() if k not in NON_VISUAL_SCENE_KEYS}
    key_src = json.dumps(
        {
            "scene": payload,
            "fps": manifest["fps"],
            "width": manifest["width"],
            "height": manifest["height"],
            "code": code_hash,
        },
        sort_keys=True,
        ensure_ascii=False,
    )
    return hashlib.sha256(key_src.encode()).hexdigest()[:24]


AUDIO_SAMPLE_RATE = 48000


def build_audio_track(manifest: dict, out_path: str, remotion_dir: str = str(REMOTION_DIR)) -> None:
    """Build the full audio track with one ffmpeg filter graph, replicating
    TikTokVideo.tsx exactly: each scene's audioPath starts at
    scene_start + audioOffsetFrames, each extraAudio seg at
    scene_start + seg.offsetFrames, and every clip is truncated at its
    scene's end (the <Audio> unmounts with its Series.Sequence). Frame
    offsets convert to whole samples (fps must divide 48000), so placement
    is sample-exact — Remotion's own audio-only pass quantized clip starts
    to whole milliseconds (±16-sample jitter); this is the accurate one.
    Scene clips use bare <Audio> tags. The optional global soundtrack volume
    is replicated explicitly in the filter graph."""
    fps = manifest["fps"]
    if AUDIO_SAMPLE_RATE % fps:
        raise ValueError(f"fps {fps} does not divide {AUDIO_SAMPLE_RATE}; offsets would not be sample-exact")
    spf = AUDIO_SAMPLE_RATE // fps

    clips = []  # (abs_path, delay_samples, max_samples, gain)
    start_f = 0
    for shot in manifest_shots(manifest):
        dur_f = shot["durationInFrames"]
        entries = []
        if shot.get("audioPath"):
            entries.append((shot["audioPath"], shot.get("audioOffsetFrames") or 0))
        for seg in shot.get("extraAudio") or []:
            unknown = set(seg) - {"path", "previewPath", "offsetFrames"}
            if unknown:
                raise ValueError(f"extraAudio has fields this builder does not replicate: {unknown}")
            entries.append((seg["path"], seg["offsetFrames"]))
        for rel, off_f in entries:
            path = os.path.abspath(os.path.join(remotion_dir, "public", rel))
            max_f = dur_f - off_f
            if max_f <= 0:
                raise ValueError(
                    f"shot '{shot.get('label', shot.get('id'))}': audio clip {rel!r} starts at "
                    f"offset {off_f}f but the scene is only {dur_f}f long — the clip's start "
                    "is past the scene's end. Extend duration_frames or move the clip earlier."
                )
            clips.append((path, (start_f + off_f) * spf, max_f * spf, 1.0))
        start_f += dur_f
    total = start_f * spf

    soundtrack = manifest.get("soundtrack")
    if soundtrack:
        unknown = set(soundtrack) - {"path", "volume"}
        if unknown:
            raise ValueError(f"soundtrack has unsupported fields: {unknown}")
        gain = float(soundtrack.get("volume", 1.0))
        if not 0 <= gain <= 1:
            raise ValueError("soundtrack volume must be between 0 and 1")
        path = os.path.abspath(os.path.join(remotion_dir, "public", soundtrack["path"]))
        clips.insert(0, (path, 0, total, gain))

    # Per clip: truncate at scene end, upmix mono→stereo (ffmpeg's default
    # -3dB pan law — bit-identical to what Remotion's pass produced), delay
    # by whole samples onto the frame grid. The silent
    # anchor is amix's *first* input so duration=first pins the exact
    # composition length; normalize=0 sums overlapping clips like Remotion.
    parts = []
    for i, (_, delay, max_s, gain) in enumerate(clips):
        parts.append(
            f"[{i}:a]atrim=end_sample={max_s},"
            f"aformat=sample_rates={AUDIO_SAMPLE_RATE}:channel_layouts=stereo,"
            f"volume={gain},"
            f"adelay={delay}S:all=1[c{i}]"
        )
    parts.append(f"anullsrc=r={AUDIO_SAMPLE_RATE}:cl=stereo,atrim=end_sample={total}[z]")
    chain = "[z]" + "".join(f"[c{i}]" for i in range(len(clips)))
    parts.append(
        f"{chain}amix=inputs={len(clips) + 1}:normalize=0:duration=first[mix];"
        f"[mix]atrim=end_sample={total}[out]"
    )

    cmd = _ffmpeg() + ["-y", "-v", "error"]
    for path, _, _, _ in clips:
        cmd += ["-i", path]
    cmd += ["-filter_complex", ";".join(parts), "-map", "[out]", "-c:a", "pcm_s16le", out_path]
    subprocess.run(cmd, check=True)


def write_concat_list(chunk_paths: list, list_path: str) -> None:
    """ffmpeg concat-demuxer input file. Single quotes in paths are escaped
    per ffmpeg's quoting rules ('\\'' closes, escapes, reopens)."""
    with open(list_path, "w", encoding="utf-8") as f:
        for path in chunk_paths:
            escaped = path.replace("'", "'\\''")
            f.write(f"file '{escaped}'\n")


def prune_cache(cache_dir: str, max_age_days: int = CACHE_MAX_AGE_DAYS) -> None:
    cutoff = time.time() - max_age_days * 86400
    for fn in os.listdir(cache_dir):
        if (fn.startswith("scene_") and fn.endswith(".mp4")) or (
            fn.startswith("audio_") and fn.endswith(".wav")
        ):
            path = os.path.join(cache_dir, fn)
            if os.path.getmtime(path) < cutoff:
                os.remove(path)


def _ffmpeg() -> list:
    if shutil.which("ffmpeg"):
        return ["ffmpeg"]
    # Remotion bundles an ffmpeg binary, exposed via its CLI.
    return ["npx", "remotion", "ffmpeg"]


def render_video_chunked(
    manifest: dict,
    video_output: str,
    remotion_dir: str = str(REMOTION_DIR),
    cache_dir: str = RENDER_CACHE_DIR,
) -> None:
    os.makedirs(cache_dir, exist_ok=True)
    code_hash = code_tree_hash(remotion_dir)

    chunk_paths = []
    jobs = []
    for shot in manifest_shots(manifest):
        key = scene_cache_key(shot, manifest, code_hash)
        chunk_path = os.path.abspath(os.path.join(cache_dir, f"scene_{key}.mp4"))
        chunk_paths.append(chunk_path)
        name = str(shot.get("label") or shot["id"])
        if os.path.exists(chunk_path):
            os.utime(chunk_path)  # mark as recently used so pruning spares it
            print(f"cache hit: {name}")
        else:
            jobs.append(
                {
                    "name": name,
                    "outPath": chunk_path,
                    "manifest": {
                        "fps": manifest["fps"],
                        "width": manifest["width"],
                        "height": manifest["height"],
                        "shots": [shot],
                    },
                }
            )

    spec = {
        "entryPoint": "src/index.ts",
        "compositionId": "TikTokVideo",
        "chunks": jobs,
    }
    jobs_file = os.path.abspath(os.path.join(cache_dir, "chunk_jobs.json"))
    with open(jobs_file, "w", encoding="utf-8") as f:
        json.dump(spec, f, ensure_ascii=False)

    total_shots = len(manifest_shots(manifest))
    print(f"Rendering {len(jobs)}/{total_shots} shot chunk(s) ({total_shots - len(jobs)} cached)")
    if jobs:
        subprocess.run(
            ["node", "scripts/render-chunks.mjs", jobs_file],
            cwd=remotion_dir,
            check=True,
        )

    audio_path = os.path.abspath(os.path.join(cache_dir, "audio_track.wav"))
    build_audio_track(manifest, audio_path, remotion_dir)

    # Lossless video concat, then mux the single-pass audio track. 320k AAC
    # matches the Remotion CLI's default audio bitrate.
    concat_list = os.path.abspath(os.path.join(cache_dir, "concat_list.txt"))
    write_concat_list(chunk_paths, concat_list)
    video_only = os.path.abspath(os.path.join(cache_dir, "concat_video.mp4"))
    ffmpeg = _ffmpeg()
    subprocess.run(
        ffmpeg + ["-y", "-v", "error", "-f", "concat", "-safe", "0",
                  "-i", concat_list, "-c", "copy", video_only],
        check=True,
    )
    subprocess.run(
        ffmpeg + ["-y", "-v", "error", "-i", video_only, "-i", audio_path,
                  "-c:v", "copy", "-c:a", "aac", "-b:a", "320k",
                  "-movflags", "+faststart", "-shortest", video_output],
        check=True,
    )
    os.remove(video_only)

    prune_cache(cache_dir)
