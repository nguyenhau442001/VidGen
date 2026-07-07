# Thumbnail Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-generate a video's cover thumbnail from its script JSON, via a single Remotion Still composition (`Thumbnail`) that dispatches to either the existing `CharacterIconCoverScene` or a new generic map-pin/car visual, based on the hook scene's (`scenes[0]`) type.

**Architecture:** `vidgen/thumbnail.py` reads a script JSON, looks up `scenes[0]["type"]` in a small style-dispatch table (mirroring `TYPE_MAP` in `vidgen/manifest.py`), extracts the right props for that style with a pure function, then shells out to `npx remotion still Thumbnail <output> --props=<json>` (cwd=`remotion/`). On the Remotion side, `ThumbnailScene.tsx` is a thin dispatcher component that renders `CharacterIconCoverScene` (existing, untouched) or the new `GenericHookThumbnailScene` (this plan) based on a `style` prop. Wired into `vidgen/main.py` as a non-fatal post-render step.

**Tech Stack:** Remotion 4 (React 19, TypeScript), Python 3.13, pytest.

**Full design context:** `docs/superpowers/specs/2026-07-07-thumbnail-generation-design.md` — read this first if anything below is ambiguous.

## Global Constraints

- Composition id is exactly `"Thumbnail"`, 1080×1920, `durationInFrames={1}`, `fps={30}`. This is the *only* composition `vidgen/thumbnail.py` ever invokes.
- Background color `colors.bg` (`#0a0a0f`), accent green `colors.green` (`#00ff41`) — both already defined in `remotion/src/styles.ts`. Do not hardcode new color tokens.
- All new thumbnail text uses `BE_VIETNAM_PRO` (already exported from `remotion/src/styles.ts`, weights 400/500/600/700 already loaded) — not `INTER`. No font-loader changes.
- Default channel name is `"DevFasterr"` everywhere (not `"Biết Rồi Thì Dễ"`).
- `CharacterIconCoverScene.tsx` and its existing `"CharacterIconCover"` Root.tsx registration must not be modified.
- Output PNGs go to `output/thumbnails/<slug>_thumb.png` (matches the existing directory, which already holds `grab_dispatch_p1_cover.png` / `grab_dispatch_p2_cover.png` from the manual workflow — do not touch those two files).
- Thumbnail generation must never fail a video render — any error in `vidgen/main.py`'s hook is caught and logged, never re-raised.
- This repo's `npx tsc --noEmit` already fails on pre-existing, unrelated errors (checked 2026-07-07) — it is *not* a usable pass/fail signal for these tasks. TSX correctness is verified by actually rendering the composition via the Remotion CLI (`npx remotion still ...`), which is how every existing scene in this codebase is verified — there is no TSX unit test framework here.

---

### Task 1: `Thumbnail` composition — dispatcher + new generic visual

**Files:**
- Modify: `remotion/src/types.ts` (append new types at end of file)
- Create: `remotion/src/scenes/GenericHookThumbnailScene.tsx`
- Create: `remotion/src/scenes/ThumbnailScene.tsx`
- Modify: `remotion/src/Root.tsx`

**Interfaces:**
- Consumes: `colors`, `BE_VIETNAM_PRO` from `remotion/src/styles.ts` (existing); `CharacterIconCoverScene` + `CharacterIconCoverSceneProps` from `remotion/src/scenes/CharacterIconCoverScene.tsx` / `remotion/src/types.ts` (existing, untouched).
- Produces: Remotion composition id `"Thumbnail"`, accepting `ThumbnailSceneProps = ({style:"characterIcon"} & CharacterIconCoverSceneProps) | ({style:"generic"} & GenericHookThumbnailSceneProps)`. Task 3 (Python) invokes this composition by id and relies on `style` being either `"characterIcon"` or `"generic"`.

- [ ] **Step 1: Add the new prop types to `remotion/src/types.ts`**

Append at the very end of the file (after the existing `ZoomRevealVisual` type):

