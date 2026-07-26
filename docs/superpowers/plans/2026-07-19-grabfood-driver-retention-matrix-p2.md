# GrabFood Phần 2 — Ma Trận Giữ Chân Tài Xế — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce `out/grabfood_driver_retention_matrix_p2.mp4` (9:16, 1080×1920, 30fps, ~1:27) — 8 new cinematic Remotion shot components driven by an 8-shot JSON script generated from the approved (and now user-agreed-trimmed) TXT source, narrated by VieNeu TTS, rendered through the existing VidGen pipeline.

**Architecture:** VidGen's existing TXT→JSON→manifest→render pipeline is unchanged. All new work is additive: 8 new scene components in `remotion/src/scenes/`, 8 new entries across the three registries that must stay in sync (`TikTokVideo.tsx` switch, `types.ts` union, `render_manifest_builder.py` TYPE_MAP), one new script JSON, and one rewritten TXT (trimmed narration, user-approved). Dark theme is local to these 8 components only — the channel-wide `colors` export in `styles.ts` (currently light) is not touched.

**Tech Stack:** Remotion 4 + React 19 + TypeScript (strict), Python 3 (VidGen pipeline), VieNeu TTS, ffmpeg/ffprobe.

## Global Constraints

- Narration for all 8 shots is FIXED by prior user approval (see Task 1) — do not paraphrase, reorder, or add words beyond what Task 1 specifies. This is a content decision already made with the user, not open for re-interpretation during implementation.
- Video ratio 9:16, exactly 1080×1920, 30fps. Composition/video id: `grabfood_driver_retention_matrix_p2`.
- Target total ≈1:30 (2700 frames); actual final length is whatever the real synthesized audio requires once `video_pipeline.py` tightens `duration_frames` — do not hand-pad shots to hit a number.
- Dark palette local to these 8 components: background `#0a0e14`, Grab accent `#00B14F`, warm home-light accent `#f97316`. Do not modify `remotion/src/styles.ts`'s exported `colors` (channel-wide light theme).
- No emoji anywhere in new components — build small inline SVG icons instead (project rule in CLAUDE.md overrides any older emoji usage elsewhere in the codebase, e.g. `DriverMatrixTeaserScene`).
- All motion via `interpolate`/`spring`/`Sequence` — no CSS animations keyed to real time. Every component must be a pure function of `frame`.
- Text-in-shape rule: on-screen text inside any card/pill/badge must stay fully enclosed with padding, centered, no overflow/clipping — verify visually per component (Task 10).
- "9/10" claim (Shot 1) must carry a small "Tình huống minh họa" label — it is illustrative, not an official GrabBenefits threshold.
- Cancel-rate visualization (Shot 3) must read as "closer to the limit = more danger," not "higher bar = better."
- Shot type registration requires exactly 3 synchronized edits per type: `remotion/src/types.ts` (Visual + SceneProps + union member), `remotion/src/TikTokVideo.tsx` (import + switch case), `vidgen/pipeline/render_manifest_builder.py` (`TYPE_MAP` entry, PascalCase key → snake_case value). Missing any one breaks the chain silently or throws at render/build time.
- Do not revert or fight the current uncommitted working-tree changes (caption system removal, Gate1/Gate2 removal, `GameHUDScene`/`game_hud` addition) — build on top of them.
- Stop and report on any command error per CLAUDE.md — do not improvise around failures (TTS, render, typecheck).
- Do not render the final MP4 until Task 9 explicitly authorizes it (this plan IS the render authorization the user already gave via `/goal`, so Task 9+ may proceed through render without a further approval prompt — but any narration or manifest surprise discovered along the way must stop and be reported, not silently patched).

---

## Final Narration (locked, from prior user approval)

8 shots, 368 words total, agreed with the user as the deep-cut version of the approved TXT. This is copied verbatim into both the rewritten TXT (Task 1) and the JSON script (Task 10) — do not re-word.

1. **map_dot_to_human** — "Ở phần trước, bạn thấy một chấm nhỏ chạy qua nhiều điểm dừng. Phía sau nó là một người thật — điện thoại sắp hết pin, anh chỉ muốn tắt ứng dụng để về. Nhưng màn hình sáng lên: chỉ còn một chuyến nữa."
2. **work_to_game_morph** — "Đây vẫn là hệ thống quyền lợi và phần thưởng. Nhưng khi công việc chia thành điểm số, mục tiêu, thứ hạng, nó mang cấu trúc của một trò chơi. Chuyến xe trở thành tiến độ. Thứ hạng trở thành cấp độ."
3. **triple_metric_orbit** — "Số chuyến chỉ là lớp đầu. GrabBenefits còn gắn điều kiện thưởng với tỷ lệ nhận và tỷ lệ hủy chuyến trong tháng. Không chỉ chạy nhiều — còn phải nhận đủ, và không được hủy quá nhiều."
4. **progress_memory_trail** — "Ở chuyến đầu, dừng lại không khó. Nhưng khi thanh tiến trình gần đầy, dừng lại giống như bỏ lại toàn bộ những giờ đã chạy. Mục tiêu giữ tài xế không chỉ bằng phần thưởng phía trước — mà bằng công sức đã nằm lại phía sau."
5. **dual_clock_route** — "Đây là nơi phần một nối vào phần hai. Mỗi đơn trong chuyến ghép GrabFood được tính thành một chuyến riêng khi xét tiến độ. Khách hàng thấy nhiều điểm dừng. Tài xế thấy thanh tiến trình tăng thêm bước. Cùng một tuyến đường — hai chiếc đồng hồ khác nhau."
6. **weighted_choice_world** — "Trò chơi không kết thúc sau tối nay — thành tích cộng dồn cả tháng, thứ hạng quyết định quyền lợi tháng sau. Không ai lấy mất quyền lựa chọn của tài xế. Nhưng một bên là về nhà, bên kia là tiến độ gần hoàn thành và quyền lợi đã quen dùng. Quyền lựa chọn vẫn còn — chỉ là hai lựa chọn không còn cùng trọng lượng."
7. **false_completion** — "Mục tiêu hoàn thành, hiệu ứng ăn mừng hiện lên. Nhưng hiệu ứng vừa tắt, anh vẫn còn phải tự chạy về nhà."
8. **thesis_teaser** — "Grab không biến tài xế thành người chơi. Nó biến công việc của họ thành một trò chơi, nơi phần thưởng luôn cách điểm dừng đúng một mục tiêu nữa. Nhưng vẫn còn một người khác trong đơn hàng này. Khi khách được giảm giá, ai đang thực sự trả phần còn lại?"

On-screen text per shot (short, ≤2 lines, safe zone):
1. "HAI LỰA CHỌN NÀY CÓ THỰC SỰ NGANG NHAU?" + small label "Tình huống minh họa" on the 9/10 badge
2. "CHUYẾN XE → TIẾN ĐỘ" / "THỨ HẠNG → CẤP ĐỘ"
3. "BA CON SỐ. CÙNG ĐẾM MỘT THÁNG LÀM VIỆC." + footer "GrabBenefits — chính sách áp dụng từ 5/2026"
4. "9/10 KHÔNG CHỈ LÀ TIẾN ĐỘ."
5. "KHÁCH HÀNG ĐẾM PHÚT." / "TÀI XẾ ĐẾM TIẾN ĐỘ."
6. "QUYỀN LỰA CHỌN VẪN CÒN." / "TRỌNG LƯỢNG THÌ KHÔNG CÒN BẰNG NHAU."
7. "ỨNG DỤNG: HOÀN THÀNH" / "NGƯỜI TÀI XẾ: CHƯA VỀ ĐẾN NHÀ"
8. "MỘT MỤC TIÊU NỮA — LUÔN LUÔN." then after a beat + 8-12f black: "PHẦN 3 — AI THỰC SỰ TRẢ TIỀN CHO MÃ GIẢM GIÁ?"

---

## File Structure

New files:
- `remotion/src/scenes/MapDotToHumanShot.tsx`
- `remotion/src/scenes/WorkToGameMorphShot.tsx`
- `remotion/src/scenes/TripleMetricOrbitShot.tsx`
- `remotion/src/scenes/ProgressMemoryTrailShot.tsx`
- `remotion/src/scenes/DualClockRouteShot.tsx`
- `remotion/src/scenes/WeightedChoiceWorldShot.tsx`
- `remotion/src/scenes/FalseCompletionShot.tsx`
- `remotion/src/scenes/ThesisTeaserShot.tsx`
- `remotion/src/scenes/grabfoodP2Palette.ts` — shared dark palette + icon SVGs for all 8 shots above (avoids repeating hex codes/icons in every file)
- `content/json/grabfood_driver_retention_matrix_p2.json` — overwritten (currently invalid plain text, not real JSON)

Modified files:
- `content/text/grabfood_driver_retention_matrix_p2.txt` — replaced with the trimmed 8-scene version (Task 1)
- `remotion/src/types.ts` — add 8 `*Visual`/`*SceneProps` types + 8 union members
- `remotion/src/TikTokVideo.tsx` — add 8 imports + 8 switch cases
- `vidgen/pipeline/render_manifest_builder.py` — add 8 `TYPE_MAP` entries
- `tests/test_render_manifest_builder.py` — add a test asserting the 8 new types translate correctly (following the existing `test_new_cinematic_scene_types_translate_to_manifest_keys` pattern)
- `remotion/src/scenes/GameHUDScene.tsx` — replace 🔓/🔒 emoji with SVG lock/unlock icons (project no-emoji rule), used by `WorkToGameMorphShot`

---

### Task 1: Rewrite the approved TXT with trimmed narration

**Files:**
- Modify: `content/text/grabfood_driver_retention_matrix_p2.txt` (replace entirely)

**Interfaces:**
- Produces: the authored source of truth for Task 10's JSON. Every narration string in Task 10 must trace back to a `**Voice-over:**` block here, verbatim.

- [ ] **Step 1: Write the new TXT**

