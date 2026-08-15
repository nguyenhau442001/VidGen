# video_pipeline.py Step/Checkpoint Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `vidgen/pipeline/video_pipeline.py`'s monolithic `main()` into
testable step functions with typed results, add automatic checkpoint/resume
via an on-disk state file, and replace `print()` with structured `logging`.

**Architecture:** Two new modules — `vidgen/pipeline/pipeline_state.py`
(checkpoint state dataclass + hash/load/save) and
`vidgen/pipeline/pipeline_steps.py` (one function per pipeline stage, each
returning a small `@dataclass` result). `video_pipeline.py` keeps only
`argparse` setup and a `main()` that calls the steps in order, threading
state between them and skipping any step whose recorded input hash still
matches and whose output artifacts still exist on disk.

**Tech Stack:** Python 3.13, stdlib `dataclasses`, `hashlib`, `json`,
`logging`; pytest for tests. No new third-party dependencies.

## Global Constraints

- No behavior change to pipeline outputs (manifest JSON, beatmap JSON,
  rendered MP4, thumbnail PNG) — this is an internal restructuring only.
- Render step (`render_video_chunked`) and thumbnail generation are **not**
  checkpointed by the new state file — render already caches by content hash;
  thumbnail always reruns non-fatally, unchanged from today.
- Studio launch (`_port_open` / `subprocess.Popen` / `webbrowser.open`) is
  **not** a checkpointed step — stays a separate function called last from
  `main()`, outside the step/state sequence.
- `--reuse-tts` / `--prebuilt-audio-dir` remain as explicit manual overrides
  for TTS synthesis; automatic resume via the state file is additive, not a
  replacement for these flags.
- Use `logging.getLogger(__name__)` in the new modules instead of `print()`.
  Keep the same message content/wording as today's `print()` calls so log
  output stays recognizable.
- Tests use plain pytest, dict fixtures, `tmp_path` for filesystem — no
  mocking framework (matches `tests/test_render_manifest_builder.py`,
  `tests/test_retention_beatmap.py`).
- Run `pytest` and `npx --prefix remotion tsc --noEmit -p remotion/tsconfig.json`
  after implementation, per `CLAUDE.md`.

---

## File Structure

- Create: `vidgen/pipeline/pipeline_state.py` — `PipelineState`,
  `compute_input_hash`, `load_state`, `save_state`.
- Create: `vidgen/pipeline/pipeline_steps.py` — step functions + result
  dataclasses + pure helpers (`build_tts_jobs`, `tighten_scene_durations`).
- Modify: `vidgen/pipeline/video_pipeline.py` — strip down to `argparse` +
  thin `main()` calling the new steps.
- Create: `tests/test_pipeline_state.py`
- Create: `tests/test_pipeline_steps.py`

---

### Task 1: Pipeline state module (hash + checkpoint file I/O)

**Files:**
- Create: `vidgen/pipeline/pipeline_state.py`
- Test: `tests/test_pipeline_state.py`

**Interfaces:**
- Consumes: nothing (foundation module).
- Produces:
  - `compute_input_hash(*parts: object) -> str` — stable sha256 hex digest
    of a canonical JSON encoding of `parts` (a tuple). Callers pass whatever
    values determine a step's validity (e.g. script dict, args dict).
  - `@dataclass class PipelineState: steps: dict[str, dict]` where each value
    is `{"input_hash": str, "result": dict}` — plain JSON-serializable dict
    for `result`.
  - `PipelineState.get(step_name: str) -> dict | None` — returns the stored
    entry for a step or `None`.
  - `PipelineState.set(step_name: str, input_hash: str, result: dict) -> None`
    — mutates in place.
  - `load_state(path: str | Path) -> PipelineState` — returns an empty
    `PipelineState` if the file doesn't exist or fails to parse as JSON.
  - `save_state(state: PipelineState, path: str | Path) -> None` — writes
    indented JSON, creating parent dirs as needed.

- [ ] **Step 1: Write failing tests for hash stability and state round-trip**

```python
# tests/test_pipeline_state.py
from pathlib import Path

from vidgen.pipeline.pipeline_state import (
    PipelineState,
    compute_input_hash,
    load_state,
    save_state,
)


def test_hash_is_stable_for_same_input():
    a = compute_input_hash({"x": 1, "y": [1, 2]})
    b = compute_input_hash({"x": 1, "y": [1, 2]})
    assert a == b


def test_hash_changes_with_input():
    a = compute_input_hash({"x": 1})
    b = compute_input_hash({"x": 2})
    assert a != b


def test_hash_stable_regardless_of_dict_key_order():
    a = compute_input_hash({"x": 1, "y": 2})
    b = compute_input_hash({"y": 2, "x": 1})
    assert a == b


def test_load_state_missing_file_returns_empty(tmp_path):
    state = load_state(tmp_path / "does_not_exist.json")
    assert state.get("any_step") is None


def test_save_then_load_round_trip(tmp_path):
    path = tmp_path / "state.json"
    state = PipelineState(steps={})
    state.set("synthesize_tts", "hash123", {"job_ids": ["a", "b"]})
    save_state(state, path)

    loaded = load_state(path)
    entry = loaded.get("synthesize_tts")
    assert entry == {"input_hash": "hash123", "result": {"job_ids": ["a", "b"]}}


def test_load_state_malformed_json_returns_empty(tmp_path):
    path = tmp_path / "state.json"
    path.write_text("not json", encoding="utf-8")
    state = load_state(path)
    assert state.get("any_step") is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_pipeline_state.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'vidgen.pipeline.pipeline_state'`

- [ ] **Step 3: Implement `pipeline_state.py`**

