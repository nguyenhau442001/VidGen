# StatComparatorScene design

## Why

`SplitViewScene` is used for before/after narration beats but its content
kinds (`loading`, `text`, `dots`, `road_diagram`, `eta_comparison`) are all
qualitative — there's no way to show two big numbers counting up side by
side. `StatComparatorScene` fills that gap: two colored stat panels (red
"before", green "after") each animate a number counter, closing with an
optional delta badge.

## Props

Matches the interface given in the `/goal` brief exactly (`headline`,
`accentWord`, `before*`/`after*` fields, optional `deltaLabel`). One
resolved ambiguity: `beforeStat`/`afterStat` (the pre-formatted strings like
`"8 phút"`) are redundant with `beforeStatNumber + beforeStatUnit` — the
component derives the animated display from the number+unit pair and does
not re-render the separate string, so authors can pass either a matching
string or leave formatting entirely to the component. Both fields stay in
the type for schema-authoring convenience (matches the brief's interface).

## Layout (1080×1920 canvas, no virtual-canvas scaling)

Follows `EventScanScene`'s pattern (most recent scene in the codebase) over
`BeforeAfterScene`'s older 750×1080 virtual-canvas approach: real-resolution
absolute positioning + `SAFE_ZONE` constants + `AmbientBackground`.

- Headline: `SAFE_ZONE.top`, centered, accentWord highlighted in `afterColor`.
- Two panels below the headline, each 384px wide with a 64px gap, filling
  the safe content width (832px) exactly. Each panel: label → big counter
  number (JetBrains Mono, tabular-nums) → unit → subtext.
- Optional delta badge: centered pill below both panels.

## Timing

The brief's frame plan (0–330 @ 30fps) is treated as a *design ratio*, not
literal frame numbers — every checkpoint is expressed as a fraction of a
330-frame reference and scaled by the actual `durationInFrames` prop. This
matches `EventScanScene`'s handling of TTS-driven duration variance (per
project memory, scene durations get tightened to real audio length, so a
scene that assumes a fixed 330 frames would clip its own ending on shorter
narration). Springs still use fps-relative settle time; only their start
offsets scale.

Sequence (fractions of `durationInFrames`, ×330 gives the brief's frame
numbers): headline fade 0→0.06, before-panel slide 0.06→(spring), before
counter 0.18→0.36, before subtext 0.24→0.30, after-panel slide 0.36→(spring),
after counter 0.48→0.67, after subtext 0.61→0.70, delta badge 0.70→0.85,
after-panel pulse glow 0.85→1.0.

## Registration

New scene type `stat_comparator`, wired through the same 5 touchpoints as
every other scene:
1. `remotion/src/types.ts` — `StatComparatorVisual`, `StatComparatorSceneProps`, `ManifestScene` union entry.
2. `remotion/src/scenes/StatComparatorScene.tsx` — the component.
3. `remotion/src/TikTokVideo.tsx` — import + switch case.
4. `remotion/src/Root.tsx` — import + demo `Composition`.
5. `vidgen/manifest.py` — `TYPE_MAP["StatComparatorScene"] = "stat_comparator"` (this alone also covers `gate1.py`'s `VALID_SCENE_TYPES`, which derives from `TYPE_MAP`).

No new Python-side visual translation is needed in `_translate_visual` —
props pass straight through unchanged, same as most scene types.
