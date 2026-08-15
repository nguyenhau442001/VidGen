# VidGen Schema Reference

This repo uses a two-file authoring contract:

- `content/text/<slug>.txt` is the human-approved source of truth.
- VidGen reads that TXT and generates `content/json/<slug>.json` using the shot-first schema below.

The generated JSON is audited before any TTS or render work. Only after explicit user approval does the live render pipeline read it and build a Remotion manifest.

## TXT source contract

The TXT is a UTF-8 Markdown-style production script. It should include a title and ordered scenes. Each scene may contain:

- `Hình ảnh` — the approved visual direction
- `Chữ ... trên màn hình` — authored on-screen copy
- `Voice-over` — approved narration

VidGen may translate visual direction into registered scene types and schema-valid `props`, but must not paraphrase, shorten, reorder, or invent voice-over. Multiple voice-over paragraphs in one scene are joined in their authored order. If the TXT is ambiguous or cannot map safely to the current shot library, stop and report the gap instead of silently changing the script.

The source and output stems must match exactly:

```text
content/text/grabfood_wait_time_p1.txt
                      ↓
content/json/grabfood_wait_time_p1.json
```

## Top-level script fields

Required:

- `shots` - list of authored shots/scenes

Common:

- `title` - human-readable title
- `language` - usually `vi`
- `fps` - optional override, otherwise default 30

Legacy / optional metadata seen in `content/json/`:

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