```python
# vidgen/pipeline/pipeline_state.py
"""Checkpoint state for video_pipeline.py: records, per step, a hash of
that step's relevant inputs and a small JSON-serializable summary of its
result. Lets main() skip re-running a step on the next invocation when the
recorded hash still matches and the step's output artifacts still exist —
automatic resume without relying solely on manual flags like --reuse-tts."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path


def compute_input_hash(*parts: object) -> str:
    canonical = json.dumps(parts, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


@dataclass
class PipelineState:
    steps: dict[str, dict] = field(default_factory=dict)

    def get(self, step_name: str) -> dict | None:
        return self.steps.get(step_name)

    def set(self, step_name: str, input_hash: str, result: dict) -> None:
        self.steps[step_name] = {"input_hash": input_hash, "result": result}


def load_state(path: str | Path) -> PipelineState:
    path = Path(path)
    if not path.exists():
        return PipelineState()
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return PipelineState()
    return PipelineState(steps=data.get("steps", {}))


def save_state(state: PipelineState, path: str | Path) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"steps": state.steps}, f, indent=2, ensure_ascii=False)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_pipeline_state.py -v`
Expected: PASS (6 passed)

- [ ] **Step 5: Commit**

```bash
git add vidgen/pipeline/pipeline_state.py tests/test_pipeline_state.py
git commit -m "feat: add pipeline checkpoint state module"
```

---

### Task 2: Pure helpers — `build_tts_jobs` and `tighten_scene_durations`

**Files:**
- Create: `vidgen/pipeline/pipeline_steps.py` (started here, extended in
  later tasks)
- Test: `tests/test_pipeline_steps.py`

**Interfaces:**
- Consumes: nothing external beyond stdlib.
- Produces:
  - `@dataclass class TTSJob: id: str; text: str; speed: float`
  - `build_tts_jobs(script: dict, base_speed: float) -> list[TTSJob]` — pure
    port of the job-building loop currently inline in `main()`
    (`video_pipeline.py:125-134`), using
    `vidgen.audio.speech_synthesizer.resolve_scene_tts_speed` and
    `vidgen.pipeline.shot_schema.script_shots`.
  - `@dataclass class DurationChange: scene_id: str; old_frames: int; new_frames: int`
  - `tighten_scene_durations(script: dict, audio_durations: dict[str, float], fps: int, jobs: list[TTSJob]) -> tuple[dict, list[DurationChange]]`
    — pure port of the tightening loop currently inline in `main()`
    (`video_pipeline.py:222-244`). Returns a **new** script dict (deep copy
    shots that change) plus the list of changes, rather than mutating the
    input in place, so it can be tested without side effects. Skips a shot
    exactly as today when: `sid not in audio_durations`, or
    `"duration_frames" not in shot`, or `shot.get("narration_per_criterion")`,
    or `shot.get("props", {}).get("dialogue")`. The "should we tighten at
    all" gate (`not args.no_trim or any non-1.0 speed among jobs`) is the
    caller's responsibility — this function itself does not take `no_trim`.

- [ ] **Step 1: Write failing tests**

```python
# tests/test_pipeline_steps.py
import copy

from vidgen.pipeline.pipeline_steps import (
    TTSJob,
    build_tts_jobs,
    tighten_scene_durations,
)


def _script(shots, fps=30):
    return {"title": "Test", "fps": fps, "shots": shots}


def test_build_tts_jobs_narration_only():
    script = _script([
        {"id": "s1", "type": "explanation", "narration": "Xin chào."},
    ])
    jobs = build_tts_jobs(script, base_speed=1.1)
    assert jobs == [TTSJob(id="s1", text="Xin chào.", speed=1.1)]


def test_build_tts_jobs_per_scene_speed_override():
    script = _script([
        {"id": "s1", "type": "explanation", "narration": "Chậm hơn.", "tts_speed": 0.9},
    ])
    jobs = build_tts_jobs(script, base_speed=1.1)
    assert jobs[0].speed == 0.9


def test_build_tts_jobs_narration_per_criterion():
    script = _script([
        {
            "id": "s1", "type": "stat_comparator",
            "narration_per_criterion": [{"text": "Một."}, {"text": "Hai."}],
        },
    ])
    jobs = build_tts_jobs(script, base_speed=1.0)
    ids = [j.id for j in jobs]
    assert ids == ["s1_seg0", "s1_seg1"]
    assert [j.text for j in jobs] == ["Một.", "Hai."]


def test_build_tts_jobs_dialogue_skips_muted_and_empty():
    script = _script([
        {
            "id": "s1", "type": "wall_portal",
            "props": {
                "dialogue": [
                    {"text": "Nói."},
                    {"text": "Im lặng.", "mute": True},
                    {"text": ""},
                ]
            },
        },
    ])
    jobs = build_tts_jobs(script, base_speed=1.0)
    assert [j.id for j in jobs] == ["s1_dlg0"]
    assert jobs[0].text == "Nói."


def test_tighten_scene_durations_shrinks_when_audio_shorter():
    script = _script([
        {
            "id": "s1", "type": "explanation", "narration": "Ngắn.",
            "duration_frames": 300, "transition_out_delay_frames": 15,
        },
    ])
    jobs = [TTSJob(id="s1", text="Ngắn.", speed=1.0)]
    new_script, changes = tighten_scene_durations(
        script, audio_durations={"s1": 2.0}, fps=30, jobs=jobs
    )
    # offset(0) + ceil(2.0*30)=60 + tail(15) = 75, less than 300
    assert new_script["shots"][0]["duration_frames"] == 75
    assert changes == [
        {"scene_id": "s1", "old_frames": 300, "new_frames": 75}
    ] or changes[0].scene_id == "s1"


def test_tighten_scene_durations_never_grows_beyond_original():
    script = _script([
        {
            "id": "s1", "type": "explanation", "narration": "Dài.",
            "duration_frames": 60, "transition_out_delay_frames": 15,
        },
    ])
    jobs = [TTSJob(id="s1", text="Dài.", speed=1.0)]
    new_script, changes = tighten_scene_durations(
        script, audio_durations={"s1": 5.0}, fps=30, jobs=jobs
    )
    assert new_script["shots"][0]["duration_frames"] == 60
    assert changes == []


def test_tighten_scene_durations_skips_dialogue_scenes():
    script = _script([
        {
            "id": "s1", "type": "wall_portal", "narration": "N.",
            "duration_frames": 300,
            "props": {"dialogue": [{"text": "x", "start_frame": 10}]},
        },
    ])
    jobs = [TTSJob(id="s1", text="N.", speed=1.0)]
    new_script, changes = tighten_scene_durations(
        script, audio_durations={"s1": 1.0}, fps=30, jobs=jobs
    )
    assert new_script["shots"][0]["duration_frames"] == 300
    assert changes == []


def test_tighten_scene_durations_does_not_mutate_input():
    script = _script([
        {
            "id": "s1", "type": "explanation", "narration": "Ngắn.",
            "duration_frames": 300, "transition_out_delay_frames": 15,
        },
    ])
    original = copy.deepcopy(script)
    jobs = [TTSJob(id="s1", text="Ngắn.", speed=1.0)]
    tighten_scene_durations(script, audio_durations={"s1": 2.0}, fps=30, jobs=jobs)
    assert script == original
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_pipeline_steps.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'vidgen.pipeline.pipeline_steps'`

