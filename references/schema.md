# VidGen Schema Reference

This repo uses a shot-first script contract: the live pipeline reads `content/*.json`, resolves the script, then builds a render manifest for Remotion.

## Top-level script fields

Required:

- `shots` - list of authored shots/scenes

Common:

- `title` - human-readable title
- `language` - usually `vi`
- `fps` - optional override, otherwise default 30

Legacy / optional metadata seen in `content/`:

- `video_id`
- `narration_language`
- `estimated_duration_seconds`
- `soundtrack`
- `editorial_notes`
- `meta`

## Shot fields

Common shot fields in this repo:

- `id` - stable shot identifier
- `type` - scene type, either snake_case manifest key or PascalCase component name
- `narration` - approved narration text
- `duration_frames` - authored duration
- `narration_timing_frames` - `[start, end]`
- `props` - main visual payload used by the render builder
- `visual` - legacy alias that some older files still use
- `on_screen_text`
- `transition_out_delay_frames`
- `sound_design`
- `tts_speed`
- `narration_per_criterion`

## Practical rules

- `shots` is the authoritative container.
- `props` is the preferred visual field; `visual` remains a compatibility alias in older scripts.
- `type` is validated by `vidgen/pipeline/render_manifest_builder.py`.
- Some scripts still mix in `meta` or other top-level notes; those are tolerated by the pipeline, but they make the folder harder to scan by eye.
