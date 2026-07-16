# VidGen

Generate short-form (TikTok-style, 1080×1920) videos from a single JSON script — synthesizes Vietnamese voiceover with VieNeu-TTS by default, or Viettel AI TTS / Gemini 2.5 Flash TTS when configured, renders cinematic shots with captions via Remotion, and opens the result in Remotion Studio.

The core principle: **one authored file per video** in `content/`, one command, one MP4 out. Everything in between (`output/`) is generated and disposable.

## Usage

```bash
python -m vidgen.main content/script_<name>.json
```

Options:

| Flag | Default | Description |
|---|---|---|
| `--speed` | `1.1` | Default voiceover speed multiplier, pitch-preserved. Per-shot `tts_speed` overrides this when present (1.0 = VieNeu native pace; don't exceed ~1.25 — Vietnamese tones degrade) |
| `--tts-provider` | `VIDGEN_TTS_PROVIDER` | `vieneu`, `viettel_ai`, or `gemini` |
| `--tts-voice` | `VIDGEN_TTS_VOICE` | Voice name/ID for the selected provider |
| `--no-trim` | off | Keep TTS silence (leading/trailing and long internal pauses) |
| `--target-dbfs` | `-15.0` | Normalize every voiceover clip to this RMS level (soft-limited) |
| `--skip-validation` | off | Skip pre-render manifest validation (emergency use only) |
| `--skip-gate1` | off | Skip Gate 1 content-quality check (emergency use only) |
| `--skip-gate2` | off | Skip Gate 2 visual-quality check (emergency use only) |

Tests: `pytest tests/`

### Viettel AI setup

Set these env vars before running with `--tts-provider viettel_ai`:

- `VIETTEL_AI_TTS_URL` if you want to override the default `https://viettelai.vn/tts/speech_synthesis`
- `VIETTEL_AI_TOKEN` for the dashboard token
- `VIETTEL_AI_VOICE` if you want a default voice code like `hcm-diemmy`
- `VIETTEL_AI_RETURN_OPTION` if you want `1`, `2`, or `3` instead of the default `3`
- `VIETTEL_AI_WITHOUT_FILTER=true` if you want to disable the quality filter
- `VIETTEL_AI_EXTRA_BODY_JSON` if your account expects extra request fields
- `VIETTEL_AI_EXTRA_HEADERS_JSON` if you need custom headers

### Gemini TTS setup

Set these env vars before running with `--tts-provider gemini`:

- `GEMINI_API_KEY` or `GOOGLE_API_KEY` for Gemini API access
- `GEMINI_TTS_MODEL` if you want to override the default `gemini-2.5-flash-preview-tts`
- `GEMINI_TTS_VOICE` if you want a specific prebuilt voice such as `charon`
- `GEMINI_TTS_LANGUAGE_CODE` if you want to force a language code like `vi-VN`

## Architecture

```
content/script_<name>.json           ← the ONLY file authored/checked in per video
         │
         ▼
┌─ Python pipeline (vidgen/) ────────────────────────────────────────┐
│  main.py               orchestrator: load → gate1 → validate →     │
│                        TTS → manifest → render → gate2 → Studio    │
│  tts_speed_adjustor.py TTS wrapper: VieNeu + Viettel AI + Gemini   │
│                        adapters, WSOLA time-stretch, silence trim, │
│                        loudness normalization                      │
│  manifest.py           script shots → render manifest: type        │
│                        mapping, prop translation, caption reading  │
│                        floor (17 chars/sec)                        │
│  chunked_render.py     per-shot cached chunk rendering + ffmpeg    │
│                        audio track build + lossless concat/mux     │
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

- `output/audio/wav/scene_<id>.wav` — per-shot TTS clips (also copied to `remotion/public/audio/`)
- `output/render_manifest.json` — the flat, fully-resolved render plan Remotion consumes (Studio imports it live; never hand-edit or write it from partial data)
- `output/render_cache/` — per-shot MP4 chunks keyed by content hash, pruned after 14 days
- `remotion/out/` — final videos, named after the script file (e.g. `content/script_grab_dispatch_p4.json` → `remotion/out/grab_dispatch_p4.mp4`); `output/thumbnails/` — cover stills

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

Gotchas: unknown shot types render blank silently — only the types in `remotion/src/types.ts`'s `ManifestScene` union (with matching props) are valid. Scripts may author a shot's `type` as either the snake_case manifest key (e.g. `demand_heatmap`) or, for the 22 types listed in `manifest.py`'s `TYPE_MAP`, the PascalCase Remotion component name (e.g. `DemandHeatmapScene`) — `TYPE_MAP` translates the latter to the former. Narration pacing must allow ≥ 8 frames/word at 30 fps or validation fails.

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

## Workflow: script → video

`python -m vidgen.main content/script_<name>.json` runs these steps:

1. **Load & resolve script** — parse the JSON; if it uses the nested motion-pipeline-1.0 schema, flatten it in-memory to flat `shots[]`.
2. **Gate 1: content quality** — rule-based scorer (`vidgen/gate1.py`, no API key) checks hook length, filler words, frame-range sanity, and duplicate shot types across 4 dimensions; aborts if the total score is < 16/20 or any dimension < 3. Skippable with `--skip-gate1`.
3. **Validate** — check every narrated shot's locked timing against its text: ≥ 8 frames/word, no narration overflow past the shot's safe end, warn on > 1s dead air. Fails fast before any expensive work. Skippable with `--skip-validation`.
4. **Synthesize voiceover** — one TTS pass per narration line using the configured provider (`vieneu` by default, `viettel_ai` or `gemini` when enabled), plus one per `narration_per_criterion` segment. Runs in parallel, capped at 3 workers (unbounded workers exhausted memory). Each clip is then sped up 1.1× with pitch-preserving WSOLA, silence-trimmed, and normalized to −15 dBFS.
5. **Tighten durations** — authored `duration_frames` were paced for native TTS tempo; narrated shots shrink to `audio offset + actual audio length + transition tail` so the sped-up voice leaves no dead air.
6. **Build the render manifest** — translate shot types and props into the exact component shapes, attach audio paths/offsets, and clamp any shot back up so its caption stays readable at 17 chars/sec. Written to `output/render_manifest.json`.
7. **Render, chunked & cached** — each shot renders as its own muted MP4 chunk, cached by a content hash of the shot entry + the Remotion source tree; re-runs only re-render shots that changed. The full audio track is built sample-exactly with a single ffmpeg filter graph, then the chunks are losslessly concatenated and the audio muxed on (AAC 320k).
8. **Gate 2: visual quality** — extracts keyframes via ffmpeg and runs OpenCV checks (contrast, sharpness, background darkness) on the rendered MP4 (`vidgen/gate2_visual.py`, offline). Skippable with `--skip-gate2`.
9. **Open Remotion Studio** — starts Studio on port 3000 if needed and opens the browser for review; Studio loads the same manifest, so the timeline matches the rendered MP4.

### Authoring workflow (Claude Code skills)

Scripts and shot components in this repo are authored with Claude Code using two skill sets:

- **`remotion`** — the AI video-production skill, used to design motion, shot pacing, and write the shot components and script JSONs.
- **`superpowers`** (brainstorming → writing-plans → executing-plans) — used for feature design and implementation; the resulting design docs and plans live in `docs/superpowers/`.

**Hook selection:** before writing a new script's first shot, run `python -m vidgen.hook_selector "<topic>"` (or `select_hook_pattern()` from `vidgen/hook_selector.py`). It scores the 20 patterns in `references/hook-patterns.json` against the topic and returns the best fit — pass `series_used_ids` for a multi-part series so no pattern repeats. Adapt the chosen `formula` to the topic in the first shot's `narration`; don't answer the question it raises until at least 40% through the video.

## Repo layout

```
content/    authored video scripts (one JSON per video)
vidgen/     Python pipeline (orchestration, TTS, manifest, chunked render)
remotion/   Remotion project (compositions, shot components, chunk renderer)
output/     generated artifacts: audio, manifest, render cache, videos, thumbnails
tests/      pytest suite for the pipeline
docs/       design docs and implementation plans
references/ hook pattern library used by vidgen/hook_selector.py
```
---

## 🤖 Automation Roadmap

> Mục tiêu: pipeline tự động hoàn toàn từ topic → publish, không cần can thiệp thủ công.

### Pipeline

```
cron 8pm
  → runner.py        picks topic from topics_queue.json
  → hook_selector    generates script JSON
  → gate1_assert()   blocks render if content score < 16/20
  → tts_speed        synthesizes audio  (speed=1.1, WSOLA pitch-preserve)
  → remotion         renders .mp4
  → gate2_assert()   checks frames via ffmpeg + OpenCV
  → publish_all.py          posts to Facebook + YouTube — run manually today, not yet cron-wired
  → publisher.py            posts to TikTok (Direct Post API) — blocked on API audit approval
  → notify.yml       GitHub Actions notifies on failure via email
```

### Progress

| Gap | What | Status | File |
|-----|------|--------|------|
| GAP 1 | Autonomous trigger — topic queue + cron | ✅ Done | `vidgen/runner.py`, `topics_queue.json` |
| GAP 2 | Gate 1 — content quality enforcement | ✅ Done | `vidgen/gate1.py` |
| GAP 3 | TTS speed wrapper — auto speed + silence trim | ✅ Done | `vidgen/tts_speed_adjustor.py` |
| GAP 4 | Gate 2 — visual quality enforcement | ✅ Done | `vidgen/gate2_visual.py` |
| GAP 5 | Auto-publish — YouTube Data API v3 | ✅ Done | `vidgen/publisher_youtube.py`, `vidgen/publish_common.py` |
| GAP 5 | Auto-publish — Facebook Graph API (Page video) | ✅ Done | `vidgen/publisher_facebook.py`, `vidgen/publish_common.py` |
| GAP 5 | Auto-publish — TikTok Direct Post API | ⏳ Waiting on API audit approval | `vidgen/publisher.py` |

Facebook and YouTube auto-publish are working end-to-end (upload → poll → notify). `vidgen/publish_all.py` publishes to both with one command. TikTok is fully wired but held back pending TikTok's Direct Post API audit approval — flip the row above to ✅ and add it to `publish_all.py`'s `PLATFORMS` once that clears.

### Quick start

```bash
# Add topics to queue
# edit topics_queue.json → pending[]

# Run pipeline manually
python -m vidgen.runner --pick-next

# Dry-run (no execution)
python -m vidgen.runner --pick-next --dry-run

# Check queue status
python -m vidgen.runner --list

# Publish to Facebook + YouTube in one shot (the everyday command)
python -m vidgen.publish_all out/video.mp4 --title "Tiêu đề"

# Publish to YouTube only (one-time OAuth setup, then reusable)
python -m vidgen.publisher_youtube --setup-guide           # print setup instructions
python -m vidgen.publisher_youtube --oauth                 # run OAuth flow, save tokens
python -m vidgen.publisher_youtube out/video.mp4 --title "Tiêu đề #Shorts"
python -m vidgen.publisher_youtube --delete VIDEO_ID        # remove a published video

# Publish to Facebook only (Page video, one-time OAuth setup, then reusable)
python -m vidgen.publisher_facebook --setup-guide           # print setup instructions
python -m vidgen.publisher_facebook --oauth                 # run OAuth flow, save Page token
python -m vidgen.publisher_facebook out/video.mp4 --title "Tiêu đề"
python -m vidgen.publisher_facebook --delete VIDEO_ID        # remove a published video

# Publish to TikTok (blocked until Direct Post API audit is approved)
python -m vidgen.publisher out/video.mp4 --title "Tiêu đề #60scongnghe"
```

### Cron setup

```bash
crontab -e
# Add:
0 20 * * * cd /path/to/VidGen && python -m vidgen.runner --pick-next >> logs/runner.log 2>&1
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

### Topic Harvester

python -m vidgen.topic_harvester --dry-run --top 5    # preview
python -m vidgen.topic_harvester --push 2             # push the best 2 topics

# Cron daily
0 7  * * * cd /path/to/VidGen && python -m vidgen.topic_harvester --push 1
0 20 * * * cd /path/to/VidGen && python -m vidgen.runner --pick-next