- [ ] **Step 3: Implement `build_tts_jobs` and `tighten_scene_durations`**

```python
# vidgen/pipeline/pipeline_steps.py (initial content)
"""Step functions for video_pipeline.py, split out of the former monolithic
main() so business logic (job construction, duration math) can be unit
tested independently of I/O (TTS synthesis, file writes, rendering)."""

from __future__ import annotations

import copy
import math
from dataclasses import dataclass

from vidgen.audio.speech_synthesizer import resolve_scene_tts_speed
from vidgen.pipeline.shot_schema import script_shots


@dataclass
class TTSJob:
    id: str
    text: str
    speed: float


def build_tts_jobs(script: dict, base_speed: float) -> list[TTSJob]:
    jobs: list[TTSJob] = []
    for shot in script_shots(script):
        scene_speed = resolve_scene_tts_speed(shot, base_speed)
        if shot.get("narration"):
            jobs.append(TTSJob(id=shot["id"], text=shot["narration"], speed=scene_speed))
        for i, seg in enumerate(shot.get("narration_per_criterion", [])):
            jobs.append(TTSJob(id=f"{shot['id']}_seg{i}", text=seg["text"], speed=scene_speed))
        for i, line in enumerate(shot.get("props", {}).get("dialogue", [])):
            if line.get("text") and not line.get("mute"):
                jobs.append(TTSJob(id=f"{shot['id']}_dlg{i}", text=line["text"], speed=scene_speed))
    return jobs


@dataclass
class DurationChange:
    scene_id: str
    old_frames: int
    new_frames: int


def tighten_scene_durations(
    script: dict,
    audio_durations: dict,
    fps: int,
    jobs: list[TTSJob],
) -> tuple[dict, list[DurationChange]]:
    new_script = copy.deepcopy(script)
    changes: list[DurationChange] = []
    for shot in script_shots(new_script):
        sid = shot["id"]
        if (
            sid not in audio_durations
            or "duration_frames" not in shot
            or shot.get("narration_per_criterion")
            or shot.get("props", {}).get("dialogue")
        ):
            continue
        offset = (shot.get("narration_timing_frames") or [0])[0]
        tail = shot.get("transition_out_delay_frames", 15)
        tightened = offset + math.ceil(audio_durations[sid] * fps) + tail
        if tightened < shot["duration_frames"]:
            changes.append(DurationChange(sid, shot["duration_frames"], tightened))
            shot["duration_frames"] = tightened
    return new_script, changes
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_pipeline_steps.py -v`
Expected: PASS (8 passed). If the `changes ==` comparison in
`test_tighten_scene_durations_shrinks_when_audio_shorter` fails because
`DurationChange` isn't dict-comparable, drop the `dict`-literal branch of
that `or` and assert on the dataclass fields directly:
`assert changes == [DurationChange("s1", 300, 75)]`.

- [ ] **Step 5: Fix the test if needed and re-run**

Run: `pytest tests/test_pipeline_steps.py -v`
Expected: PASS (8 passed)

- [ ] **Step 6: Commit**

```bash
git add vidgen/pipeline/pipeline_steps.py tests/test_pipeline_steps.py
git commit -m "feat: extract pure TTS-job and duration-tightening helpers"
```

---

### Task 3: Step functions with I/O — script loading, TTS synth, duration fit, audio measurement

**Files:**
- Modify: `vidgen/pipeline/pipeline_steps.py`
- Test: `tests/test_pipeline_steps.py`

**Interfaces:**
- Consumes: `TTSJob` from Task 2; `resolve_script` (`script_resolver.py`),
  `validate_manifest` (`script_validator.py`), `script_shots`
  (`shot_schema.py`), `fit_wav_to_duration`, `synthesize as tts_synthesize`,
  `wav_filename` (`render_manifest_builder.py`).
