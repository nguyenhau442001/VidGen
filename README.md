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

Gotchas: unknown scene types render blank silently — only the types in `remotion/src/types.ts`'s `ManifestScene` union (with matching props) are valid. Scripts may author a scene's `type` as either the snake_case manifest key (e.g. `demand_heatmap`) or, for the 18 types listed in `manifest.py`'s `TYPE_MAP`, the PascalCase Remotion component name (e.g. `DemandHeatmapScene`) — `TYPE_MAP` translates the latter to the former. Narration pacing must allow ≥ 8 frames/word at 30 fps or validation fails.

## Scene library (24 wired scene types + 2 covers)

The video is assembled from **24 reusable scene types** — the tool's "skills" — each a React component in `remotion/src/scenes/`, registered in `remotion/src/types.ts` and dispatched by `remotion/src/TikTokVideo.tsx`'s scene switch:

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
| `DemandHeatmapScene` | Pulsing heatmap blobs over a map, intensity-colored |
| `SignalFlowScene` | Input signal nodes streaming particles into a central "brain" node |
| `RippleAggregateScene` | One phone tap zooms out into a field of rippling phones converging on a hotspot |
| `DriverSwarmScene` | Multiple drivers converging on a pulsing demand zone |
| `CounterBlastScene` | Big count-up number reveal with a flash and lock-in pulse |
| `ScoreCardScene` | Score rows revealed with a stagger (supports per-row narration) |
| `SplitViewScene` | Two-panel left/right comparison with captions |
| `QuoteCalloutScene` | Large quote with an accent word, subtle or dark background |
| `ZoomRevealScene` | Camera pull-back from a focal element to a wider dot field |
| `SplitRevealScene` | Full-screen content compresses left to reveal a right panel |
| `AnimatedFlowScene` | Node graph with animated edges connecting labeled nodes |
| `BubbleComparatorScene` | Sized bubbles comparing labeled values |
| `PhoneMapScene` | Phone UI with map pins (driver/user/zone) |
| `ConversationScene` | Chat-style message bubbles, left/right |
| `BeforeAfterScene` | Two-panel before/after point comparison |
| `GridHeatmapScene` | Cell grid revealing top-left to bottom-right by intensity |

`AnimatedFlowScene`, `BubbleComparatorScene`, `PhoneMapScene`, `ConversationScene`, `BeforeAfterScene`, and `GridHeatmapScene` aren't in `TYPE_MAP` — author their `type` as the snake_case manifest key directly (e.g. `"type": "grid_heatmap"`).

Two additional cover components are used for thumbnails, not in the video timeline: `CoverScene` and `CharacterIconCoverScene`. Thumbnails are rendered with `npx remotion still CharacterIconCover --props='...'` into `output/thumbnails/`.

Six more components exist in `remotion/src/scenes/` but aren't wired into the manifest/render pipeline yet — built but not yet registered in `types.ts`/`TikTokVideo.tsx`, so scripts can't reference them: `AnimatedBarRaceScene`, `CounterAnimScene`, `PacketFlowScene`, `QuizPopScene`, `SplitRevealTitleScene`, `TimelineScene`.

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

**Hook selection:** before writing a new script's first scene, run `python -m vidgen.hook_selector "<topic>"` (or `select_hook_pattern()` from `vidgen/hook_selector.py`). It scores the 20 patterns in `references/hook-patterns.json` against the topic and returns the best fit — pass `series_used_ids` for a multi-part series so no pattern repeats. Adapt the chosen `formula` to the topic in the first scene's `narration`; don't answer the question it raises until at least 40% through the video.

## Repo layout

```
content/    authored video scripts (one JSON per video)
vidgen/     Python pipeline (orchestration, TTS, manifest, chunked render)
remotion/   Remotion project (compositions, scene components, chunk renderer)
output/     generated artifacts: audio, manifest, render cache, videos, thumbnails
tests/      pytest suite for the pipeline
docs/       design docs and implementation plans
references/ hook pattern library used by vidgen/hook_selector.py
```

