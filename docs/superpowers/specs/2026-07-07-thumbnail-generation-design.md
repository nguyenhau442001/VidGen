# Thumbnail Generation Design

**Date:** 2026-07-07
**Status:** Proposed

---

## Overview

Every video currently gets its cover thumbnail by hand: someone hand-writes bespoke `line1/line2/line3` copy for the `CharacterIconCover` composition and runs `npx remotion still CharacterIconCover ...` manually. This work replaces that manual step with a single automated entry point: `vidgen/thumbnail.py` always renders one composition — `Thumbnail` — and that composition is a **dispatcher**. It picks which visual style to render based on the hook scene's own type (`scenes[0]["type"]`), the same way `TYPE_MAP`/`SceneRenderer` already dispatch scene rendering elsewhere in this codebase:

- `scenes[0]["type"] == "CharacterIconScene"` (e.g. `grab_dispatch_p1`) → renders via the existing `CharacterIconCoverScene`, with its props auto-derived from `scenes[0]`.
- anything else (e.g. `"ExplanationScene"`, as in `grab_dispatch_p2`'s hook) → renders a new generic map-pin/car/headline visual, auto-derived the same way.

`CharacterIconCoverScene` itself is unmodified — the dispatcher only imports and reuses it. The two already-rendered covers in `output/thumbnails/` (`grab_dispatch_p1_cover.png`, `grab_dispatch_p2_cover.png`) are untouched; this system only affects future automated runs.

## Goals

- `ThumbnailScene.tsx` — a Still composition (id `"Thumbnail"`), 1080×1920, that dispatches on a `style` prop to either `CharacterIconCoverScene` or a new generic hook visual.
- `vidgen/thumbnail.py` — derives `style` from `scenes[0]["type"]`, extracts the right props for that style from the script JSON, and renders the still via the Remotion CLI. Callable as a library function, a `python -m vidgen.thumbnail <script>` CLI, and an automatic (non-fatal) step at the end of `vidgen/main.py`'s render.
- All prop-extraction logic (style dispatch, generic headline/accentWord/subtext/partLabel, characterIcon field mapping, the line1/2/3 text-splitting heuristic) is pure and unit-tested without invoking Remotion.

## Non-goals

- No modification to `CharacterIconCoverScene.tsx` or its existing `CharacterIconCover` Root.tsx registration.
- No retroactive regeneration of the grab_dispatch p1/p2 covers already in `output/thumbnails/`.
- No manual-override script field for line1/line2/line3 in this pass — the naive auto-split is used unconditionally for the characterIcon style. (Anyone wanting hand-tuned copy can still fall back to the existing manual `npx remotion still CharacterIconCover ...` workflow directly.)
- No dispatch branches beyond the two above — any scene type other than `CharacterIconScene` falls through to the generic style; no other scene-type-specific visual is built in this pass.

---

## Architecture

```
content/script_<name>.json
         │  scenes[0] (hook scene)
         ▼
[Python: vidgen/thumbnail.py]
  style = SCENE_TYPE_TO_STYLE.get(scenes[0]["type"], "generic")   # "CharacterIconScene" -> "characterIcon"

  if style == "characterIcon":
      props = _extract_character_icon_props(script, scene_index)   # pure, unit-tested
  else:
      props = _extract_generic_props(script, scene_index)          # pure, unit-tested

  generate_thumbnail(script_path, output_path, ...):
    1. load script, compute style + props (above)
    2. subprocess: npx remotion still Thumbnail <abs_output_path> --props=<inline json>
                    (cwd="remotion", mirrors chunked_render.py's remotion_dir convention)
         │
         ▼
[Remotion: remotion/src/scenes/ThumbnailScene.tsx]   registered in remotion/src/Root.tsx as id "Thumbnail"
  style == "characterIcon" → <CharacterIconCoverScene {...props} />   (existing component, reused as-is)
  style == "generic"       → <GenericHookThumbnailScene {...props} /> (new)
  → PNG at output/thumbnails/<slug>_thumb.png
```

Hooked into `vidgen/main.py`: after the existing render line (`render_video_chunked(manifest, video_output)` / `print(f"Video rendered to {video_output}")`), call `generate_thumbnail(args.script, video_output.replace(".mp4", "_thumb.png"))` inside a `try/except` that logs and swallows any error — thumbnail generation must never fail the video render.

---

## TSX: dispatcher + new generic visual

### `remotion/src/scenes/ThumbnailScene.tsx` (dispatcher, new)

```typescript
export type ThumbnailSceneProps =
  | ({ style: "characterIcon" } & CharacterIconCoverSceneProps)
  | ({ style: "generic" } & GenericHookThumbnailSceneProps);

export const ThumbnailScene: React.FC<ThumbnailSceneProps> = (props) => {
  if (props.style === "characterIcon") {
    return <CharacterIconCoverScene {...props} />;
  }
  return <GenericHookThumbnailScene {...props} />;
};
```

Registered in `remotion/src/Root.tsx` as the `"Thumbnail"` composition (1080×1920, `durationInFrames={1}`, `fps={30}`), same pattern as the other Still-style entries already there.

### `remotion/src/scenes/GenericHookThumbnailScene.tsx` (new — this is the visual originally scoped as "ThumbnailScene")

Portrait Still, layered back-to-front per the original layout spec (grid background → radial glow → part badge → pin/car/dashed-line visual → headline block → subtext → brand bar → bottom scrim), with these adaptations to match the actual codebase:

- **Colors** imported from `remotion/src/styles.ts`: `colors.bg` (`#0a0a0f`) and `colors.green` (`#00ff41`) — both exact matches already, no new tokens.
- **Font**: `BE_VIETNAM_PRO` (from `styles.ts`) for all text, matching the convention every existing cover-style still already uses. (Inter stays reserved for in-video scene copy like `ExplanationScene`.)
- **Channel name default**: `"DevFasterr"`.
- **Part badge**: renders only when `partLabel` is provided — no hardcoded fallback text.
- Map pin, car icon, dashed connector, 2–3 line headline with `**word**`-driven accent-span truncation, subtext, and brand bar (`▶` icon + channel name) implemented as originally specified, in plain HTML/CSS + inline SVG — no canvas, no external assets.

```typescript
export interface GenericHookThumbnailSceneProps {
  headline: string;
  accentWord?: string;
  subtext?: string;
  partLabel?: string;
  channelName?: string;
}
```

Both prop interfaces live in `remotion/src/types.ts`, alongside every other scene's prop types.

---

## `vidgen/thumbnail.py`

### Style dispatch

```python
SCENE_TYPE_TO_STYLE = {
    "CharacterIconScene": "characterIcon",
}

def _style_for_scene(scene_type: str) -> str:
    return SCENE_TYPE_TO_STYLE.get(scene_type, "generic")
```

### `_extract_generic_props(script: dict, scene_index: int = 0) -> dict`

Unchanged from the original design — pure function:

- `headline` ← `scenes[scene_index]["narration"]`, trailing `.` stripped.
- `accentWord` ← `props.get("accentWord")`, else longest `**bold**` span in `props.get("headline", "")`, else omitted.
- `subtext` ← `props.get("body")` or `props.get("headline", "")`, `**` stripped.
- `partLabel` ← first `props.partLabel` found across *all* scenes; omitted if none found.

### `_extract_character_icon_props(script: dict, scene_index: int = 0, channel_name: str = "DevFasterr") -> dict`

Pure function. Source scene is `scenes[scene_index]`, whose `props` looks like `grab_dispatch_p1`'s hook (`accentColor`, `partLabel`, `rejectedPin: {label}`, `selectedPin: {label}`):

- `accentColor` ← `props.get("accentColor")`, passthrough.
- `seriesLabel` ← `props.get("partLabel")`, passthrough (same field `CharacterIconCoverScene` already expects).
- `rejectedLabel` ← `props["rejectedPin"]["label"] + " ✕"` if present, else omitted.
- `selectedLabel` ← `props["selectedPin"]["label"] + " ✓"` if present, else omitted.
- `eyebrowText` ← `channel_name` (always — matches existing branding convention, not `topicLabel`, which has no cover slot).
- `line1`, `line2`, `line3` ← `_split_into_three_lines(scene.get("on_screen_text") or scene["narration"])`.
- `subtitle` ← `scene["narration"]`, truncated to a single line.

### `_split_into_three_lines(text: str) -> tuple[str, str, str]`

Pure function, unit-tested directly. Greedy word-boundary packing with a **tight budget on line2** (its fixed 214px highlight box is what makes ~10 chars a hard visual limit, not just a stylistic one — confirmed against `CharacterIconCoverScene`'s `HIGHLIGHT_RECT_W`):

1. Split `text` into words.
2. Fill `line1` greedily up to a ~18-char budget (never splitting a word).
3. Fill `line2` greedily up to a ~10-char budget from the remaining words.
4. Remaining words go to `line3`; truncate with `…` if it exceeds a ~24-char budget.

This won't always spotlight the "ideal" word in line2 the way a human pick would, but it never overflows the highlight box, and requires no authoring.

### `generate_thumbnail(script_path, output_path, scene_index=0, channel_name="DevFasterr", overwrite=True, remotion_dir="remotion") -> str`

- Loads `script_path` (raises `FileNotFoundError` if missing).
- `scene = script["scenes"][scene_index]`; `style = _style_for_scene(scene["type"])`.
- `props = _extract_character_icon_props(...)` or `_extract_generic_props(...)` depending on `style`; sets `props["style"] = style`.
- If `overwrite=False` and `output_path` exists, skips and returns the existing path *without* invoking Remotion.
- Runs `["npx", "remotion", "still", "Thumbnail", <abs output_path>, f"--props={json.dumps(props)}"]`, `cwd=remotion_dir`. Verified directly against this repo's Remotion CLI (v4.0.293): entry-point auto-detects, positional `<comp-id> <output>` args, `--props=` accepts inline JSON (no temp file — `subprocess.run` with an argv list never goes through a shell, so there's no escaping risk). No `--overwrite` flag needed either: `remotion/remotion.config.ts` already sets `Config.setOverwriteOutput(true)` globally.
- Logging: `🎨 Rendering thumbnail for: <script_path>`, `✅ Thumbnail saved: <output_path>` / `❌ Remotion error (exit <code>): <last 5 stderr lines>`.
- Errors: `RuntimeError("npx not found. Run: npm install")` on missing `npx`; `RuntimeError(f"renderStill failed:\n{stderr}")` on non-zero exit.
- Returns the absolute path to the rendered PNG.

### CLI

```bash
python -m vidgen.thumbnail content/script_grab_dispatch_p1.json
# → output/thumbnails/script_grab_dispatch_p1_thumb.png   (style: characterIcon)

python -m vidgen.thumbnail content/script_grab_dispatch_p2.json
# → output/thumbnails/script_grab_dispatch_p2_thumb.png   (style: generic)
```

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

`tests/test_thumbnail.py`, matching how `tests/test_manifest.py` tests `vidgen/manifest.py` — pure logic, no subprocess/Remotion involved:

- `_style_for_scene`: `"CharacterIconScene"` → `"characterIcon"`; anything else (including unknown types) → `"generic"`.
- `_extract_generic_props`: accent-word extraction from `**bold**`, `partLabel` cross-scene search, missing-field omission (no hardcoded fallback).
- `_extract_character_icon_props`: field mapping from a `grab_dispatch_p1`-shaped scene (accentColor/partLabel/rejectedPin/selectedPin → seriesLabel/rejectedLabel/selectedLabel with ✕/✓ suffixes), `eyebrowText` always equals the passed `channel_name`.
- `_split_into_three_lines`: line2 never exceeds its char budget across a few representative Vietnamese strings (including one shorter than 3 "lines' worth" of words, and one long enough to force line3 truncation).

Manual end-to-end verification (per original ask): `npx remotion compositions`, a hardcoded `remotion still` render for each style, `python -m vidgen.thumbnail` against both `grab_dispatch_p1` and `grab_dispatch_p2` scripts, then visually open both PNGs to confirm the dispatch actually picked the right visual for each.