- Produces:
  - `@dataclass class LoadResult: script: dict`
  - `load_and_validate_script(script_path: str, skip_validation: bool) -> LoadResult`
    — reads JSON from `script_path`, calls `resolve_script`, strips
    `shots[0]` when its `"type"` is `"HSKFlashCardThumbnailScene"` (mirrors
    `video_pipeline.py:107-109`), calls `validate_manifest` unless
    `skip_validation`.
  - `@dataclass class TTSResult: job_ids: list[str]; elapsed_seconds: float`
  - `synthesize_tts(jobs: list[TTSJob], wav_dir: str, tts_voice: str, reuse_tts: bool, prebuilt_audio_dir: str | None, no_trim: bool, target_dbfs: float) -> TTSResult`
    — same `ThreadPoolExecutor(max_workers=min(3, max(1, len(jobs))))` logic
    as `video_pipeline.py:137-172`, including the `--reuse-tts` and
    `--prebuilt-audio-dir` short-circuits and the `FileNotFoundError` raise
    when a prebuilt file is missing.
  - `@dataclass class FitResult: narration_fitted: int; dialogue_fitted: int`
  - `fit_durations(script: dict, wav_dir: str, fps: int) -> FitResult` — both
    fit passes from `video_pipeline.py:178-208` (narration windows, then
    dialogue windows), calling `fit_wav_to_duration` for each WAV that
    exists; counts how many WAVs were adjusted.
  - `measure_audio_durations(jobs: list[TTSJob], wav_dir: str) -> dict[str, float]`
    — port of `video_pipeline.py:211-220` minus the `print`/running total
    (caller logs the total via `sum(result.values())`).

- [ ] **Step 1: Write failing tests using `tmp_path`**

```python
# append to tests/test_pipeline_steps.py
import wave

from vidgen.pipeline.pipeline_steps import (
    TTSJob,
    load_and_validate_script,
    measure_audio_durations,
    synthesize_tts,
)


def _write_wav(path, seconds, sr=24000):
    path.parent.mkdir(parents=True, exist_ok=True)
    n_frames = int(seconds * sr)
    with wave.open(str(path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(b"\x00\x00" * n_frames)


def test_load_and_validate_script_strips_thumbnail_shot(tmp_path):
    import json

    script_path = tmp_path / "script.json"
    script_path.write_text(
        json.dumps(
            {
                "fps": 30,
                "shots": [
                    {"id": "cover", "type": "HSKFlashCardThumbnailScene"},
                    {"id": "s1", "type": "explanation", "narration": "N."},
                ],
            }
        ),
        encoding="utf-8",
    )
    result = load_and_validate_script(str(script_path), skip_validation=True)
    ids = [s["id"] for s in result.script["shots"]]
    assert ids == ["s1"]


def test_measure_audio_durations_reads_wav_headers(tmp_path):
    wav_dir = tmp_path / "wav"
    _write_wav(wav_dir / "scene_s1.wav", seconds=1.5)
    jobs = [TTSJob(id="s1", text="x", speed=1.0)]
    durations = measure_audio_durations(jobs, str(wav_dir))
    assert durations["s1"] == pytest.approx(1.5, abs=0.01)


def test_synthesize_tts_reuse_skips_existing(tmp_path, monkeypatch):
    wav_dir = tmp_path / "wav"
    _write_wav(wav_dir / "scene_s1.wav", seconds=1.0)

    def fail_if_called(*a, **kw):
        raise AssertionError("tts_synthesize should not be called when reusing")

    monkeypatch.setattr("vidgen.pipeline.pipeline_steps.tts_synthesize", fail_if_called)

    jobs = [TTSJob(id="s1", text="x", speed=1.0)]
    result = synthesize_tts(
        jobs,
        wav_dir=str(wav_dir),
        tts_voice="v",
        reuse_tts=True,
        prebuilt_audio_dir=None,
        no_trim=False,
        target_dbfs=-15.0,
    )
    assert result.job_ids == ["s1"]


def test_synthesize_tts_prebuilt_missing_raises(tmp_path):
    wav_dir = tmp_path / "wav"
    prebuilt_dir = tmp_path / "prebuilt"
    prebuilt_dir.mkdir()
    jobs = [TTSJob(id="s1", text="x", speed=1.0)]
    with pytest.raises(FileNotFoundError):
        synthesize_tts(
            jobs,
            wav_dir=str(wav_dir),
            tts_voice="v",
            reuse_tts=False,
            prebuilt_audio_dir=str(prebuilt_dir),
            no_trim=False,
            target_dbfs=-15.0,
        )
```

Add `import pytest` at the top of `tests/test_pipeline_steps.py`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_pipeline_steps.py -v`
Expected: FAIL — `load_and_validate_script`, `measure_audio_durations`,
`synthesize_tts` not defined yet.

- [ ] **Step 3: Implement the I/O step functions**

Append to `vidgen/pipeline/pipeline_steps.py`:

```python
import logging
import os
import shutil
import wave
from concurrent.futures import ThreadPoolExecutor, as_completed
from time import time as now

from vidgen.audio.speech_synthesizer import fit_wav_to_duration, synthesize as tts_synthesize
from vidgen.pipeline.render_manifest_builder import wav_filename
from vidgen.pipeline.script_resolver import resolve_script
from vidgen.pipeline.script_validator import validate_manifest

logger = logging.getLogger(__name__)


@dataclass
class LoadResult:
    script: dict


def load_and_validate_script(script_path: str, skip_validation: bool) -> LoadResult:
    with open(script_path, encoding="utf-8") as f:
        script = json.load(f)
    script = resolve_script(script)

    shots = script_shots(script)
    if shots and shots[0]["type"] == "HSKFlashCardThumbnailScene":
        script["shots"] = shots[1:]

    if not skip_validation:
        validate_manifest(script)
    return LoadResult(script=script)


@dataclass
class TTSResult:
    job_ids: list
    elapsed_seconds: float


