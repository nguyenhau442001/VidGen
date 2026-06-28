# Video Generation — Remotion Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Remotion video rendering layer so that `python vidgen/main.py` produces a final TikTok MP4 from a JSON script and synthesized audio.

**Architecture:** Python synthesizes per-scene WAV audio, copies it into `remotion/public/audio/`, then writes `output/render_manifest.json` with scene type, visual content, audio path, and `durationInFrames` per scene. Remotion reads the manifest via `--props` and renders a `<Series>` of typed scene components synced to their audio. Python triggers `npx remotion render` as the final pipeline step via `subprocess`.

**Tech Stack:** Python 3.13, `wave` + `subprocess` (stdlib); Remotion 4.0.293, React 19, TypeScript 5, `@remotion/google-fonts` 4.0.293, `prism-react-renderer` ^2.3.0

## Global Constraints

- TikTok format: 1080×1920, 30 fps
- Background `#0a0a0f`; green accent `#00ff41`; cyan accent `#61dafb`; error red `#ff3b3b`
- JetBrains Mono for all code/terminal/error content; Inter for explanation text
- Fonts loaded via `@remotion/google-fonts` `loadFont()` — never `@font-face` or `<link>`
- ALL animation via `useCurrentFrame()` + `interpolate()`/`spring()` — no CSS transitions, `@keyframes`, or Tailwind `animate-*`
- Enter animation: first 10 frames (`translateY` 20→0, `opacity` 0→1)
- Exit animation: last 8 frames of `durationInFrames` (`opacity` 1→0)
- `durationInFrames = ceil(audio_duration_seconds × 30) + 10`
- `npx` must be available in PATH when `main.py` runs
- All Python must use `/Users/haunguyen/miniconda3/bin/python`

---

## File Map

**New files — Remotion project:**
- `remotion/package.json` — npm project definition
- `remotion/remotion.config.ts` — Remotion renderer config
- `remotion/tsconfig.json` — TypeScript config
- `remotion/src/index.ts` — registerRoot entry point
- `remotion/src/types.ts` — discriminated union scene types + RenderManifest
- `remotion/src/styles.ts` — color tokens, font loading, type scale
- `remotion/src/scenes/ExplanationScene.tsx` — headline + body, staggered spring
- `remotion/src/scenes/TerminalScene.tsx` — typewriter reveal, terminal chrome
- `remotion/src/scenes/CodeScene.tsx` — syntax-highlighted code, line-by-line reveal
- `remotion/src/scenes/ErrorLogScene.tsx` — red-tinted terminal, sine shake entry
- `remotion/src/TikTokVideo.tsx` — main composition using `<Series>`
- `remotion/src/Root.tsx` — composition registration with `calculateMetadata`

**New files — Python:**
- `vidgen/manifest.py` — `build_render_manifest()` and `write_render_manifest()`
- `tests/test_manifest.py` — unit tests for manifest generation

**Modified files:**
- `vidgen/main.py` — import manifest module, copy audio to Remotion public, write manifest, call render
- `content/sample_script.json` — add `type` and `visual` fields per scene

---

### Task 1: Remotion project scaffold

**Files:**
- Create: `remotion/package.json`
- Create: `remotion/remotion.config.ts`
- Create: `remotion/tsconfig.json`
- Create: `remotion/src/index.ts`

