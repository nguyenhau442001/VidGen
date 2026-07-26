# Multi-Scene Media Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new VidGen scene types — `real_footage` (embedded phone/screen-recording video clips) and `screenshot` (a generic screenshot scene) — so authored scripts can mix graphic scenes, screenshots, and real video footage in the same video.

**Architecture:** Both types plug into VidGen's existing three-way scene registration (`render_manifest_builder.py` TYPE_MAP/DIRECT_SNAKE_CASE_SCENE_TYPES ↔ `types.ts` ManifestScene union ↔ `TikTokVideo.tsx` switch), same as every existing scene. A new `content/media/<slug>/` source directory holds raw screenshots/clips; a new `copy_media_to_remotion_public()` function (parallel to the existing `copy_audio_to_remotion_public()`) copies them into `remotion/public/` at manifest-build time. Two new pipeline steps — `measure_media_durations` (ffprobe on real-footage clips with `useOriginalAudio`) and `check_footage_fit` (blocking pre-TTS pacing check) — slot into `video_pipeline.main()` alongside the existing step functions in `pipeline_steps.py`.

**Tech Stack:** Python 3.13 (vidgen package), pytest, TypeScript/React (Remotion 4.x), ffprobe (subprocess, already used elsewhere in the codebase).

## Global Constraints