def synthesize_tts(
    jobs: list[TTSJob],
    wav_dir: str,
    tts_voice: str,
    reuse_tts: bool,
    prebuilt_audio_dir: str | None,
    no_trim: bool,
    target_dbfs: float,
) -> TTSResult:
    def synthesize_job(job: TTSJob) -> str:
        output_path = f"{wav_dir}/{wav_filename(job.id)}"
        if prebuilt_audio_dir:
            prebuilt_path = os.path.join(prebuilt_audio_dir, wav_filename(job.id))
            if not os.path.exists(prebuilt_path):
                raise FileNotFoundError(
                    f"--prebuilt-audio-dir set but no prebuilt WAV found for "
                    f"'{job.id}' (expected {prebuilt_path})"
                )
            shutil.copyfile(prebuilt_path, output_path)
            logger.info("%s using prebuilt %s", job.id, prebuilt_path)
            return job.id
        if reuse_tts and os.path.exists(output_path):
            logger.info("%s reusing existing %s", job.id, output_path)
            return job.id
        tts_synthesize(
            job.text,
            output_path,
            voice=tts_voice,
            speed=job.speed,
            trim_silence=not no_trim,
            target_dbfs=target_dbfs,
        )
        return job.id

    os.makedirs(wav_dir, exist_ok=True)
    start_time = now()
    job_ids = []
    with ThreadPoolExecutor(max_workers=min(3, max(1, len(jobs)))) as executor:
        futures = {executor.submit(synthesize_job, job): job for job in jobs}
        for future in as_completed(futures):
            job_id = future.result()
            job_ids.append(job_id)
            logger.info("%s saved to %s/%s", job_id, wav_dir, wav_filename(job_id))
    elapsed = now() - start_time
    logger.info("Total generation time: %.2fs", elapsed)
    return TTSResult(job_ids=job_ids, elapsed_seconds=elapsed)


@dataclass
class FitResult:
    narration_fitted: int
    dialogue_fitted: int


def fit_durations(script: dict, wav_dir: str, fps: int) -> FitResult:
    narration_fitted = 0
    for shot in script_shots(script):
        sid = shot["id"]
        if not shot.get("narration") or "duration_frames" not in shot:
            continue
        offset = (shot.get("narration_timing_frames") or [0])[0]
        tail = shot.get("transition_out_delay_frames", 0)
        available_frames = shot["duration_frames"] - offset - tail
        wav_path = f"{wav_dir}/{wav_filename(sid)}"
        if os.path.exists(wav_path):
            fit_wav_to_duration(wav_path, max_duration_seconds=available_frames / fps)
            narration_fitted += 1

    dialogue_fitted = 0
    for shot in script_shots(script):
        sid = shot["id"]
        dialogue = shot.get("props", {}).get("dialogue", [])
        if not dialogue or "duration_frames" not in shot:
            continue
        starts = [line.get("start_frame", line.get("frame", 0)) for line in dialogue]
        tail = shot.get("transition_out_delay_frames", 0)
        for i, start in enumerate(starts):
            dlg_id = f"{sid}_dlg{i}"
            wav_path = f"{wav_dir}/{wav_filename(dlg_id)}"
            if not os.path.exists(wav_path):
                continue
            next_start = starts[i + 1] if i + 1 < len(starts) else shot["duration_frames"] - tail
            available_frames = next_start - start
            if available_frames > 0:
                fit_wav_to_duration(wav_path, max_duration_seconds=available_frames / fps)
                dialogue_fitted += 1
    return FitResult(narration_fitted=narration_fitted, dialogue_fitted=dialogue_fitted)


def measure_audio_durations(jobs: list[TTSJob], wav_dir: str) -> dict:
    audio_durations = {}
    for job in jobs:
        wav_path = f"{wav_dir}/{wav_filename(job.id)}"
        with wave.open(wav_path) as wf:
            duration = wf.getnframes() / wf.getframerate()
            logger.info("%s audio duration: %.2fs", job.id, duration)
            audio_durations[job.id] = duration
    return audio_durations
```

Add `import json` near the top of the file alongside the existing imports.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_pipeline_steps.py -v`
Expected: PASS (12 passed)

- [ ] **Step 5: Commit**

```bash
git add vidgen/pipeline/pipeline_steps.py tests/test_pipeline_steps.py
git commit -m "feat: add I/O-bound pipeline steps (load, TTS synth, duration fit)"
```

---

### Task 4: Step functions — manifest, beatmap, dead air, render, thumbnail

**Files:**
- Modify: `vidgen/pipeline/pipeline_steps.py`
- Test: `tests/test_pipeline_steps.py`

**Interfaces:**
- Consumes: `build_render_manifest`, `write_render_manifest`,
  `copy_audio_to_remotion_public`, `detect_dead_air` (all from
  `render_manifest_builder.py`); `score_beatmap`, `write_beatmap`,
  `format_report` (from `retention_beatmap.py`); `render_video_chunked`
  (from `chunked_video_renderer.py`); `generate_thumbnail` (from
  `vidgen.presentation.thumbnail_renderer`, imported lazily inside the
  function exactly as today, since `main()` already does a local import
  there — `video_pipeline.py:286`).
- Produces:
  - `@dataclass class ManifestResult: manifest: dict; audio_ids_copied: int`
  - `write_manifest_step(script: dict, audio_durations: dict, manifest_path: str, wav_dir: str, remotion_public_audio: str, audio_ids: list[str]) -> ManifestResult`
  - `@dataclass class BeatmapResult: beatmap: dict; report: str`
  - `score_and_write_beatmap(script: dict, manifest: dict, beatmap_path: str) -> BeatmapResult`
  - `@dataclass class DeadAirResult: findings: list[dict]`
  - `check_dead_air(script: dict, manifest: dict, audio_durations: dict) -> DeadAirResult`
  - `@dataclass class RenderResult: video_output: str`
  - `render_video(manifest: dict, video_output: str) -> RenderResult` — deletes
    a pre-existing file at `video_output` first (matches
    `video_pipeline.py:278-280`), then calls `render_video_chunked`.
  - `@dataclass class ThumbnailResult: generated: bool; error: str | None`
  - `generate_thumbnail_step(script_path: str, video_output: str) -> ThumbnailResult`
    — non-fatal try/except exactly as `video_pipeline.py:285-290`.