Replace the full contents of `content/text/grabfood_driver_retention_matrix_p2.txt` with a title block plus 8 scenes, each with `Hình ảnh`, `Voice-over`, `Chữ trên màn hình`, `Âm thanh`, `Chuyển cảnh` sections. Use the exact narration and on-screen text listed in "Final Narration" above (the wording was already approved by the user in this session — do not alter it). Include a short production note at the top recording that this is a deliberately shortened cut of the original 15-scene draft, agreed with the user, target ≈1:30, dark cinematic theme local to this video.

- [ ] **Step 2: Verify word count matches the locked narration**

Run:
```bash
/Users/haunguyen/miniconda3/bin/python3 -c "
import re
text = open('content/text/grabfood_driver_retention_matrix_p2.txt', encoding='utf-8').read()
blocks = re.findall(r'\*\*Voice-over:\*\*\n\n(.*?)(?=\n\*\*Chữ|\n---|\Z)', text, re.S)
total = 0
for b in blocks:
    lines = re.findall(r'[“\"]([^”\"]+)[”\"]', b)
    total += len(' '.join(lines).split())
print('scenes:', len(blocks), 'total words:', total)
"
```
Expected: `scenes: 8 total words: 368` (±5 words tolerance for minor connector differences).

- [ ] **Step 3: Commit**

```bash
git add content/text/grabfood_driver_retention_matrix_p2.txt
git commit -m "content: trim GrabFood P2 script to 8 scenes / ~1:30 per user approval"
```

---

### Task 2: Shared palette + icon helpers for the 8 new shots

**Files:**
- Create: `remotion/src/scenes/grabfoodP2Palette.ts`

**Interfaces:**
- Produces: `export const p2Colors = { bg: string; bgDeep: string; grab: string; grabDim: string; warmHome: string; danger: string; textPrimary: string; textDim: string }` and `export const P2Icons = { Lock, Unlock, Phone, Clock, Calendar, Scale, Confetti, Home }` — each a `React.FC<{ size?: number; color?: string }>` returning an inline `<svg>` (no emoji, no external asset).

- [ ] **Step 1: Write the palette + icons file**

```typescript
import React from "react";

// Dark cinematic palette local to grabfood_driver_retention_matrix_p2 — NOT
// the channel-wide `colors` export in styles.ts (which stays light theme).
export const p2Colors = {
  bg: "#0a0e14",
  bgDeep: "#05070a",
  grab: "#00B14F",
  grabDim: "rgba(0,177,79,0.35)",
  warmHome: "#f97316",
  danger: "#ef4444",
  textPrimary: "rgba(255,255,255,0.95)",
  textDim: "rgba(255,255,255,0.55)",
} as const;

type IconProps = { size?: number; color?: string };

export const P2Icons = {
  Lock: ({ size = 22, color = p2Colors.textDim }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke={color} strokeWidth="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={color} strokeWidth="2" fill="none" />
    </svg>
  ),
  Unlock: ({ size = 22, color = p2Colors.grab }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke={color} strokeWidth="2" />
      <path d="M8 11V7a4 4 0 0 1 7.5-1.8" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  ),
  Phone: ({ size = 22, color = p2Colors.textPrimary }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="6" y="2" width="12" height="20" rx="2.5" stroke={color} strokeWidth="2" />
      <line x1="10" y1="19" x2="14" y2="19" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Clock: ({ size = 22, color = p2Colors.textPrimary }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <path d="M12 7v5l3.5 2" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  Calendar: ({ size = 22, color = p2Colors.textPrimary }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke={color} strokeWidth="2" />
      <line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="2" />
      <line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Scale: ({ size = 22, color = p2Colors.textPrimary }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <line x1="12" y1="3" x2="12" y2="21" stroke={color} strokeWidth="2" />
      <line x1="4" y1="7" x2="20" y2="7" stroke={color} strokeWidth="2" />
      <path d="M4 7l-3 6a3.5 3.5 0 0 0 7 0Z" stroke={color} strokeWidth="1.6" fill="none" />
      <path d="M20 7l-3 6a3.5 3.5 0 0 0 7 0Z" stroke={color} strokeWidth="1.6" fill="none" />
    </svg>
  ),
  Confetti: ({ size = 22, color = p2Colors.grab }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="4" height="4" fill={color} transform="rotate(15 5 5)" />
      <rect x="17" y="4" width="4" height="4" fill={p2Colors.warmHome} transform="rotate(-20 19 6)" />
      <rect x="10" y="14" width="4" height="4" fill={color} transform="rotate(30 12 16)" />
      <circle cx="19" cy="16" r="2" fill={p2Colors.warmHome} />
    </svg>
  ),
  Home: ({ size = 22, color = p2Colors.warmHome }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 11l8-7 8 7" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" stroke={color} strokeWidth="2" fill="none" />
    </svg>
  ),
};
```

- [ ] **Step 2: Typecheck**

Run: `npx --prefix remotion tsc --noEmit -p remotion/tsconfig.json`
Expected: no new errors referencing `grabfoodP2Palette.ts` (pre-existing unrelated errors, if any, are out of scope).

- [ ] **Step 3: Commit**

```bash
git add remotion/src/scenes/grabfoodP2Palette.ts
git commit -m "feat: add shared dark palette and SVG icons for GrabFood P2 shots"
```

---

### Task 3: MapDotToHumanShot (Shot 1)

**Files:**
- Create: `remotion/src/scenes/MapDotToHumanShot.tsx`
- Modify: `remotion/src/types.ts` (append near other map/driver visual types, e.g. after `MapPingSceneProps`)
- Modify: `remotion/src/TikTokVideo.tsx` (import + switch case)
- Modify: `vidgen/pipeline/render_manifest_builder.py` (`TYPE_MAP` entry)

**Interfaces:**
- Consumes: `p2Colors`, `P2Icons.Phone` from Task 2; `SafeZone` from `../SafeZone`; `AmbientBackground` from `../AmbientBackground`.
- Produces: `MapDotToHumanVisual = { headline: string; illustrativeLabel: string; batteryPercent: number; targetCurrent: number; targetTotal: number }` and `MapDotToHumanSceneProps = MapDotToHumanVisual & { durationInFrames: number }`. Manifest type key: `"map_dot_to_human"`. Component export: `MapDotToHumanShot`.

- [ ] **Step 1: Add the type to `remotion/src/types.ts`**

Insert after `MapPingSceneProps` (around line 232):

```typescript
export type MapDotToHumanVisual = {
  headline: string;
  illustrativeLabel: string; // "Tình huống minh họa" badge on the 9/10 notification
  batteryPercent: number; // e.g. 5
  targetCurrent: number; // e.g. 9
  targetTotal: number; // e.g. 10
};

export type MapDotToHumanSceneProps = MapDotToHumanVisual & { durationInFrames: number };
```

Also add the union member inside `ManifestScene` (anywhere in the big union, e.g. right before the closing `;` of the union — add as a new `|` line):

```typescript
  | { type: "map_dot_to_human"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: MapDotToHumanVisual }
```

- [ ] **Step 2: Write the component**