- Narration must be preserved verbatim; this feature adds a new shot type, it does not touch narration text for any existing shot (per project CLAUDE.md's "Remotion Production Reliability" rules).
- Any new scene type MUST be registered in all three places (`render_manifest_builder.py`, `types.ts`, `TikTokVideo.tsx`) and pass `python -m vidgen.pipeline.check_scene_types` (no drift) before being considered done.
- `real_footage` shots require either `narration` (normal TTS path, clip audio muted) or `props.useOriginalAudio: true` with no narration (clip's own audio, duration from ffprobe) — never neither, never a state where the shot has no audio source at all.
- When `narration` is present on a `real_footage` shot, estimated narration time (word count / 4.2 WPS) must not exceed the clip's real ffprobe duration — validated before TTS synthesis runs, hard failure (not a warning) with shot id + both durations named in the message.
- No freeze-frame, clip looping, or audio padding logic anywhere in this feature — a clip too short for its narration is an authoring error surfaced to the user, not silently patched at render time.
- Missing source media file in `content/media/<slug>/` is a hard failure at the ingestion copy step, matching the existing fail-fast posture for missing WAV files — never a silently blank/broken shot.
- `screenshot` is a new, additional generic scene; `GrabFoodScreenshotScene`/`HSKScreenshotScene` and their two live JSON usages (`grabfood_wait_time_p1.json`, `hsk_flashcard.json`) are left untouched — no migration.
- Video/image cropping to the 1080×1920 frame uses `objectFit: cover` with an optional `objectPosition` prop; no letterboxing path.
- Base Python interpreter for all commands: `/Users/haunguyen/miniconda3/bin/python` (not the `video_generator_tool` env).

---

## File Structure

**Python (`vidgen/pipeline/`):**
- `render_manifest_builder.py` — modify: add `TYPE_MAP`/`DIRECT_SNAKE_CASE_SCENE_TYPES` entries, add `copy_media_to_remotion_public()`, add `_measure_ffprobe_duration()` helper, add validation for the `real_footage` audio-source invariant inside `build_render_manifest()`.
- `pipeline_steps.py` — modify: add `measure_media_durations()` and `check_footage_fit()` step functions, add a `MediaDurationResult`/`FootageFitResult` dataclass pair.
- `video_pipeline.py` — modify: wire the two new steps into `main()`, add `--media-dir` awareness via `project_paths.py`.
- `script_validator.py` — modify: add the audio-source-invariant check (no narration + no `useOriginalAudio`) so it's caught at `load_and_validate_script` time, not just at manifest-build time.

**Python (`vidgen/config/`):**
- `project_paths.py` — modify: add `CONTENT_MEDIA_DIR` constant and `REMOTION_PUBLIC_VIDEO`/`REMOTION_PUBLIC_IMAGES` path constants.

**Tests (`tests/`):**
- `test_render_manifest_builder.py` — modify: add tests for the two new TYPE_MAP/DIRECT_SNAKE_CASE_SCENE_TYPES entries, `copy_media_to_remotion_public`, the audio-source invariant.
- `test_pipeline_steps.py` — modify: add tests for `measure_media_durations`, `check_footage_fit`.

**Remotion (`remotion/src/`):**
- `types.ts` — modify: add `RealFootageVisual`/`RealFootageSceneProps`, `ScreenshotVisual`/`ScreenshotSceneProps`, and two new `ManifestScene` union members.
- `scenes/RealFootageScene.tsx` — create: renders an embedded video clip via `OffthreadVideo`.
- `scenes/ScreenshotScene.tsx` — create: generic screenshot scene with `chrome`/`spotlight` props.
- `TikTokVideo.tsx` — modify: import both new components, add two `case` branches in `SceneRenderer`.

Each Python file keeps its existing single responsibility (manifest building, step orchestration, path constants); no file is large enough here to warrant a split.

---

### Task 1: Path constants for media ingestion

**Files:**
- Modify: `vidgen/config/project_paths.py`
- Test: `tests/test_project_paths.py` (create — no existing test file for this module; it's currently untested constants, but this task adds testable path-shape assertions)

**Interfaces:**
- Produces: `CONTENT_MEDIA_DIR: Path`, `REMOTION_PUBLIC_VIDEO: Path`, `REMOTION_PUBLIC_IMAGES: Path` — consumed by Task 2 (`copy_media_to_remotion_public`) and Task 5 (`video_pipeline.main()`).

- [ ] **Step 1: Write the failing test**

```python
# tests/test_project_paths.py
from vidgen.config.project_paths import (
    CONTENT_DIR,
    CONTENT_MEDIA_DIR,
    REMOTION_DIR,
    REMOTION_PUBLIC_IMAGES,
    REMOTION_PUBLIC_VIDEO,
)


def test_content_media_dir_under_content():
    assert CONTENT_MEDIA_DIR == CONTENT_DIR / "media"


def test_remotion_public_media_dirs():
    assert REMOTION_PUBLIC_VIDEO == REMOTION_DIR / "public" / "video"
    assert REMOTION_PUBLIC_IMAGES == REMOTION_DIR / "public" / "images"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_project_paths.py -v`
Expected: FAIL with `ImportError: cannot import name 'CONTENT_MEDIA_DIR'`

- [ ] **Step 3: Add the constants**

```python
# vidgen/config/project_paths.py — add after existing constants
CONTENT_MEDIA_DIR = CONTENT_DIR / "media"
REMOTION_PUBLIC_VIDEO = REMOTION_DIR / "public" / "video"
REMOTION_PUBLIC_IMAGES = REMOTION_DIR / "public" / "images"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_project_paths.py -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add vidgen/config/project_paths.py tests/test_project_paths.py
git commit -m "feat: add content/media and remotion public path constants"
```

---

### Task 2: Media ingestion — `copy_media_to_remotion_public`

**Files:**
- Modify: `vidgen/pipeline/render_manifest_builder.py`
- Test: `tests/test_render_manifest_builder.py`

**Interfaces:**
- Consumes: `CONTENT_MEDIA_DIR` (Task 1, imported directly at call site — the function itself takes plain paths so it stays testable without touching real project dirs).
- Produces: `copy_media_to_remotion_public(script: dict, media_dir: str, public_video_dir: str, public_images_dir: str) -> list[str]` — returns the list of copied filenames (relative paths, e.g. `"video/screen_recording_01.mp4"`). Consumed by Task 6 (`write_manifest_step`).

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_render_manifest_builder.py — add
import os

from vidgen.pipeline.render_manifest_builder import copy_media_to_remotion_public


def test_copy_media_to_remotion_public_copies_video_and_image(tmp_path):
    media_dir = tmp_path / "media"
    media_dir.mkdir()
    (media_dir / "clip.mp4").write_bytes(b"fake video bytes")
    (media_dir / "shot.png").write_bytes(b"fake png bytes")

    public_video_dir = tmp_path / "public_video"
    public_images_dir = tmp_path / "public_images"

    script = {
        "shots": [
            {"id": "s1", "type": "real_footage", "props": {"mediaPath": "video/clip.mp4"}},
            {"id": "s2", "type": "screenshot", "props": {"imagePath": "images/shot.png"}},
        ]
    }

    copied = copy_media_to_remotion_public(
        script, str(media_dir), str(public_video_dir), str(public_images_dir)
    )

    assert os.path.exists(public_video_dir / "clip.mp4")
    assert os.path.exists(public_images_dir / "shot.png")
    assert sorted(copied) == ["images/shot.png", "video/clip.mp4"]


def test_copy_media_to_remotion_public_missing_file_raises(tmp_path):
    media_dir = tmp_path / "media"
    media_dir.mkdir()  # no clip.mp4 inside

    script = {
        "shots": [
            {"id": "s1", "type": "real_footage", "props": {"mediaPath": "video/clip.mp4"}},
        ]
    }

    try:
        copy_media_to_remotion_public(
            script, str(media_dir), str(tmp_path / "pv"), str(tmp_path / "pi")
        )
        assert False, "expected FileNotFoundError"
    except FileNotFoundError as e:
        assert "s1" in str(e)
        assert "clip.mp4" in str(e)


def test_copy_media_to_remotion_public_ignores_other_shot_types(tmp_path):
    media_dir = tmp_path / "media"
    media_dir.mkdir()
    script = {"shots": [{"id": "s1", "type": "explanation", "props": {"headline": "hi"}}]}

    copied = copy_media_to_remotion_public(
        script, str(media_dir), str(tmp_path / "pv"), str(tmp_path / "pi")
    )
    assert copied == []
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_render_manifest_builder.py -k copy_media -v`
Expected: FAIL with `ImportError: cannot import name 'copy_media_to_remotion_public'`

- [ ] **Step 3: Implement `copy_media_to_remotion_public`**

Add to `vidgen/pipeline/render_manifest_builder.py` (near `copy_audio_to_remotion_public`, after it):

```python
def copy_media_to_remotion_public(
    script: dict, media_dir: str, public_video_dir: str, public_images_dir: str
) -> list[str]:
    """Copy raw screenshots/video clips authored in content/media/<slug>/ into
    remotion/public/, mirroring copy_audio_to_remotion_public()'s pattern for
    WAVs. Returns the list of public-relative paths copied (e.g.
    "video/clip.mp4"), unchanged from each shot's authored mediaPath/imagePath
    so staticFile() resolution in Remotion needs no further translation."""
    os.makedirs(public_video_dir, exist_ok=True)
    os.makedirs(public_images_dir, exist_ok=True)
    copied = []
    for shot in script_shots(script):
        props = shot.get("props", shot.get("visual", {}))
        if shot["type"] == "real_footage":
            rel_path = props.get("mediaPath")
            if not rel_path:
                continue
            filename = os.path.basename(rel_path)
            src = os.path.join(media_dir, filename)
            if not os.path.exists(src):
                raise FileNotFoundError(
                    f"shot '{shot['id']}': media file not found: {src} "
                    f"(expected under content/media/<slug>/)"
                )
            shutil.copy2(src, os.path.join(public_video_dir, filename))
            copied.append(f"video/{filename}")
        elif shot["type"] == "screenshot":
            rel_path = props.get("imagePath")
            if not rel_path:
                continue
            filename = os.path.basename(rel_path)
            src = os.path.join(media_dir, filename)
            if not os.path.exists(src):
                raise FileNotFoundError(
                    f"shot '{shot['id']}': media file not found: {src} "
                    f"(expected under content/media/<slug>/)"
                )
            shutil.copy2(src, os.path.join(public_images_dir, filename))
            copied.append(f"images/{filename}")
    return copied
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_render_manifest_builder.py -k copy_media -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add vidgen/pipeline/render_manifest_builder.py tests/test_render_manifest_builder.py
git commit -m "feat: add copy_media_to_remotion_public for screenshot/real-footage ingestion"
```

---

### Task 3: Register `real_footage` and `screenshot` scene types (Python side)

**Files:**
- Modify: `vidgen/pipeline/render_manifest_builder.py`
- Test: `tests/test_render_manifest_builder.py`

**Interfaces:**
- Consumes: nothing new.
- Produces: `"real_footage"` and `"screenshot"` added to `DIRECT_SNAKE_CASE_SCENE_TYPES`, so `VALID_SCENE_TYPES` includes both. Consumed by Task 4 (validation) and by `build_render_manifest()`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_render_manifest_builder.py — add
from vidgen.pipeline.render_manifest_builder import VALID_SCENE_TYPES, build_render_manifest


def test_real_footage_and_screenshot_are_valid_scene_types():
    assert "real_footage" in VALID_SCENE_TYPES
    assert "screenshot" in VALID_SCENE_TYPES


def test_build_render_manifest_accepts_real_footage_shot():
    script = {
        "fps": 30,
        "shots": [
            {
                "id": "s1",
                "type": "real_footage",
                "narration": "Đây là màn hình thật.",
                "duration_frames": 90,
                "props": {"mediaPath": "video/clip.mp4"},
            }
        ],
    }
    manifest = build_render_manifest(script, audio_durations={"s1": 2.5})
    assert manifest["shots"][0]["type"] == "real_footage"
    assert manifest["shots"][0]["visual"]["mediaPath"] == "video/clip.mp4"


def test_build_render_manifest_accepts_screenshot_shot():
    script = {
        "fps": 30,
        "shots": [
            {
                "id": "s1",
                "type": "screenshot",
                "narration": "Xem giao diện.",
                "duration_frames": 90,
                "props": {"imagePath": "images/shot.png", "chrome": "phone"},
            }
        ],
    }
    manifest = build_render_manifest(script, audio_durations={"s1": 2.0})
    assert manifest["shots"][0]["type"] == "screenshot"
    assert manifest["shots"][0]["visual"]["chrome"] == "phone"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_render_manifest_builder.py -k "real_footage or screenshot" -v`
Expected: FAIL — `"real_footage" in VALID_SCENE_TYPES` is False

- [ ] **Step 3: Add the two types to `DIRECT_SNAKE_CASE_SCENE_TYPES`**

```python
# vidgen/pipeline/render_manifest_builder.py — inside DIRECT_SNAKE_CASE_SCENE_TYPES set
DIRECT_SNAKE_CASE_SCENE_TYPES = {
    "animated_flow",
    "bubble_comparator",
    "phone_map",
    "conversation",
    "before_after",
    "grid_heatmap",
    "marketing_caption_hook",
    "marketing_prompt_demo",
    "brief_blueprint",
    "task_instruction",
    "caption_upgrade",
    "reuse_system",
    "brand_swap_test",
    "real_footage",
    "screenshot",
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_render_manifest_builder.py -k "real_footage or screenshot" -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add vidgen/pipeline/render_manifest_builder.py tests/test_render_manifest_builder.py
git commit -m "feat: register real_footage and screenshot as valid scene types"
```

---

### Task 4: Validate the `real_footage` audio-source invariant

**Files:**
- Modify: `vidgen/pipeline/render_manifest_builder.py` (add a validation function)
- Modify: `vidgen/pipeline/script_validator.py` (call it from `validate_manifest`)
- Test: `tests/test_render_manifest_builder.py`, `tests/test_script_validator.py` (create if it doesn't exist — check first)

**Interfaces:**
- Consumes: `script_shots(script)` (existing, from `shot_schema.py`).
- Produces: `validate_real_footage_audio_source(script: dict) -> None` — raises `ValueError` naming the shot id if a `real_footage` shot has neither `narration` nor `props.useOriginalAudio == True`. Consumed by `script_validator.validate_manifest()`.

- [ ] **Step 1: Check whether `tests/test_script_validator.py` already exists**

Run: `ls tests/test_script_validator.py`

If it exists, add tests to it; if not, create it with the necessary imports mirroring `test_render_manifest_builder.py`'s style (plain dict scripts, no fixtures).

- [ ] **Step 2: Write the failing tests**

```python
# tests/test_render_manifest_builder.py — add
from vidgen.pipeline.render_manifest_builder import validate_real_footage_audio_source


def test_validate_real_footage_audio_source_ok_with_narration():
    script = {
        "shots": [
            {"id": "s1", "type": "real_footage", "narration": "Nói gì đó.",
             "props": {"mediaPath": "video/clip.mp4"}},
        ]
    }
    validate_real_footage_audio_source(script)  # should not raise


def test_validate_real_footage_audio_source_ok_with_original_audio():
    script = {
        "shots": [
            {"id": "s1", "type": "real_footage",
             "props": {"mediaPath": "video/clip.mp4", "useOriginalAudio": True}},
        ]
    }
    validate_real_footage_audio_source(script)  # should not raise


def test_validate_real_footage_audio_source_raises_with_neither():
    script = {
        "shots": [
            {"id": "s1", "type": "real_footage", "props": {"mediaPath": "video/clip.mp4"}},
        ]
    }
    try:
        validate_real_footage_audio_source(script)
        assert False, "expected ValueError"
    except ValueError as e:
        assert "s1" in str(e)


def test_validate_real_footage_audio_source_ignores_other_types():
    script = {"shots": [{"id": "s1", "type": "explanation", "narration": None}]}
    validate_real_footage_audio_source(script)  # should not raise
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_render_manifest_builder.py -k validate_real_footage -v`
Expected: FAIL with `ImportError`

- [ ] **Step 4: Implement the validator and wire it into `validate_manifest`**

Add to `vidgen/pipeline/render_manifest_builder.py`:

```python
def validate_real_footage_audio_source(script: dict) -> None:
    """A real_footage shot must have exactly one audio source: TTS narration
    (clip audio muted) or props.useOriginalAudio=True (clip's own audio, no
    TTS job). Neither present means the shot would render with no audio at
    all — an authoring mistake to catch before TTS/render, not at runtime."""
    for shot in script_shots(script):
        if shot["type"] != "real_footage":
            continue
        props = shot.get("props", shot.get("visual", {}))
        has_narration = bool(shot.get("narration"))
        uses_original_audio = bool(props.get("useOriginalAudio"))
        if not has_narration and not uses_original_audio:
            raise ValueError(
                f"shot '{shot['id']}': real_footage shot has no audio source — "
                f"set 'narration' for TTS, or props.useOriginalAudio=true to "
                f"keep the clip's own audio"
            )
```

Modify `vidgen/pipeline/script_validator.py`'s `validate_manifest()` — add near the top of the function, before the per-shot loop:

```python
from vidgen.pipeline.render_manifest_builder import (
    MAX_DEAD_AIR_FRAMES,
    detect_transition_silence,
    validate_real_footage_audio_source,
)

def validate_manifest(manifest: dict) -> None:
    validate_real_footage_audio_source(manifest)
    rows = []
    ...
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_render_manifest_builder.py -k validate_real_footage -v`
Expected: PASS (4 tests)

Then run the full validator suite to make sure the new call didn't break anything:

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_script_validator.py -v` (or wherever validator tests live — confirmed in Step 1)
Expected: PASS, no regressions

- [ ] **Step 6: Commit**

```bash
git add vidgen/pipeline/render_manifest_builder.py vidgen/pipeline/script_validator.py tests/test_render_manifest_builder.py
git commit -m "feat: validate real_footage shots have exactly one audio source"
```

---

### Task 5: `measure_media_durations` pipeline step (ffprobe)

**Files:**
- Modify: `vidgen/pipeline/pipeline_steps.py`
- Test: `tests/test_pipeline_steps.py`

**Interfaces:**
- Consumes: `script_shots(script)` (existing).
- Produces: `measure_media_durations(script: dict, media_dir: str) -> dict[str, float]` — maps shot id → real duration in seconds, for every `real_footage` shot with `props.useOriginalAudio == True`. Also produces `MediaDurationResult` is NOT needed — this step returns a plain dict directly (matching `measure_audio_durations`'s existing return shape) so it can be merged into the same `audio_durations` dict `build_render_manifest()` already consumes. Consumed by Task 6 (`write_manifest_step` call site in `video_pipeline.main()`).

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_pipeline_steps.py — add
from unittest.mock import patch

from vidgen.pipeline.pipeline_steps import measure_media_durations


def test_measure_media_durations_only_real_footage_with_original_audio(tmp_path):
    media_dir = tmp_path / "media"
    media_dir.mkdir()
    (media_dir / "clip.mp4").write_bytes(b"fake")

    script = {
        "shots": [
            {
                "id": "s1", "type": "real_footage",
                "props": {"mediaPath": "video/clip.mp4", "useOriginalAudio": True},
            },
            {
                "id": "s2", "type": "real_footage",
                "narration": "Có TTS nên không cần đo.",
                "props": {"mediaPath": "video/clip.mp4"},
            },
            {"id": "s3", "type": "explanation", "props": {}},
        ]
    }

    with patch("vidgen.pipeline.pipeline_steps._ffprobe_duration_seconds", return_value=4.2):
        durations = measure_media_durations(script, str(media_dir))

    assert durations == {"s1": 4.2}


def test_measure_media_durations_empty_when_no_original_audio_shots(tmp_path):
    media_dir = tmp_path / "media"
    media_dir.mkdir()
    script = {"shots": [{"id": "s1", "type": "explanation", "props": {}}]}
    assert measure_media_durations(script, str(media_dir)) == {}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_pipeline_steps.py -k measure_media_durations -v`
Expected: FAIL with `ImportError`

- [ ] **Step 3: Implement `_ffprobe_duration_seconds` and `measure_media_durations`**

Add to `vidgen/pipeline/pipeline_steps.py` (near `measure_audio_durations`):

```python
import os
import subprocess


def _ffprobe_duration_seconds(path: str) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        capture_output=True, text=True, check=True,
    )
    return float(result.stdout.strip())


def measure_media_durations(script: dict, media_dir: str) -> dict:
    durations = {}
    for shot in script_shots(script):
        if shot["type"] != "real_footage":
            continue
        props = shot.get("props", shot.get("visual", {}))
        if not props.get("useOriginalAudio"):
            continue
        filename = os.path.basename(props["mediaPath"])
        src = os.path.join(media_dir, filename)
        duration = _ffprobe_duration_seconds(src)
        logger.info("%s media duration: %.2fs", shot["id"], duration)
        durations[shot["id"]] = duration
    return durations
```

(Note: `os` is already imported at the top of `pipeline_steps.py`; only add the `subprocess` import if it's not already present — check the existing import block first.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_pipeline_steps.py -k measure_media_durations -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add vidgen/pipeline/pipeline_steps.py tests/test_pipeline_steps.py
git commit -m "feat: add measure_media_durations step for real_footage clips using original audio"
```

---

### Task 6: `check_footage_fit` pipeline step (narration-vs-clip-duration gate)

**Files:**
- Modify: `vidgen/pipeline/pipeline_steps.py`
- Test: `tests/test_pipeline_steps.py`

**Interfaces:**
- Consumes: `script_shots(script)` (existing); real clip durations via a `media_dir` param and the same `_ffprobe_duration_seconds` helper from Task 5.
- Produces: `check_footage_fit(script: dict, media_dir: str, wps: float = 4.2) -> None` — raises `ValueError` naming shot id + estimated narration seconds + actual clip seconds when narration would overrun the clip. Called from `video_pipeline.main()` before TTS synthesis (Task 7).

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_pipeline_steps.py — add
from unittest.mock import patch

from vidgen.pipeline.pipeline_steps import check_footage_fit


def test_check_footage_fit_passes_when_narration_fits(tmp_path):
    media_dir = tmp_path / "media"
    media_dir.mkdir()
    (media_dir / "clip.mp4").write_bytes(b"fake")
    script = {
        "shots": [
            {
                "id": "s1", "type": "real_footage",
                "narration": "Một hai ba bốn.",  # 4 words / 4.2 wps ≈ 0.95s
                "props": {"mediaPath": "video/clip.mp4"},
            }
        ]
    }
    with patch("vidgen.pipeline.pipeline_steps._ffprobe_duration_seconds", return_value=5.0):
        check_footage_fit(script, str(media_dir))  # should not raise


def test_check_footage_fit_raises_when_narration_overruns_clip(tmp_path):
    media_dir = tmp_path / "media"
    media_dir.mkdir()
    (media_dir / "clip.mp4").write_bytes(b"fake")
    long_narration = " ".join(["từ"] * 40)  # 40 words / 4.2 wps ≈ 9.5s
    script = {
        "shots": [
            {
                "id": "s1", "type": "real_footage",
                "narration": long_narration,
                "props": {"mediaPath": "video/clip.mp4"},
            }
        ]
    }
    with patch("vidgen.pipeline.pipeline_steps._ffprobe_duration_seconds", return_value=2.0):
        try:
            check_footage_fit(script, str(media_dir))
            assert False, "expected ValueError"
        except ValueError as e:
            msg = str(e)
            assert "s1" in msg
            assert "2.0" in msg or "2.00" in msg


def test_check_footage_fit_skips_shots_without_narration(tmp_path):
    media_dir = tmp_path / "media"
    media_dir.mkdir()
    script = {
        "shots": [
            {
                "id": "s1", "type": "real_footage",
                "props": {"mediaPath": "video/clip.mp4", "useOriginalAudio": True},
            }
        ]
    }
    check_footage_fit(script, str(media_dir))  # should not raise, no ffprobe call needed
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_pipeline_steps.py -k check_footage_fit -v`
Expected: FAIL with `ImportError`

- [ ] **Step 3: Implement `check_footage_fit`**

Add to `vidgen/pipeline/pipeline_steps.py` (near `check_dead_air`):

```python
def check_footage_fit(script: dict, media_dir: str, wps: float = 4.2) -> None:
    """For every real_footage shot with narration, estimate the TTS time the
    narration will need (word_count / wps) and fail fast if it exceeds the
    clip's real duration. Runs before TTS synthesis so a too-short clip is
    caught before spending a TTS call on narration that can't fit — no
    freeze-frame/loop/pad fallback is used to paper over the mismatch."""
    for shot in script_shots(script):
        if shot["type"] != "real_footage" or not shot.get("narration"):
            continue
        props = shot.get("props", shot.get("visual", {}))
        filename = os.path.basename(props["mediaPath"])
        src = os.path.join(media_dir, filename)
        clip_seconds = _ffprobe_duration_seconds(src)
        word_count = len(shot["narration"].split())
        estimated_seconds = word_count / wps
        if estimated_seconds > clip_seconds:
            raise ValueError(
                f"shot '{shot['id']}': narration needs ~{estimated_seconds:.2f}s "
                f"({word_count} words @ {wps} wps) but clip '{filename}' is only "
                f"{clip_seconds:.2f}s long — shorten the narration or use a longer clip"
            )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_pipeline_steps.py -k check_footage_fit -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add vidgen/pipeline/pipeline_steps.py tests/test_pipeline_steps.py
git commit -m "feat: add check_footage_fit gate for real_footage narration vs clip duration"
```

---

### Task 7: Wire ingestion + new steps into `write_manifest_step` and `video_pipeline.main()`

**Files:**
- Modify: `vidgen/pipeline/pipeline_steps.py` (`write_manifest_step` signature)
- Modify: `vidgen/pipeline/video_pipeline.py` (`main()`)
- Test: `tests/test_pipeline_steps.py`, `tests/test_video_pipeline_main.py`

**Interfaces:**
- Consumes: `copy_media_to_remotion_public` (Task 2), `measure_media_durations` (Task 5), `check_footage_fit` (Task 6), `CONTENT_MEDIA_DIR`/`REMOTION_PUBLIC_VIDEO`/`REMOTION_PUBLIC_IMAGES` (Task 1).
- Produces: `write_manifest_step(..., media_dir, remotion_public_video, remotion_public_images)` — new trailing params, defaulted so existing call sites without media don't break; `ManifestResult` gains `media_copied: list[str]`.

- [ ] **Step 1: Write the failing test for `write_manifest_step`**

```python
# tests/test_pipeline_steps.py — add
from vidgen.pipeline.pipeline_steps import write_manifest_step


def test_write_manifest_step_copies_media_when_present(tmp_path):
    media_dir = tmp_path / "media"
    media_dir.mkdir()
    (media_dir / "clip.mp4").write_bytes(b"fake")

    wav_dir = tmp_path / "wav"
    wav_dir.mkdir()
    public_audio = tmp_path / "pub_audio"
    public_video = tmp_path / "pub_video"
    public_images = tmp_path / "pub_images"
    manifest_path = tmp_path / "manifest.json"

    script = {
        "fps": 30,
        "shots": [
            {
                "id": "s1", "type": "real_footage",
                "props": {"mediaPath": "video/clip.mp4", "useOriginalAudio": True},
                "duration_frames": 90,
            }
        ],
    }

    result = write_manifest_step(
        script, {}, str(manifest_path), str(wav_dir), str(public_audio), [],
        media_dir=str(media_dir),
        remotion_public_video=str(public_video),
        remotion_public_images=str(public_images),
    )

    assert (public_video / "clip.mp4").exists()
    assert result.media_copied == ["video/clip.mp4"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_pipeline_steps.py -k write_manifest_step_copies_media -v`
Expected: FAIL — `TypeError: write_manifest_step() got an unexpected keyword argument 'media_dir'`

- [ ] **Step 3: Update `ManifestResult` and `write_manifest_step`**

```python
# vidgen/pipeline/pipeline_steps.py
@dataclass
class ManifestResult:
    manifest: dict
    audio_ids_copied: int
    media_copied: list


def write_manifest_step(
    script: dict,
    audio_durations: dict,
    manifest_path: str,
    wav_dir: str,
    remotion_public_audio: str,
    audio_ids: list,
    media_dir: str | None = None,
    remotion_public_video: str | None = None,
    remotion_public_images: str | None = None,
) -> ManifestResult:
    copy_audio_to_remotion_public(audio_ids, wav_dir, remotion_public_audio)
    logger.info("Copied %d WAV file(s) to %s/", len(audio_ids), remotion_public_audio)

    media_copied = []
    if media_dir and remotion_public_video and remotion_public_images:
        media_copied = copy_media_to_remotion_public(
            script, media_dir, remotion_public_video, remotion_public_images
        )
        if media_copied:
            logger.info("Copied %d media file(s) to remotion/public/", len(media_copied))

    manifest = build_render_manifest(script, audio_durations)
    write_render_manifest(manifest, manifest_path)
    logger.info("Render manifest written to %s", manifest_path)
    return ManifestResult(manifest=manifest, audio_ids_copied=len(audio_ids), media_copied=media_copied)
```

Add `copy_media_to_remotion_public` to the existing `from vidgen.pipeline.render_manifest_builder import (...)` block at the top of `pipeline_steps.py`.

- [ ] **Step 4: Run the new test and the full `test_pipeline_steps.py` suite**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_pipeline_steps.py -v`
Expected: PASS, no regressions (existing `write_manifest_step` callers work unchanged since the three new params default to `None`)

- [ ] **Step 5: Wire into `video_pipeline.main()`**

Modify `vidgen/pipeline/video_pipeline.py`:

```python
# top-level imports — add
from vidgen.config.project_paths import (
    CONTENT_JSON_DIR, CONTENT_MEDIA_DIR, OUTPUT_DIR, REMOTION_DIR,
    REMOTION_PUBLIC_IMAGES, REMOTION_PUBLIC_VIDEO,
)

# after load_result = steps.load_and_validate_script(...) / script = load_result.script
script_stem_for_media = Path(args.script).stem  # reuse existing script_stem computation order — see note below
media_dir = str(CONTENT_MEDIA_DIR / script_stem_for_media)

steps.check_footage_fit(script, media_dir)

# ... after jobs = steps.build_tts_jobs(script, args.speed) and before audio_durations is finalized:
media_durations = steps.measure_media_durations(script, media_dir)
```

Then merge `media_durations` into `audio_durations` right after `audio_durations = steps.measure_audio_durations(jobs, str(WAV_DIR))`:

```python
audio_durations = steps.measure_audio_durations(jobs, str(WAV_DIR))
audio_durations.update(steps.measure_media_durations(script, media_dir))
logger.info("Total audio duration: %.2fs", sum(audio_durations.values()))
```

Update the `write_manifest_step` call site to pass the new media params:

```python
manifest_result = steps.write_manifest_step(
    script, audio_durations, str(MANIFEST_PATH), str(WAV_DIR),
    str(REMOTION_PUBLIC_AUDIO), audio_ids,
    media_dir=media_dir,
    remotion_public_video=str(REMOTION_PUBLIC_VIDEO),
    remotion_public_images=str(REMOTION_PUBLIC_IMAGES),
)
```

Note on placement: `script_stem` is already computed in `main()` right after `load_and_validate_script` (existing line ~80-83, with the `script_` prefix stripped) — reuse that exact existing `script_stem` variable for `media_dir` rather than recomputing it, i.e. `media_dir = str(CONTENT_MEDIA_DIR / script_stem)` placed after the existing `script_stem` computation, and move `steps.check_footage_fit(script, media_dir)` to run right after that line, before `jobs = steps.build_tts_jobs(...)`.

- [ ] **Step 6: Add/update a `test_video_pipeline_main.py` integration test**

First read `tests/test_video_pipeline_main.py` to see how `main()` is currently tested (likely via `sys.argv` patching + tmp dirs + mocked TTS). Add a test asserting that when a script has no `real_footage`/`screenshot` shots, `main()` behaves exactly as before (no media dir required to exist) — this guards the "existing videos with only graphic scenes still render" invariant.

```python
# tests/test_video_pipeline_main.py — add, matching whatever mocking pattern
# the existing tests in this file use for TTS/render:
def test_main_without_media_shots_unaffected(...):
    # Reuse the existing test's script fixture / mocking setup for a
    # graphic-only script (e.g. type "explanation"), assert it still
    # completes through write_manifest_step without requiring
    # content/media/<slug>/ to exist on disk.
    ...
```

- [ ] **Step 7: Run the full pipeline test suite**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_video_pipeline_main.py tests/test_pipeline_steps.py tests/test_render_manifest_builder.py -v`
Expected: PASS, no regressions

- [ ] **Step 8: Commit**

```bash
git add vidgen/pipeline/pipeline_steps.py vidgen/pipeline/video_pipeline.py tests/test_pipeline_steps.py tests/test_video_pipeline_main.py
git commit -m "feat: wire media ingestion and footage-fit check into video_pipeline main()"
```

---

### Task 8: Remotion `types.ts` — `RealFootageVisual`/`ScreenshotVisual`

**Files:**
- Modify: `remotion/src/types.ts`

**Interfaces:**
- Produces: `RealFootageVisual`, `RealFootageSceneProps`, `ScreenshotVisual`, `ScreenshotSceneProps` types, and two `ManifestScene` union members (`"real_footage"`, `"screenshot"`). Consumed by Task 9 (components) and Task 10 (`TikTokVideo.tsx`).

- [ ] **Step 1: Add the Visual types**

Add near `HSKScreenshotVisual` (around line 28-31 of `remotion/src/types.ts`):

```typescript
// Embedded real-footage clip (phone/screen recording) filling the full
// frame. mediaPath is a staticFile()-relative path under remotion/public/video/.
export type RealFootageVisual = {
  mediaPath: string;
  useOriginalAudio?: boolean;
  trimStartSeconds?: number;
  trimEndSeconds?: number;
  objectPosition?: string; // CSS object-position value, default "center"
};

export type ScreenshotSpotlightBox = {
  x: number; // fraction 0-1 of image width
  y: number; // fraction 0-1 of image height
  w: number; // fraction 0-1 of image width
  h: number; // fraction 0-1 of image height
  startFrame: number;
  endFrame: number;
};

// Generic screenshot scene — replaces bespoke per-video screenshot scenes
// going forward (see Scene Library Freeze). chrome picks the frame style;
// spotlight boxes are fractional (not pixel) coordinates so any screenshot
// can use the pan/highlight effect, not just one hand-tuned image.
export type ScreenshotVisual = {
  imagePath: string;
  chrome: "phone" | "browser" | "none";
  headline?: string;
  accentWord?: string;
  badgeText?: string;
  spotlight?: ScreenshotSpotlightBox[];
};
```

- [ ] **Step 2: Add the two `ManifestScene` union members**

Add at the end of the `ManifestScene` union in `remotion/src/types.ts` (currently ending at `"brand_swap_test"` around line 191) — change the trailing `;` of the last existing member to `|` and append:

```typescript
  | { type: "real_footage"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: RealFootageVisual }
  | { type: "screenshot"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: ScreenshotVisual };
```

- [ ] **Step 3: Add the SceneProps types**

Add near `HSKScreenshotSceneProps` (around line 459):

```typescript
export type RealFootageSceneProps = RealFootageVisual & { durationInFrames: number };
export type ScreenshotSceneProps = ScreenshotVisual & { durationInFrames: number };
```

- [ ] **Step 4: Type-check**

Run: `npx --prefix remotion tsc --noEmit -p remotion/tsconfig.json`
Expected: Errors only about `RealFootageScene`/`ScreenshotScene` not existing yet (Task 9) or `TikTokVideo.tsx` not handling the new union members exhaustively (Task 10) — no errors about the types just added themselves. If `tsc` reports errors in `types.ts` itself, fix them before proceeding.

- [ ] **Step 5: Commit**

```bash
git add remotion/src/types.ts
git commit -m "feat: add RealFootage and Screenshot visual/props types"
```

---

### Task 9: Remotion components — `RealFootageScene.tsx` and `ScreenshotScene.tsx`

**Files:**
- Create: `remotion/src/scenes/RealFootageScene.tsx`
- Create: `remotion/src/scenes/ScreenshotScene.tsx`

**Interfaces:**
- Consumes: `RealFootageSceneProps`, `ScreenshotSceneProps` (Task 8).
- Produces: `RealFootageScene: React.FC<RealFootageSceneProps>`, `ScreenshotScene: React.FC<ScreenshotSceneProps>` — consumed by Task 10 (`TikTokVideo.tsx` imports + switch cases).

- [ ] **Step 1: Create `RealFootageScene.tsx`**

```typescript
// remotion/src/scenes/RealFootageScene.tsx
import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useVideoConfig } from "remotion";
import { RealFootageSceneProps } from "../types";

export const RealFootageScene: React.FC<RealFootageSceneProps> = ({
  mediaPath,
  useOriginalAudio = false,
  trimStartSeconds = 0,
  trimEndSeconds,
  objectPosition = "center",
}) => {
  const { fps } = useVideoConfig();
  const startFrom = Math.round(trimStartSeconds * fps);
  const endAt = trimEndSeconds !== undefined ? Math.round(trimEndSeconds * fps) : undefined;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      <OffthreadVideo
        src={staticFile(mediaPath)}
        startFrom={startFrom}
        endAt={endAt}
        muted={!useOriginalAudio}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition,
        }}
      />
    </AbsoluteFill>
  );
};

export default RealFootageScene;
```

- [ ] **Step 2: Create `ScreenshotScene.tsx`**

```typescript
// remotion/src/scenes/ScreenshotScene.tsx
import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { ScreenshotSceneProps } from "../types";
import { INTER } from "../styles";

const FRAME_ENTER_FRAMES = 22;
const CHROME_BG = "#ffffff";
const CHROME_BORDER = "rgba(26,23,20,0.12)";

export const ScreenshotScene: React.FC<ScreenshotSceneProps> = ({
  imagePath,
  chrome,
  headline,
  accentWord,
  badgeText,
  spotlight = [],
}) => {
  const frame = useCurrentFrame();

  const frameOpacity = interpolate(frame, [0, FRAME_ENTER_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const frameScale = interpolate(frame, [0, FRAME_ENTER_FRAMES], [0.92, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const renderHeadline = () => {
    if (!headline) return null;
    if (!accentWord || !headline.includes(accentWord)) {
      return <span>{headline}</span>;
    }
    const idx = headline.indexOf(accentWord);
    return (
      <span>
        {headline.slice(0, idx)}
        <span style={{ color: "#c0392b" }}>{accentWord}</span>
        {headline.slice(idx + accentWord.length)}
      </span>
    );
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#f5f1eb",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 64px 120px",
      }}
    >
      {badgeText && (
        <div
          style={{
            display: "flex",
            padding: "10px 22px",
            borderRadius: 999,
            backgroundColor: "#c0392b",
            marginBottom: 28,
          }}
        >
          <span style={{ fontFamily: INTER, fontWeight: 800, fontSize: 18, color: "#ffffff" }}>
            {badgeText}
          </span>
        </div>
      )}

      {headline && (
        <div
          style={{
            fontFamily: INTER,
            fontWeight: 800,
            fontSize: 40,
            textAlign: "center",
            color: "#1a1714",
            marginBottom: 32,
          }}
        >
          {renderHeadline()}
        </div>
      )}

      <div
        style={{
          position: "relative",
          width: "100%",
          maxHeight: 900,
          borderRadius: chrome === "none" ? 0 : 20,
          backgroundColor: CHROME_BG,
          border: chrome === "none" ? "none" : `1px solid ${CHROME_BORDER}`,
          boxShadow: chrome === "none" ? "none" : "0 30px 60px rgba(26,23,20,0.18)",
          overflow: "hidden",
          opacity: frameOpacity,
          transform: `scale(${frameScale})`,
        }}
      >
        {chrome === "browser" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 18px",
              borderBottom: `1px solid ${CHROME_BORDER}`,
            }}
          >
            {["#ff5f57", "#febc2e", "#28c840"].map((dot) => (
              <div key={dot} style={{ width: 11, height: 11, borderRadius: "50%", backgroundColor: dot }} />
            ))}
          </div>
        )}
        <div style={{ position: "relative" }}>
          <Img src={staticFile(imagePath)} style={{ width: "100%", display: "block" }} />
          {spotlight.map((box, i) => {
            const active = frame >= box.startFrame && frame <= box.endFrame;
            const boxOpacity = interpolate(
              frame,
              [box.startFrame, box.startFrame + 10, box.endFrame - 10, box.endFrame],
              [0, 1, 1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            if (!active) return null;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.w * 100}%`,
                  height: `${box.h * 100}%`,
                  border: "3px solid #c0392b",
                  borderRadius: 8,
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
                  opacity: boxOpacity,
                }}
              />
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default ScreenshotScene;
```

- [ ] **Step 3: Type-check both new files**

Run: `npx --prefix remotion tsc --noEmit -p remotion/tsconfig.json`
Expected: No errors originating from `RealFootageScene.tsx` or `ScreenshotScene.tsx` themselves (remaining errors, if any, should only be the `TikTokVideo.tsx` exhaustiveness ones expected until Task 10).

- [ ] **Step 4: Commit**

```bash
git add remotion/src/scenes/RealFootageScene.tsx remotion/src/scenes/ScreenshotScene.tsx
git commit -m "feat: add RealFootageScene and generic ScreenshotScene components"
```

---

### Task 10: Register both scenes in `TikTokVideo.tsx`

**Files:**
- Modify: `remotion/src/TikTokVideo.tsx`

**Interfaces:**
- Consumes: `RealFootageScene`, `ScreenshotScene` (Task 9).
- Produces: two working `case` branches in `SceneRenderer`, completing the three-way registration.

- [ ] **Step 1: Add imports**

In `remotion/src/TikTokVideo.tsx`, add near the other scene imports (after `import { PunchlineHoldShot } from "./scenes/PunchlineHoldShot";`, line 100):

```typescript
import { RealFootageScene } from "./scenes/RealFootageScene";
import { ScreenshotScene } from "./scenes/ScreenshotScene";
```

- [ ] **Step 2: Add switch cases**

In `SceneRenderer`, add near the other screenshot case (after the `hsk_screenshot` case, around line 326):

```typescript
    case "real_footage":
      return <RealFootageScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "screenshot":
      return <ScreenshotScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
```

- [ ] **Step 3: Type-check**

Run: `npx --prefix remotion tsc --noEmit -p remotion/tsconfig.json`
Expected: PASS, no errors.

- [ ] **Step 4: Run the scene-type drift checker**

Run: `/Users/haunguyen/miniconda3/bin/python -m vidgen.pipeline.check_scene_types`
Expected: PASS, no `SceneTypeDriftError` — confirms `real_footage`/`screenshot` are present and matching on both the Python (`DIRECT_SNAKE_CASE_SCENE_TYPES`) and TS (`ManifestScene` union + switch) sides.

- [ ] **Step 5: Commit**

```bash
git add remotion/src/TikTokVideo.tsx
git commit -m "feat: register real_footage and screenshot scenes in TikTokVideo SceneRenderer"
```

---

### Task 11: End-to-end manual verification

**Files:** none (verification only — no code changes)

**Interfaces:** none produced; this task exercises everything from Tasks 1-10 together.

- [ ] **Step 1: Prepare a tiny real sample**

Record or find a short (5-10s) screen recording (e.g. `screenrecord` on a phone, or `Cmd+Shift+5` on Mac) and a screenshot PNG. Place them at:
```
content/media/e2e_media_test/sample_clip.mp4
content/media/e2e_media_test/sample_shot.png
```

- [ ] **Step 2: Author a minimal test script**

Create `content/json/e2e_media_test.json`:

```json
{
  "title": "E2E Media Test",
  "fps": 30,
  "shots": [
    {
      "id": "shot_01",
      "type": "explanation",
      "narration": "Đây là cảnh graphic bình thường.",
      "duration_frames": 90,
      "narration_timing_frames": [8, 60],
      "props": {"headline": "Graphic scene", "body": "Vẫn hoạt động như trước."}
    },
    {
      "id": "shot_02",
      "type": "screenshot",
      "narration": "Đây là ảnh chụp màn hình thật.",
      "duration_frames": 90,
      "narration_timing_frames": [8, 60],
      "props": {"imagePath": "sample_shot.png", "chrome": "phone", "headline": "Giao diện thật"}
    },
    {
      "id": "shot_03",
      "type": "real_footage",
      "duration_frames": 150,
      "props": {"mediaPath": "sample_clip.mp4", "useOriginalAudio": true}
    }
  ]
}
```

- [ ] **Step 3: Run the full pipeline**

Run: `/Users/haunguyen/miniconda3/bin/python -m vidgen.pipeline.video_pipeline content/json/e2e_media_test.json`
Expected: Completes without error; logs show media files copied, `check_footage_fit` passing for shot_02 (has narration, no clip-duration constraint since it's not `real_footage`... note shot_03 has no narration so `check_footage_fit` skips it entirely), `measure_media_durations` reporting shot_03's real duration.

- [ ] **Step 4: Inspect in Remotion Studio**

With Studio open (launched automatically by the pipeline), scrub to shot_02 and shot_03. Verify per the project's mandatory visual-inspection rule (CLAUDE.md "Remotion Production Reliability"):
- shot_02: phone chrome renders around the screenshot, no clipped headline text, image not distorted.
- shot_03: video plays, fills the 1080×1920 frame via crop-to-fill (no black bars), original audio audible (not muted).

- [ ] **Step 5: Verify the rendered MP4**

Run: `ffprobe -v error -show_entries stream=codec_type,width,height,duration -of default=noprint_wrappers=1 remotion/out/e2e_media_test.mp4`
Expected: video stream 1080x1920, audio stream present, total duration roughly matches the sum of the three shots' `duration_frames` at 30fps.

- [ ] **Step 6: Clean up test artifacts**

Per CLAUDE.md's audio-cleanup rule, delete the WAV files this test run produced under `output/audio/wav/` and `remotion/public/audio/` for `e2e_media_test`'s shot ids, and remove the temporary `content/json/e2e_media_test.json` / `content/media/e2e_media_test/` / `remotion/out/e2e_media_test.mp4` test fixtures once verification is confirmed — these were created only to validate this feature, not as a deliverable video.

- [ ] **Step 7: Run the complete test suite one more time**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/ -v`
Expected: PASS, full suite green, no regressions from any of the 10 preceding tasks.

No commit for this task (verification only, and its artifacts are deleted in Step 6).

---

## Self-Review Notes

- **Spec coverage:** every section of the design spec (shot schemas, ingestion, pipeline wiring, Remotion components, three-way registration, error handling, testing) has a corresponding task above (Tasks 1-2 ingestion, 3-4 Python registration+validation, 5-6 new pipeline steps, 7 wiring, 8-10 Remotion side, 11 e2e). No spec requirement lacks a task.
- **Placeholder scan:** no TBD/TODO; every step has literal code, not descriptions of code.
- **Type consistency:** `copy_media_to_remotion_public` signature is identical across Tasks 2 and 7. `measure_media_durations` and `check_footage_fit` both consume `_ffprobe_duration_seconds` (defined once, in Task 5) — Task 6 reuses it rather than redefining it. `ManifestResult.media_copied` (Task 7) matches the return type of `copy_media_to_remotion_public` (Task 2, `list[str]`). `RealFootageSceneProps`/`ScreenshotSceneProps` (Task 8) match exactly what Tasks 9 and 10 destructure/spread.
