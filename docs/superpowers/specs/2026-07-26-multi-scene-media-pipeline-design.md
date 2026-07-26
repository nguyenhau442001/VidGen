# Multi-Scene Media Pipeline: Real Footage + Generic Screenshot

## Problem

VidGen's pipeline today only produces graphic/animated scenes rendered from React components (`remotion/src/scenes/*.tsx`), driven by a shot's `type` + `props` in `content/json/<slug>.json`. There is no way to embed:

1. Real footage — screen recordings or phone-camera video clips shot by hand.
2. Screenshots, beyond two narrow, hardcoded scenes (`GrabFoodScreenshotScene`, `HSKScreenshotScene`) each tailored to one specific image.

This spec adds two new scene types to the existing type system so authored scripts can mix graphic scenes, screenshots, and real video footage within the same video, using the same TTS/manifest/render pipeline already in place.

## Scope

In scope: a `real_footage` shot type (full-shot embedded video clip) and a generic `screenshot` shot type (replaces bespoke-scene creation for screenshots going forward, per the Scene Library Freeze). Ingestion via a new `content/media/<slug>/` source directory, auto-copied to `remotion/public/` at manifest-build time, mirroring how audio is handled today.

Out of scope (YAGNI, no current need): picture-in-picture/background video under graphic overlays, video transcoding/resizing, letterboxing, multi-track audio mixing beyond mute-vs-original.

## Shot Schemas

### `real_footage`

```json
{
  "id": "shot_04",
  "type": "real_footage",
  "narration": "Đây là màn hình thật khi mình bấm nút này...",
  "props": {
    "mediaPath": "video/screen_recording_01.mp4",
    "useOriginalAudio": false,
    "trimStartSeconds": 0,
    "trimEndSeconds": null,
    "objectPosition": "center"
  }
}
```