```typescript
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MapDotToHumanSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BE_VIETNAM_PRO } from "../styles";
import { p2Colors, P2Icons } from "./grabfoodP2Palette";

// Frame plan: 0-40 map dot glows and zooms; 40-90 dot morphs into a phone
// silhouette (camera-push feel via scale+blur); 90-130 phone UI fades in
// with battery/route; 130+ notification badge springs in over it.
export const MapDotToHumanShot: React.FC<MapDotToHumanSceneProps> = ({
  headline,
  illustrativeLabel,
  batteryPercent,
  targetCurrent,
  targetTotal,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dotToPhone = interpolate(frame, [0, 40, 90], [0, 0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dotScale = interpolate(frame, [0, 40], [1, 6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dotBlur = interpolate(frame, [20, 40], [0, 18], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const phoneOpacity = interpolate(frame, [60, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const notifSpring = spring({ frame: frame - 130, fps, config: { damping: 14, stiffness: 170 } });
  const headlineOpacity = interpolate(frame, [durationInFrames - 110, durationInFrames - 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: p2Colors.bg, opacity: exitOpacity, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AmbientBackground accent={p2Colors.grab} />

      {/* Map dot -> camera push */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "38%",
          width: 18,
          height: 18,
          marginLeft: -9,
          marginTop: -9,
          borderRadius: "50%",
          background: p2Colors.grab,
          boxShadow: `0 0 ${20 + dotScale * 4}px ${p2Colors.grab}`,
          transform: `scale(${dotScale})`,
          filter: `blur(${dotBlur}px)`,
          opacity: interpolate(dotToPhone, [0, 1], [1, 0]),
        }}
      />

      {/* Phone mockup revealed by the push-in */}
      <div style={{ position: "absolute", inset: 0, opacity: phoneOpacity, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: 420,
            height: 860,
            borderRadius: 44,
            border: `3px solid ${p2Colors.grabDim}`,
            background: `linear-gradient(180deg, ${p2Colors.bgDeep} 0%, #0d1420 100%)`,
            boxShadow: `0 0 60px rgba(0,177,79,0.15)`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 24, left: 24, right: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <P2Icons.Phone size={20} color={p2Colors.textDim} />
            <span style={{ fontSize: 15, color: batteryPercent <= 10 ? p2Colors.danger : p2Colors.textDim, fontWeight: 700 }}>
              PIN {batteryPercent}%
            </span>
          </div>

          {/* Route line home */}
          <svg width="420" height="860" style={{ position: "absolute", inset: 0 }}>
            <path
              d="M 120 300 Q 220 480 160 700"
              stroke={p2Colors.warmHome}
              strokeWidth="5"
              fill="none"
              strokeDasharray="10 8"
              opacity={0.7}
            />
          </svg>

          {/* Notification badge */}
          <div
            style={{
              position: "absolute",
              left: 28,
              right: 28,
              top: 380,
              borderRadius: 20,
              padding: "20px 22px",
              background: "rgba(0,177,79,0.14)",
              border: `2px solid ${p2Colors.grab}`,
              opacity: Math.min(1, notifSpring),
              transform: `translateY(${(1 - Math.min(1, notifSpring)) * 30}px) scale(${Math.min(1, notifSpring)})`,
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            <div style={{ fontSize: 16, color: p2Colors.textDim, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
              MỤC TIÊU HÔM NAY
            </div>
            <div style={{ fontSize: 40, fontWeight: 900, color: p2Colors.textPrimary }}>
              {targetCurrent}/{targetTotal}
            </div>
            <div
              style={{
                marginTop: 10,
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                fontSize: 12,
                color: p2Colors.textDim,
                fontWeight: 600,
              }}
            >
              {illustrativeLabel}
            </div>
          </div>
        </div>
      </div>

      <SafeZone style={{ justifyContent: "flex-end" }}>
        <div
          style={{
            fontSize: 40,
            fontWeight: 800,
            lineHeight: 1.25,
            color: p2Colors.textPrimary,
            textAlign: "center",
            opacity: headlineOpacity,
          }}
        >
          {headline}
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};

export default MapDotToHumanShot;
```

- [ ] **Step 3: Register in `TikTokVideo.tsx`**

Add import near the other scene imports (after `TrafficCinematicScene` import):
```typescript
import { MapDotToHumanShot } from "./scenes/MapDotToHumanShot";
```
Add switch case right before `default:`:
```typescript
    case "map_dot_to_human":
      return <MapDotToHumanShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
```

- [ ] **Step 4: Register in `render_manifest_builder.py`**

Add to `TYPE_MAP` dict:
```python
    "MapDotToHumanShot": "map_dot_to_human",
```

- [ ] **Step 5: Typecheck**

Run: `npx --prefix remotion tsc --noEmit -p remotion/tsconfig.json`
Expected: no errors for `MapDotToHumanShot.tsx` or the new `types.ts`/`TikTokVideo.tsx` additions.

- [ ] **Step 6: Commit**

```bash
git add remotion/src/scenes/MapDotToHumanShot.tsx remotion/src/types.ts remotion/src/TikTokVideo.tsx vidgen/pipeline/render_manifest_builder.py
git commit -m "feat: add MapDotToHumanShot scene type (GrabFood P2 shot 1)"
```

---

### Task 4: WorkToGameMorphShot (Shot 2) + fix GameHUDScene emoji

**Files:**
- Modify: `remotion/src/scenes/GameHUDScene.tsx` (replace 🔓/🔒 with `P2Icons`/local SVGs — GameHUDScene is channel-wide, so use inline SVG directly, not the P2-specific palette import, to avoid coupling a shared scene to a single video's palette file)
- Create: `remotion/src/scenes/WorkToGameMorphShot.tsx`
- Modify: `remotion/src/types.ts`, `remotion/src/TikTokVideo.tsx`, `vidgen/pipeline/render_manifest_builder.py`

**Interfaces:**
- Produces: `WorkToGameMorphVisual = { headline: string; transformations: Array<{ from: string; to: string }> }`, `WorkToGameMorphSceneProps`, manifest key `"work_to_game_morph"`, component `WorkToGameMorphShot`.

- [ ] **Step 1: Fix `GameHUDScene.tsx` emoji (lines 218, unlock/lock spans)**

Add at top of file (after existing imports):
```typescript
const LockIcon: React.FC<{ locked: boolean; color: string }> = ({ locked, color }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect x="5" y="11" width="14" height="9" rx="2" stroke={color} strokeWidth="2" />
    {locked ? (
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={color} strokeWidth="2" fill="none" />
    ) : (
      <path d="M8 11V7a4 4 0 0 1 7.5-1.8" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    )}
  </svg>
);
```
Replace the line `<span style={{ fontSize: 24 }}>{unlocked ? "🔓" : "🔒"}</span>` with:
```typescript
                <LockIcon locked={!unlocked} color={unlocked ? accentColor : colors.textDim} />
```

- [ ] **Step 2: Add the type to `types.ts`**

```typescript
export type WorkToGameMorphVisual = {
  headline: string;
  transformations: Array<{ from: string; to: string }>; // e.g. [{from:"CHUYẾN XE", to:"TIẾN ĐỘ"}, {from:"THỨ HẠNG", to:"CẤP ĐỘ"}]
};

export type WorkToGameMorphSceneProps = WorkToGameMorphVisual & { durationInFrames: number };
```
Add union member:
```typescript
  | { type: "work_to_game_morph"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: WorkToGameMorphVisual }
```

- [ ] **Step 3: Write the component**

```typescript
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { WorkToGameMorphSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BE_VIETNAM_PRO } from "../styles";
import { p2Colors } from "./grabfoodP2Palette";

// Frame plan: phone silhouette shrinks to top; each transformation row
// flies in staggered (fromLabel -> arrow -> toLabel), arrow morphs via
// scaleX so it reads as "becoming", not just appearing.
export const WorkToGameMorphShot: React.FC<WorkToGameMorphSceneProps> = ({
  headline,
  transformations,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneShrink = spring({ frame, fps, config: { damping: 16, stiffness: 140 }, durationInFrames: 30 });
  const headlineOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: p2Colors.bg, opacity: exitOpacity, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AmbientBackground accent={p2Colors.grab} />
      <SafeZone style={{ justifyContent: "center", flexDirection: "column" }}>
        <div
          style={{
            fontSize: 44,
            fontWeight: 800,
            lineHeight: 1.2,
            color: p2Colors.textPrimary,
            opacity: headlineOpacity,
            marginBottom: 56,
            transform: `scale(${interpolate(phoneShrink, [0, 1], [1.1, 1])})`,
          }}
        >
          {headline}
        </div>

        {transformations.map((t, i) => {
          const start = 40 + i * 26;
          const rowSpring = spring({ frame: frame - start, fps, config: { damping: 15, stiffness: 160 }, durationInFrames: 24 });
          const arrowScale = interpolate(rowSpring, [0, 1], [0, 1]);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                marginBottom: 28,
                opacity: Math.min(1, rowSpring),
                transform: `translateX(${(1 - Math.min(1, rowSpring)) * -40}px)`,
              }}
            >
              <div
                style={{
                  padding: "14px 22px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  fontSize: 24,
                  fontWeight: 700,
                  color: p2Colors.textDim,
                }}
              >
                {t.from}
              </div>
              <div style={{ width: 40, height: 3, background: p2Colors.grab, transform: `scaleX(${arrowScale})`, transformOrigin: "left" }} />
              <div
                style={{
                  padding: "14px 22px",
                  borderRadius: 14,
                  background: p2Colors.grabDim,
                  border: `1px solid ${p2Colors.grab}`,
                  fontSize: 24,
                  fontWeight: 800,
                  color: p2Colors.textPrimary,
                }}
              >
                {t.to}
              </div>
            </div>
          );
        })}
      </SafeZone>
    </AbsoluteFill>
  );
};

export default WorkToGameMorphShot;
```

- [ ] **Step 4: Register in `TikTokVideo.tsx` and `render_manifest_builder.py`**

Import: `import { WorkToGameMorphShot } from "./scenes/WorkToGameMorphShot";`
Case:
```typescript
    case "work_to_game_morph":
      return <WorkToGameMorphShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
```
TYPE_MAP: `"WorkToGameMorphShot": "work_to_game_morph",`

- [ ] **Step 5: Typecheck**

Run: `npx --prefix remotion tsc --noEmit -p remotion/tsconfig.json`
Expected: no errors, including in the modified `GameHUDScene.tsx`.

- [ ] **Step 6: Commit**

```bash
git add remotion/src/scenes/GameHUDScene.tsx remotion/src/scenes/WorkToGameMorphShot.tsx remotion/src/types.ts remotion/src/TikTokVideo.tsx vidgen/pipeline/render_manifest_builder.py
git commit -m "feat: add WorkToGameMorphShot; remove emoji lock icons from GameHUDScene"
```

---

### Task 5: TripleMetricOrbitShot (Shot 3)

**Files:**
- Create: `remotion/src/scenes/TripleMetricOrbitShot.tsx`
- Modify: `remotion/src/types.ts`, `remotion/src/TikTokVideo.tsx`, `vidgen/pipeline/render_manifest_builder.py`

**Interfaces:**
- Produces: `TripleMetricOrbitVisual = { headline: string; trips: { current: number; target: number }; acceptanceRate: { value: number; min: number }; cancellationRate: { value: number; max: number }; footer: string }`, manifest key `"triple_metric_orbit"`, component `TripleMetricOrbitShot`.

- [ ] **Step 1: Add types**

```typescript
export type TripleMetricOrbitVisual = {
  headline: string;
  trips: { current: number; target: number };
  acceptanceRate: { value: number; min: number }; // percent, e.g. value:92, min:90
  cancellationRate: { value: number; max: number }; // percent, e.g. value:7, max:8 -- closer to max = more danger
  footer: string;
};

export type TripleMetricOrbitSceneProps = TripleMetricOrbitVisual & { durationInFrames: number };
```
Union member:
```typescript
  | { type: "triple_metric_orbit"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: TripleMetricOrbitVisual }
```

- [ ] **Step 2: Write the component**

The cancellation-rate ring must visually read as danger-when-high: fill color interpolates from `p2Colors.grab` toward `p2Colors.danger` as `value` approaches `max`, and the ring is labeled "CÀNG GẦN VẠCH ĐỎ CÀNG RỦI RO" via a small red tick mark at the max position — not just "more fill = better" like the other two rings.

```typescript
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { TripleMetricOrbitSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BE_VIETNAM_PRO } from "../styles";
import { p2Colors } from "./grabfoodP2Palette";

const RING_RADIUS = 130;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const MetricRing: React.FC<{
  label: string;
  valueLabel: string;
  ratio: number; // 0-1 fill
  color: string;
  dangerTickRatio?: number; // 0-1 position of the "max" red tick, if this ring is danger-oriented
  enterAt: number;
}> = ({ label, valueLabel, ratio, color, dangerTickRatio, enterAt }) => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [enterAt, enterAt + 40], [0, ratio], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [enterAt, enterAt + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tickAngle = dangerTickRatio !== undefined ? dangerTickRatio * 360 - 90 : 0;

  return (
    <div style={{ position: "relative", width: 300, height: 300, opacity }}>
      <svg width="300" height="300" viewBox="0 0 300 300">
        <circle cx="150" cy="150" r={RING_RADIUS} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
        <circle
          cx="150"
          cy="150"
          r={RING_RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - draw)}
          transform="rotate(-90 150 150)"
        />
        {dangerTickRatio !== undefined && (
          <line
            x1={150 + Math.cos((tickAngle * Math.PI) / 180) * (RING_RADIUS - 12)}
            y1={150 + Math.sin((tickAngle * Math.PI) / 180) * (RING_RADIUS - 12)}
            x2={150 + Math.cos((tickAngle * Math.PI) / 180) * (RING_RADIUS + 12)}
            y2={150 + Math.sin((tickAngle * Math.PI) / 180) * (RING_RADIUS + 12)}
            stroke={p2Colors.danger}
            strokeWidth="4"
          />
        )}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 38, fontWeight: 900, color: p2Colors.textPrimary }}>{valueLabel}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: p2Colors.textDim, marginTop: 6, textAlign: "center", maxWidth: 180 }}>{label}</div>
      </div>
    </div>
  );
};

