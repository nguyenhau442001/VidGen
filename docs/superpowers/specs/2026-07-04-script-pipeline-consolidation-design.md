# Script Pipeline Consolidation Design

**Date:** 2026-07-04
**Status:** Implemented

---

## Overview

The VidGen design is: drop one authored script into `content/`, run `vidgen/main.py` on it, get a rendered video out — nothing else lives in `content/` per video. That principle had drifted (a manual conversion step was producing a second file per video); this work restored it and fixed a couple of content issues found along the way.

## Goals

- One file per video in `content/` — the authored script — full stop.
- `python -m vidgen.main content/script_<name>.json` works end-to-end regardless of which schema (flat or nested motion-pipeline-1.0) the script uses, with no manual conversion step.
- All conversion logic lives directly in `vidgen/main.py` — no separate module to run by hand.

## Non-goals

- No motion-pipeline-1.0 nested-schema authoring for `grab_dispatch_p1`. Its script uses the flat schema, matching every other script in `content/`.
- No wiring up of `on_screen_text_at_frame` — carried over as authored intent but not read anywhere in `manifest.py` or the Remotion components yet. (`on_screen_text_style` *is* now wired up, as a `captionStyle` passthrough to `Caption.tsx`'s preset system — see the `headline_bold` caption preset work.)

---

## Architecture

```
content/script_<name>.json          ← the ONLY file authored/checked in per video
         │
         ▼
[Python: vidgen/main.py]
  0. Load script JSON
  1. If "sequences" in script: flatten_script(script) → flat scenes[] schema (in-memory, no file written)
  2. Synthesize per-scene WAV        → output/audio/wav/scene_N.wav
  3. Measure audio durations
  4. Write render manifest           → output/render_manifest.json
  5. Call: npx remotion render ... --concurrency=100%
         │
         ▼
[Remotion: remotion/]  (unchanged)
```

`output/render_manifest.json` is the sole handoff contract to Remotion, and stays gitignored/disposable — nothing generated ever needs to live in `content/`.

### Script format

Every file in `content/` shares the same top-level envelope: `title`, `language`, `scenes[]`. Scenes are authored either directly in this flat shape (`type`, `props`, `duration_frames`, `narration`, ...), or in the richer nested motion-pipeline-1.0 shape (`assets{}` + `sequences[].shots[]`) that `flatten_script()` converts in-memory before the rest of the pipeline runs.

## Code (`vidgen/main.py`)

- `flatten_script(script: dict) -> dict` converts the nested schema into flat `scenes[]`, along with its private helpers (`_anims`, `_first_asset_of_type`, `_resolve_map_dot_ids`, `_resolve_label`, `_resolve_highlight`, `_resolve_accent_color`, the `_build_*_props` functions, `PROP_BUILDERS`).
- `resolve_script(script: dict) -> dict` auto-detects: `flatten_script(script)` if `"sequences" in script`, otherwise passes the script through unchanged.
- The script body (TTS synthesis, manifest build, Remotion render, Studio launch) lives in `main()`, guarded by `if __name__ == "__main__":` — this keeps the module import-safe (no TTS init or real render as a side effect of import), which is what makes `resolve_script`/`flatten_script` unit-testable.
- No dry-run/preview flag — a full run (TTS + manifest + render) is the only mode.

`vidgen/manifest.py` is unchanged — it already consumes the flat schema regardless of where it came from.

---

## Content fixed along the way

- `content/script_grab_dispatch_p1.json`'s shot_01a/01b adopted a richer opening hook (topic badge, part indicator, rejected/selected distance pins) that had been drafted but never merged into the canonical script, even though the `CharacterIconScene.tsx` code to render it already existed.
- `CharacterIconScene`'s character was rendering 30px left of true frame-center (`CHAR_X` didn't match the SVG canvas's own midpoint) — invisible until the new frame-centered topic badge/part indicator gave it something to visually clash against. Fixed by centering `CHAR_X` on the canvas midpoint and shifting `ICON_X` by the same offset.
- Added `CharacterIconCoverScene`, a cover-frame variant of `CharacterIconScene` for series/part branding, registered as its own demo composition in `Root.tsx`.

---

## Testing

`tests/test_main.py` covers `resolve_script`'s two branches: flat-schema input passes through unchanged, nested-schema input gets flattened. `tests/test_manifest.py` is unaffected — it only exercises `build_render_manifest`, which didn't change.