- `mediaPath` (required): path resolved relative to `remotion/public/` after ingestion copy, same convention as `screenshotPath`/`imageSrc` today.
- `narration` present (default/common case): normal TTS pipeline applies unchanged (job creation, synthesis, duration fitting); the clip's own audio track is rendered muted so it never competes with the voice-over.
- `narration` absent **and** `props.useOriginalAudio: true`: no TTS job is generated for this shot; the clip's original audio plays; `durationInFrames` is derived from the clip's real duration (via `ffprobe`) instead of audio duration.
- It is invalid for a shot to have neither `narration` nor `useOriginalAudio: true` — no audio source at all. Validation must reject this combination.
- `trimStartSeconds` / `trimEndSeconds` (optional): select a sub-range of a longer source clip.
- `objectPosition` (optional, default `"center"`): passed through to the cover-fit crop for off-center framing (e.g. a phone recording where the relevant UI isn't centered).

**Narration-fits-footage constraint**: when `narration` is present, its estimated speaking time (`word_count / 4.2 WPS`, matching the project's existing pacing target) must not exceed the clip's real ffprobe duration. If it does, the pipeline must fail fast with a clear message naming the shot id, estimated narration seconds, and actual clip seconds, asking the user to shorten narration or supply a longer clip. No freeze-frame, loop, or padding fallback — a clip that's too short for its narration is an authoring error to fix, not a runtime effect to paper over.

### `screenshot`

```json
{
  "id": "shot_02",
  "type": "screenshot",
  "narration": "...",
  "props": {
    "imagePath": "images/app_screen_01.png",
    "chrome": "phone",
    "headline": "Giao diện thật",
    "accentWord": "thật",
    "badgeText": null,
    "spotlight": [
      {"x": 0.12, "y": 0.30, "w": 0.5, "h": 0.08, "startFrame": 30, "endFrame": 90}
    ]
  }
}
```

- `imagePath` (required): resolved relative to `remotion/public/` after ingestion copy.
- `chrome`: `"phone" | "browser" | "none"` — replaces the two hardcoded frame styles used by the two existing bespoke scenes.
- `spotlight` (optional): array of fractional boxes (0–1 of image bounds, not pixel coordinates) with frame ranges, generalizing `GrabFoodScreenshotScene`'s hardcoded `FOCUS_AREAS` so the pan/evidence-highlight effect works on any screenshot, not one hand-tuned image.
- `headline` / `accentWord` / `badgeText` (all optional): same semantics as the two existing scenes.

This is a new, additional generic scene — `GrabFoodScreenshotScene` and `HSKScreenshotScene` and their two live JSON usages (`grabfood_wait_time_p1.json`, `hsk_flashcard.json`) are left untouched. No migration. Going forward, new screenshot needs should use `screenshot`, not a new bespoke scene, consistent with the Scene Library Freeze.

## Ingestion: `content/media/<slug>/` → `remotion/public/`

- New source convention: raw screenshots/clips live in `content/media/<slug>/` (e.g. `content/media/grabfood_wait_time_p1/screen_recording_01.mp4`), not committed directly into `remotion/public/` by hand.
- New function `copy_media_to_remotion_public(script, media_dir)` in `vidgen/pipeline/render_manifest_builder.py`, invoked from `write_manifest_step()` alongside the existing `copy_audio_to_remotion_public()`. For every `real_footage`/`screenshot` shot, resolves `mediaPath`/`imagePath` against `content/media/<slug>/`, copies into `remotion/public/video/` or `remotion/public/images/` respectively, and leaves the prop's public-relative path unchanged for `staticFile()` resolution.
- Missing source file → hard fail immediately (same fail-fast posture as a missing WAV file), not a silent blank shot.
- No transcoding/resizing/normalization in this pass.

## Pipeline Wiring

Two new steps in `vidgen/pipeline/pipeline_steps.py`, wired into `video_pipeline.main()`:

1. **`measure_media_durations(script, media_dir) -> dict[shot_id, seconds]`** — runs after `load_and_validate_script`, before TTS. For each `real_footage` shot with `useOriginalAudio: true`, runs `ffprobe -v error -show_entries format=duration -of json <file>` against the resolved source file and returns its real duration. Feeds into the same duration-selection precedence `build_render_manifest()` already uses (authored `duration_frames` → measured seconds → 3s fallback) — no parallel code path needed.
2. **`check_footage_fit(script, media_dir) -> None`** (parallel to `check_dead_air`, but blocking) — runs after `measure_media_durations`, before TTS synthesis. For every `real_footage` shot with `narration` present, estimates narration seconds from word count / 4.2 WPS, compares against the clip's real ffprobe duration, and raises with shot id + both durations if narration would overrun the clip. Runs before TTS synthesis so it fails fast rather than after burning TTS calls.

`build_tts_jobs()` requires no changes: it already only creates a job when a shot has narration/dialogue text, so `useOriginalAudio` shots are skipped automatically.

`copy_media_to_remotion_public()` runs inside `write_manifest_step()`, same step as the audio copy.

## Remotion Components

**`RealFootageScene.tsx`** (new):
- Props: `mediaPath, useOriginalAudio?, trimStartSeconds?, trimEndSeconds?, objectPosition?, durationInFrames`.
- Renders `<OffthreadVideo src={staticFile(mediaPath)} startFrom={trimStartSeconds*fps} endAt={trimEndSeconds*fps} muted={!useOriginalAudio} style={{objectFit:"cover", objectPosition}} />`, filling the full 1080×1920 frame (crop-to-fill, no letterboxing).
- When muted (default/TTS case), the shot's TTS WAV plays through the existing per-shot `audioPath` mechanism in `TikTokVideo.tsx`, unchanged.

**`ScreenshotScene.tsx`** (new, generic):
- Props: `imagePath, chrome, headline?, accentWord?, badgeText?, spotlight?[], durationInFrames`.
- `chrome` switches frame styling (`phone`/`browser`/`none`); `spotlight` boxes drive an optional pan/highlight overlay generically via fractional coordinates + frame ranges instead of hardcoded pixel boxes.

## Registration (three-way sync)

Both new types go through the existing required sync, then the drift checker:

- `remotion/src/types.ts`: add `RealFootageVisual`/`RealFootageSceneProps`, `ScreenshotVisual`/`ScreenshotSceneProps`, and their `ManifestScene` union members.
- `remotion/src/TikTokVideo.tsx`: import both components; add `case "real_footage"` / `case "screenshot"` branches in `SceneRenderer`.
- `vidgen/pipeline/render_manifest_builder.py`: register `"real_footage"` and `"screenshot"` (as `DIRECT_SNAKE_CASE_SCENE_TYPES` entries, since they're authored directly in snake_case, consistent with other recent additions like `animated_flow`).
- Run `python -m vidgen.pipeline.check_scene_types` after registration to confirm no drift between Python and TS.

## Error Handling Summary

- Missing media source file → hard fail at ingestion copy step, before TTS/render.
- `real_footage` shot with neither `narration` nor `useOriginalAudio: true` → validation error at script-load/validation time.
- Narration estimated to exceed real clip duration → hard fail at `check_footage_fit`, before TTS synthesis, naming the shot and both durations.
- Vertical/aspect mismatch → handled generically via `objectFit: cover` + optional `objectPosition`; no letterboxing path.

## Testing

- `copy_media_to_remotion_public`: missing file raises; correct destination path per media type; existing files not clobbered incorrectly.
- `measure_media_durations`: ffprobe output parsing (mocked subprocess), correct mapping to shot id.
- `check_footage_fit`: passes when narration fits, raises with correct shot id/durations when it doesn't; skipped entirely for shots without narration.
- `render_manifest_builder`: both new types resolve through `TYPE_MAP`/`DIRECT_SNAKE_CASE_SCENE_TYPES`; duration selection prefers authored → measured → fallback correctly.
- `check_scene_types.py` passes (no drift) after TS registration.
- Manual Studio visual check of both new scenes with a real sample clip and screenshot at 1080×1920 — overflow, crop framing, spotlight alignment, chrome rendering — per the project's mandatory visual-inspection rule before any render is considered done.
