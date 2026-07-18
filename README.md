# VidGen

Generate short-form (TikTok-style, 1080×1920) videos from a human-approved TXT script. VidGen converts the approved narration and visual direction into a schema-valid JSON shot plan; after audit and explicit render approval, the production pipeline synthesizes Vietnamese voiceover with VieNeu-TTS, renders cinematic shots with captions via Remotion, and opens the result in Remotion Studio.

The core principle: **the TXT is authored; the JSON is generated**. Each production maps `content/text/<slug>.txt` to `content/json/<slug>.json`. Existing JSON files are historical generated outputs, not future inputs. Audit must pass before the user decides whether to render. Everything in `output/` is generated and disposable.

## Usage

1. Finalize the script with Claude/ChatGPT and save it as `content/text/<slug>.txt`.
2. Ask VidGen to generate and audit `content/json/<slug>.json`. VidGen stops after reporting the audit.
3. Only after approving that JSON, run:

```bash
# Pre-render audit (VidGen runs these and stops)
python -m vidgen.quality.source_fidelity \
  content/text/<slug>.txt \
  content/json/<slug>.json
python -m vidgen.quality.script_quality_gate content/json/<slug>.json

# Separate, explicitly approved render step
python -m vidgen.pipeline.video_pipeline content/json/<slug>.json
```

Options:

| Flag | Default | Description |
|---|---|---|
| `--speed` | `1.1` | Default voiceover speed multiplier, pitch-preserved. Per-shot `tts_speed` overrides this when present (1.0 = VieNeu native pace; don't exceed ~1.25 — Vietnamese tones degrade) |
| `--tts-voice` | `Thanh Bình` | VieNeu preset voice. `VIDGEN_TTS_VOICE` overrides the channel default |
| `--no-trim` | off | Keep TTS silence (leading/trailing and long internal pauses) |
| `--target-dbfs` | `-15.0` | Normalize every voiceover clip to this RMS level (soft-limited) |
| `--skip-validation` | off | Skip pre-render manifest validation (emergency use only) |
| `--skip-gate1` | off | Skip Gate 1 content-quality check (emergency use only) |
| `--skip-gate2` | off | Skip Gate 2 visual-quality check (emergency use only) |

Fast tests: `pytest tests/`

Real browser layout audit: `npm --prefix remotion run audit:layout`. It renders the
start, middle, and end of every shot and fails when any marked text container has
`scrollWidth > clientWidth` or `scrollHeight > clientHeight`.

## Architecture

```
content/text/<slug>.txt              ← human-approved source of truth
         │  VidGen: generate JSON + audit, then STOP
         ▼
content/json/<slug>.json             ← generated shot plan, reviewed before render
         │  explicit user render approval
         ▼
┌─ Python pipeline (vidgen/) ────────────────────────────────────────┐
│  pipeline/video_pipeline.py          production orchestrator       │
│  pipeline/render_manifest_builder.py script → Remotion contract    │
│  pipeline/chunked_video_renderer.py  chunk render + ffmpeg mux     │
│  audio/vieneu_tts.py                  VieNeu model adapter           │
│  audio/speech_synthesizer.py         TTS orchestration              │
│  audio/audio_processing.py           trim, speed, loudness          │
│  quality/                             script and rendered audits     │
│  presentation/                        thumbnail and A/V previews     │
│  publishing/                          explicit platform publishers   │
│  discovery/                           optional topic idea tools       │
└────────────────────────────────────────────────────────────────────┘
         │  output/render_manifest.json   ← sole handoff contract
         ▼
┌─ Remotion project (remotion/) ─────────────────────────────────────┐
│  src/TikTokVideo.tsx   root composition: Series of shots, each     │
│                        with its visual, caption, and <Audio>       │
│  src/scenes/*          the shot template library (see below)       │
│  scripts/render-chunks.mjs  renders individual shot chunks         │
└────────────────────────────────────────────────────────────────────┘
         │
         ▼
remotion/out/<script>.mp4  +  Remotion Studio (localhost:3000)
```

Key artifacts:

- `content/text/<slug>.txt` — human-approved narration and visual direction; the authored source of truth
- `content/json/<slug>.json` — generated and audited shot plan consumed by the production pipeline
- `output/audio/wav/scene_<id>.wav` — per-shot TTS clips (also copied to `remotion/public/audio/`)
- `output/render_manifest.json` — the flat, fully-resolved render plan Remotion consumes (Studio imports it live; never hand-edit or write it from partial data)
- `output/render_cache/` — per-shot MP4 chunks keyed by content hash, pruned after 14 days
- `remotion/out/` — final videos, named after the generated JSON (e.g. `content/json/script_grab_dispatch_p4.json` → `remotion/out/grab_dispatch_p4.mp4`); `output/thumbnails/` — cover stills

### Script schema

Every script shares the envelope `title` / `language` / `shots[]`. `shots` is the only public container, and `resolve_script()` keeps everything in that shape:

- **Flat schema** — each shot has `type`, `props`, `duration_frames`, `narration`, `narration_timing_frames`, optional `on_screen_text`, `transition_out_delay_frames`, `sound_design`, `tts_speed` (per-shot TTS override).
- **Nested motion-pipeline-1.0 schema** — `assets{}` + `sequences[].shots[]` with declarative `animations[]`; `flatten_script()` converts it in-memory (no intermediate file is ever written).

Example:

```json
{
  "shots": [
    {
      "id": "hook",
      "type": "QuoteCalloutScene",
      "narration": "Hook chạy nhanh hơn một chút",
      "tts_speed": 1.25
    },
    {
      "id": "cta",
      "type": "QuoteCalloutScene",
      "narration": "CTA chậm lại để nghe rõ hơn",
      "tts_speed": 0.95
    }
  ]
}
```

Gotchas: unknown shot types render blank silently — only the types in `remotion/src/types.ts`'s `ManifestScene` union (with matching props) are valid. Scripts may author a shot's `type` as either the snake_case manifest key or a PascalCase Remotion component name registered in `pipeline/render_manifest_builder.py`. Narration pacing must allow ≥ 8 frames/word at 30 fps or validation fails.

## Shot library (32 wired shot types + 2 covers)

The video is assembled from **28 reusable shot templates** — the tool's "skills" — each a React component in `remotion/src/scenes/`, registered in `remotion/src/types.ts` and dispatched by `remotion/src/TikTokVideo.tsx`'s shot switch:

| Shot type | What it renders |
|---|---|
| `ExplanationScene` | Headline + body text card (supports `**bold**` accents) |
| `TerminalScene` | Animated terminal with typed output lines |
| `CodeScene` | Code snippet display |
| `ErrorLogScene` | Error/stack-trace log panel |
| `CharacterIconScene` | Animated character icon with poses and accessory icons |
| `PhoneMockupScene` | Ride-hailing app phone UI (idle → loading → matched states) |
| `MapPingScene` | Map with driver dots, distance labels, highlight/selection phases |
| `GeohashRevealScene` | Abstract city grid whose cells ripple in, breathe as a demand heatmap, then show district labels |
| `DemandHeatmapScene` | Pulsing heatmap blobs over a map, intensity-colored |
| `SignalFlowScene` | Input signal nodes streaming particles into a central "brain" node |
| `RippleAggregateScene` | One phone tap zooms out into a field of rippling phones converging on a hotspot |
| `DriverSwarmScene` | Multiple drivers converging on a pulsing demand zone |
| `CounterBlastScene` | Big count-up number reveal with a flash and lock-in pulse |
| `ScoreCardScene` | Score rows revealed with a stagger (supports per-row narration) |
| `SplitViewScene` | Two-panel left/right comparison with captions |
| `SplitApartmentScene` | Two apartments side by side with TV lag, wall shockwave, and room reactions |
| `WallPortalScene` | A wall crack, door, or energy portal opens into another space |
| `StadiumGoalScene` | Cinematic football goal build-up, shot, flight, impact, and freeze frame |
| `GoalOrbJourneyScene` | A glowing goal orb relays through the city and branches to multiple targets |
| `QuoteCalloutScene` | Large quote with an accent word, subtle or dark background |
| `ZoomRevealScene` | Camera pull-back from a focal element to a wider dot field |
| `SplitRevealScene` | Full-screen content compresses left to reveal a right panel |
| `AnimatedFlowScene` | Node graph with animated edges connecting labeled nodes |
| `BubbleComparatorScene` | Sized bubbles comparing labeled values |
| `PhoneMapScene` | Phone UI with map pins (driver/user/zone) |
| `ConversationScene` | Chat-style message bubbles, left/right |
| `BeforeAfterScene` | Two-panel before/after point comparison |
| `GridHeatmapScene` | Cell grid revealing top-left to bottom-right by intensity |
| `RadarHookScene` | 3 driver blips connect to a central "you" dot on a rotating sweep radar, then headline + 3-cell stats row (hook framing alternative to `CharacterIconScene`) |
| `EventScanScene` | Scanning beam sweeps a timeline panel, popping in "found" event cards, then a demand-multiplier badge and dispatch action line |
| `DriverHeatmapScene` | Full-canvas field of driver pings spawning staggered over a faint geohash grid with a ticking clock overlay |
| `StatComparatorScene` | Before/after stat cards with number, unit, and subtext per side, plus a delta callout |

`AnimatedFlowScene`, `BubbleComparatorScene`, `PhoneMapScene`, `ConversationScene`, `BeforeAfterScene`, and `GridHeatmapScene` aren't in `TYPE_MAP` — author their `type` as the snake_case manifest key directly (e.g. `"type": "grid_heatmap"`).

Two additional cover components are used for thumbnails, not in the video timeline: `CoverScene` and `CharacterIconCoverScene`. Thumbnails are rendered with `npx remotion still CharacterIconCover --props='...'` into `output/thumbnails/`.

Six more components exist in `remotion/src/scenes/` but aren't wired into the manifest/render pipeline yet — built but not yet registered in `types.ts`/`TikTokVideo.tsx`, so scripts can't reference them: `AnimatedBarRaceScene`, `CounterAnimScene`, `PacketFlowScene`, `QuizPopScene`, `SplitRevealTitleScene`, `TimelineScene`.

All compositions are browsable individually in Remotion Studio (`npx remotion studio` in `remotion/`).

## Workflow: approved TXT → audited JSON → approved render

The authoring stage is intentionally separate from the production command:

1. **Finalize outside VidGen** — the owner and Claude/ChatGPT agree on the exact topic, narration, visual direction, and on-screen copy.
2. **Save approved TXT** — write `content/text/<slug>.txt` using ordered scene sections with `Hình ảnh`, on-screen text, and `Voice-over` blocks.
3. **Generate JSON** — VidGen reads only that TXT and writes `content/json/<slug>.json`. The filename stem must match. Voice-over is copied verbatim and in order; VidGen chooses registered scene types, props, and timing without rewriting the script.
4. **Audit generated JSON** — parse JSON, validate schema and scene types, compare narration against the TXT, run Gate 1, and report unsupported visual direction or assumptions.
5. **Stop for review** — no TTS, manifest build, Studio launch, or render. The user reviews the generated JSON and audit report.
6. **Render only after explicit approval** — run `python -m vidgen.pipeline.video_pipeline content/json/<slug>.json` only when the user separately authorizes rendering.

After approval, `video_pipeline` loads and resolves the generated JSON, re-runs Gate 1 and validation, synthesizes voiceover, tightens durations, writes `output/render_manifest.json`, renders cached chunks, audits the video, and opens Studio for human review.

### Authoring workflow (Claude Code skills)

Scripts and shot components in this repo are authored with Claude Code using two skill sets:

- **`remotion`** — the AI video-production skill, used to design motion, shot pacing, and map the approved TXT into shot components and generated JSON.
- **`superpowers`** (brainstorming → writing-plans → executing-plans) — used for feature design and implementation.

**Hook selection:** `python -m vidgen.discovery.hook_pattern_selector "<topic>"` can suggest a hook pattern. Treat the result as brainstorming input; a person must approve the final script.

## Repo layout

```text
content/text/       human-approved TXT scripts (source of truth)
content/json/       VidGen-generated JSON shot plans and historical outputs
scripts/            helper shell entrypoints and CI wrappers
resources/          shared colors and optional topic-idea queue
vidgen/             role-based Python packages for production tooling
remotion/           compositions, scenes, and chunk renderer
output/             generated audio, manifests, caches, and reports
tests/              critical pipeline regression tests
references/         source contract, schema refs, audits, and production notes
```
---

## Human-reviewed Workflow

VidGen deliberately starts after content approval. Topic selection, research, narration, visual direction, and on-screen copy are finalized by the owner with Claude/ChatGPT before VidGen receives the TXT source.

1. Brainstorm and research a topic together outside VidGen.
2. Review and approve the exact narration, visual plan, and on-screen copy.
3. Save the approved source as `content/text/<slug>.txt`.
4. Let VidGen generate `content/json/<slug>.json`, validate it, run Gate 1, and stop.
5. Review the JSON and audit report; explicitly approve rendering when ready.
6. Run `vidgen.pipeline.video_pipeline` only after that approval, then inspect every shot and the final MP4 before publishing.

`vidgen.discovery.topic_harvester` remains an optional idea source for days when the
backlog is empty. It writes candidates to `resources/topics_queue.json`; it never
starts script generation, TTS, rendering, or publishing.

```bash
# Preview current topic ideas without modifying the queue
python -m vidgen.discovery.topic_harvester --dry-run --top 5

# Add selected candidates to the review queue
python -m vidgen.discovery.topic_harvester --push 2
```

### Manual Publishing

Publishing commands remain explicit and separate from video generation:

```bash
python -m vidgen.publishing.publish_all remotion/out/video.mp4 --title "Tiêu đề"
python -m vidgen.publishing.youtube remotion/out/video.mp4 --title "Tiêu đề #Shorts"
python -m vidgen.publishing.facebook remotion/out/video.mp4 --title "Tiêu đề"
python -m vidgen.publishing.tiktok remotion/out/video.mp4 --title "Tiêu đề #60scongnghe"
```

### Environment variables

```bash
# .env (create at repo root)
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
GITHUB_REPO=nguyenhau442001/VidGen
GITHUB_TOKEN=ghp_...        # scope: workflow
```

YouTube tokens (access + refresh) are stored in `.youtube_tokens.json` after running `--oauth`; the publisher auto-refreshes the access token when it expires.

### Notification

Uses GitHub Actions (`notify.yml`) — no external services required.
GitHub emails you automatically when a publish fails. Silent on success.

```
.github/
└── workflows/
    └── notify.yml
```