export const TripleMetricOrbitShot: React.FC<TripleMetricOrbitSceneProps> = ({
  headline,
  trips,
  acceptanceRate,
  cancellationRate,
  footer,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const headlineOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const footerOpacity = interpolate(frame, [durationInFrames - 60, durationInFrames - 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const dangerRatio = cancellationRate.value / cancellationRate.max;
  const dangerColor = dangerRatio > 0.85 ? p2Colors.danger : dangerRatio > 0.6 ? p2Colors.warmHome : p2Colors.grab;

  return (
    <AbsoluteFill style={{ backgroundColor: p2Colors.bg, opacity: exitOpacity, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AmbientBackground accent={p2Colors.grab} />
      <SafeZone style={{ justifyContent: "center", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 38, fontWeight: 800, textAlign: "center", color: p2Colors.textPrimary, opacity: headlineOpacity, marginBottom: 36 }}>
          {headline}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center" }}>
          <MetricRing
            label="ĐIỂM CHUYẾN"
            valueLabel={`${trips.current}/${trips.target}`}
            ratio={trips.current / trips.target}
            color={p2Colors.grab}
            enterAt={20}
          />
          <div style={{ display: "flex", gap: 20 }}>
            <MetricRing
              label={`TỶ LỆ NHẬN — TỐI THIỂU ${acceptanceRate.min}%`}
              valueLabel={`${acceptanceRate.value}%`}
              ratio={acceptanceRate.value / 100}
              color={p2Colors.grab}
              enterAt={50}
            />
            <MetricRing
              label={`TỶ LỆ HỦY — TỐI ĐA ${cancellationRate.max}%`}
              valueLabel={`${cancellationRate.value}%`}
              ratio={cancellationRate.value / 100}
              color={dangerColor}
              dangerTickRatio={cancellationRate.max / 100}
              enterAt={80}
            />
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 60, fontSize: 15, color: p2Colors.textDim, opacity: footerOpacity, textAlign: "center" }}>
          {footer}
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};

export default TripleMetricOrbitShot;
```

- [ ] **Step 3: Register in `TikTokVideo.tsx` and `render_manifest_builder.py`**

Import: `import { TripleMetricOrbitShot } from "./scenes/TripleMetricOrbitShot";`
Case:
```typescript
    case "triple_metric_orbit":
      return <TripleMetricOrbitShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
```
TYPE_MAP: `"TripleMetricOrbitShot": "triple_metric_orbit",`

- [ ] **Step 4: Typecheck**

Run: `npx --prefix remotion tsc --noEmit -p remotion/tsconfig.json`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add remotion/src/scenes/TripleMetricOrbitShot.tsx remotion/src/types.ts remotion/src/TikTokVideo.tsx vidgen/pipeline/render_manifest_builder.py
git commit -m "feat: add TripleMetricOrbitShot scene type (GrabFood P2 shot 3)"
```

---

### Task 6: ProgressMemoryTrailShot (Shot 4) + DualClockRouteShot (Shot 5)

**Files:**
- Create: `remotion/src/scenes/ProgressMemoryTrailShot.tsx`
- Create: `remotion/src/scenes/DualClockRouteShot.tsx`
- Modify: `remotion/src/types.ts`, `remotion/src/TikTokVideo.tsx`, `vidgen/pipeline/render_manifest_builder.py`

**Interfaces:**
- Produces: `ProgressMemoryTrailVisual = { headline: string; totalCells: number; filledCells: number }`, manifest key `"progress_memory_trail"`, component `ProgressMemoryTrailShot`.
- Produces: `DualClockRouteVisual = { headline: string; customerLabel: string; driverLabel: string; stopCount: number }`, manifest key `"dual_clock_route"`, component `DualClockRouteShot`.

- [ ] **Step 1: Add types**

```typescript
export type ProgressMemoryTrailVisual = {
  headline: string;
  totalCells: number; // e.g. 10
  filledCells: number; // e.g. 9
};

export type ProgressMemoryTrailSceneProps = ProgressMemoryTrailVisual & { durationInFrames: number };

export type DualClockRouteVisual = {
  headline: string;
  customerLabel: string; // "Tài xế đang giao một đơn hàng khác"
  driverLabel: string; // "+1 +1 +1"
  stopCount: number; // e.g. 3
};

export type DualClockRouteSceneProps = DualClockRouteVisual & { durationInFrames: number };
```
Union members:
```typescript
  | { type: "progress_memory_trail"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: ProgressMemoryTrailVisual }
  | { type: "dual_clock_route"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: DualClockRouteVisual }
```

- [ ] **Step 2: Write ProgressMemoryTrailShot**

Frame plan: cells enter staggered left-to-right as small rounded rectangles; filled cells (0..filledCells-1) glow green and pull inward slightly (spring "tug", reading as "these hold you back") while empty cells stay dim and static.

```typescript
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ProgressMemoryTrailSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BE_VIETNAM_PRO } from "../styles";
import { p2Colors } from "./grabfoodP2Palette";

export const ProgressMemoryTrailShot: React.FC<ProgressMemoryTrailSceneProps> = ({
  headline,
  totalCells,
  filledCells,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headlineOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tugPhase = interpolate(frame, [totalCells * 8 + 40, totalCells * 8 + 100], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: p2Colors.bg, opacity: exitOpacity, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AmbientBackground accent={p2Colors.grab} />
      <SafeZone style={{ justifyContent: "center", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 40, fontWeight: 800, textAlign: "center", color: p2Colors.textPrimary, opacity: headlineOpacity, marginBottom: 48 }}>
          {headline}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, maxWidth: 720, justifyContent: "center" }}>
          {Array.from({ length: totalCells }).map((_, i) => {
            const start = i * 8;
            const enter = spring({ frame: frame - start, fps, config: { damping: 15, stiffness: 180 }, durationInFrames: 20 });
            const filled = i < filledCells;
            const tugOffset = filled ? Math.sin((tugPhase - i * 0.05) * Math.PI) * (filled ? -6 : 0) * tugPhase : 0;
            return (
              <div
                key={i}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 14,
                  background: filled ? p2Colors.grabDim : "rgba(255,255,255,0.05)",
                  border: `2px solid ${filled ? p2Colors.grab : "rgba(255,255,255,0.12)"}`,
                  boxShadow: filled ? `0 0 18px rgba(0,177,79,0.3)` : undefined,
                  opacity: Math.min(1, enter),
                  transform: `scale(${Math.min(1, enter)}) translateY(${tugOffset}px)`,
                }}
              />
            );
          })}
        </div>

        <div style={{ marginTop: 40, fontSize: 22, fontWeight: 700, color: p2Colors.textDim }}>
          {filledCells}/{totalCells}
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};

export default ProgressMemoryTrailShot;
```

- [ ] **Step 3: Write DualClockRouteShot**

Frame plan: a single vertical route line splits into two horizontally-offset "layers" (translateX) at frame ~60 — left layer shows the customer clock counting up, right layer shows three `+1` chips popping in sequentially onto a progress readout.

```typescript
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DualClockRouteSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BE_VIETNAM_PRO } from "../styles";
import { p2Colors, P2Icons } from "./grabfoodP2Palette";

export const DualClockRouteShot: React.FC<DualClockRouteSceneProps> = ({
  headline,
  customerLabel,
  driverLabel,
  stopCount,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const split = interpolate(frame, [50, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const headlineOpacity = interpolate(frame, [durationInFrames - 110, durationInFrames - 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const minutesElapsed = Math.floor(interpolate(frame, [90, durationInFrames - 60], [0, 42], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));

  return (
    <AbsoluteFill style={{ backgroundColor: p2Colors.bg, opacity: exitOpacity, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AmbientBackground accent={p2Colors.grab} />

      {/* Single route line before split */}
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0, opacity: interpolate(split, [0, 1], [1, 0.3]) }}>
        <path d="M 540 400 Q 620 900 500 1500" stroke={p2Colors.grabDim} strokeWidth="6" fill="none" />
      </svg>

      <SafeZone style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
        {/* Customer layer */}
        <div
          style={{
            flex: 1,
            transform: `translateX(${-split * 40}px)`,
            opacity: split,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <P2Icons.Clock size={40} color={p2Colors.textDim} />
          <div style={{ fontSize: 34, fontWeight: 900, color: p2Colors.textPrimary }}>{minutesElapsed} phút</div>
          <div style={{ fontSize: 15, color: p2Colors.textDim, textAlign: "center", maxWidth: 200 }}>{customerLabel}</div>
        </div>

        <div style={{ width: 2, height: 320, background: "rgba(255,255,255,0.1)" }} />

        {/* Driver layer */}
        <div
          style={{
            flex: 1,
            transform: `translateX(${split * 40}px)`,
            opacity: split,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            {Array.from({ length: stopCount }).map((_, i) => {
              const chipSpring = spring({ frame: frame - (100 + i * 20), fps, config: { damping: 14, stiffness: 200 } });
              return (
                <div
                  key={i}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    background: p2Colors.grabDim,
                    border: `1px solid ${p2Colors.grab}`,
                    color: p2Colors.grab,
                    fontWeight: 900,
                    fontSize: 20,
                    opacity: Math.min(1, chipSpring),
                    transform: `scale(${Math.min(1, chipSpring)})`,
                  }}
                >
                  +1
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 15, color: p2Colors.textDim, textAlign: "center", maxWidth: 200 }}>{driverLabel}</div>
        </div>
      </SafeZone>

      <div
        style={{
          position: "absolute",
          bottom: 140,
          left: 70,
          right: 70,
          textAlign: "center",
          fontSize: 32,
          fontWeight: 800,
          lineHeight: 1.3,
          color: p2Colors.textPrimary,
          opacity: headlineOpacity,
        }}
      >
        {headline}
      </div>
    </AbsoluteFill>
  );
};

export default DualClockRouteShot;
```

- [ ] **Step 4: Register both in `TikTokVideo.tsx` and `render_manifest_builder.py`**

Imports:
```typescript
import { ProgressMemoryTrailShot } from "./scenes/ProgressMemoryTrailShot";
import { DualClockRouteShot } from "./scenes/DualClockRouteShot";
```
Cases:
```typescript
    case "progress_memory_trail":
      return <ProgressMemoryTrailShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "dual_clock_route":
      return <DualClockRouteShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
```
TYPE_MAP entries:
```python
    "ProgressMemoryTrailShot": "progress_memory_trail",
    "DualClockRouteShot": "dual_clock_route",
```

- [ ] **Step 5: Typecheck**

Run: `npx --prefix remotion tsc --noEmit -p remotion/tsconfig.json`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add remotion/src/scenes/ProgressMemoryTrailShot.tsx remotion/src/scenes/DualClockRouteShot.tsx remotion/src/types.ts remotion/src/TikTokVideo.tsx vidgen/pipeline/render_manifest_builder.py
git commit -m "feat: add ProgressMemoryTrailShot and DualClockRouteShot scene types (GrabFood P2 shots 4-5)"
```

---

### Task 7: WeightedChoiceWorldShot (Shot 6)

**Files:**
- Create: `remotion/src/scenes/WeightedChoiceWorldShot.tsx`
- Modify: `remotion/src/types.ts`, `remotion/src/TikTokVideo.tsx`, `vidgen/pipeline/render_manifest_builder.py`

**Interfaces:**
- Produces: `WeightedChoiceWorldVisual = { headline: string; homeLabel: string; progressLabel: string; scaleTiltRatio: number }` (`scaleTiltRatio` 0-1, how far the scale tips toward the progress side — 0.5 = balanced, closer to 1 = fully tipped), manifest key `"weighted_choice_world"`, component `WeightedChoiceWorldShot`.

- [ ] **Step 1: Add types**

```typescript
export type WeightedChoiceWorldVisual = {
  headline: string;
  homeLabel: string; // "Tắt ứng dụng — về nhà"
  progressLabel: string; // "Nhận đơn — giữ tiến độ & quyền lợi"
  scaleTiltRatio: number; // 0-1, final tilt toward the progress side
};

export type WeightedChoiceWorldSceneProps = WeightedChoiceWorldVisual & { durationInFrames: number };
```
Union member:
```typescript
  | { type: "weighted_choice_world"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: WeightedChoiceWorldVisual }
```

- [ ] **Step 2: Write the component**

The world splits diagonally via `clipPath: polygon(...)` animated over time; left side warm-tinted (home), right side cool-tinted (progress/rain feel via subtle vertical lines). A scale (using `P2Icons.Scale` as the fulcrum icon, custom beam+pans in SVG) tips based on `scaleTiltRatio`, driven by `interpolate` + a light spring wobble before settling — no chains/prison imagery.

```typescript
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { WeightedChoiceWorldSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { BE_VIETNAM_PRO } from "../styles";
import { p2Colors, P2Icons } from "./grabfoodP2Palette";

const BEAM_HALF_WIDTH = 220;
const MAX_TILT_DEG = 14;

export const WeightedChoiceWorldShot: React.FC<WeightedChoiceWorldSceneProps> = ({
  headline,
  homeLabel,
  progressLabel,
  scaleTiltRatio,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const splitProgress = interpolate(frame, [0, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tiltSpring = spring({ frame: frame - 50, fps, config: { damping: 10, stiffness: 60 }, durationInFrames: 60 });
  const tiltDeg = interpolate(tiltSpring, [0, 1], [0, MAX_TILT_DEG * (scaleTiltRatio * 2 - 1)]);
  const headlineOpacity = interpolate(frame, [durationInFrames - 130, durationInFrames - 100], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const leftPanX = -Math.sin((tiltDeg * Math.PI) / 180) * BEAM_HALF_WIDTH;
  const leftPanY = Math.cos((tiltDeg * Math.PI) / 180) * BEAM_HALF_WIDTH - BEAM_HALF_WIDTH + Math.sin((tiltDeg * Math.PI) / 180) * -BEAM_HALF_WIDTH * 0;
  const rightPanX = Math.sin((tiltDeg * Math.PI) / 180) * BEAM_HALF_WIDTH;

  return (
    <AbsoluteFill style={{ backgroundColor: p2Colors.bg, opacity: exitOpacity, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      {/* Diagonal world split */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(135deg, rgba(249,115,22,0.16) 0%, transparent 55%)`,
          clipPath: `polygon(0 0, ${50 * splitProgress + 50}% 0, ${50 - 50 * splitProgress}% 100%, 0 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(315deg, rgba(0,177,79,0.14) 0%, transparent 55%)`,
          clipPath: `polygon(100% 0, ${50 * splitProgress + 50}% 0, ${50 - 50 * splitProgress}% 100%, 100% 100%)`,
        }}
      />

      <SafeZone style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
        {/* Scale */}
        <svg width="600" height="380" viewBox="0 0 600 380">
          <g transform={`rotate(${tiltDeg} 300 90)`}>
            <line x1="300" y1="90" x2="300" y2="40" stroke={p2Colors.textDim} strokeWidth="4" />
            <line x1="80" y1="90" x2="520" y2="90" stroke={p2Colors.textDim} strokeWidth="6" strokeLinecap="round" />
            <line x1="80" y1="90" x2="80" y2="170" stroke={p2Colors.textDim} strokeWidth="3" />
            <line x1="520" y1="90" x2="520" y2="170" stroke={p2Colors.textDim} strokeWidth="3" />
            <rect x="20" y="170" width="120" height="16" rx="8" fill={p2Colors.warmHome} opacity="0.85" />
            <rect x="460" y="170" width="120" height="16" rx="8" fill={p2Colors.grab} opacity="0.85" />
          </g>
          <polygon points="290,20 310,20 300,5" fill={p2Colors.textDim} />
          <line x1="300" y1="20" x2="300" y2="370" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
        </svg>

        <div style={{ display: "flex", justifyContent: "space-between", width: 640, marginTop: -20 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: 260 }}>
            <P2Icons.Home size={30} />
            <div style={{ fontSize: 18, fontWeight: 700, color: p2Colors.textPrimary, textAlign: "center" }}>{homeLabel}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: 260 }}>
            <P2Icons.Scale size={30} color={p2Colors.grab} />
            <div style={{ fontSize: 18, fontWeight: 700, color: p2Colors.textPrimary, textAlign: "center" }}>{progressLabel}</div>
          </div>
        </div>

        <div
          style={{
            marginTop: 56,
            fontSize: 30,
            fontWeight: 800,
            lineHeight: 1.3,
            textAlign: "center",
            color: p2Colors.textPrimary,
            opacity: headlineOpacity,
            maxWidth: 800,
          }}
        >
          {headline}
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};

export default WeightedChoiceWorldShot;
```

- [ ] **Step 3: Register in `TikTokVideo.tsx` and `render_manifest_builder.py`**

Import: `import { WeightedChoiceWorldShot } from "./scenes/WeightedChoiceWorldShot";`
Case:
```typescript
    case "weighted_choice_world":
      return <WeightedChoiceWorldShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
```
TYPE_MAP: `"WeightedChoiceWorldShot": "weighted_choice_world",`

- [ ] **Step 4: Typecheck**

Run: `npx --prefix remotion tsc --noEmit -p remotion/tsconfig.json`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add remotion/src/scenes/WeightedChoiceWorldShot.tsx remotion/src/types.ts remotion/src/TikTokVideo.tsx vidgen/pipeline/render_manifest_builder.py
git commit -m "feat: add WeightedChoiceWorldShot scene type (GrabFood P2 shot 6)"
```

---

### Task 8: FalseCompletionShot (Shot 7) + ThesisTeaserShot (Shot 8)

**Files:**
- Create: `remotion/src/scenes/FalseCompletionShot.tsx`
- Create: `remotion/src/scenes/ThesisTeaserShot.tsx`
- Modify: `remotion/src/types.ts`, `remotion/src/TikTokVideo.tsx`, `vidgen/pipeline/render_manifest_builder.py`

**Interfaces:**
- Produces: `FalseCompletionVisual = { completedLabel: string; driverStatusLabel: string }`, manifest key `"false_completion"`, component `FalseCompletionShot`.
- Produces: `ThesisTeaserVisual = { thesisLines: string[]; teaserEyebrow: string; teaserQuestion: string }`, manifest key `"thesis_teaser"`, component `ThesisTeaserShot`.

- [ ] **Step 1: Add types**

```typescript
export type FalseCompletionVisual = {
  completedLabel: string; // "ỨNG DỤNG: HOÀN THÀNH"
  driverStatusLabel: string; // "NGƯỜI TÀI XẾ: CHƯA VỀ ĐẾN NHÀ"
};

export type FalseCompletionSceneProps = FalseCompletionVisual & { durationInFrames: number };

export type ThesisTeaserVisual = {
  thesisLines: string[]; // each line shown as its own beat
  teaserEyebrow: string; // "PHẦN 3"
  teaserQuestion: string; // "AI THỰC SỰ TRẢ TIỀN CHO MÃ GIẢM GIÁ?"
};

export type ThesisTeaserSceneProps = ThesisTeaserVisual & { durationInFrames: number };
```
Union members:
```typescript
  | { type: "false_completion"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: FalseCompletionVisual }
  | { type: "thesis_teaser"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: ThesisTeaserVisual }
```

- [ ] **Step 2: Write FalseCompletionShot**

Frame plan: confetti pops in briefly (0-40, using `P2Icons.Confetti` scattered + fading), "completed" badge holds, then at ~50% duration everything cuts hard to a cold, mostly-empty frame revealing the still-long route home (a thin route line stretching toward the bottom, unfinished) alongside `driverStatusLabel`.

```typescript
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FalseCompletionSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { BE_VIETNAM_PRO } from "../styles";
import { p2Colors, P2Icons } from "./grabfoodP2Palette";

const CONFETTI_POSITIONS = [
  { x: 200, y: 300, delay: 0 }, { x: 800, y: 260, delay: 4 }, { x: 500, y: 200, delay: 8 },
  { x: 350, y: 420, delay: 2 }, { x: 700, y: 400, delay: 10 }, { x: 900, y: 340, delay: 6 },
];

export const FalseCompletionShot: React.FC<FalseCompletionSceneProps> = ({
  completedLabel,
  driverStatusLabel,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const cutFrame = Math.round(durationInFrames * 0.45);

  const celebrationOpacity = interpolate(frame, [cutFrame - 10, cutFrame], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const revealOpacity = interpolate(frame, [cutFrame, cutFrame + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const routeStretch = interpolate(frame, [cutFrame + 15, durationInFrames - 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: p2Colors.bg, opacity: exitOpacity, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      {/* Celebration phase */}
      <div style={{ position: "absolute", inset: 0, opacity: celebrationOpacity }}>
        {CONFETTI_POSITIONS.map((c, i) => {
          const fall = interpolate(frame, [c.delay, c.delay + 40], [0, 140], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const fadeIn = interpolate(frame, [c.delay, c.delay + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ position: "absolute", left: c.x, top: c.y + fall, opacity: fadeIn }}>
              <P2Icons.Confetti size={26} />
            </div>
          );
        })}
        <SafeZone style={{ justifyContent: "center", alignItems: "center" }}>
          <div
            style={{
              padding: "26px 40px",
              borderRadius: 22,
              background: p2Colors.grabDim,
              border: `2px solid ${p2Colors.grab}`,
              fontSize: 32,
              fontWeight: 900,
              color: p2Colors.textPrimary,
              textAlign: "center",
            }}
          >
            {completedLabel}
          </div>
        </SafeZone>
      </div>

      {/* Cold reveal phase */}
      <div style={{ position: "absolute", inset: 0, opacity: revealOpacity }}>
        <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
          <path
            d="M 540 600 Q 460 1000 620 1400 Q 700 1650 540 1850"
            stroke={p2Colors.warmHome}
            strokeWidth="5"
            fill="none"
            strokeDasharray="1000"
            strokeDashoffset={1000 * (1 - routeStretch)}
            opacity={0.75}
          />
        </svg>
        <SafeZone style={{ justifyContent: "flex-end", alignItems: "center" }}>
          <div
            style={{
              padding: "20px 32px",
              borderRadius: 18,
              background: "rgba(239,68,68,0.12)",
              border: `2px solid ${p2Colors.danger}`,
              fontSize: 26,
              fontWeight: 800,
              color: p2Colors.textPrimary,
              textAlign: "center",
            }}
          >
            {driverStatusLabel}
          </div>
        </SafeZone>
      </div>
    </AbsoluteFill>
  );
};

export default FalseCompletionShot;
```

- [ ] **Step 3: Write ThesisTeaserShot**

Frame plan: thesis lines fade in sequentially (one at a time, prior line dims), hold, then fully fade to black for 10 frames (hard-coded within the component's own timeline, not relying on inter-shot gaps since `Series` renders back-to-back with no overlap), then the teaser eyebrow + question fade in on the same black background.

```typescript
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ThesisTeaserSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { BE_VIETNAM_PRO } from "../styles";
import { p2Colors } from "./grabfoodP2Palette";

const BLACK_HOLD_FRAMES = 10;

export const ThesisTeaserShot: React.FC<ThesisTeaserSceneProps> = ({
  thesisLines,
  teaserEyebrow,
  teaserQuestion,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  const thesisEnd = Math.round(durationInFrames * 0.55);
  const blackStart = thesisEnd;
  const blackEnd = blackStart + BLACK_HOLD_FRAMES;
  const teaserStart = blackEnd;

  const thesisOpacity = interpolate(frame, [thesisEnd - 20, thesisEnd - 6], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const blackOverlay = interpolate(
    frame,
    [thesisEnd - 6, blackStart, blackEnd, teaserStart + 10],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const teaserOpacity = interpolate(frame, [teaserStart, teaserStart + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const perLineWindow = thesisEnd / thesisLines.length;

  return (
    <AbsoluteFill style={{ backgroundColor: p2Colors.bg, opacity: exitOpacity, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <SafeZone style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
        <div style={{ opacity: thesisOpacity, display: "flex", flexDirection: "column", gap: 18, alignItems: "center" }}>
          {thesisLines.map((line, i) => {
            const start = i * perLineWindow;
            const lineOpacity = interpolate(frame, [start, start + 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={i}
                style={{
                  fontSize: 34,
                  fontWeight: 800,
                  color: p2Colors.textPrimary,
                  textAlign: "center",
                  maxWidth: 820,
                  lineHeight: 1.3,
                  opacity: lineOpacity,
                }}
              >
                {line}
              </div>
            );
          })}
        </div>
      </SafeZone>

      <AbsoluteFill style={{ backgroundColor: "#000000", opacity: blackOverlay, pointerEvents: "none" }} />

      <SafeZone style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
        <div style={{ opacity: teaserOpacity, textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3, color: p2Colors.grab, marginBottom: 20 }}>
            {teaserEyebrow}
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: p2Colors.textPrimary, maxWidth: 780, lineHeight: 1.3 }}>
            {teaserQuestion}
          </div>
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};

export default ThesisTeaserShot;
```

- [ ] **Step 4: Register both in `TikTokVideo.tsx` and `render_manifest_builder.py`**

Imports:
```typescript
import { FalseCompletionShot } from "./scenes/FalseCompletionShot";
import { ThesisTeaserShot } from "./scenes/ThesisTeaserShot";
```
Cases:
```typescript
    case "false_completion":
      return <FalseCompletionShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "thesis_teaser":
      return <ThesisTeaserShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
```
TYPE_MAP entries:
```python
    "FalseCompletionShot": "false_completion",
    "ThesisTeaserShot": "thesis_teaser",
```

- [ ] **Step 5: Typecheck**

Run: `npx --prefix remotion tsc --noEmit -p remotion/tsconfig.json`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add remotion/src/scenes/FalseCompletionShot.tsx remotion/src/scenes/ThesisTeaserShot.tsx remotion/src/types.ts remotion/src/TikTokVideo.tsx vidgen/pipeline/render_manifest_builder.py
git commit -m "feat: add FalseCompletionShot and ThesisTeaserShot scene types (GrabFood P2 shots 7-8)"
```

---

### Task 9: Python test coverage for the 8 new scene types

**Files:**
- Modify: `tests/test_render_manifest_builder.py`

**Interfaces:**
- Consumes: `build_render_manifest` from `vidgen.pipeline.render_manifest_builder` (already imported at top of test file).

- [ ] **Step 1: Write the failing test**

Add after `test_new_cinematic_scene_types_translate_to_manifest_keys` (around line 168):

```python
def test_grabfood_p2_scene_types_translate_to_manifest_keys():
    new_types = [
        ("MapDotToHumanShot", "map_dot_to_human"),
        ("WorkToGameMorphShot", "work_to_game_morph"),
        ("TripleMetricOrbitShot", "triple_metric_orbit"),
        ("ProgressMemoryTrailShot", "progress_memory_trail"),
        ("DualClockRouteShot", "dual_clock_route"),
        ("WeightedChoiceWorldShot", "weighted_choice_world"),
        ("FalseCompletionShot", "false_completion"),
        ("ThesisTeaserShot", "thesis_teaser"),
    ]
    script = {
        "shots": [
            {
                "id": f"shot_{i}",
                "type": pascal,
                "duration_frames": 100,
                "narration": "...",
                "props": {},
            }
            for i, (pascal, _snake) in enumerate(new_types)
        ]
    }
    audio_durations = {f"shot_{i}": 2.0 for i in range(len(new_types))}
    manifest = build_render_manifest(script, audio_durations)
    got_types = [s["type"] for s in manifest["shots"]]
    assert got_types == [snake for _pascal, snake in new_types]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_render_manifest_builder.py::test_grabfood_p2_scene_types_translate_to_manifest_keys -v`
Expected: FAIL with `ValueError: shot 'shot_0': unknown scene type 'MapDotToHumanShot'` (if Tasks 3-8's `TYPE_MAP` edits weren't done yet) or PASS (if they were — Tasks 3-8 precede this task in execution order, so this should already PASS; this step confirms the registrations from earlier tasks are actually wired correctly).

- [ ] **Step 3: If it fails, fix `TYPE_MAP` in `render_manifest_builder.py`**

Cross-check every entry against Tasks 3-8 — all 8 should already be present. If any are missing, add them now.

- [ ] **Step 4: Run test to verify it passes**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_render_manifest_builder.py::test_grabfood_p2_scene_types_translate_to_manifest_keys -v`
Expected: PASS

- [ ] **Step 5: Run the full existing test suite for regressions**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_render_manifest_builder.py -v`
Expected: all tests PASS (no regressions from the `TYPE_MAP` additions).

- [ ] **Step 6: Commit**

```bash
git add tests/test_render_manifest_builder.py
git commit -m "test: cover GrabFood P2's 8 new scene types in render_manifest_builder"
```

---

### Task 10: Author the script JSON

**Files:**
- Create (overwrite): `content/json/grabfood_driver_retention_matrix_p2.json`

**Interfaces:**
- Consumes: the trimmed TXT from Task 1 (narration must match verbatim), the 8 manifest type keys from Tasks 3-8 (used here as PascalCase `type` values, matching Part 1's convention of PascalCase in script JSON — see `content/json/grabfood_wait_time_p1.json`).
- Produces: valid JSON matching `references/schema.md`, ready for `video_pipeline.py`.

- [ ] **Step 1: Write the JSON**

Overwrite `content/json/grabfood_driver_retention_matrix_p2.json` with (duration_frames values are starting estimates — Task 12's pipeline run will tighten them to real audio):

```json
{
  "video_id": "grabfood_driver_retention_matrix_p2",
  "title": "GrabFood Phần 2 — Ma trận giữ chân tài xế",
  "fps": 30,
  "narration_language": "vi",
  "shots": [
    {
      "id": "shot_01",
      "type": "MapDotToHumanShot",
      "duration_frames": 320,
      "narration": "Ở phần trước, bạn thấy một chấm nhỏ chạy qua nhiều điểm dừng. Phía sau nó là một người thật — điện thoại sắp hết pin, anh chỉ muốn tắt ứng dụng để về. Nhưng màn hình sáng lên: chỉ còn một chuyến nữa.",
      "props": {
        "headline": "HAI LỰA CHỌN NÀY CÓ THỰC SỰ NGANG NHAU?",
        "illustrativeLabel": "Tình huống minh họa",
        "batteryPercent": 5,
        "targetCurrent": 9,
        "targetTotal": 10
      },
      "on_screen_text": "HAI LỰA CHỌN NÀY CÓ THỰC SỰ NGANG NHAU?"
    },
    {
      "id": "shot_02",
      "type": "WorkToGameMorphShot",
      "duration_frames": 310,
      "narration": "Đây vẫn là hệ thống quyền lợi và phần thưởng. Nhưng khi công việc chia thành điểm số, mục tiêu, thứ hạng, nó mang cấu trúc của một trò chơi. Chuyến xe trở thành tiến độ. Thứ hạng trở thành cấp độ.",
      "props": {
        "headline": "CÔNG VIỆC MANG CẤU TRÚC CỦA MỘT TRÒ CHƠI",
        "transformations": [
          { "from": "CHUYẾN XE", "to": "TIẾN ĐỘ" },
          { "from": "THỨ HẠNG", "to": "CẤP ĐỘ" }
        ]
      },
      "on_screen_text": "CHUYẾN XE → TIẾN ĐỘ / THỨ HẠNG → CẤP ĐỘ"
    },
    {
      "id": "shot_03",
      "type": "TripleMetricOrbitShot",
      "duration_frames": 290,
      "narration": "Số chuyến chỉ là lớp đầu. GrabBenefits còn gắn điều kiện thưởng với tỷ lệ nhận và tỷ lệ hủy chuyến trong tháng. Không chỉ chạy nhiều — còn phải nhận đủ, và không được hủy quá nhiều.",
      "props": {
        "headline": "BA CON SỐ. CÙNG ĐẾM MỘT THÁNG LÀM VIỆC.",
        "trips": { "current": 9, "target": 10 },
        "acceptanceRate": { "value": 92, "min": 90 },
        "cancellationRate": { "value": 7, "max": 8 },
        "footer": "GrabBenefits — chính sách áp dụng từ tháng 5/2026"
      },
      "on_screen_text": "BA CON SỐ. CÙNG ĐẾM MỘT THÁNG LÀM VIỆC."
    },
    {
      "id": "shot_04",
      "type": "ProgressMemoryTrailShot",
      "duration_frames": 360,
      "narration": "Ở chuyến đầu, dừng lại không khó. Nhưng khi thanh tiến trình gần đầy, dừng lại giống như bỏ lại toàn bộ những giờ đã chạy. Mục tiêu giữ tài xế không chỉ bằng phần thưởng phía trước — mà bằng công sức đã nằm lại phía sau.",
      "props": {
        "headline": "9/10 KHÔNG CHỈ LÀ TIẾN ĐỘ.",
        "totalCells": 10,
        "filledCells": 9
      },
      "on_screen_text": "9/10 KHÔNG CHỈ LÀ TIẾN ĐỘ."
    },
    {
      "id": "shot_05",
      "type": "DualClockRouteShot",
      "duration_frames": 380,
      "narration": "Đây là nơi phần một nối vào phần hai. Mỗi đơn trong chuyến ghép GrabFood được tính thành một chuyến riêng khi xét tiến độ. Khách hàng thấy nhiều điểm dừng. Tài xế thấy thanh tiến trình tăng thêm bước. Cùng một tuyến đường — hai chiếc đồng hồ khác nhau.",
      "props": {
        "headline": "KHÁCH HÀNG ĐẾM PHÚT. TÀI XẾ ĐẾM TIẾN ĐỘ.",
        "customerLabel": "Tài xế đang giao một đơn hàng khác",
        "driverLabel": "+1  +1  +1",
        "stopCount": 3
      },
      "on_screen_text": "KHÁCH HÀNG ĐẾM PHÚT. / TÀI XẾ ĐẾM TIẾN ĐỘ."
    },
    {
      "id": "shot_06",
      "type": "WeightedChoiceWorldShot",
      "duration_frames": 510,
      "narration": "Trò chơi không kết thúc sau tối nay — thành tích cộng dồn cả tháng, thứ hạng quyết định quyền lợi tháng sau. Không ai lấy mất quyền lựa chọn của tài xế. Nhưng một bên là về nhà, bên kia là tiến độ gần hoàn thành và quyền lợi đã quen dùng. Quyền lựa chọn vẫn còn — chỉ là hai lựa chọn không còn cùng trọng lượng.",
      "props": {
        "headline": "QUYỀN LỰA CHỌN VẪN CÒN. TRỌNG LƯỢNG THÌ KHÔNG.",
        "homeLabel": "Tắt ứng dụng — về nhà",
        "progressLabel": "Nhận đơn — giữ tiến độ & quyền lợi",
        "scaleTiltRatio": 0.78
      },
      "on_screen_text": "QUYỀN LỰA CHỌN VẪN CÒN. / TRỌNG LƯỢNG THÌ KHÔNG CÒN BẰNG NHAU."
    },
    {
      "id": "shot_07",
      "type": "FalseCompletionShot",
      "duration_frames": 180,
      "narration": "Mục tiêu hoàn thành, hiệu ứng ăn mừng hiện lên. Nhưng hiệu ứng vừa tắt, anh vẫn còn phải tự chạy về nhà.",
      "props": {
        "completedLabel": "ỨNG DỤNG: HOÀN THÀNH",
        "driverStatusLabel": "NGƯỜI TÀI XẾ: CHƯA VỀ ĐẾN NHÀ"
      },
      "on_screen_text": "ỨNG DỤNG: HOÀN THÀNH / NGƯỜI TÀI XẾ: CHƯA VỀ ĐẾN NHÀ"
    },
    {
      "id": "shot_08",
      "type": "ThesisTeaserShot",
      "duration_frames": 400,
      "narration": "Grab không biến tài xế thành người chơi. Nó biến công việc của họ thành một trò chơi, nơi phần thưởng luôn cách điểm dừng đúng một mục tiêu nữa. Nhưng vẫn còn một người khác trong đơn hàng này. Khi khách được giảm giá, ai đang thực sự trả phần còn lại?",
      "props": {
        "thesisLines": [
          "GRAB KHÔNG BIẾN TÀI XẾ THÀNH NGƯỜI CHƠI.",
          "NÓ BIẾN CÔNG VIỆC CỦA HỌ THÀNH MỘT TRÒ CHƠI.",
          "PHẦN THƯỞNG LUÔN CÁCH ĐIỂM DỪNG MỘT MỤC TIÊU NỮA."
        ],
        "teaserEyebrow": "PHẦN 3",
        "teaserQuestion": "AI THỰC SỰ TRẢ TIỀN CHO MÃ GIẢM GIÁ?"
      },
      "on_screen_text": "PHẦN 3 — AI THỰC SỰ TRẢ TIỀN CHO MÃ GIẢM GIÁ?"
    }
  ]
}
```

- [ ] **Step 2: Validate JSON syntax**

Run: `/Users/haunguyen/miniconda3/bin/python -c "import json; json.load(open('content/json/grabfood_driver_retention_matrix_p2.json')); print('JSON valid')"`
Expected: `JSON valid`

- [ ] **Step 3: Verify narration matches Task 1's TXT verbatim**

Run: `/Users/haunguyen/miniconda3/bin/python -m vidgen.quality.source_fidelity content/text/grabfood_driver_retention_matrix_p2.txt content/json/grabfood_driver_retention_matrix_p2.json`
Expected: PASS (or the tool's success output — if it reports a mismatch, fix the JSON's narration strings to match the TXT exactly, do not edit the TXT to match the JSON).

- [ ] **Step 4: Run the script quality gate**

Run: `/Users/haunguyen/miniconda3/bin/python -m vidgen.quality.script_quality_gate content/json/grabfood_driver_retention_matrix_p2.json`
Expected: passes or reports scores — report any failures to the user rather than silently reworking narration further (narration is locked per Global Constraints).

- [ ] **Step 5: Commit**

```bash
git add content/json/grabfood_driver_retention_matrix_p2.json
git commit -m "content: author GrabFood P2 script JSON (8 shots, matches trimmed TXT)"
```

---

### Task 11: TTS synthesis, manifest build, and chunked render

**Files:**
- No new files — invokes existing pipeline entrypoint `vidgen/pipeline/video_pipeline.py`.

**Interfaces:**
- Consumes: `content/json/grabfood_driver_retention_matrix_p2.json` from Task 10.
- Produces: `output/render_manifest.json`, per-shot WAVs in `public/audio/` (and copies in `remotion/public/audio/`), final MP4 at `remotion/out/grabfood_driver_retention_matrix_p2.mp4`.

- [ ] **Step 1: Confirm base Python has required deps**

Run: `/Users/haunguyen/miniconda3/bin/python -c "import librosa, soundfile; print('ok')"`
Expected: `ok`. If `ModuleNotFoundError`, stop and report — do not silently `pip install` without checking whether this is the correct environment (per memory: always use base Python, not `video_generator_tool` env).

- [ ] **Step 2: Run the full pipeline (fresh TTS, no reuse)**

Run:
```bash
/Users/haunguyen/miniconda3/bin/python -m vidgen.pipeline.video_pipeline content/json/grabfood_driver_retention_matrix_p2.json --speed 1.2
```
Expected: logs show TTS synthesis for all 8 shots (`[tts] shot_01 ...s` etc., all NEW syntheses — no "reuse" messages since `--reuse-tts` is not passed), manifest written to `output/render_manifest.json`, then `render_video_chunked` producing `remotion/out/grabfood_driver_retention_matrix_p2.mp4`. This step can take several minutes. If any step errors (TTS failure, unknown scene type, render crash), STOP immediately — do not retry with `--skip-validation` or other bypass flags — report the exact error and what completed before the failure, then wait for guidance before proceeding, per Global Constraints and CLAUDE.md's error-handling rule.

- [ ] **Step 3: Confirm `output/render_manifest.json` reflects real (non-fake) audio durations**

Run: `/Users/haunguyen/miniconda3/bin/python -c "
import json
m = json.load(open('output/render_manifest.json'))
print('shots:', len(m['shots']))
print('fps:', m['fps'], 'size:', m['width'], 'x', m['height'])
total = sum(s['durationInFrames'] for s in m['shots'])
print('total frames:', total, '=', round(total/m['fps'],1), 's')
for s in m['shots']:
    print(s['id'], s['type'], s['durationInFrames'], s['audioPath'])
"`
Expected: 8 shots, `fps: 30`, `1080 x 1920`, every `audioPath` non-empty and pointing at a real synthesized file (per the memory rule: never treat this file as trustworthy if it was written from partial/fake durations — this check exists specifically to catch that).

- [ ] **Step 4: No commit** — `output/render_manifest.json`, `public/audio/*.wav`, and `remotion/out/*.mp4` are pipeline-generated artifacts; check `.gitignore` before staging anything from this step (do not force-add generated media into git history unless the repo's existing convention already tracks `remotion/out/*.mp4` — check with `git check-ignore` first).

Run: `git check-ignore -v output/render_manifest.json remotion/out/grabfood_driver_retention_matrix_p2.mp4 public/audio/scene_shot_01.wav 2>&1 || true`
Report the result; do not `git add` any path that comes back gitignored.

---

### Task 12: Visual QA pass — frame extraction and inspection

**Files:**
- No source files modified in the success path; this task may loop back to Tasks 3-8 to fix a specific component if a defect is found.

**Interfaces:**
- Consumes: `remotion/out/grabfood_driver_retention_matrix_p2.mp4` from Task 11.

- [ ] **Step 1: Extract representative frames per shot**

Run (adjust frame numbers to the actual `durationInFrames` cumulative offsets read from `output/render_manifest.json` in Task 11 Step 3 — compute start/mid/end frame per shot):
```bash
mkdir -p /private/tmp/claude-501/-Users-haunguyen-GitHub-VidGen/d3cd5008-b685-4864-befb-40f7b82b4f73/scratchpad/frames
/Users/haunguyen/miniconda3/bin/python3 - <<'EOF'
import json, subprocess
m = json.load(open("output/render_manifest.json"))
offset = 0
frames_to_grab = []
for s in m["shots"]:
    d = s["durationInFrames"]
    frames_to_grab += [offset + 2, offset + d // 2, offset + d - 3]
    offset += d
select = "+".join(f"eq(n\\,{f})" for f in frames_to_grab)
subprocess.run([
    "ffmpeg", "-i", "remotion/out/grabfood_driver_retention_matrix_p2.mp4",
    "-vf", f"select='{select}'", "-vsync", "0",
    "/private/tmp/claude-501/-Users-haunguyen-GitHub-VidGen/d3cd5008-b685-4864-befb-40f7b82b4f73/scratchpad/frames/f_%03d.png"
], check=True)
print("grabbed", len(frames_to_grab), "frames")
EOF
```
Expected: 24 PNG files (3 per shot × 8 shots) written to the scratchpad frames directory.

- [ ] **Step 2: Visually inspect every extracted frame**

Read each PNG with the Read tool. Check per Global Constraints and the project's Visual Text Rules: no text overflow/clipping outside its card, all text centered and padded, no blank/black frames outside the intentional Shot 8 black hold, no NaN transforms (component rendering as blank/broken layout), Shot 1's "9/10" carries the "Tình huống minh họa" label visibly, Shot 3's cancellation ring reads as danger-oriented (red tick visible, color shifts toward red), Shot 6's scale is visibly tilted, Shot 8 shows a real black gap between thesis and teaser.

- [ ] **Step 3: If any defect is found, fix the specific component**

Return to the relevant Task (3-8), edit the flagged component only, re-run `npx --prefix remotion tsc --noEmit -p remotion/tsconfig.json`, then re-run Task 11 Step 2 (full pipeline — a visual prop or duration change requires a fresh render; a pure animation-only fix that doesn't touch narration timing can instead use `npx remotion render grabfood_driver_retention_matrix_p2 remotion/out/grabfood_driver_retention_matrix_p2.mp4` directly against the existing `output/render_manifest.json` from inside `remotion/`, skipping TTS — confirm which is needed based on what changed). Re-extract and re-inspect frames for the fixed shot only. Cap at 2 fix cycles; if still failing, report the specific issue and the frame(s) showing it and stop.

- [ ] **Step 4: Commit any component fixes made in this task**

```bash
git add remotion/src/scenes/<FixedShot>.tsx
git commit -m "fix: <specific visual defect> in <ShotName> (GrabFood P2 QA pass)"
```
(Only run if Step 3 required a fix; skip if QA passed clean.)

---

### Task 13: Final verification and report

**Files:**
- None modified.

**Interfaces:**
- Consumes: `remotion/out/grabfood_driver_retention_matrix_p2.mp4`.

- [ ] **Step 1: ffprobe the final output**

Run:
```bash
ffprobe -v error -show_entries format=duration:stream=codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels -of default=noprint_wrappers=1 remotion/out/grabfood_driver_retention_matrix_p2.mp4
```
Expected output includes: a video stream `codec_type=video`, `width=1080`, `height=1920`, `r_frame_rate=30/1`; an audio stream `codec_type=audio`; `duration=` some value near 90s (per Global Constraints, actual value is whatever real audio produced — report it, don't force it).

- [ ] **Step 2: Run `git diff --check` for whitespace/conflict-marker issues across everything touched**

Run: `git diff --check`
Expected: no output (clean).

- [ ] **Step 3: Run the full TS and Python test suites one more time**

Run:
```bash
npx --prefix remotion tsc --noEmit -p remotion/tsconfig.json
/Users/haunguyen/miniconda3/bin/python -m pytest tests/test_render_manifest_builder.py -v
```
Expected: both clean/passing.

- [ ] **Step 4: Compose the final report to the user**

Report: composition ID, output path (`remotion/out/grabfood_driver_retention_matrix_p2.mp4`), real duration from ffprobe, resolution/fps/codec confirmation, the 8 new component files + 3 registry files touched, the TXT rewrite, the JSON authored, TTS command used, render command used, and any remaining known limitation (e.g. if Task 12 hit its 2-fix-cycle cap on some shot). This report is the deliverable — no further action after this without new user instruction.

---

## Self-Review Notes

- **Spec coverage:** All 8 locked-narration shots (Task 1's list) map 1:1 to Tasks 3-8's components and Task 10's JSON entries. Dark palette constraint → Task 2. No-emoji rule → Task 2 (icons) + Task 4 Step 1 (GameHUDScene fix). 3-registry sync rule → every scene task's Steps for `types.ts`/`TikTokVideo.tsx`/`render_manifest_builder.py`. Visual QA against project's Visual Text Rules → Task 12. ffprobe verification → Task 13. TXT-is-source-of-truth / narration-verbatim rule → Task 1 + Task 10 Step 3 (`source_fidelity` check).
- **Placeholder scan:** No TBD/TODO; every step has literal code or literal commands with expected output.
- **Type consistency:** All 8 new `*Visual`/`*SceneProps` names are used identically across their defining task (types.ts) and consuming task (component file) and registration task (TikTokVideo.tsx case uses `shot.visual` spread, matching the manifest key). Manifest snake_case keys (`map_dot_to_human`, etc.) are consistent between `types.ts` union tags, `TikTokVideo.tsx` switch cases, and `TYPE_MAP` values across all of Tasks 3-8.
- **Scope check:** Single cohesive deliverable (one video), no sub-project decomposition needed. Task order respects dependency: palette (2) before any shot component (3-8); all components before the Python test (9) and JSON authoring (10); JSON before pipeline run (11); render before QA (12); QA before final report (13).
