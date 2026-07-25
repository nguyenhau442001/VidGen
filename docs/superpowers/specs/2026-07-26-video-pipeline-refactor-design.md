# video_pipeline.py refactor: testable, checkpointed steps

## Problem

`vidgen/pipeline/video_pipeline.py` is a single ~300-line `main()` that does
everything: parse args, resolve/validate the script, build TTS jobs, run them
in a `ThreadPoolExecutor`, fit WAVs to duration, tighten scene durations,
write the render manifest, score the beatmap, detect dead air, render video,
generate a thumbnail, and launch Remotion Studio in a browser. All state is
local to the function, all progress reporting is `print()`, and there is no
structured way to know which step failed or to resume without the manual
`--reuse-tts` / `--prebuilt-audio-dir` flags. This makes it untestable (side
effects — filesystem, sockets, subprocess, browser — are inlined into
business logic) and unsafe to run unattended: a crash between TTS and
manifest write requires reading logs to figure out what to rerun.

## Goals

- Testability: pure business logic (building TTS jobs, tightening durations)
  becomes directly unit-testable with no mocking, matching the existing style
  in `tests/test_render_manifest_builder.py` and `tests/test_retention_beatmap.py`.
- Checkpoint/resume: an interrupted run can be resumed automatically without
  manual flags, by skipping steps whose recorded inputs still match.
- Structured logging: replace `print()` with the standard `logging` module.
- No behavior change to the actual pipeline outputs (manifest, beatmap,
  rendered video, thumbnail) — this is an internal restructuring.

## Non-goals

- Changing TTS synthesis, duration-fitting math, manifest schema, beatmap
  scoring, or rendering logic itself.
- Adding a new task queue, distributed execution, or CLI subcommands.
- Checkpointing the video render step — `chunked_video_renderer.py` already
  caches per-scene chunks by content hash; it's naturally resumable/idempotent
  without help from the new state file.
- Checkpointing thumbnail generation — it's cheap, always reruns, stays a
  non-fatal try/except exactly as today.
- Checkpointing Studio launch — it's a UX convenience with no artifact to
  verify or resume; stays a separate, non-checkpointed function called last.

## Architecture

### New file: `vidgen/pipeline/pipeline_steps.py`

Holds the step functions and their result dataclasses. Each step:

- Takes explicit typed inputs (script dict, args, paths) — no reliance on
  closures over `main()`'s locals.
- Performs its I/O (filesystem/subprocess/thread pool) internally, but keeps
  the computational core (job list construction, duration math) in separate
  pure helper functions so those helpers can be tested without I/O.
- Returns a small `@dataclass` result capturing what happened (ids produced,
  durations, counts, warnings) instead of only printing.
- Logs via `logging.getLogger(__name__)`.

Steps, in pipeline order:

