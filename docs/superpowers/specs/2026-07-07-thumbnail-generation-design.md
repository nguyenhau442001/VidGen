# Thumbnail Generation Design

**Date:** 2026-07-07
**Status:** Proposed

---

## Overview

Every video currently gets its cover thumbnail by hand: someone hand-writes bespoke `line1/line2/line3` copy for the `CharacterIconCover` composition and runs `npx remotion still CharacterIconCover ...` manually. This work adds a second, fully automated path: a new `ThumbnailScene` Still composition plus a `vidgen/thumbnail.py` module that derives thumbnail copy directly from a script JSON's hook scene (`scenes[0]`) and renders it with no manual authoring step, wired into `vidgen/main.py` so every render gets a thumbnail for free.

The two paths are **not consolidated** in this pass — `CharacterIconCover` is left exactly as-is (grab_dispatch parts 1–2 covers already rendered from it; parts 3–4 may still use it). This system is additive, decoupled from it entirely, and the choice of which system to use per-video is left open for later.

## Goals

- `ThumbnailScene.tsx` — a new Still composition (id `"Thumbnail"`), 1080×1920, rendering a generic map-pin/car hook-driven layout from arbitrary headline/subtext/accent-word props.
- `vidgen/thumbnail.py` — parses a script JSON's `scenes[0]` into those props and renders the still via the Remotion CLI, callable as a library function, a `python -m vidgen.thumbnail <script>` CLI, and an automatic (non-fatal) step at the end of `vidgen/main.py`'s render.
- Prop-extraction logic (headline/accentWord/subtext/partLabel) is a pure function, unit-tested without invoking Remotion.

## Non-goals

- No changes to `CharacterIconCover`, its Root.tsx registration, or the grab_dispatch p1/p2 renders already in `output/thumbnails/`.
- No UI/CLI to pick which of the two thumbnail systems runs for a given script — that decision is out of scope here.
- No retroactive thumbnail generation for scripts already rendered.

---

## Architecture

```
content/script_<name>.json
         │  scenes[0] (hook scene)
         ▼
[Python: vidgen/thumbnail.py]
  _extract_thumbnail_props(script, scene_index) -> dict   (pure, unit-tested)
  generate_thumbnail(script_path, output_path, ...)
    1. load + extract props
    2. subprocess: npx remotion still Thumbnail <abs_output_path> --props=<inline json>
                    (cwd="remotion", mirrors chunked_render.py's remotion_dir convention)
         │
         ▼
[Remotion: remotion/src/scenes/ThumbnailScene.tsx]   registered in remotion/src/Root.tsx
  → PNG at output/thumbnails/<slug>_thumb.png
```

Hooked into `vidgen/main.py`: after the existing render line (`render_video_chunked(manifest, video_output)` / `print(f"Video rendered to {video_output}")`), call `generate_thumbnail(args.script, video_output.replace(".mp4", "_thumb.png"))` inside a `try/except` that logs and swallows any error — thumbnail generation must never fail the video render.

---

## `remotion/src/scenes/ThumbnailScene.tsx`

Portrait 1080×1920 Still, layered back-to-front exactly per the original layout spec (grid background → radial glow → part badge → pin/car/dashed-line visual → headline block → subtext → brand bar → bottom scrim), with these adaptations to match the actual codebase rather than a generic guess:

- **Colors** imported from `remotion/src/styles.ts`: `colors.bg` (`#0a0a0f`) and `colors.green` (`#00ff41`) — both already exact matches, no new tokens needed.
- **Font**: `BE_VIETNAM_PRO` (from `styles.ts`) for all text — headline, subtext, part badge, brand bar. This matches every existing cover-style still (`CharacterIconCoverScene`) and needs no font-loader changes. (Inter is reserved for in-video scene copy like `ExplanationScene`, per existing convention — not used here.)
- **Channel name default**: `"DevFasterr"` (current channel name; `"Biết Rồi Thì Dễ"` does not appear anywhere in this codebase and predates the rebrand).
- **Part badge**: renders only when `partLabel` is provided. No hardcoded fallback text — a badge reading a stale example value like `"PHẦN 2 / 4"` on a script that has no part info would be actively wrong.
- Map pin, car icon, dashed connector, 2–3 line headline with `**word**`-driven accent-span truncation, subtext, and brand bar (`▶` icon + channel name) are implemented as originally specified, in plain HTML/CSS + inline SVG — no canvas, no external assets.

