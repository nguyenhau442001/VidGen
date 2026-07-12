# HSKFlashCardThumbnailScene design

## Purpose

Static (frame-0) thumbnail scene for HSK vocabulary flashcard videos: a warm
red/cream flashcard mockup, distinct from the existing dark/green tech-channel
aesthetic. Extends the `thumbnail-generation` branch's existing
style-dispatch thumbnail infrastructure rather than the `TikTokVideo.tsx`
TYPE_MAP path used by in-Series scenes.

## Branch

All changes land in `.worktrees/thumbnail-generation` (branch
`thumbnail-generation`), alongside the existing `GenericHookThumbnailScene`
and `CharacterIconCoverScene` thumbnail styles.

## Files

1. **`remotion/src/scenes/HSKFlashCardThumbnailScene.tsx`** (new)
   - 1080×1920 canvas, split into a 52%-width left half (`#b52a1c` bg, 3px
     `#8a1e12` right border) and a `flex:1` right half (`#ede8e0` bg).
   - Left half: absolute "汉字" watermark behind content; centered stack of
     `titleTop` / `range` / `badgeText` pill / `count`+"+" / `countSub`,
     with exact sizes, weights, colors, rotation, and shadow from the spec.
   - Right half: web badge, flashcard (hanzi/pinyin/meaning), example box
     (with `accentHanzi` highlighted in red inside `exampleZh`), and a
     two-button row (red "Chưa nhớ" / green "Đã nhớ" — the only green
     element, intentional eye magnet).
   - No animation — frame 0 == frame 29. `useCurrentFrame`/`useVideoConfig`
     imported per convention but not used to vary output.
   - Colors/sizes defined as local constants in the file, matching how
     `GenericHookThumbnailScene.tsx` keeps one-off values local instead of
     extending the shared `colors` palette in `styles.ts` (that palette is
     the tech-channel's dark/green theme and unrelated to this warm-red one).
   - Font split: `BE_VIETNAM_PRO` for all Vietnamese strings (badge, buttons,
     meaning, example translation) — matches the project's existing
     convention for Vietnamese diacritics. `INTER` for plain-ASCII/numeric
     text ("HSK", "5000+", "1 – 6"). New `NotoSerifSC` font for the CJK
     watermark and the "爱惜" flashcard headline.

2. **`remotion/src/styles.ts`**
   - Add `loadFont` for `NotoSerifSC` (same pattern as the existing
     `Inter`/`JetBrainsMono`/`BeVietnamPro` exports).

3. **`remotion/src/types.ts`**
   - `HSKFlashCardThumbnailVisual` / `HSKFlashCardThumbnailSceneProps`: all
     11 props (`titleTop`, `range`, `badgeText`, `count`, `countSub`,
     `hanzi`, `pinyin`, `meaning`, `exampleZh`, `exampleVi`, `accentHanzi`),
     all optional with the spec's defaults applied in the component.
   - Extend `ThumbnailSceneProps` union with
     `{ style: "hskFlashCard" } & HSKFlashCardThumbnailSceneProps`.

4. **`remotion/src/scenes/ThumbnailScene.tsx`**
   - Add a branch: `if (props.style === "hskFlashCard") return <HSKFlashCardThumbnailScene {...props} />;`

5. **`remotion/src/Root.tsx`**
   - No new `<Composition>` — all thumbnail styles render through the
     existing single `id="Thumbnail"` composition. Left as-is.

6. **`vidgen/thumbnail.py`**
   - Add `"HSKFlashCardThumbnailScene": "hskFlashCard"` to
     `SCENE_TYPE_TO_STYLE`.
   - Add `_extract_hsk_flash_card_props()`: unlike the other extractors,
     this is a straight passthrough of `scene["props"]` plus
     `"style": "hskFlashCard"` — the spec's JSON prop names already match
     the component's prop names 1:1, so no transformation is needed.

7. **Content JSON** (`content/<slug>.json`)
   - `scenes[0]` = the exact JSON block from the spec: `"type":
     "HSKFlashCardThumbnailScene"`, `"narration": ""`, `"props": {...}`.
   - No `tts.py` change needed: `vidgen/main.py:490`
     (`if scene.get("narration")`) already skips empty-narration scenes.

## Out of scope

- No entrance animations (explicitly static per spec).
- No validation/error handling on the passthrough extractor — internal
  content JSON is trusted, consistent with the rest of `thumbnail.py`.
