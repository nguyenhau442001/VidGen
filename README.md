# VidGen

Generate short-form (TikTok-style, 1080×1920) videos from a single JSON script — synthesizes Vietnamese voiceover with VieNeu-TTS, renders animated scenes with captions via Remotion, and opens the result in Remotion Studio.

The core principle: **one authored file per video** in `content/`, one command, one MP4 out. Everything in between (`output/`) is generated and disposable.

## Usage

```bash
python -m vidgen.main content/script_<name>.json
```

Options:

| Flag | Default | Description |
|---|---|---|
| `--speed` | `1.2` | Voiceover speed multiplier, pitch-preserved (1.0 = VieNeu native pace; don't exceed ~1.25 — Vietnamese tones degrade) |
| `--no-trim` | off | Keep TTS silence (leading/trailing and long internal pauses) |
| `--target-dbfs` | `-15.0` | Normalize every voiceover clip to this RMS level (soft-limited) |
| `--skip-validation` | off | Skip pre-render manifest validation (emergency use only) |

Tests: `pytest tests/`

## Architecture

```
content/script_<name>.json           ← the ONLY file authored/checked in per video
         │
         ▼
┌─ Python pipeline (vidgen/) ────────────────────────────────────────┐
│  main.py               orchestrator: load → validate → TTS →       │
│                        manifest → render → open Studio             │
│  tts_speed_adjustor.py VieNeu-TTS wrapper: WSOLA time-stretch      │
│                        (pitch-preserved), silence trim, loudness   │
│                        normalization                               │
│  manifest.py           script scenes → render manifest: type       │
│                        mapping, prop translation, caption reading  │
│                        floor (17 chars/sec)                        │
│  chunked_render.py     per-scene cached chunk rendering + ffmpeg   │
│                        audio track build + lossless concat/mux     │
└────────────────────────────────────────────────────────────────────┘
         │  output/render_manifest.json   ← sole handoff contract
         ▼
┌─ Remotion project (remotion/) ─────────────────────────────────────┐
│  src/TikTokVideo.tsx   root composition: Series of scenes, each    │
│                        with its visual, caption, and <Audio>       │
│  src/scenes/*          the scene component library (see below)     │
│  scripts/render-chunks.mjs  renders individual scene chunks        │
└────────────────────────────────────────────────────────────────────┘
         │
         ▼
output/video/mp4/<title>.mp4  +  Remotion Studio (localhost:3000)
```

Key artifacts:

- `output/audio/wav/scene_<id>.wav` — per-scene TTS clips (also copied to `remotion/public/audio/`)
- `output/render_manifest.json` — the flat, fully-resolved render plan Remotion consumes (Studio imports it live; never hand-edit or write it from partial data)
- `output/render_cache/` — per-scene MP4 chunks keyed by content hash, pruned after 14 days
- `output/video/mp4/` — final videos; `output/thumbnails/` — cover stills

### Script schema

Every script shares the envelope `title` / `language` / `scenes[]`. Scenes can be authored in two shapes, auto-detected by `resolve_script()`:

- **Flat schema** — each scene has `type`, `props`, `duration_frames`, `narration`, `narration_timing_frames`, optional `on_screen_text`, `transition_out_delay_frames`, `sound_design`.
- **Nested motion-pipeline-1.0 schema** — `assets{}` + `sequences[].shots[]` with declarative `animations[]`; `flatten_script()` converts it in-memory (no intermediate file is ever written).

Gotchas: unknown scene types render blank silently — only the types in `manifest.py`'s `TYPE_MAP` with props matching `remotion/src/types.ts` are valid. Narration pacing must allow ≥ 8 frames/word at 30 fps or validation fails.

## Scene library (13 scene types + 2 covers)

The video is assembled from **13 reusable scene types** — the tool's "skills" — each a React component in `remotion/src/scenes/`:

| Scene type | What it renders |
|---|---|
| `ExplanationScene` | Headline + body text card (supports `**bold**` accents) |
| `TerminalScene` | Animated terminal with typed output lines |
| `CodeScene` | Code snippet display |
| `ErrorLogScene` | Error/stack-trace log panel |
| `CharacterIconScene` | Animated character icon with poses and accessory icons |
| `PhoneMockupScene` | Ride-hailing app phone UI (idle → loading → matched states) |
| `MapPingScene` | Map with driver dots, distance labels, highlight/selection phases |
| `GeohashRevealScene` | Abstract city grid whose cells ripple in, breathe as a demand heatmap, then show district labels |
| `ScoreCardScene` | Score rows revealed with a stagger (supports per-row narration) |
| `SplitViewScene` | Two-panel left/right comparison with captions |
| `QuoteCalloutScene` | Large quote with an accent word, subtle or dark background |
| `ZoomRevealScene` | Camera pull-back from a focal element to a wider dot field |
| `SplitRevealScene` | Full-screen content compresses left to reveal a right panel |

Two additional cover components are used for thumbnails, not in the video timeline: `CoverScene` and `CharacterIconCoverScene`. Thumbnails are rendered with `npx remotion still CharacterIconCover --props='...'` into `output/thumbnails/`.

All compositions are browsable individually in Remotion Studio (`npx remotion studio` in `remotion/`).

## Workflow: script → video

`python -m vidgen.main content/script_<name>.json` runs these steps:

1. **Load & resolve script** — parse the JSON; if it uses the nested motion-pipeline-1.0 schema, flatten it in-memory to flat `scenes[]`.
2. **Validate** — check every narrated scene's locked timing against its text: ≥ 8 frames/word, no narration overflow past the scene's safe end, warn on > 1s dead air. Fails fast before any expensive work.
3. **Synthesize voiceover** — one VieNeu-TTS pass per narration line (voice "Xuân Vĩnh"), plus one per `narration_per_criterion` segment. Runs in parallel, capped at 3 workers (unbounded workers exhausted memory). Each clip is then sped up 1.2× with pitch-preserving WSOLA, silence-trimmed, and normalized to −15 dBFS.
4. **Tighten durations** — authored `duration_frames` were paced for native TTS tempo; narrated scenes shrink to `audio offset + actual audio length + transition tail` so the sped-up voice leaves no dead air.
5. **Build the render manifest** — translate scene types and props into the exact component shapes, attach audio paths/offsets, and clamp any scene back up so its caption stays readable at 17 chars/sec. Written to `output/render_manifest.json`.
6. **Render, chunked & cached** — each scene renders as its own muted MP4 chunk, cached by a content hash of the scene entry + the Remotion source tree; re-runs only re-render scenes that changed. The full audio track is built sample-exactly with a single ffmpeg filter graph, then the chunks are losslessly concatenated and the audio muxed on (AAC 320k).
7. **Open Remotion Studio** — starts Studio on port 3000 if needed and opens the browser for review; Studio loads the same manifest, so the timeline matches the rendered MP4.

### Authoring workflow (Claude Code skills)

Scripts and scene components in this repo are authored with Claude Code using two skill sets:

- **`remotion`** — the AI video-production skill, used to design motion, scene pacing, and write the scene components and script JSONs.
- **`superpowers`** (brainstorming → writing-plans → executing-plans) — used for feature design and implementation; the resulting design docs and plans live in `docs/superpowers/`.

## Repo layout

```
content/    authored video scripts (one JSON per video)
vidgen/     Python pipeline (orchestration, TTS, manifest, chunked render)
remotion/   Remotion project (compositions, scene components, chunk renderer)
output/     generated artifacts: audio, manifest, render cache, videos, thumbnails
tests/      pytest suite for the pipeline
docs/       design docs and implementation plans
```