1. `load_and_validate_script(script_path, skip_validation) -> LoadResult`
   Parses JSON, resolves script, strips the reserved thumbnail shot
   (`shots[0]` when it's `HSKFlashCardThumbnailScene`), validates unless
   skipped. Returns the resolved script dict.
2. `build_tts_jobs(script, base_speed) -> list[TTSJob]`
   Pure function (already close to pure in the current code) — no I/O.
3. `synthesize_tts(jobs, tts_voice, args) -> TTSResult`
   Runs the existing `ThreadPoolExecutor` synth loop (including
   `--reuse-tts` / `--prebuilt-audio-dir` short-circuits). Returns job ids
   processed and elapsed time.
4. `fit_durations(script, fps) -> FitResult`
   Both existing fit-to-duration passes (narration windows, dialogue
   windows), unchanged math, wrapped as one step.
5. `measure_audio_durations(jobs) -> dict[str, float]`
   Reads WAV headers, returns the `audio_durations` dict (was inline in
   `main()`).
6. `tighten_scene_durations(script, audio_durations, fps, jobs) -> TightenResult`
   Pure duration math extracted from the current inline loop, returns the
   updated script plus a list of `(scene_id, old_frames, new_frames)`
   changes for logging.
7. `write_manifest_step(script, audio_durations, manifest_path) -> ManifestResult`
   Wraps `build_render_manifest` + `write_render_manifest` +
   `copy_audio_to_remotion_public`.
8. `score_and_write_beatmap(script, manifest, beatmap_path) -> BeatmapResult`
9. `check_dead_air(script, manifest, audio_durations) -> DeadAirResult`
   (advisory only, never raises — same as today)
10. `render_video(manifest, video_output) -> RenderResult`
    Thin wrapper around existing `render_video_chunked` (unchanged; already
    cached).
11. `generate_thumbnail_step(script_path, video_output) -> ThumbnailResult`
    Same non-fatal try/except as today, always runs, not checkpointed.
12. `launch_studio(port) -> None`
    Existing `_port_open` + `subprocess.Popen` + `webbrowser.open` logic,
    unchanged, called directly from `main()` after all steps — not part of
    the step/checkpoint list.

### New file: `vidgen/pipeline/pipeline_state.py`

- `PipelineState`: dataclass/JSON schema recording, per step name: an input
  hash and a small summary of the result needed to skip recomputation (e.g.
  step name → `{"input_hash": ..., "result": {...}}`).
- `compute_input_hash(**relevant_fields) -> str`: stable hash (e.g. sha256 of
  a canonical JSON encoding) of the fields that determine whether a step's
  prior output is still valid (e.g. for `synthesize_tts`: the job list,
  voice, speed, trim/dbfs flags; for `write_manifest_step`: the script content
  and audio_durations).
- `load_state(path) -> PipelineState | None`, `save_state(state, path) -> None`.
- Written to `output/pipeline_state.json` after each of steps 1–9 succeeds.
- Before running a step, `main()` computes that step's input hash; if it
  matches the recorded hash **and** the step's expected output artifacts
  still exist on disk (e.g. manifest file, beatmap file, WAVs), the step is
  skipped and its recorded result is reused, with a log line noting the skip.
  Otherwise it runs normally and overwrites that entry.
- `--reuse-tts` / `--prebuilt-audio-dir` remain as explicit manual overrides
  for the TTS step specifically; they are no longer the only way to resume.

### `video_pipeline.py` becomes thin

Keeps `argparse` setup and `main()`, which now just: parses args, calls the
steps in sequence, threads state between them, saves `PipelineState` after
each, and on an unhandled exception logs which step failed (state up to that
point is already saved on disk) and re-raises. `launch_studio()` is called
last, unconditionally, outside the checkpointed sequence.

## Testing

- `tests/test_pipeline_steps.py` (new): unit tests for pure helpers
  (`build_tts_jobs`, `tighten_scene_durations`, `compute_input_hash`) with no
  I/O or mocking, following the existing style (plain dict fixtures, direct
  function calls, `assert`).
- `tests/test_pipeline_state.py` (new): round-trip save/load, hash-mismatch
  triggers rerun, matching artifacts + matching hash triggers skip — using
  `tmp_path`.
- I/O-touching steps (`synthesize_tts`, `write_manifest_step`) get thin tests
  using `tmp_path` for output dirs, following the pattern already used for
  filesystem-touching code in this repo (no new mocking framework).
- No changes to end-to-end behavior, so existing manual verification (render
  a real script, `ffprobe` the output) remains the final check per
  `CLAUDE.md`'s Remotion Production Reliability rules — this refactor doesn't
  change what gets rendered.

## Verification plan for this change itself

- `npx --prefix remotion tsc --noEmit -p remotion/tsconfig.json` — n/a (no
  Remotion/TS changes), but run anyway to confirm the refactor didn't touch
  compiled paths.
- `pytest tests/test_pipeline_steps.py tests/test_pipeline_state.py` plus
  full `pytest` run to ensure no regressions in sibling modules
  (`render_manifest_builder`, `chunked_video_renderer` callers).
- Run the real pipeline end-to-end once against an existing script JSON to
  confirm identical manifest/beatmap/video output to before the refactor,
  then a second run to confirm checkpoint skip messages appear for
  already-completed steps.
