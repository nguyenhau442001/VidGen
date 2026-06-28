# Video Generation Design — VidGen Remotion Pipeline

**Date:** 2026-06-28
**Status:** Approved

---

## Overview

Add a Remotion-based video rendering layer to VidGen. Python remains the single pipeline entrypoint: it synthesizes per-scene audio, computes frame counts, writes a render manifest, then invokes Remotion via subprocess to produce the final MP4.

Target: Vietnamese tech/coding TikTok content (9:16, 1080×1920). YouTube (16:9) is deferred.

---

## Architecture

```
content/sample_script.json          ← authored by user (extended schema)
         │
         ▼
[Python: vidgen/main.py]
  1. Synthesize per-scene WAV        → output/wav/scene_N.wav
  2. Measure audio durations
  3. Write render manifest           → output/render_manifest.json
  4. Call: npx remotion render ...
         │
         ▼
[Remotion: remotion/]
  - Reads render_manifest.json via --props
  - Renders each scene (code / terminal / explanation / error_log)
  - Syncs audio per scene
  - Outputs final MP4                → output/video/video.mp4
```

The `render_manifest.json` is the sole handoff contract between Python and Remotion. No other shared state.

---

## Extended Script Schema

`content/sample_script.json` — each scene adds `type` and `visual`:

```json
{
  "title": "Video Title",
  "language": "vi",
  "scenes": [
    {
      "id": 1,
      "type": "explanation",
      "narration": "...",
      "visual": {
        "headline": "Unix File Permissions",
        "body": "Every file has 3 permission sets: owner, group, others"
      }
    },
    {
      "id": 2,
      "type": "terminal",
      "narration": "...",
      "visual": {
        "lines": ["$ ls -la /etc/passwd", "-rw-r--r-- 1 root root 2847 /etc/passwd"]
      }
    },
    {
      "id": 3,
      "type": "code",
      "narration": "...",
      "visual": {
        "language": "bash",
        "code": "chmod 755 script.sh\nchown user:group file.txt",
        "highlightLines": [1]
      }
    },
    {
      "id": 4,
      "type": "error_log",
      "narration": "...",
      "visual": {
        "lines": ["Error: ENOENT: no such file or directory"],
        "highlightKeywords": ["Error", "ENOENT"]
      }
    }
  ]
}
```

**Scene types:**
- `explanation` — headline + body text, kinetic typography
- `terminal` — command prompt + output lines, typewriter reveal
- `code` — syntax-highlighted code block, line-by-line reveal
- `error_log` — red-tinted terminal, shake/pulse on entry

---

## Render Manifest

Python writes `output/render_manifest.json` after audio synthesis:

```json
{
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "scenes": [
    {
      "id": 1,
      "type": "explanation",
      "audioPath": "../output/wav/scene_1.wav",
      "durationInFrames": 39,
      "visual": { "headline": "...", "body": "..." }
    }
  ]
}
```

`durationInFrames = ceil(audio_duration_seconds × fps) + 10` (10-frame padding to avoid audio cutoff).

Python then calls:
```bash
npx remotion render TikTokVideo output/video/video.mp4 \
  --props='{"manifestPath":"../../output/render_manifest.json"}'
```

---

## Remotion Project Structure

```
remotion/
├── package.json
├── remotion.config.ts
├── src/
│   ├── index.ts
│   ├── Root.tsx
│   ├── TikTokVideo.tsx
│   ├── types.ts               # Discriminated union scene types
│   ├── styles.ts              # Shared colors, fonts, type scale
│   └── scenes/
│       ├── ExplanationScene.tsx
│       ├── TerminalScene.tsx
│       ├── CodeScene.tsx
│       └── ErrorLogScene.tsx
```

---

## Theme (styles.ts)

- **Background:** `#0a0a0f`
- **Primary accent:** `#00ff41` (matrix green) — code/terminal success states
- **Secondary accent:** `#61dafb` (cyan) — explanation/info highlights
- **Error color:** `#ff3b3b` — error_log tint/border
- **Code/terminal font:** JetBrains Mono (loaded via `@remotion/google-fonts`)
- **Explanation font:** Inter (loaded via `@remotion/google-fonts`)

Font loading uses `loadFont()` + `waitUntilDone()` from `@remotion/google-fonts` — never `@font-face` or `<link>` tags, which risk wrong fallback fonts in exported frames.

---

## Scene Components

### Shared Animation Rules (hard Remotion constraints)

- **FORBIDDEN:** CSS transitions, CSS `@keyframes`, Tailwind `animate-*` — Remotion captures discrete frames, not real-time playback
- **ALL animation** must be computed from `useCurrentFrame()` via `interpolate()` or `spring()`, applied as inline styles
- **Enter:** slide up + fade in, first 10 frames (`translateY: 20px→0`, `opacity: 0→1`)
- **Exit:** fade out, last 8 frames of `durationInFrames`

### ExplanationScene

Props: `{ headline: string; body: string; durationInFrames: number }`

Fonts: Inter. Headline bold + large, body normal weight.
Content reveal: staggered spring entrance per word or line — each word/line gets a `spring()` with a frame offset proportional to its index.

### TerminalScene

Props: `{ lines: string[]; durationInFrames: number }`

Lines starting with `$ ` are commands (accent color), others are output (dim white).
Optional rounded top bar with 3 traffic-light dots.
Content reveal: typewriter character-by-character via `interpolate(frame, [lineStart, lineEnd], [0, line.length])` — stagger each line's start after the previous finishes. No `setInterval`/`setTimeout`.

### CodeScene

Props: `{ language: string; code: string; highlightLines?: number[]; durationInFrames: number }`

Syntax highlighting: `prism-react-renderer` (synchronous, no async in render loop).
Tokens precomputed via `useMemo` outside the frame render path.
Content reveal: line-by-line opacity driven by frame number. `highlightLines` get a background highlight color.

### ErrorLogScene

Props: `{ lines: string[]; highlightKeywords?: string[]; durationInFrames: number }`

Same terminal rendering as TerminalScene but with red tint (`#ff3b3b` border or background tint).
Entry animation: frame-driven sine shake — `translateX: Math.sin(frame * freq) * amplitude * decay` for first ~12 frames.

---

## TikTokVideo.tsx

Uses `<Series>` and `<Series.Sequence durationInFrames={scene.durationInFrames}>` — no manual frame offset accumulation.
Each sequence dispatches on `scene.type` to the right component and includes `<Audio src={scene.audioPath}>`.

## Root.tsx

`<Composition>` with `calculateMetadata` that sums `scene.durationInFrames` across all scenes from props — duration is never hardcoded.

---

## Out of Scope (Deferred)

- Subtitle/caption overlay
- YouTube (16:9) format support
- Background music
