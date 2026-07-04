"""Per-scene chunked rendering with an on-disk cache.

Instead of rendering the whole composition monolithically, each manifest
scene is rendered as its own muted MP4 chunk (safe because TikTokVideo is a
pure Series — every visual, caption, and audio tag lives inside its scene's
Series.Sequence, and the only global element, SafeZoneGuide, renders nothing
in production). Chunks are cached by content hash, so re-running the
pipeline only re-renders scenes whose manifest entry or the Remotion code
changed. The full audio track is rendered by Remotion in one audio-only
pass every run (fast — no frames are captured) and muxed onto the
losslessly concatenated video, which sidesteps the AAC encoder-priming gaps
that concatenating per-chunk audio would introduce.
"""

import hashlib
import json
import os
import shutil
import subprocess
import time

RENDER_CACHE_DIR = "output/render_cache"
CACHE_MAX_AGE_DAYS = 14

# Scene keys that only affect Remotion Studio's timeline labels (the
# Series.Sequence name), never rendered pixels — excluded from the cache key
# so inserting/reordering scenes doesn't invalidate untouched chunks.
NON_VISUAL_SCENE_KEYS = {"id", "label", "sceneName"}


def code_tree_hash(remotion_dir: str = "remotion") -> str:
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


def audio_cache_key(manifest: dict, remotion_dir: str = "remotion") -> str:
    """Hash of everything the audio-only render depends on: each scene's
    duration (which sets where the next scene's audio starts), its audio
    clip paths/offsets, and the audio files' actual bytes. Visual-only
    edits leave this unchanged, so the ~40s audio pass is skipped too."""
    h = hashlib.sha256()
    timeline = [
        [
            scene.get("durationInFrames"),
            scene.get("audioPath"),
            scene.get("audioOffsetFrames"),
            scene.get("extraAudio"),
        ]
        for scene in manifest["scenes"]
    ]
    h.update(json.dumps({"fps": manifest["fps"], "timeline": timeline}, sort_keys=True).encode())
    for scene in manifest["scenes"]:
        clips = [scene.get("audioPath")] + [seg["path"] for seg in scene.get("extraAudio") or []]
        for clip in clips:
            if not clip:
                continue
            path = os.path.join(remotion_dir, "public", clip)
            if os.path.exists(path):
                with open(path, "rb") as f:
                    h.update(f.read())
    return h.hexdigest()[:24]


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
    remotion_dir: str = "remotion",
    cache_dir: str = RENDER_CACHE_DIR,
) -> None:
    os.makedirs(cache_dir, exist_ok=True)
    code_hash = code_tree_hash(remotion_dir)

    chunk_paths = []
    jobs = []
    for scene in manifest["scenes"]:
        key = scene_cache_key(scene, manifest, code_hash)
        chunk_path = os.path.abspath(os.path.join(cache_dir, f"scene_{key}.mp4"))
        chunk_paths.append(chunk_path)
        name = str(scene.get("label") or scene["id"])
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
                        "scenes": [scene],
                    },
                }
            )

    audio_path = os.path.abspath(
        os.path.join(cache_dir, f"audio_{audio_cache_key(manifest, remotion_dir)}.wav")
    )
    if os.path.exists(audio_path):
        os.utime(audio_path)
        print("cache hit: audio track")
        audio_job = None
    else:
        audio_job = {"outPath": audio_path, "manifest": manifest}
    spec = {
        "entryPoint": "src/index.ts",
        "compositionId": "TikTokVideo",
        "chunks": jobs,
        "audio": audio_job,
    }
    jobs_file = os.path.abspath(os.path.join(cache_dir, "chunk_jobs.json"))
    with open(jobs_file, "w", encoding="utf-8") as f:
        json.dump(spec, f, ensure_ascii=False)

    print(f"Rendering {len(jobs)}/{len(manifest['scenes'])} scene chunk(s) ({len(manifest['scenes']) - len(jobs)} cached)")
    if jobs or audio_job:
        subprocess.run(
            ["node", "scripts/render-chunks.mjs", jobs_file],
            cwd=remotion_dir,
            check=True,
        )

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
