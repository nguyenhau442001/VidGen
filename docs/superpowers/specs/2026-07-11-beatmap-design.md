# Beat Map — predicted-replay heuristic overlay

## Problem

Before a video is published there is no real viewer/retention data — no way
to know which scenes people would rewind and rewatch. The goal is a
pre-publish quality signal: flag the scenes most likely to earn a replay so a
weak or flat edit gets caught before it ships, not after it flops.

## Approach

Rule-based heuristic scorer (no API key, same philosophy as `gate1.py`) that
scores every scene 0–100 on signals correlated with short-form rewatch
behavior, surfaced as an overlay directly inside Remotion Studio's preview —
not a separate panel (Remotion 4.0.293 has no public API for custom timeline
panels), and not real analytics (the video hasn't published yet).

## Architecture

```
main.py (after build_render_manifest, before Gate 2)
   → vidgen/beatmap.py: score_beatmap(script, manifest)
   → output/beatmap.json          (advisory only — never blocks the pipeline)
                    │
                    ▼
remotion/src/BeatMapOverlay.tsx statically imports beatmap.json
   (same "Python computes once, Studio imports live" pattern as
   render_manifest.json)
                    │
                    ▼
Rendered unconditionally inside TikTokVideo.tsx, self-gates on
process.env.REMOTION_BEAT_MAP === "1"   (same pattern as SafeZoneGuide.tsx)
```

`main.py`'s own Studio launch sets `REMOTION_BEAT_MAP=1` so the overlay is on
by default during the pre-publish review step. Manual `npx remotion studio`
runs need `REMOTION_BEAT_MAP=1` explicitly. Off by default everywhere else —
never appears in a real render.

## Scoring model (`vidgen/beatmap.py`)

Per scene, sum of:

| Signal | Points | Rationale |
|---|---|---|
| Numeric payoff (`stat_comparator`, `counter_blast`, `score_card`, `delta_arrow`) | +30 | viewers rewind to re-read a number |
| Info rate above this video's own average words/sec | up to +25 | dense scenes get replayed to catch what was said |
| Pattern interrupt (type differs from both neighbors) | +20 | a visual "wait, what was that" |
| Hook/twist proximity (scene 1, or narration has a twist word) | +15 | opening hook, or a reveal beat |
| Brevity under load (≤120 frames, still narrated) | +10 | fast + information-dense |

Top 3 scenes by score are flagged `"hot": true`. Each scene carries a short
`reasons` list (mirrors gate1's `issues` list).

## `output/beatmap.json` schema

```json
{
  "video_title": "...",
  "scenes": [
    {"id": "shot_08", "index": 7, "score": 50, "reasons": ["numeric payoff", "pattern interrupt"], "hot": true}
  ]
}
```

No `start_frame`/`duration_frames` stored — `BeatMapOverlay.tsx` derives
cumulative timing live from `manifest.scenes[].durationInFrames` (already
available as a prop), avoiding a second source of truth for frame math.

## `BeatMapOverlay.tsx`

- Bottom strip spanning the canvas, one segment per scene sized by duration
  share, colored by score (dim → bright accent green), white playhead tick
  at the current frame.
- Corner badge (score + top reasons) shown only while a "hot" scene is
  playing, so it doesn't clutter every scene.

## Verified

- `pytest tests/test_beatmap.py` — 7 tests covering hook bonus, numeric
  payoff, pattern interrupt, top-N "hot" selection, and report formatting.
- `npx remotion still TikTokVideo --frame=<mid shot_08>` with
  `REMOTION_BEAT_MAP=1` on the real `grab_dispatch_p3` manifest — strip and
  badge render correctly on an actual numeric-payoff scene.
- Same still without the env var — overlay fully absent, confirming it never
  leaks into production renders.