# 🤖 VidGen — Automation Coverage Roadmap

> **Current coverage: ~40% → Target: 100% fully autonomous**

---

## Pipeline Overview

```
[Topic Queue]
      │
  1. Topic trigger          ← GAP 1 (manual start)
      │
  2. Script generation      ✅ automated (Claude → JSON)
      │
  3. Gate 1 — content audit ← GAP 2 (score not enforced in code)
      │
  4. TTS synthesis          ← GAP 3 (speed/silence tuned manually)
      │
  5. Remotion render        ✅ automated (python -m vidgen.main)
      │
  6. Gate 2 — visual audit  ← GAP 4 (no ffmpeg frame check)
      │
  7. Publish / distribute   ← GAP 5 (manual upload)
```

---

## GAP 1 — Autonomous Trigger (replace manual topic input)

**Problem:** Pipeline must be started manually each time.

**Solution:** `topic_queue.json` + cron job

```json
// topics_queue.json
["Thuật toán Redis pub/sub", "Tại sao QUIC nhanh hơn TCP", "..."]
```

```bash
# crontab — runs every evening at 8pm
0 20 * * * cd ~/VidGen && python -m vidgen.runner --pick-next
```

`runner.py` pops the first topic from the queue and runs the full pipeline without human intervention.

- [ ] Create `topics_queue.json`
- [ ] Implement `vidgen/runner.py` with `--pick-next` flag
- [ ] Register cron job

---

## GAP 2 — Gate 1 Score Enforcement (block bad scripts before render)

**Problem:** Gate 1 quality scoring only exists in the prompt — no code assertion stops a low-quality script from proceeding to render.

**Solution:** Add `gate1_assert()` to `main.py` before TTS is called

```python
def gate1_assert(script: dict, min_total: int = 22) -> None:
    audit = score_script(script)   # calls Claude API to self-score
    if audit["total"] < min_total or any(v < 4 for v in audit.values()):
        raise ValueError(f"Gate 1 FAIL: {audit} — rewriting...")
```

Pipeline auto-blocks and Claude self-rewrites. Nothing renders until score ≥ 22/30 and all dimensions ≥ 4.

- [ ] Implement `score_script()` using Claude API
- [ ] Implement `gate1_assert()` in `vidgen/main.py`
- [ ] Add max rewrite retry limit (e.g. 3 attempts before human alert)

---

## GAP 3 — TTS Speed Wrapper (replace manual speed tuning)

**Problem:** TTS speed and silence trimming are configured manually each run.

**Solution:** Call `synthesize_scenes()` inside `main.py` as a pipeline step

```python
# in vidgen/main.py — replace raw TTS call
from vidgen.tts_speed import synthesize_scenes

synthesize_scenes(
    scenes=script["scenes"],
    output_dir="public/audio",
    speed=1.2,           # standard for ~70s format
    max_silence_ms=120,  # auto-strip dead air
)
```

No separate TTS command needed — it becomes one step in the unified runner.

**Speed reference:**

| Speed | Effect           | Use when                        |
|-------|------------------|---------------------------------|
| 1.0   | Normal pace      | Reference / debugging only      |
| 1.15  | Slightly faster  | Dense narration, long sentences |
| 1.2   | **Recommended**  | Standard short-form video       |
| 1.25  | Aggressive       | Very short scenes < 4s          |
| > 1.3 | ❌ Do NOT use   | Vietnamese tones degrade        |

- [ ] Confirm `vidgen/tts_speed.py` is present in repo
- [ ] Replace raw TTS call in `main.py` with `synthesize_scenes()`
- [ ] Verify `librosa` and `soundfile` are in `requirements.txt`

---

## GAP 4 — Gate 2 Visual Audit (replace manual video review)

**Problem:** After render, visual quality (legibility, contrast, pacing) is checked by eye. Not scalable.