**Interfaces:**
- Produces: npm project runnable via `npm run dev` (Remotion Studio) and `npm run render`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p remotion/src/scenes remotion/public/audio
```

- [ ] **Step 2: Create `remotion/package.json`**

```json
{
  "name": "vidgen-remotion",
  "scripts": {
    "dev": "npx remotion studio",
    "render": "npx remotion render TikTokVideo"
  },
  "dependencies": {
    "@remotion/cli": "4.0.293",
    "@remotion/google-fonts": "4.0.293",
    "prism-react-renderer": "^2.3.0",
    "react": "^19",
    "react-dom": "^19",
    "remotion": "4.0.293"
  },
  "devDependencies": {
    "@types/react": "^19",
    "typescript": "^5"
  }
}
```

- [ ] **Step 3: Create `remotion/remotion.config.ts`**

```typescript
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
```

- [ ] **Step 4: Create `remotion/tsconfig.json`**

```json
{
  "compilerOptions": {
    "lib": ["dom", "esnext"],
    "module": "commonjs",
    "target": "ES2022",
    "strict": true,
    "jsx": "react",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*", "remotion.config.ts"]
}
```

- [ ] **Step 5: Create `remotion/src/index.ts`**

```typescript
import { registerRoot } from "remotion";
import { Root } from "./Root";

registerRoot(Root);
```

- [ ] **Step 6: Install dependencies**

```bash
cd remotion && npm install
```

Expected: `node_modules/` created, no errors. Verify: `ls node_modules/remotion` should show files.

- [ ] **Step 7: Commit**

```bash
git add remotion/
git commit -m "chore: scaffold Remotion project"
```

---

### Task 2: Types and shared styles

**Files:**
- Create: `remotion/src/types.ts`
- Create: `remotion/src/styles.ts`

**Interfaces:**
- Produces: `ManifestScene`, `RenderManifest`, `ExplanationSceneProps`, `TerminalSceneProps`, `CodeSceneProps`, `ErrorLogSceneProps` — imported by all scene components and `TikTokVideo.tsx`
- Produces: `colors`, `INTER`, `JETBRAINS_MONO`, `type` — imported by all scene components

- [ ] **Step 1: Create `remotion/src/types.ts`**

```typescript
export type ExplanationVisual = {
  headline: string;
  body: string;
};

export type TerminalVisual = {
  lines: string[];
};

export type CodeVisual = {
  language: string;
  code: string;
  highlightLines?: number[];
};

export type ErrorLogVisual = {
  lines: string[];
  highlightKeywords?: string[];
};

export type ManifestScene =
  | { type: "explanation"; id: number; audioPath: string; durationInFrames: number; visual: ExplanationVisual }
  | { type: "terminal"; id: number; audioPath: string; durationInFrames: number; visual: TerminalVisual }
  | { type: "code"; id: number; audioPath: string; durationInFrames: number; visual: CodeVisual }
  | { type: "error_log"; id: number; audioPath: string; durationInFrames: number; visual: ErrorLogVisual };

export type RenderManifest = {
  fps: number;
  width: number;
  height: number;
  scenes: ManifestScene[];
};

export type ExplanationSceneProps = ExplanationVisual & { durationInFrames: number };
export type TerminalSceneProps = TerminalVisual & { durationInFrames: number };
export type CodeSceneProps = CodeVisual & { durationInFrames: number };
export type ErrorLogSceneProps = ErrorLogVisual & { durationInFrames: number };
```

- [ ] **Step 2: Create `remotion/src/styles.ts`**

```typescript
import { loadFont as loadInterFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrainsMonoFont } from "@remotion/google-fonts/JetBrainsMono";

export const { fontFamily: INTER, waitUntilDone: waitForInter } = loadInterFont("normal", {
  weights: ["400", "600", "700"],
  subsets: ["latin"],
});

export const { fontFamily: JETBRAINS_MONO, waitUntilDone: waitForJetBrainsMono } =
  loadJetBrainsMonoFont("normal", {
    weights: ["400", "500", "700"],
    subsets: ["latin"],
  });

export const colors = {
  bg: "#0a0a0f",
  green: "#00ff41",
  cyan: "#61dafb",
  errorRed: "#ff3b3b",
  textPrimary: "rgba(255,255,255,0.95)",
  textDim: "rgba(255,255,255,0.5)",
  terminalBg: "#0d1117",
  terminalBorder: "rgba(255,255,255,0.08)",
  codeBg: "#0d1117",
};

export const type = {
  headline: { fontSize: 56, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.025em" } as const,
  body: { fontSize: 32, fontWeight: 400, lineHeight: 1.5 } as const,
  code: { fontSize: 26, fontWeight: 400, lineHeight: 1.6 } as const,
  terminal: { fontSize: 24, fontWeight: 400, lineHeight: 1.7 } as const,
  label: { fontSize: 18, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const } as const,
};
```

- [ ] **Step 3: Commit**

```bash
git add remotion/src/types.ts remotion/src/styles.ts
git commit -m "feat: add Remotion types and shared dark-terminal styles"
```

---

### Task 3: ExplanationScene

**Files:**
- Create: `remotion/src/scenes/ExplanationScene.tsx`

**Interfaces:**
- Consumes: `ExplanationSceneProps` from `../types`; `colors`, `INTER`, `type` from `../styles`
- Produces: `ExplanationScene` — used in `TikTokVideo.tsx` switch dispatch

- [ ] **Step 1: Create `remotion/src/scenes/ExplanationScene.tsx`**

```tsx
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ExplanationSceneProps } from "../types";
import { colors, INTER, type as t } from "../styles";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;

export const ExplanationScene: React.FC<ExplanationSceneProps> = ({
  headline,
  body,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneOpacity = interpolate(
    frame,
    [0, ENTER_FRAMES, durationInFrames - EXIT_FRAMES, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const sceneY = interpolate(frame, [0, ENTER_FRAMES], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const headlineWords = headline.split(" ");
  const bodyWords = body.split(" ");

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        opacity: sceneOpacity,
        transform: `translateY(${sceneY}px)`,
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "0 72px",
        fontFamily: INTER,
        flexDirection: "column",
      }}
    >
      {/* Cyan accent bar */}
      <div
        style={{
          width: 6,
          height: 64,
          backgroundColor: colors.cyan,
          borderRadius: 3,
          marginBottom: 36,
          opacity: interpolate(frame, [ENTER_FRAMES, ENTER_FRAMES + 6], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />

      {/* Headline — staggered spring per word */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 14px", marginBottom: 36 }}>
        {headlineWords.map((word, i) => {
          const s = spring({
            frame: frame - ENTER_FRAMES - i * 3,
            fps,
            config: { stiffness: 300, damping: 20 },
            durationInFrames: 20,
          });
          return (
            <span
              key={i}
              style={{
                ...t.headline,
                color: colors.textPrimary,
                opacity: s,
                transform: `translateY(${interpolate(s, [0, 1], [16, 0])}px)`,
                display: "inline-block",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>

      {/* Body — staggered spring per word, delayed after headline */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 8px" }}>
        {bodyWords.map((word, i) => {
          const delay = ENTER_FRAMES + headlineWords.length * 3 + i * 2;
          const s = spring({
            frame: frame - delay,
            fps,
            config: { stiffness: 200, damping: 22 },
            durationInFrames: 20,
          });
          return (
            <span
              key={i}
              style={{
                ...t.body,
                color: colors.textDim,
                opacity: s,
                transform: `translateY(${interpolate(s, [0, 1], [10, 0])}px)`,
                display: "inline-block",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add remotion/src/scenes/ExplanationScene.tsx
git commit -m "feat: add ExplanationScene with staggered spring word reveal"
```

---

### Task 4: TerminalScene

**Files:**
- Create: `remotion/src/scenes/TerminalScene.tsx`

**Interfaces:**
- Consumes: `TerminalSceneProps` from `../types`; `colors`, `JETBRAINS_MONO`, `type` from `../styles`
- Produces: `TerminalScene` — used in `TikTokVideo.tsx` switch dispatch

Lines starting with `$ ` are commands (rendered in `colors.green`); others are output (`colors.textDim`).

- [ ] **Step 1: Create `remotion/src/scenes/TerminalScene.tsx`**

```tsx
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { TerminalSceneProps } from "../types";
import { colors, JETBRAINS_MONO, type as t } from "../styles";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const CHARS_PER_FRAME = 3;

export const TerminalScene: React.FC<TerminalSceneProps> = ({ lines, durationInFrames }) => {
  const frame = useCurrentFrame();

  const sceneOpacity = interpolate(
    frame,
    [0, ENTER_FRAMES, durationInFrames - EXIT_FRAMES, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const sceneY = interpolate(frame, [0, ENTER_FRAMES], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Each line starts typing after the previous one finishes
  const lineStartFrames: number[] = [];
  let cursor = ENTER_FRAMES;
  for (const line of lines) {
    lineStartFrames.push(cursor);
    cursor += Math.ceil(line.length / CHARS_PER_FRAME) + 4;
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        opacity: sceneOpacity,
        transform: `translateY(${sceneY}px)`,
        justifyContent: "center",
        alignItems: "center",
        padding: "0 48px",
        fontFamily: JETBRAINS_MONO,
      }}
    >
      <div
        style={{
          width: "100%",
          backgroundColor: colors.terminalBg,
          borderRadius: 16,
          border: `1px solid ${colors.terminalBorder}`,
          overflow: "hidden",
        }}
      >
        {/* Top bar with traffic-light dots */}
        <div
          style={{
            height: 44,
            backgroundColor: "#1a1a2e",
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            gap: 8,
          }}
        >
          {(["#ff5f57", "#febc2e", "#28c840"] as const).map((c, i) => (
            <div
              key={i}
              style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: c }}
            />
          ))}
        </div>

        {/* Lines */}
        <div style={{ padding: "28px 32px", minHeight: 200 }}>
          {lines.map((line, lineIdx) => {
            const isCommand = line.startsWith("$ ");
            const startFrame = lineStartFrames[lineIdx];
            const charsToShow = Math.floor(
              interpolate(
                frame,
                [startFrame, startFrame + Math.max(1, Math.ceil(line.length / CHARS_PER_FRAME))],
                [0, line.length],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              )
            );
            const visible = frame >= startFrame;
            const stillTyping = charsToShow < line.length;

            return (
              <div
                key={lineIdx}
                style={{
                  ...t.terminal,
                  color: isCommand ? colors.green : colors.textDim,
                  whiteSpace: "pre",
                  opacity: visible ? 1 : 0,
                  minHeight: "1.7em",
                }}
              >
                {line.slice(0, charsToShow)}
                {visible && stillTyping && (
                  <span
                    style={{
                      color: colors.green,
                      opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0,
                    }}
                  >
                    █
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add remotion/src/scenes/TerminalScene.tsx
git commit -m "feat: add TerminalScene with frame-driven typewriter effect"
```

---

### Task 5: CodeScene

**Files:**
- Create: `remotion/src/scenes/CodeScene.tsx`

**Interfaces:**
- Consumes: `CodeSceneProps` from `../types`; `colors`, `JETBRAINS_MONO`, `type` from `../styles`
- Produces: `CodeScene` — used in `TikTokVideo.tsx` switch dispatch

`prism-react-renderer` v2 is synchronous — `Highlight`'s children render prop is called synchronously in React's render phase, so it is safe to use inside Remotion's per-frame render.

- [ ] **Step 1: Create `remotion/src/scenes/CodeScene.tsx`**

```tsx
import React from "react";
import { Highlight, themes, type Language } from "prism-react-renderer";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CodeSceneProps } from "../types";
import { colors, JETBRAINS_MONO, type as t } from "../styles";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const FRAMES_PER_LINE = 6;

export const CodeScene: React.FC<CodeSceneProps> = ({
  language,
  code,
  highlightLines = [],
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  const sceneOpacity = interpolate(
    frame,
    [0, ENTER_FRAMES, durationInFrames - EXIT_FRAMES, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const sceneY = interpolate(frame, [0, ENTER_FRAMES], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        opacity: sceneOpacity,
        transform: `translateY(${sceneY}px)`,
        justifyContent: "center",
        alignItems: "center",
        padding: "0 48px",
        fontFamily: JETBRAINS_MONO,
      }}
    >
      <div
        style={{
          width: "100%",
          backgroundColor: colors.codeBg,
          borderRadius: 16,
          border: `1px solid ${colors.terminalBorder}`,
          overflow: "hidden",
        }}
      >
        {/* Language label bar */}
        <div
          style={{
            padding: "12px 24px",
            borderBottom: `1px solid ${colors.terminalBorder}`,
          }}
        >
          <span style={{ ...t.label, color: colors.cyan }}>{language}</span>
        </div>

        {/* Code block */}
        <div style={{ padding: "24px 32px" }}>
          <Highlight
            theme={themes.nightOwl}
            code={code.trim()}
            language={language as Language}
          >
            {({ tokens, getTokenProps }) =>
              tokens.map((line, lineIdx) => {
                const revealStart = ENTER_FRAMES + lineIdx * FRAMES_PER_LINE;
                const lineOpacity = interpolate(
                  frame,
                  [revealStart, revealStart + 8],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                );
                const isHighlighted = highlightLines.includes(lineIdx + 1);

                return (
                  <div
                    key={lineIdx}
                    style={{
                      ...t.code,
                      opacity: lineOpacity,
                      backgroundColor: isHighlighted
                        ? "rgba(0,255,65,0.08)"
                        : "transparent",
                      borderLeft: isHighlighted
                        ? `3px solid ${colors.green}`
                        : "3px solid transparent",
                      padding: "2px 12px",
                      margin: "0 -12px",
                      whiteSpace: "pre",
                    }}
                  >
                    {line.map((token, tokenIdx) => (
                      <span key={tokenIdx} {...getTokenProps({ token })} />
                    ))}
                  </div>
                );
              })
            }
          </Highlight>
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add remotion/src/scenes/CodeScene.tsx
git commit -m "feat: add CodeScene with prism syntax highlighting and line-by-line reveal"
```

---

### Task 6: ErrorLogScene

**Files:**
- Create: `remotion/src/scenes/ErrorLogScene.tsx`

**Interfaces:**
- Consumes: `ErrorLogSceneProps` from `../types`; `colors`, `JETBRAINS_MONO`, `type` from `../styles`
- Produces: `ErrorLogScene` — used in `TikTokVideo.tsx` switch dispatch

Same terminal chrome as `TerminalScene` but with a red `#ff3b3b` left border and a frame-driven sine shake on entry.

- [ ] **Step 1: Create `remotion/src/scenes/ErrorLogScene.tsx`**

```tsx
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ErrorLogSceneProps } from "../types";
import { colors, JETBRAINS_MONO, type as t } from "../styles";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const SHAKE_DURATION = 12;
const CHARS_PER_FRAME = 3;

export const ErrorLogScene: React.FC<ErrorLogSceneProps> = ({
  lines,
  highlightKeywords = [],
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  const sceneOpacity = interpolate(
    frame,
    [0, ENTER_FRAMES, durationInFrames - EXIT_FRAMES, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const sceneY = interpolate(frame, [0, ENTER_FRAMES], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Sine shake: decays to zero over SHAKE_DURATION frames
  const shakeX =
    frame < ENTER_FRAMES + SHAKE_DURATION
      ? Math.sin((frame - ENTER_FRAMES) * 1.8) *
        8 *
        Math.max(0, 1 - (frame - ENTER_FRAMES) / SHAKE_DURATION)
      : 0;

  // Stagger lines same as TerminalScene
  const lineStartFrames: number[] = [];
  let cursor = ENTER_FRAMES + SHAKE_DURATION;
  for (const line of lines) {
    lineStartFrames.push(cursor);
    cursor += Math.ceil(line.length / CHARS_PER_FRAME) + 4;
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        opacity: sceneOpacity,
        transform: `translateY(${sceneY}px) translateX(${shakeX}px)`,
        justifyContent: "center",
        alignItems: "center",
        padding: "0 48px",
        fontFamily: JETBRAINS_MONO,
      }}
    >
      <div
        style={{
          width: "100%",
          backgroundColor: colors.terminalBg,
          borderRadius: 16,
          border: `1px solid ${colors.errorRed}`,
          overflow: "hidden",
        }}
      >
        {/* Top bar — red tinted */}
        <div
          style={{
            height: 44,
            backgroundColor: "rgba(255,59,59,0.12)",
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            gap: 8,
            borderBottom: `1px solid ${colors.errorRed}`,
          }}
        >
          <span style={{ ...t.label, color: colors.errorRed }}>ERROR</span>
        </div>

        {/* Lines */}
        <div style={{ padding: "28px 32px", minHeight: 200 }}>
          {lines.map((line, lineIdx) => {
            const startFrame = lineStartFrames[lineIdx];
            const charsToShow = Math.floor(
              interpolate(
                frame,
                [startFrame, startFrame + Math.max(1, Math.ceil(line.length / CHARS_PER_FRAME))],
                [0, line.length],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              )
            );
            const visible = frame >= startFrame;
            const visibleText = line.slice(0, charsToShow);

            // Highlight matching keywords in red
            const renderedLine = highlightKeywords.length > 0
              ? renderWithKeywords(visibleText, highlightKeywords, colors.errorRed, colors.textDim)
              : <span style={{ color: colors.textDim }}>{visibleText}</span>;

            return (
              <div
                key={lineIdx}
                style={{
                  ...t.terminal,
                  whiteSpace: "pre",
                  opacity: visible ? 1 : 0,
                  minHeight: "1.7em",
                }}
              >
                {renderedLine}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

function renderWithKeywords(
  text: string,
  keywords: string[],
  highlightColor: string,
  baseColor: string
): React.ReactNode {
  const pattern = new RegExp(`(${keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        keywords.includes(part) ? (
          <span key={i} style={{ color: highlightColor, fontWeight: 700 }}>
            {part}
          </span>
        ) : (
          <span key={i} style={{ color: baseColor }}>
            {part}
          </span>
        )
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add remotion/src/scenes/ErrorLogScene.tsx
git commit -m "feat: add ErrorLogScene with red tint, sine shake entry, keyword highlighting"
```

---

### Task 7: TikTokVideo and Root compositions

**Files:**
- Create: `remotion/src/TikTokVideo.tsx`
- Create: `remotion/src/Root.tsx`

**Interfaces:**
- Consumes: all four scene components; `ManifestScene`, `RenderManifest` from `./types`
- Produces: `TikTokVideo` composition registered as `"TikTokVideo"` — target of `npx remotion render TikTokVideo`

- [ ] **Step 1: Create `remotion/src/TikTokVideo.tsx`**

```tsx
import React from "react";
import { AbsoluteFill, Audio, Series, staticFile } from "remotion";
import { ManifestScene, RenderManifest } from "./types";
import { ExplanationScene } from "./scenes/ExplanationScene";
import { TerminalScene } from "./scenes/TerminalScene";
import { CodeScene } from "./scenes/CodeScene";
import { ErrorLogScene } from "./scenes/ErrorLogScene";

export const TikTokVideo: React.FC<{ manifest: RenderManifest }> = ({ manifest }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      <Series>
        {manifest.scenes.map((scene) => (
          <Series.Sequence key={scene.id} durationInFrames={scene.durationInFrames}>
            {scene.audioPath && <Audio src={staticFile(scene.audioPath)} />}
            <SceneRenderer scene={scene} />
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};

const SceneRenderer: React.FC<{ scene: ManifestScene }> = ({ scene }) => {
  switch (scene.type) {
    case "explanation":
      return <ExplanationScene {...scene.visual} durationInFrames={scene.durationInFrames} />;
    case "terminal":
      return <TerminalScene {...scene.visual} durationInFrames={scene.durationInFrames} />;
    case "code":
      return <CodeScene {...scene.visual} durationInFrames={scene.durationInFrames} />;
    case "error_log":
      return <ErrorLogScene {...scene.visual} durationInFrames={scene.durationInFrames} />;
  }
};
```

- [ ] **Step 2: Create `remotion/src/Root.tsx`**

Sample manifest used for Studio preview. Replace with real manifest path when doing production renders via Python.

```tsx
import React from "react";
import { Composition, continueRender, delayRender } from "remotion";
import { TikTokVideo } from "./TikTokVideo";
import { RenderManifest } from "./types";
import { waitForInter, waitForJetBrainsMono } from "./styles";

// Load fonts before any frame is captured
const fontHandle = delayRender("Loading fonts");
Promise.all([waitForInter(), waitForJetBrainsMono()]).then(() => {
  continueRender(fontHandle);
});

const SAMPLE_MANIFEST: RenderManifest = {
  fps: 30,
  width: 1080,
  height: 1920,
  scenes: [
    {
      id: 1,
      type: "explanation",
      audioPath: "",
      durationInFrames: 60,
      visual: {
        headline: "Unix File Permissions",
        body: "Every file has 3 permission sets: owner, group, others",
      },
    },
    {
      id: 2,
      type: "terminal",
      audioPath: "",
      durationInFrames: 90,
      visual: {
        lines: ["$ ls -la /etc/passwd", "-rw-r--r-- 1 root root 2847 /etc/passwd"],
      },
    },
    {
      id: 3,
      type: "code",
      audioPath: "",
      durationInFrames: 90,
      visual: {
        language: "bash",
        code: "chmod 755 script.sh\nchown user:group file.txt",
        highlightLines: [1],
      },
    },
    {
      id: 4,
      type: "error_log",
      audioPath: "",
      durationInFrames: 75,
      visual: {
        lines: [
          "Error: ENOENT: no such file or directory",
          "    at Object.openSync (node:fs:601:3)",
        ],
        highlightKeywords: ["Error", "ENOENT"],
      },
    },
  ],
};

export const Root: React.FC = () => {
  return (
    <Composition
      id="TikTokVideo"
      component={TikTokVideo}
      durationInFrames={SAMPLE_MANIFEST.scenes.reduce((s, sc) => s + sc.durationInFrames, 0)}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ manifest: SAMPLE_MANIFEST }}
      calculateMetadata={async ({ props }) => {
        const manifest = props.manifest as RenderManifest;
        return {
          durationInFrames: manifest.scenes.reduce((s, sc) => s + sc.durationInFrames, 0),
        };
      }}
    />
  );
};
```

- [ ] **Step 3: Start Remotion Studio to visually verify all 4 scene types render**

```bash
cd remotion && npm run dev
```

Expected: Studio opens at `http://localhost:3000`. Navigate to `TikTokVideo` composition. Scrub through frames and verify:
- Frames 0–59: ExplanationScene — cyan accent bar, staggered words appear
- Frames 60–149: TerminalScene — typewriter effect, green command, dim output
- Frames 150–239: CodeScene — language label, lines reveal one by one, line 1 highlighted
- Frames 240–314: ErrorLogScene — red border/header, shake on entry, red keywords

Stop Studio with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add remotion/src/TikTokVideo.tsx remotion/src/Root.tsx
git commit -m "feat: add TikTokVideo composition with Series scene dispatch and Root registration"
```

---

### Task 8: Python manifest generation and Remotion render call

**Files:**
- Create: `vidgen/manifest.py`
- Create: `tests/test_manifest.py`
- Modify: `vidgen/main.py`
- Modify: `content/sample_script.json`

**Interfaces:**
- Consumes: `script: dict` (loaded JSON), `audio_durations: dict[int, float]` (scene id → seconds)
- Produces: `output/render_manifest.json`; triggers `npx remotion render` subprocess; final MP4 at `output/video/video.mp4`

- [ ] **Step 1: Update `content/sample_script.json` with type and visual fields**

```json
{
  "title": "Sample TikTok Video",
  "language": "vi",
  "scenes": [
    {
      "id": 1,
      "type": "explanation",
      "narration": "Bạn có biết rằng...",
      "visual": {
        "headline": "Unix File Permissions",
        "body": "Mỗi file có 3 nhóm quyền: owner, group, others"
      }
    },
    {
      "id": 2,
      "type": "terminal",
      "narration": "Đây là một sự thật thú vị.",
      "visual": {
        "lines": ["$ ls -la /etc/passwd", "-rw-r--r-- 1 root root 2847 /etc/passwd"]
      }
    },
    {
      "id": 3,
      "type": "code",
      "narration": "Hãy theo dõi để biết thêm nhé!",
      "visual": {
        "language": "bash",
        "code": "chmod 755 script.sh\nchown user:group file.txt",
        "highlightLines": [1]
      }
    }
  ]
}
```

- [ ] **Step 2: Write the failing tests**

```python
# tests/test_manifest.py
import math
import pytest
from vidgen.manifest import build_render_manifest, FPS, FRAME_PADDING


def test_duration_frames_calculation():
    script = {
        "scenes": [
            {
                "id": 1,
                "type": "explanation",
                "narration": "...",
                "visual": {"headline": "H", "body": "B"},
            }
        ]
    }
    manifest = build_render_manifest(script, {1: 1.5})
    assert manifest["scenes"][0]["durationInFrames"] == math.ceil(1.5 * FPS) + FRAME_PADDING


def test_manifest_structure():
    script = {
        "scenes": [
            {
                "id": 2,
                "type": "terminal",
                "narration": "...",
                "visual": {"lines": ["$ ls"]},
            }
        ]
    }
    manifest = build_render_manifest(script, {2: 2.0})
    scene = manifest["scenes"][0]
    assert scene["type"] == "terminal"
    assert scene["audioPath"] == "audio/scene_2.wav"
    assert scene["visual"] == {"lines": ["$ ls"]}
    assert manifest["fps"] == FPS
    assert manifest["width"] == 1080
    assert manifest["height"] == 1920


def test_multi_scene_ordering():
    script = {
        "scenes": [
            {"id": 1, "type": "explanation", "narration": "...", "visual": {"headline": "A", "body": "B"}},
            {"id": 2, "type": "terminal", "narration": "...", "visual": {"lines": ["$ pwd"]}},
        ]
    }
    manifest = build_render_manifest(script, {1: 1.0, 2: 2.0})
    assert len(manifest["scenes"]) == 2
    assert manifest["scenes"][0]["id"] == 1
    assert manifest["scenes"][1]["id"] == 2
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_manifest.py -v
```

Expected: `ModuleNotFoundError: No module named 'vidgen.manifest'`

- [ ] **Step 4: Create `vidgen/manifest.py`**

```python
import json
import math
import os
import shutil

FPS = 30
FRAME_PADDING = 10


def build_render_manifest(script: dict, audio_durations: dict[int, float]) -> dict:
    scenes = []
    for scene in script["scenes"]:
        sid = scene["id"]
        duration_secs = audio_durations[sid]
        duration_frames = math.ceil(duration_secs * FPS) + FRAME_PADDING
        scenes.append(
            {
                "id": sid,
                "type": scene["type"],
                "audioPath": f"audio/scene_{sid}.wav",
                "durationInFrames": duration_frames,
                "visual": scene["visual"],
            }
        )
    return {"fps": FPS, "width": 1080, "height": 1920, "scenes": scenes}


def write_render_manifest(manifest: dict, output_path: str) -> None:
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)


def copy_audio_to_remotion_public(scene_ids: list[int], wav_dir: str, public_audio_dir: str) -> None:
    os.makedirs(public_audio_dir, exist_ok=True)
    for sid in scene_ids:
        src = os.path.join(wav_dir, f"scene_{sid}.wav")
        dst = os.path.join(public_audio_dir, f"scene_{sid}.wav")
        shutil.copy2(src, dst)
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_manifest.py -v
```

Expected:
```
PASSED tests/test_manifest.py::test_duration_frames_calculation
PASSED tests/test_manifest.py::test_manifest_structure
PASSED tests/test_manifest.py::test_multi_scene_ordering
```

- [ ] **Step 6: Update `vidgen/main.py` to write manifest and call Remotion**

Replace the full contents of `vidgen/main.py` with:

```python
import json
import math
import os
import subprocess
import wave
from time import time

from vieneu import Vieneu  # type: ignore

from vidgen.manifest import (
    build_render_manifest,
    copy_audio_to_remotion_public,
    write_render_manifest,
)

WAV_DIR = "output/audio/wav"
REMOTION_PUBLIC_AUDIO = "remotion/public/audio"
MANIFEST_PATH = "output/render_manifest.json"
VIDEO_OUTPUT = "output/video/video.mp4"

tts = Vieneu()

with open("content/sample_script.json", encoding="utf-8") as f:
    script = json.load(f)

# --- Audio synthesis ---
start_time = time()
for scene in script["scenes"]:
    output_path = f"{WAV_DIR}/scene_{scene['id']}.wav"
    audio = tts.infer(scene["narration"], voice="Xuân Vĩnh")  # type: ignore
    tts.save(audio, output_path)  # type: ignore
    print(f"Scene {scene['id']} saved to {output_path}")

end_time = time()
print(f"Total generation time: {end_time - start_time:.2f}s")

# --- Audio durations ---
audio_durations: dict[int, float] = {}
total_audio = 0.0
for scene in script["scenes"]:
    wav_path = f"{WAV_DIR}/scene_{scene['id']}.wav"
    with wave.open(wav_path) as wf:
        duration = wf.getnframes() / wf.getframerate()
    print(f"Scene {scene['id']} audio duration: {duration:.2f}s")
    audio_durations[scene["id"]] = duration
    total_audio += duration
print(f"Total audio duration: {total_audio:.2f}s")

# --- Copy audio to Remotion public/ ---
scene_ids = [s["id"] for s in script["scenes"]]
copy_audio_to_remotion_public(scene_ids, WAV_DIR, REMOTION_PUBLIC_AUDIO)
print(f"Copied {len(scene_ids)} WAV file(s) to {REMOTION_PUBLIC_AUDIO}/")

# --- Write render manifest ---
manifest = build_render_manifest(script, audio_durations)
write_render_manifest(manifest, MANIFEST_PATH)
print(f"Render manifest written to {MANIFEST_PATH}")

# --- Render video ---
os.makedirs("output/video", exist_ok=True)
manifest_props = json.dumps({"manifest": manifest})
result = subprocess.run(
    [
        "npx", "remotion", "render", "TikTokVideo", VIDEO_OUTPUT,
        f"--props={manifest_props}",
    ],
    cwd="remotion",
    check=True,
)
print(f"Video rendered to {VIDEO_OUTPUT}")
```

- [ ] **Step 7: Run full pipeline end-to-end**

```bash
/Users/haunguyen/miniconda3/bin/python vidgen/main.py
```

Expected output (in order):
```
Scene 1 saved to output/audio/wav/scene_1.wav
Scene 2 saved to output/audio/wav/scene_2.wav
Scene 3 saved to output/audio/wav/scene_3.wav
Total generation time: X.XXs
Scene 1 audio duration: X.XXs
...
Total audio duration: X.XXs
Copied 3 WAV file(s) to remotion/public/audio/
Render manifest written to output/render_manifest.json
...
Video rendered to output/video/video.mp4
```

Verify `output/video/video.mp4` exists and plays correctly.

- [ ] **Step 8: Commit**

```bash
git add vidgen/manifest.py tests/test_manifest.py vidgen/main.py content/sample_script.json
git commit -m "feat: add manifest generation and Remotion render subprocess to pipeline"
```