**Props interface** (added to `remotion/src/types.ts`, alongside the other scene prop interfaces):

```typescript
export interface ThumbnailSceneProps {
  headline: string;
  accentWord?: string;
  subtext?: string;
  partLabel?: string;
  channelName?: string;
}
```

**Registration** in `remotion/src/Root.tsx`:

```tsx
<Composition
  id="Thumbnail"
  component={ThumbnailScene}
  durationInFrames={1}
  fps={30}
  width={1080}
  height={1920}
  defaultProps={{
    headline: "Tài xế biết trước cả bạn",
    accentWord: "biết trước",
    partLabel: "PHẦN 2 / 4",
    channelName: "DevFasterr",
  }}
/>
```

---

## `vidgen/thumbnail.py`

### `_extract_thumbnail_props(script: dict, scene_index: int = 0) -> dict`

Pure function, no I/O — this is what `tests/test_thumbnail.py` exercises directly.

- `headline` ← `scenes[scene_index]["narration"]`, trailing `.` stripped.
- `accentWord` ← `scenes[scene_index]["props"].get("accentWord")` if present; else the longest `**bold**` span in `scenes[scene_index]["props"].get("headline", "")`; else omitted.
- `subtext` ← `scenes[scene_index]["props"].get("body")` or `.get("headline", "")`, with `**` markers stripped.
- `partLabel` ← first `props.partLabel` found across *all* scenes (matches the real field name confirmed in `content/script_grab_dispatch_p1.json` / `p2.json`); omitted (not defaulted) if none found.
- Raises `IndexError` with a clear message if `scene_index` is out of range.

### `generate_thumbnail(script_path, output_path, scene_index=0, channel_name="DevFasterr", overwrite=True, remotion_dir="remotion") -> str`

- Loads `script_path` (raises `FileNotFoundError` if missing), builds props via `_extract_thumbnail_props`, adds `channelName`.
- If `overwrite=False` and `output_path` exists, skips and returns the existing path *without* invoking Remotion at all.
- Runs `["npx", "remotion", "still", "Thumbnail", <abs output_path>, f"--props={json.dumps(props)}"]`, `cwd=remotion_dir`. Verified directly against this repo's Remotion CLI (v4.0.293): entry-point auto-detects, positional `<comp-id> <output>` args, and `--props=` accepts inline JSON — no temp file needed, since `subprocess.run` with an argv list never goes through a shell, so there's no escaping risk for Vietnamese diacritics/quotes to guard against. No `--overwrite` flag either: `remotion/remotion.config.ts` already calls `Config.setOverwriteOutput(true)` globally, so the Python-level check above is the only overwrite gate needed.
- Logging: `🎨 Rendering thumbnail for: <script_path>`, `✅ Thumbnail saved: <output_path>` / `❌ Remotion error (exit <code>): <last 5 stderr lines>`.
- Errors: `RuntimeError("npx not found. Run: npm install")` on missing `npx`; `RuntimeError(f"renderStill failed:\n{stderr}")` on non-zero exit.
- Returns the absolute path to the rendered PNG.

### CLI

```bash
python -m vidgen.thumbnail content/script_grab_dispatch_p2.json
# → output/thumbnails/script_grab_dispatch_p2_thumb.png
```

`out/<slug>_thumb.png` (from the original ask) is replaced with `output/thumbnails/<slug>_thumb.png` — the directory that already holds the two existing covers.

### `vidgen/main.py` integration

After the existing `print(f"Video rendered to {video_output}")` line:

```python
try:
    from vidgen.thumbnail import generate_thumbnail
    generate_thumbnail(args.script, video_output.replace(".mp4", "_thumb.png"))
except Exception as e:
    print(f"⚠️  Thumbnail generation failed (non-fatal): {e}")
```

---

## Testing

- `tests/test_thumbnail.py`: unit tests for `_extract_thumbnail_props` against small in-memory script dicts — accent-word extraction from `**bold**`, `partLabel` cross-scene search, missing-field fallbacks, no hardcoded `partLabel` fallback. No subprocess/Remotion involved, matching how `tests/test_manifest.py` tests `vidgen/manifest.py`.
- Manual end-to-end verification (per original ask): `npx remotion compositions`, a hardcoded `remotion still` render, `python -m vidgen.thumbnail content/script_grab_dispatch_p2.json`, then visually open the PNG.