**Solution:** `gate2_visual.py` using ffmpeg frame extraction + Claude Vision

```python
import subprocess, base64

def extract_frames(mp4_path: str) -> list[str]:
    """Extract keyframes at seconds 1, 3, 6, 10, 20 → base64"""
    frames = []
    for t in [1, 3, 6, 10, 20]:
        out = f"/tmp/frame_{t}.png"
        subprocess.run([
            "ffmpeg", "-ss", str(t), "-i", mp4_path,
            "-frames:v", "1", out, "-y", "-loglevel", "quiet"
        ])
        with open(out, "rb") as f:
            frames.append(base64.b64encode(f.read()).decode())
    return frames

def gate2_assert(mp4_path: str) -> dict:
    frames_b64 = extract_frames(mp4_path)
    result = claude_vision_audit(frames_b64)  # Claude Vision checks legibility, contrast, pacing
    if not result["pass"]:
        raise ValueError(f"Gate 2 FAIL: {result['issues']}")
    return result
```

Claude Vision replaces the human eye. Max 2 self-correct cycles before escalating.

**Visual dimensions checked automatically:**
- Text legibility — no overflow, readable on dark background
- Contrast & color — accent colors not competing
- Information density — no scene has > 4 bullets
- Scene pacing — no freeze-frame or too-fast cuts

- [ ] Implement `vidgen/gate2_visual.py`
- [ ] Integrate `gate2_assert()` call after render step in `main.py`
- [ ] Handle self-correct loop: fix JSON → re-render (max 2 cycles)

---

## GAP 5 — Auto-Publish After Render (replace manual upload)

**Problem:** After `.mp4` is produced and quality-verified, the file still has to be uploaded manually.

**Solution (short-term):** CLI uploader post Gate 2 pass

```python
import subprocess

subprocess.run([
    "python", "-m", "tiktok_uploader",
    "--video", f"out/{slug}.mp4",
    "--title", script["scenes"][0]["props"]["headline"],
    "--cookies", "cookies.txt"
])
```

**Solution (long-term):** YouTube Data API v3 (official) or
[tiktok-uploader](https://github.com/wkaisertexas/tiktok-uploader) integrated as a post-render step.

**Notification after publish:**

```python
# Telegram bot ping on success
requests.post(f"https://api.telegram.org/bot{TOKEN}/sendMessage", json={
    "chat_id": CHAT_ID,
    "text": f"✅ Video mới đã đăng: {slug}\n⏱ {duration}s | Gate1={gate1_score}/30"
})
```

- [ ] Set up `tiktok_uploader` or YouTube API credentials
- [ ] Implement `vidgen/publisher.py`
- [ ] Add Telegram bot notification on success/failure

---

## Target Architecture — Fully Autonomous

```
cron 8pm
  → runner.py picks topic from queue
  → claude_script.py generates JSON
  → gate1_assert() blocks if score < 22  (max 3 rewrites)
  → tts_speed.py synthesizes audio (speed=1.2, silence=120ms)
  → remotion renders .mp4
  → gate2_assert() checks frames via ffmpeg + Claude Vision  (max 2 fix cycles)
  → publisher.py posts to TikTok / YouTube
  → Telegram bot notifies "✅ Video mới đã đăng"
```

---

## Implementation Priority

| Priority | Gap   | Effort | Impact                              |
|----------|-------|--------|-------------------------------------|
| 🔴 P0   | GAP 2 | Low    | Blocks bad scripts before render    |
| 🔴 P0   | GAP 4 | Medium | Catches visual bugs before publish  |
| 🟡 P1   | GAP 3 | Low    | Eliminates manual TTS tuning        |
| 🟡 P1   | GAP 1 | Low    | Enables unattended overnight runs   |
| 🟢 P2   | GAP 5 | Medium | Full end-to-end zero-touch pipeline |

> **Start with GAP 2 + GAP 4 first** — quality gates must work before auto-publishing is safe.