- [ ] **Step 1: Write failing tests**

```python
# append to tests/test_pipeline_steps.py
from vidgen.pipeline.pipeline_steps import (
    check_dead_air,
    render_video,
    score_and_write_beatmap,
    write_manifest_step,
)


def test_write_manifest_step_writes_file_and_copies_audio(tmp_path):
    script = _script([
        {"id": "s1", "type": "explanation", "narration": "N.", "visual": {"headline": "H"}},
    ])
    wav_dir = tmp_path / "wav"
    _write_wav(wav_dir / "scene_s1.wav", seconds=1.0)
    public_audio = tmp_path / "public_audio"
    manifest_path = tmp_path / "output" / "render_manifest.json"

    result = write_manifest_step(
        script,
        audio_durations={"s1": 1.0},
        manifest_path=str(manifest_path),
        wav_dir=str(wav_dir),
        remotion_public_audio=str(public_audio),
        audio_ids=["s1"],
    )
    assert manifest_path.exists()
    assert result.audio_ids_copied == 1
    assert (public_audio / "scene_s1.wav").exists()


def test_score_and_write_beatmap_writes_file(tmp_path):
    script = _script([
        {"id": "s1", "type": "explanation", "narration": "N.",
         "duration_frames": 150, "visual": {"headline": "H"}},
    ])
    from vidgen.pipeline.render_manifest_builder import build_render_manifest
    manifest = build_render_manifest(script, {"s1": 1.0})
    beatmap_path = tmp_path / "beatmap.json"

    result = score_and_write_beatmap(script, manifest, str(beatmap_path))
    assert beatmap_path.exists()
    assert "video_title" in result.beatmap
    assert isinstance(result.report, str) and result.report


def test_check_dead_air_returns_findings_list():
    script = _script([
        {"id": "s1", "type": "explanation", "narration": "N.",
         "duration_frames": 150, "visual": {"headline": "H"}},
    ])
    from vidgen.pipeline.render_manifest_builder import build_render_manifest
    manifest = build_render_manifest(script, {"s1": 0.5})
    result = check_dead_air(script, manifest, audio_durations={"s1": 0.5})
    assert isinstance(result.findings, list)


def test_render_video_deletes_stale_output(tmp_path, monkeypatch):
    video_output = tmp_path / "out.mp4"
    video_output.write_text("stale")

    calls = []
    monkeypatch.setattr(
        "vidgen.pipeline.pipeline_steps.render_video_chunked",
        lambda manifest, out: calls.append(out),
    )
    result = render_video({"shots": []}, str(video_output))
    assert not video_output.exists()  # deleted before render_video_chunked ran
    assert calls == [str(video_output)]
    assert result.video_output == str(video_output)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_pipeline_steps.py -v`
Expected: FAIL — new names not defined yet.

- [ ] **Step 3: Implement the remaining step functions**

Append to `vidgen/pipeline/pipeline_steps.py`:

```python
from vidgen.pipeline.chunked_video_renderer import render_video_chunked
from vidgen.pipeline.render_manifest_builder import (
    build_render_manifest,
    copy_audio_to_remotion_public,
    detect_dead_air,
    write_render_manifest,
)
from vidgen.quality.retention_beatmap import format_report as beatmap_report
from vidgen.quality.retention_beatmap import score_beatmap, write_beatmap


@dataclass
class ManifestResult:
    manifest: dict
    audio_ids_copied: int


def write_manifest_step(
    script: dict,
    audio_durations: dict,
    manifest_path: str,
    wav_dir: str,
    remotion_public_audio: str,
    audio_ids: list,
) -> ManifestResult:
    copy_audio_to_remotion_public(audio_ids, wav_dir, remotion_public_audio)
    logger.info("Copied %d WAV file(s) to %s/", len(audio_ids), remotion_public_audio)

    manifest = build_render_manifest(script, audio_durations)
    write_render_manifest(manifest, manifest_path)
    logger.info("Render manifest written to %s", manifest_path)
    return ManifestResult(manifest=manifest, audio_ids_copied=len(audio_ids))


@dataclass
class BeatmapResult:
    beatmap: dict
    report: str


def score_and_write_beatmap(script: dict, manifest: dict, beatmap_path: str) -> BeatmapResult:
    beatmap = score_beatmap(script, manifest)
    write_beatmap(beatmap, beatmap_path)
    report = beatmap_report(beatmap)
    logger.info("\n%s", report)
    logger.info(
        "Beat map written to %s — view it in Studio with "
        "REMOTION_BEAT_MAP=1 npx remotion studio (run from remotion/)",
        beatmap_path,
    )
    return BeatmapResult(beatmap=beatmap, report=report)


@dataclass
class DeadAirResult:
    findings: list


def check_dead_air(script: dict, manifest: dict, audio_durations: dict) -> DeadAirResult:
    findings = detect_dead_air(script, manifest, audio_durations)
    if findings:
        logger.warning("Dead air warnings:")
        for f in findings:
            logger.warning(
                "  - %s: %d frames (%ss) of dead air after audio ends",
                f["scene_id"], f["dead_air_frames"], f["dead_air_seconds"],
            )
    return DeadAirResult(findings=findings)


@dataclass
class RenderResult:
    video_output: str


def render_video(manifest: dict, video_output: str) -> RenderResult:
    os.makedirs(os.path.dirname(video_output), exist_ok=True)
    if os.path.exists(video_output):
        os.remove(video_output)
        logger.info("Deleted old video: %s", video_output)
    render_video_chunked(manifest, video_output)
    logger.info("Video rendered to %s", video_output)
    return RenderResult(video_output=video_output)


@dataclass
class ThumbnailResult:
    generated: bool
    error: str | None


def generate_thumbnail_step(script_path: str, video_output: str) -> ThumbnailResult:
    try:
        from vidgen.presentation.thumbnail_renderer import generate_thumbnail

        generate_thumbnail(script_path, video_output.replace(".mp4", "_thumb.png"))
        return ThumbnailResult(generated=True, error=None)
    except Exception as e:
        logger.warning("Thumbnail generation failed (non-fatal): %s", e)
        return ThumbnailResult(generated=False, error=str(e))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_pipeline_steps.py -v`