```typescript
export type GenericHookThumbnailVisual = {
  headline: string;
  accentWord?: string;
  subtext?: string;
  partLabel?: string;
  channelName?: string;
};

export type GenericHookThumbnailSceneProps = GenericHookThumbnailVisual;

export type ThumbnailSceneProps =
  | ({ style: "characterIcon" } & CharacterIconCoverSceneProps)
  | ({ style: "generic" } & GenericHookThumbnailSceneProps);
```

- [ ] **Step 2: Create `remotion/src/scenes/GenericHookThumbnailScene.tsx`**

```typescript
import React from "react";
import { AbsoluteFill } from "remotion";
import { GenericHookThumbnailSceneProps } from "../types";
import { colors, BE_VIETNAM_PRO } from "../styles";

const CANVAS_W = 1080;
const CANVAS_H = 1920;

// Splits on Vietnamese sentence-break punctuation into up to 3 lines;
// truncates the last line with an ellipsis if there's overflow or it's too long.
function splitHeadlineLines(headline: string, maxLines = 3, maxCharsPerLine = 42): string[] {
  const rawParts = headline
    .split(/\.\s+|—/)
    .map((s) => s.trim())
    .filter(Boolean);
  const parts = rawParts.length > 0 ? rawParts : [headline];
  const lines = parts.slice(0, maxLines);
  const overflowed = parts.length > maxLines;
  const lastIndex = lines.length - 1;
  if (lines[lastIndex] && (overflowed || lines[lastIndex].length > maxCharsPerLine)) {
    const truncated = lines[lastIndex].slice(0, maxCharsPerLine);
    lines[lastIndex] = truncated.replace(/\s+\S*$/, "") + "…";
  }
  return lines;
}

function renderLineWithAccent(line: string, accentWord?: string): React.ReactNode {
  if (!accentWord) return line;
  const idx = line.indexOf(accentWord);
  if (idx === -1) return line;
  return (
    <>
      {line.slice(0, idx)}
      <span style={{ color: colors.green }}>{accentWord}</span>
      {line.slice(idx + accentWord.length)}
    </>
  );
}

export const GenericHookThumbnailScene: React.FC<GenericHookThumbnailSceneProps> = ({
  headline,
  accentWord,
  subtext,
  partLabel,
  channelName = "DevFasterr",
}) => {
  const lines = splitHeadlineLines(headline);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      {/* Layer 0 — background grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(0,255,65,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Layer 1 — atmospheric glow */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 600,
          left: (CANVAS_W - 900) / 2,
          top: 560,
          background: "radial-gradient(ellipse at center, rgba(0,255,65,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Layer 2 — part badge (omitted entirely when no partLabel) */}
      {partLabel && (
        <div
          style={{
            position: "absolute",
            top: 48,
            left: 48,
            padding: "8px 18px",
            borderRadius: 999,
            border: "1px solid rgba(0,255,65,0.5)",
            backgroundColor: "rgba(0,255,65,0.08)",
            fontFamily: BE_VIETNAM_PRO,
            fontSize: 22,
            letterSpacing: "0.08em",
            color: colors.green,
          }}
        >
          {partLabel}
        </div>
      )}

      {/* Layer 3 — map pin / car / dashed connector */}
      <div style={{ position: "absolute", top: CANVAS_H * 0.3, left: 0, width: CANVAS_W, height: CANVAS_H * 0.25 }}>
        <svg width={CANVAS_W} height={CANVAS_H * 0.25} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H * 0.25}`}>
          <line
            x1={510}
            y1={230}
            x2={540}
            y2={210}
            stroke={colors.green}
            strokeWidth={3}
            strokeDasharray="8 6"
            opacity={0.7}
          />
          <g transform="translate(540,150)">
            <path
              d="M0,-60 C33,-60 60,-33 60,0 C60,45 0,60 0,60 C0,60 -60,45 -60,0 C-60,-33 -33,-60 0,-60 Z"
              fill="none"
              stroke={colors.green}
              strokeWidth={5}
            />
            <circle cx={0} cy={-10} r={20} fill="none" stroke={colors.green} strokeWidth={5} />
          </g>
          <g transform="translate(510,230)">
            <polygon points="0,-24 20,20 -20,20" fill="#22C55E" />
          </g>
        </svg>
      </div>

      {/* Layer 4 — headline (max 3 lines, accent word highlighted) */}
      <div
        style={{
          position: "absolute",
          top: CANVAS_H * 0.58,
          left: 56,
          right: 56,
          height: CANVAS_H * 0.2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              fontFamily: BE_VIETNAM_PRO,
              fontWeight: 700,
              fontSize: 72,
              lineHeight: 1.15,
              color: "#f8fafc",
            }}
          >
            {renderLineWithAccent(line, accentWord)}
          </div>
        ))}
      </div>

      {/* Layer 5 — subtext */}
      {subtext && (
        <div
          style={{
            position: "absolute",
            top: CANVAS_H * 0.8,
            left: 56,
            right: 56,
            fontFamily: BE_VIETNAM_PRO,
            fontWeight: 400,
            fontSize: 32,
            color: "rgba(226,232,240,0.7)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {subtext}
        </div>
      )}

      {/* Layer 7 — bottom scrim, painted before the brand bar so the bar reads on top of it */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 300,
          background: "linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0))",
        }}
      />

      {/* Layer 6 — brand bar */}
      <div
        style={{
          position: "absolute",
          left: 56,
          right: 56,
          bottom: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 20,
          borderTop: "1px solid rgba(0,255,65,0.15)",
        }}
      >
        <span
          style={{
            fontFamily: BE_VIETNAM_PRO,
            fontWeight: 500,
            fontSize: 26,
            color: "rgba(0,255,65,0.8)",
          }}
        >
          {channelName}
        </span>
        <span style={{ color: colors.green, fontSize: 22 }}>▶</span>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Create the dispatcher, `remotion/src/scenes/ThumbnailScene.tsx`**

```typescript
import React from "react";
import { ThumbnailSceneProps } from "../types";
import { CharacterIconCoverScene } from "./CharacterIconCoverScene";
import { GenericHookThumbnailScene } from "./GenericHookThumbnailScene";

export const ThumbnailScene: React.FC<ThumbnailSceneProps> = (props) => {
  if (props.style === "characterIcon") {
    return <CharacterIconCoverScene {...props} />;
  }
  return <GenericHookThumbnailScene {...props} />;
};
```

- [ ] **Step 4: Register the `Thumbnail` composition in `remotion/src/Root.tsx`**

Add the import next to the other scene imports (after the existing `CharacterIconCoverScene` import line):

```typescript
import { ThumbnailScene } from "./scenes/ThumbnailScene";
```

Add the composition block right after the existing `CharacterIconCover` composition (which ends with `defaultProps={{ eyebrowText: "DevFasterr" }} />`) and before the `QuoteCallout` composition:

```tsx
      <Composition
        id="Thumbnail"
        component={ThumbnailScene}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          style: "generic",
          headline: "Tài xế biết trước cả bạn",
          accentWord: "biết trước",
          partLabel: "PHẦN 2 / 4",
          channelName: "DevFasterr",
        }}
      />
```

- [ ] **Step 5: Smoke-test both dispatch branches via the Remotion CLI**

Run from the repo root:

```bash
cd remotion
npx remotion still Thumbnail /tmp/thumb_generic.png --props='{"style":"generic","headline":"Tài xế biết trước cả bạn","accentWord":"biết trước","partLabel":"PHẦN 2 / 4","subtext":"Và tài xế đã lăn bánh."}'
npx remotion still Thumbnail /tmp/thumb_charactericon.png --props='{"style":"characterIcon","line1":"Tài xế cách bạn","line2":"200 mét","line3":"vừa bị bỏ qua","subtitle":"và bạn không bao giờ biết tại sao","seriesLabel":"Phần 1/4","rejectedLabel":"200m ✕","selectedLabel":"350m ✓","eyebrowText":"DevFasterr","accentColor":"#22C55E"}'
```

Expected: both commands exit 0, print `Rendered 1/1`, and `ls -la /tmp/thumb_generic.png /tmp/thumb_charactericon.png` shows two PNG files each comfortably over 50KB (a blank/broken render is typically much smaller). This confirms the dispatcher correctly routes to each style.

- [ ] **Step 6: Clean up smoke-test artifacts and commit**

```bash
rm -f /tmp/thumb_generic.png /tmp/thumb_charactericon.png
git add remotion/src/types.ts remotion/src/scenes/GenericHookThumbnailScene.tsx remotion/src/scenes/ThumbnailScene.tsx remotion/src/Root.tsx
git commit -m "feat: add Thumbnail composition dispatching to generic or characterIcon style"
```

---

### Task 2: Pure prop-extraction and dispatch logic (`vidgen/thumbnail.py`, part 1)

**Files:**
- Create: `vidgen/thumbnail.py`
- Test: `tests/test_thumbnail.py`

**Interfaces:**
- Consumes: nothing (pure functions, no I/O).
- Produces: `_style_for_scene(scene_type: str) -> str`, `_extract_generic_props(script: dict, scene_index: int = 0) -> dict`, `_extract_character_icon_props(script: dict, scene_index: int = 0, channel_name: str = "DevFasterr") -> dict`, `_split_into_three_lines(text: str) -> tuple[str, str, str]`. Task 3's `generate_thumbnail` calls all four.

- [ ] **Step 1: Write the failing tests**

Create `tests/test_thumbnail.py`:

```python
from vidgen.thumbnail import (
    _style_for_scene,
    _extract_generic_props,
    _extract_character_icon_props,
    _split_into_three_lines,
)


def test_style_for_scene_character_icon():
    assert _style_for_scene("CharacterIconScene") == "characterIcon"


def test_style_for_scene_defaults_to_generic():
    assert _style_for_scene("ExplanationScene") == "generic"
    assert _style_for_scene("SomeUnknownType") == "generic"


def test_extract_generic_props_accent_word_from_explicit_prop():
    script = {
        "scenes": [
            {
                "type": "ExplanationScene",
                "narration": "Tài xế biết trước cả bạn.",
                "props": {
                    "accentWord": "biết trước",
                    "headline": "H",
                    "body": "Và tài xế đã lăn bánh.",
                },
            }
        ]
    }
    props = _extract_generic_props(script)
    assert props["headline"] == "Tài xế biết trước cả bạn"
    assert props["accentWord"] == "biết trước"
    assert props["subtext"] == "Và tài xế đã lăn bánh."


def test_extract_generic_props_accent_word_from_bold_markdown():
    script = {
        "scenes": [
            {
                "type": "ExplanationScene",
                "narration": "Bạn chưa mở app.",
                "props": {"headline": "Bạn chưa mở app. Hệ thống **đã biết.**"},
            }
        ]
    }
    props = _extract_generic_props(script)
    assert props["accentWord"] == "đã biết."
    assert props["subtext"] == "Bạn chưa mở app. Hệ thống đã biết."


def test_extract_generic_props_part_label_found_in_later_scene():
    script = {
        "scenes": [
            {"type": "ExplanationScene", "narration": "A.", "props": {"headline": "H"}},
            {"type": "PhoneMockupScene", "narration": "B", "props": {"partLabel": "Phần 3/4"}},
        ]
    }
    props = _extract_generic_props(script)
    assert props["partLabel"] == "Phần 3/4"


def test_extract_generic_props_no_part_label_omits_key():
    script = {
        "scenes": [
            {"type": "ExplanationScene", "narration": "A.", "props": {"headline": "H"}},
        ]
    }
    props = _extract_generic_props(script)
    assert "partLabel" not in props


def test_extract_character_icon_props_maps_fields():
    script = {
        "scenes": [
            {
                "type": "CharacterIconScene",
                "narration": "Grab không chọn tài xế gần bạn nhất.",
                "on_screen_text": "Tài xế cách bạn 200 mét vừa bị hệ thống bỏ qua",
                "props": {
                    "accentColor": "#22C55E",
                    "partLabel": "Phần 1/4",
                    "rejectedPin": {"label": "200m"},
                    "selectedPin": {"label": "350m"},
                },
            }
        ]
    }
    props = _extract_character_icon_props(script, channel_name="DevFasterr")
    assert props["accentColor"] == "#22C55E"
    assert props["seriesLabel"] == "Phần 1/4"
    assert props["rejectedLabel"] == "200m ✕"
    assert props["selectedLabel"] == "350m ✓"
    assert props["eyebrowText"] == "DevFasterr"
    assert props["subtitle"] == "Grab không chọn tài xế gần bạn nhất."


def test_split_into_three_lines_respects_line2_budget():
    _, line2, _ = _split_into_three_lines(
        "Tài xế cách bạn hai trăm mét vừa bị hệ thống bỏ qua hoàn toàn"
    )
    assert len(line2) <= 10


def test_split_into_three_lines_truncates_long_remainder():
    _, _, line3 = _split_into_three_lines(
        "một hai ba bốn năm sáu bảy tám chín mười mười một mười hai mười ba mười bốn"
    )
    assert line3.endswith("…")
    assert len(line3) <= 25


def test_split_into_three_lines_short_text_preserves_all_words():
    line1, line2, line3 = _split_into_three_lines("Xe đã đến")
    combined = f"{line1} {line2} {line3}".split()
    assert combined == ["Xe", "đã", "đến"]
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pytest tests/test_thumbnail.py -v`
Expected: collection error — `ModuleNotFoundError: No module named 'vidgen.thumbnail'` (the module doesn't exist yet).

- [ ] **Step 3: Create `vidgen/thumbnail.py` with the pure functions**

```python
import json
import os
import re
import subprocess
from pathlib import Path

SCENE_TYPE_TO_STYLE = {
    "CharacterIconScene": "characterIcon",
}

BOLD_RE = re.compile(r"\*\*([^*]+)\*\*")


def _style_for_scene(scene_type: str) -> str:
    return SCENE_TYPE_TO_STYLE.get(scene_type, "generic")


def _longest_bold_span(text: str) -> str | None:
    matches = BOLD_RE.findall(text)
    if not matches:
        return None
    return max(matches, key=len)


def _strip_bold_markers(text: str) -> str:
    return BOLD_RE.sub(r"\1", text)


def _extract_generic_props(script: dict, scene_index: int = 0) -> dict:
    scene = script["scenes"][scene_index]
    props = scene.get("props", {})
    raw_headline = props.get("headline", "")

    headline = (scene.get("narration") or "").rstrip(".")

    accent_word = props.get("accentWord") or _longest_bold_span(raw_headline)

    subtext = _strip_bold_markers(props.get("body") or raw_headline)

    part_label = None
    for s in script["scenes"]:
        label = s.get("props", {}).get("partLabel")
        if label:
            part_label = label
            break

    result = {"headline": headline, "subtext": subtext}
    if accent_word:
        result["accentWord"] = accent_word
    if part_label:
        result["partLabel"] = part_label
    return result


def _split_into_three_lines(text: str) -> tuple[str, str, str]:
    """Greedy word-boundary packing into 3 lines. line2's budget is tight
    (10 chars) because CharacterIconCoverScene highlights it in a fixed
    214px-wide box — overflow there looks broken, unlike lines 1/3."""

    def fill(budget: int, words: list, target: list) -> None:
        length = 0
        while words:
            candidate_len = length + len(words[0]) + (1 if length else 0)
            if candidate_len > budget:
                break
            length = candidate_len
            target.append(words.pop(0))

    remaining = text.split()
    line1_words: list = []
    line2_words: list = []
    fill(18, remaining, line1_words)
    fill(10, remaining, line2_words)
    line3_words = remaining

    line3 = " ".join(line3_words)
    if len(line3) > 24:
        truncated = line3[:24].rsplit(" ", 1)[0]
        line3 = truncated + "…"

    return " ".join(line1_words), " ".join(line2_words), line3


def _extract_character_icon_props(
    script: dict, scene_index: int = 0, channel_name: str = "DevFasterr"
) -> dict:
    scene = script["scenes"][scene_index]
    props = scene.get("props", {})

    headline_source = scene.get("on_screen_text") or scene.get("narration", "")
    line1, line2, line3 = _split_into_three_lines(headline_source)

    result = {
        "eyebrowText": channel_name,
        "line1": line1,
        "line2": line2,
        "line3": line3,
        "subtitle": scene.get("narration", ""),
    }

    if props.get("accentColor"):
        result["accentColor"] = props["accentColor"]
    if props.get("partLabel"):
        result["seriesLabel"] = props["partLabel"]
    if props.get("rejectedPin", {}).get("label"):
        result["rejectedLabel"] = f"{props['rejectedPin']['label']} ✕"
    if props.get("selectedPin", {}).get("label"):
        result["selectedLabel"] = f"{props['selectedPin']['label']} ✓"

    return result
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pytest tests/test_thumbnail.py -v`
Expected: all 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add vidgen/thumbnail.py tests/test_thumbnail.py
git commit -m "feat: add pure style-dispatch and prop-extraction logic for thumbnails"
```

---

### Task 3: `generate_thumbnail()` + CLI entry point (`vidgen/thumbnail.py`, part 2)

**Files:**
- Modify: `vidgen/thumbnail.py`

**Interfaces:**
- Consumes: `_style_for_scene`, `_extract_generic_props`, `_extract_character_icon_props` (Task 2); Remotion composition id `"Thumbnail"` (Task 1).
- Produces: `generate_thumbnail(script_path: str, output_path: str, scene_index: int = 0, channel_name: str = "DevFasterr", overwrite: bool = True, remotion_dir: str = "remotion") -> str`, and a `python -m vidgen.thumbnail <script>` CLI. Task 4 (`main.py`) calls `generate_thumbnail` directly.

- [ ] **Step 1: Append `generate_thumbnail` and the CLI block to `vidgen/thumbnail.py`**

```python
def generate_thumbnail(
    script_path: str,
    output_path: str,
    scene_index: int = 0,
    channel_name: str = "DevFasterr",
    overwrite: bool = True,
    remotion_dir: str = "remotion",
) -> str:
    """Render a thumbnail PNG from scenes[scene_index] of a VidGen script JSON.

    Raises FileNotFoundError if script_path doesn't exist, RuntimeError if
    npx is missing or the Remotion still render exits non-zero.
    """
    if not os.path.exists(script_path):
        raise FileNotFoundError(f"Script not found: {script_path}")

    output_path = os.path.abspath(output_path)
    if not overwrite and os.path.exists(output_path):
        print(f"Thumbnail already exists, skipping: {output_path}")
        return output_path

    with open(script_path, encoding="utf-8") as f:
        script = json.load(f)

    scene = script["scenes"][scene_index]
    style = _style_for_scene(scene["type"])
    if style == "characterIcon":
        props = _extract_character_icon_props(script, scene_index, channel_name)
    else:
        props = _extract_generic_props(script, scene_index)
        props["channelName"] = channel_name
    props["style"] = style

    print(f"🎨 Rendering thumbnail for: {script_path}")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    cmd = ["npx", "remotion", "still", "Thumbnail", output_path, f"--props={json.dumps(props)}"]
    try:
        result = subprocess.run(cmd, cwd=remotion_dir, capture_output=True, text=True)
    except FileNotFoundError:
        raise RuntimeError("npx not found. Run: npm install")

    if result.returncode != 0:
        stderr_tail = "\n".join(result.stderr.strip().splitlines()[-5:])
        print(f"❌ Remotion error (exit {result.returncode}): {stderr_tail}")
        raise RuntimeError(f"renderStill failed:\n{result.stderr}")

    print(f"✅ Thumbnail saved: {output_path}")
    return output_path


if __name__ == "__main__":
    import sys

    script_arg = sys.argv[1]
    slug = Path(script_arg).stem
    out = f"output/thumbnails/{slug}_thumb.png"
    generate_thumbnail(script_arg, out)
```

- [ ] **Step 2: Run the existing unit tests to confirm nothing broke**

Run: `pytest tests/test_thumbnail.py -v`
Expected: all 10 tests still PASS (this step adds new code but doesn't touch the pure functions Task 2 tested).

- [ ] **Step 3: Integration-test the CLI against both real scripts**

This exercises both dispatch branches against actual content in the repo — run from the repo root:

```bash
python -m vidgen.thumbnail content/script_grab_dispatch_p1.json
python -m vidgen.thumbnail content/script_grab_dispatch_p2.json
ls -la output/thumbnails/script_grab_dispatch_p1_thumb.png output/thumbnails/script_grab_dispatch_p2_thumb.png
```

Expected: both commands print `🎨 Rendering thumbnail for: ...` then `✅ Thumbnail saved: ...` with exit code 0. Both PNGs exist and are each comfortably over 50KB. (`script_grab_dispatch_p1.json`'s hook scene is `CharacterIconScene` → renders via the characterIcon style; `p2`'s hook scene is `ExplanationScene` → renders via the generic style — so this single check confirms both branches work end-to-end.)

- [ ] **Step 4: Commit**

```bash
git add vidgen/thumbnail.py
git commit -m "feat: add generate_thumbnail() Remotion CLI wrapper and CLI entry point"
```

---

### Task 4: Wire into `vidgen/main.py`

**Files:**
- Modify: `vidgen/main.py:561` (immediately after the existing `print(f"Video rendered to {video_output}")` line)

**Interfaces:**
- Consumes: `generate_thumbnail(script_path, output_path)` (Task 3).
- Produces: nothing new — this is the pipeline's terminal step.

- [ ] **Step 1: Add the non-fatal thumbnail hook**

In `vidgen/main.py`, the last two lines of `main()` currently read:

```python
    render_video_chunked(manifest, video_output)
    print(f"Video rendered to {video_output}")
```

Change to:

```python
    render_video_chunked(manifest, video_output)
    print(f"Video rendered to {video_output}")

    try:
        from vidgen.thumbnail import generate_thumbnail

        generate_thumbnail(args.script, video_output.replace(".mp4", "_thumb.png"))
    except Exception as e:
        print(f"⚠️  Thumbnail generation failed (non-fatal): {e}")
```

- [ ] **Step 2: Sanity-check the module still imports cleanly**

Run: `python -c "import vidgen.main"`
Expected: no output, exit code 0 (confirms no syntax errors — `vidgen/main.py`'s pipeline body only runs under `if __name__ == "__main__":`, so this doesn't trigger TTS or a real render).

Full pipeline verification (TTS + render + this hook) is out of scope here — it requires the expensive TTS/render pipeline this feature is explicitly meant not to gate ([Global Constraints](#global-constraints)). `generate_thumbnail`'s own correctness was already verified end-to-end in Task 3 Step 3; this hook is a 4-line try/except around that same call, verifiable by inspection.

- [ ] **Step 3: Commit**

```bash
git add vidgen/main.py
git commit -m "feat: auto-generate thumbnail after video render (non-fatal)"
```

---

### Task 5: Full verification pass

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Confirm Remotion sees the new composition**

```bash
cd remotion && npx remotion compositions
```

Expected: `Thumbnail` appears in the listed compositions (alongside `TikTokVideo`, `Cover`, `CharacterIconCover`, etc.).

- [ ] **Step 2: Re-confirm both styles render correctly from the repo root**

```bash
python -m vidgen.thumbnail content/script_grab_dispatch_p1.json
python -m vidgen.thumbnail content/script_grab_dispatch_p2.json
open output/thumbnails/script_grab_dispatch_p1_thumb.png
open output/thumbnails/script_grab_dispatch_p2_thumb.png
```

Expected: `p1`'s PNG shows the `CharacterIconCoverScene` illustration (human silhouette + car + distance pins) with line1/2/3 text auto-split from its `on_screen_text`. `p2`'s PNG shows the new generic layout (map pin + car icon + dashed connector, headline from its hook narration with the `**bold**` word highlighted in green).

- [ ] **Step 3: Run the full test suite**

```bash
pytest tests/ -v
```

Expected: all tests pass, including the 10 new tests in `tests/test_thumbnail.py` and every pre-existing test (this feature must not regress `test_main.py`, `test_manifest.py`, etc.).

- [ ] **Step 4: Confirm the untouched files are actually untouched**

```bash
git status output/thumbnails/grab_dispatch_p1_cover.png output/thumbnails/grab_dispatch_p2_cover.png
git diff --stat remotion/src/scenes/CharacterIconCoverScene.tsx
```

Expected: no changes reported for either — the existing manual-workflow covers and the component they came from are untouched, per this feature's non-goals.