Expected: PASS (16 passed)

- [ ] **Step 5: Commit**

```bash
git add vidgen/pipeline/pipeline_steps.py tests/test_pipeline_steps.py
git commit -m "feat: add manifest/beatmap/dead-air/render/thumbnail pipeline steps"
```

---

### Task 5: Rewire `video_pipeline.py` to call the steps with checkpoint skipping

**Files:**
- Modify: `vidgen/pipeline/video_pipeline.py`
- Test: manual end-to-end run (no new automated test — this task wires
  existing tested pieces together; correctness here is behavioral parity,
  verified by running the real pipeline).

**Interfaces:**
- Consumes: everything produced in Tasks 1-4 (`pipeline_state` module,
  all step functions/dataclasses from `pipeline_steps`).
- Produces: `main()` — same CLI contract as before (same args, same
  observable outputs), used by any external caller/script invoking
  `python -m vidgen.pipeline.video_pipeline` or `main()` directly.

- [ ] **Step 1: Rewrite `video_pipeline.py`**

```python
# vidgen/pipeline/video_pipeline.py
import argparse
import logging
import os
import socket
import subprocess
import time
import webbrowser
from pathlib import Path

from vidgen.config.project_paths import CONTENT_JSON_DIR, OUTPUT_DIR, REMOTION_DIR
from vidgen.audio.speech_synthesizer import DEFAULT_VIENEU_VOICE
from vidgen.pipeline import pipeline_steps as steps
from vidgen.pipeline.pipeline_state import compute_input_hash, load_state, save_state

WAV_DIR = OUTPUT_DIR / "audio" / "wav"
REMOTION_PUBLIC_AUDIO = REMOTION_DIR / "public" / "audio"
MANIFEST_PATH = OUTPUT_DIR / "render_manifest.json"
BEATMAP_PATH = OUTPUT_DIR / "beatmap.json"
VIDEO_OUT_DIR = REMOTION_DIR / "out"
STATE_PATH = OUTPUT_DIR / "pipeline_state.json"
STUDIO_PORT = 3000

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)


def _port_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex(("localhost", port)) == 0


def launch_studio(port: int = STUDIO_PORT) -> None:
    if not _port_open(port):
        studio_env = {**os.environ, "REMOTION_BEAT_MAP": "1"}
        subprocess.Popen(
            ["npx", "remotion", "studio"],
            cwd=REMOTION_DIR,
            env=studio_env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        logger.info("Starting Remotion Studio (beat map overlay on)...")
        while not _port_open(port):
            time.sleep(1)
    webbrowser.open(f"http://localhost:{port}")
    logger.info("Opened Remotion Studio at http://localhost:%d", port)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("script", nargs="?", default=str(CONTENT_JSON_DIR / "sample_script.json"))
    parser.add_argument("--skip-validation", action="store_true",
                         help="Skip pre-render manifest validation (emergency use only)")
    parser.add_argument("--speed", type=float, default=1.1,
                         help="Voiceover speed multiplier, pitch-preserved (1.0 = VieNeu native pace)")
    parser.add_argument("--tts-voice", default=None, help="VieNeu preset voice name")
    parser.add_argument("--reuse-tts", action="store_true",
                         help="Reuse existing WAV files instead of synthesizing them again")
    parser.add_argument("--prebuilt-audio-dir", default=None,
                         help=("Directory of prebuilt per-scene WAV files (e.g. input/audio/wav). "
                               "Each scene's audio is looked up by filename — scene_01_shout_through_wall "
                               "uses scene_01_shout_through_wall.wav. When set, no TTS is synthesized for "
                               "any scene that has a matching file in this directory."))
    parser.add_argument("--no-trim", action="store_true",
                         help="Keep TTS silence (leading/trailing and long internal pauses)")
    parser.add_argument("--target-dbfs", type=float, default=-15.0,
                         help="Normalize every voiceover clip to this RMS level in dBFS (soft-limited)")
    args = parser.parse_args()

    state = load_state(STATE_PATH)

    load_result = steps.load_and_validate_script(args.script, args.skip_validation)
    script = load_result.script

    tts_voice = args.tts_voice or os.getenv("VIDGEN_TTS_VOICE") or DEFAULT_VIENEU_VOICE
    logger.info("[TTS] provider=vieneu, voice=%s", tts_voice)

    script_stem = Path(args.script).stem
    if script_stem.startswith("script_"):
        script_stem = script_stem[len("script_"):]
    video_output = os.path.abspath(f"{VIDEO_OUT_DIR}/{script_stem}.mp4")

    jobs = steps.build_tts_jobs(script, args.speed)

    tts_hash = compute_input_hash(
        [(j.id, j.text, j.speed) for j in jobs], tts_voice, args.reuse_tts,
        args.prebuilt_audio_dir, args.no_trim, args.target_dbfs,
    )
    tts_entry = state.get("synthesize_tts")
    wav_files_present = all(
        os.path.exists(f"{WAV_DIR}/{steps.wav_filename(j.id)}") for j in jobs
    ) if hasattr(steps, "wav_filename") else False
    if tts_entry and tts_entry["input_hash"] == tts_hash and wav_files_present:
        logger.info("synthesize_tts: skipped (checkpoint match)")
    else:
        steps.synthesize_tts(
            jobs, str(WAV_DIR), tts_voice, args.reuse_tts, args.prebuilt_audio_dir,
            args.no_trim, args.target_dbfs,
        )
        state.set("synthesize_tts", tts_hash, {"job_ids": [j.id for j in jobs]})
        save_state(state, STATE_PATH)

    fps = script.get("fps", 30)
    steps.fit_durations(script, str(WAV_DIR), fps)

    audio_durations = steps.measure_audio_durations(jobs, str(WAV_DIR))
    logger.info("Total audio duration: %.2fs", sum(audio_durations.values()))

    if not args.no_trim or any(abs(j.speed - 1.0) > 1e-9 for j in jobs):
        script, changes = steps.tighten_scene_durations(script, audio_durations, fps, jobs)
        for c in changes:
            logger.info("%s: duration %d -> %d frames", c.scene_id, c.old_frames, c.new_frames)

    audio_ids = [j.id for j in jobs]
    manifest_result = steps.write_manifest_step(
        script, audio_durations, str(MANIFEST_PATH), str(WAV_DIR),
        str(REMOTION_PUBLIC_AUDIO), audio_ids,
    )
    manifest = manifest_result.manifest

    steps.score_and_write_beatmap(script, manifest, str(BEATMAP_PATH))
    steps.check_dead_air(script, manifest, audio_durations)

    steps.render_video(manifest, video_output)
    steps.generate_thumbnail_step(args.script, video_output)

    save_state(state, STATE_PATH)
    launch_studio(STUDIO_PORT)


if __name__ == "__main__":
    main()
```

Note: `steps.wav_filename` doesn't exist on the `pipeline_steps` module —
fix the checkpoint-presence check to import `wav_filename` directly instead:
add `from vidgen.pipeline.render_manifest_builder import wav_filename` to
`video_pipeline.py`'s imports and simplify:

```python
    wav_files_present = all(
        os.path.exists(f"{WAV_DIR}/{wav_filename(j.id)}") for j in jobs
    )
```

Remove the `hasattr(steps, "wav_filename")` branch — it was a placeholder
guard and must not remain.

- [ ] **Step 2: Type-check and byte-compile sanity check**

Run: `python -m py_compile vidgen/pipeline/video_pipeline.py vidgen/pipeline/pipeline_steps.py vidgen/pipeline/pipeline_state.py`
Expected: no output, exit code 0.

- [ ] **Step 3: Run full pytest suite**

Run: `pytest -v`
Expected: all tests pass, including the pre-existing suite
(`test_chunked_video_renderer.py`, `test_render_manifest_builder.py`, etc.)
and the new `test_pipeline_state.py` / `test_pipeline_steps.py`.

- [ ] **Step 4: Run the real pipeline end-to-end against an existing script**

Run: `/Users/haunguyen/miniconda3/bin/python -m vidgen.pipeline.video_pipeline content/json/<an existing script>.json --reuse-tts`
(use `--reuse-tts` for this smoke test to keep it fast; pick any existing
script under `content/json/`)
Expected: completes without traceback, logs each step, writes
`output/render_manifest.json`, `output/beatmap.json`,
`output/pipeline_state.json`, and the rendered MP4 under
`remotion/out/`. Compare `output/render_manifest.json` against a copy taken
before this change (same script/flags) to confirm byte-for-byte identical
output — this is the parity check for the refactor.

- [ ] **Step 5: Run it a second time to confirm checkpoint skip**

Run the same command again.
Expected: log line `synthesize_tts: skipped (checkpoint match)` appears
(TTS hash and WAV files unchanged from step 4).

- [ ] **Step 6: Run `npx --prefix remotion tsc --noEmit -p remotion/tsconfig.json`**

Expected: no errors (no Remotion/TS files touched by this refactor, but this
confirms nothing else broke).

- [ ] **Step 7: Delete leftover WAVs from the smoke-test render per CLAUDE.md**

Per the project's Remotion Production Reliability rule, delete the WAV files
under `public/audio` used by the Step 4/5 smoke-test render once the MP4 is
verified — they're intermediate build artifacts. Confirm with the user
before deleting if there's any doubt they're from this test run and not a
prior deliverable.

- [ ] **Step 8: Commit**

```bash
git add vidgen/pipeline/video_pipeline.py
git commit -m "refactor: rewire video_pipeline main() to use checkpointed steps"
```

---

## Self-Review Notes

- **Spec coverage:** every architecture item in the spec (steps 1-12, state
  file, logging, file layout) maps to Task 1 (state), Task 2 (pure
  helpers), Task 3 (I/O steps: load/TTS/fit/measure), Task 4 (manifest/
  beatmap/dead-air/render/thumbnail), Task 5 (rewired `main()` +
  `launch_studio`). Non-goals (render/thumbnail/studio not checkpointed) are
  respected — only `synthesize_tts` is gated by the state file in Task 5;
  render and thumbnail always run, matching the spec.
- **Type consistency:** `TTSJob`, `DurationChange`, `LoadResult`,
  `TTSResult`, `FitResult`, `ManifestResult`, `BeatmapResult`,
  `DeadAirResult`, `RenderResult`, `ThumbnailResult` are each defined once
  (Tasks 2-4) and referenced by the same names/fields in Task 5's `main()`.
- **Placeholder fix applied inline:** Task 5 originally sketched a
  `hasattr(steps, "wav_filename")` guard; corrected within the task to a
  direct import instead, since leaving a `hasattr` placeholder would silently
  disable the checkpoint-presence check.
