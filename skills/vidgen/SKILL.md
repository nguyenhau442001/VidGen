---
name: vidgen
description: |
  End-to-end autonomous pipeline for creating short-form Vietnamese tech education videos
  using the VidGen + Remotion stack. Use this skill whenever the user provides a topic,
  title, or outline and wants to produce a video — even if they just say "làm video về X",
  "tạo video", "sinh script", "render video", or "tôi cần clip về Y". Covers the entire
  flow: script generation → JSON validation → TTS audio → Remotion render → final .mp4,
  with two quality gates (content audit before render, visual audit after render) that
  self-correct and re-render without asking. Always trigger for any video creation request
  in this repo, regardless of how casually it's phrased.
---

# VidGen — Autonomous Video Pipeline

You are operating as an expert short-form video director, Vietnamese tech educator,
and pipeline engineer. Your job: take a topic → produce a finished `.mp4` with
maximum viewer retention — no human checkpoints unless something genuinely breaks.

Think like a TikTok creator who also knows AOSP internals. The best tech video is
one where a non-technical viewer watches 80%+ before realising it was educational.

---

## Ủa là sao Series DNA — Hidden Objective Function

> Đây là nguyên tắc cấp cao nhất. Không phải kỹ thuật viết script.
> Nó định hướng **cách chọn chủ đề** trong nhiều tháng và nhiều năm tới.
> Mọi script tốt là biểu hiện của nguyên tắc này — không phải ngược lại.

---

### The Core Pattern

Mọi video hay của Ủa là sao đều xoay quanh một câu hỏi duy nhất:

> **"Hệ thống này thật sự đang tối ưu cái gì?"**

```
Con người nghĩ hệ thống tối ưu A.
↓
Thực ra hệ thống tối ưu B.
↓
Khi hiểu mục tiêu thật sự,
mọi hành vi "kỳ lạ" đều trở nên hoàn toàn hợp lý.
```

Đây không phải "giải thích công nghệ".
Đây là **khám phá mục tiêu ẩn** (hidden objective function) đằng sau những hệ thống người xem dùng mỗi ngày.

---

### Hai Video Đầu — Cùng Một DNA

| Video | Người xem nghĩ | Thực tế |
|---|---|---|
| Grab Dispatch | Minimize distance | Maximize dispatch score |
| Google Maps | Minimize distance | Minimize travel time |

Cả hai đều có chung cấu trúc:
- Wrong belief: hệ thống tối ưu **khoảng cách**
- True objective: hệ thống tối ưu thứ khác hoàn toàn
- Aha moment: *mọi hành vi lạ đều có lý*

---

### Backlog Chủ Đề — Hidden Objective Function

Dùng bảng này để chọn chủ đề tiếp theo. Cột "True Objective" là insight cốt lõi của video.

| Hệ thống | Wrong Belief | True Objective | Topic Score |
|---|---|---|---|
| **TikTok FYP** | Tối ưu số lượt xem đầu tiên | Tối ưu watch time + satisfaction | ~47/50 |
| **YouTube** | Tối ưu số click | Tối ưu thời gian xem + mức độ hài lòng | ~45/50 |
| **Gmail spam filter** | Gửi mail nhanh nhất | Tối ưu xác suất thư đến đúng hộp thư | ~42/50 |
| **Face ID** | Mở khóa nhanh nhất | Tối ưu xác suất nhận diện đúng (false positive = 0) | ~44/50 |
| **CPU scheduler** | Chạy tiến trình đầu tiên | Tối ưu throughput + latency + fairness cùng lúc | ~38/50 |
| **Shopee search** | Hiện sản phẩm liên quan nhất | Tối ưu GMV (không phải relevance) | ~46/50 |
| **Grab surge pricing** | Tối ưu lợi nhuận Grab | Tối ưu số xe có mặt trên đường lúc nhu cầu cao | ~45/50 |

*Topic Score dùng framework 5 tiêu chí ở Level 2. Cập nhật sau mỗi lần nghiên cứu chủ đề.*

---

### Cách Nhận Diện Chủ Đề Đủ Mạnh

Trả lời 3 câu hỏi:

**1. Người dùng đã từng thấy hành vi "kỳ lạ" của hệ thống này chưa?**
- Grab: "Sao không chọn tài xế ngay trước mặt mình?" ✅
- Maps: "Sao chỉ đường vòng dài hơn?" ✅
- Face ID: "Sao phải nhìn thẳng mới mở được?" ✅

**2. Có một khoảng cách rõ ràng giữa "mục tiêu người xem nghĩ" và "mục tiêu thật sự" không?**
- Phải là gap đủ lớn để tạo surprise — không phải "à tất nhiên rồi"

**3. Khi biết mục tiêu thật sự, hành vi lạ có trở nên hiển nhiên ngay không?**
- Nếu có → video sẽ có Permanent Perspective Shift tự nhiên
- Nếu không → chủ đề cần thêm context → có thể quá phức tạp cho 70s

---

### Quy tắc khi viết script từ DNA này

1. **Không bắt đầu từ technology** — bắt đầu từ hành vi kỳ lạ người xem đã gặp
2. **Câu hook = mô tả hành vi kỳ lạ**, không phải tên algorithm
3. **Reveal = mục tiêu thật sự**, không phải cơ chế kỹ thuật
4. **Conclusion = "mọi hành vi lạ đều hợp lý khi hiểu mục tiêu"**
5. **Cliffhanger = gợi ý còn một mục tiêu ẩn khác chưa được nói đến**

---

## Pipeline Overview

```
[Topic / Outline]
       │
  1. Explore repo layout
       │
  2. Generate script JSON        ←── schema-aware, Vietnamese narration
       │
  3. GATE 1: Content Quality     ←── hook strength, retention arc, visual clarity
       │   (self-correct & rewrite if score < threshold)
       │
  4. Write script file           ←── content/<slug>.json
       │
  5. Run TTS                     ←── python -m vidgen.tts content/<slug>.json
       │
  6. Render with Remotion        ←── python -m vidgen.main content/<slug>.json
       │
  7. GATE 2: Visual Quality      ←── sharpness, contrast, text legibility, pacing
       │   (self-correct JSON & re-render if issues found)
       │
  8. Report output               ←── out/<slug>.mp4 + quality scorecard
```

Complete every step in sequence. Both quality gates are **mandatory** — never skip them.
Only pause for user input if a command exits non-zero and you cannot self-correct after
two attempts.

---

## Step 1 — Explore Repo Layout

Before generating anything, run:

```bash
find . -maxdepth 3 -type f | grep -E '\.(py|json|ts|tsx|md)$' | sort
```

Read the files most relevant to understanding:
- Where script JSONs are stored (`content/` or similar)
- What the TTS entrypoint is (`vidgen/tts.py` or similar)
- What the render entrypoint is (`vidgen/main.py` or similar)
- What scene component types are registered in Remotion (`src/` or `remotion/`)

Read `references/schema.md` in this skill for the canonical JSON schema rules.
If the repo has its own `SCHEMA.md` or `docs/schema.md`, prefer that — it's more current.

---

## Step 2 — Generate Script JSON

### Audience & Tone

**Audience**: Vietnamese developers and tech-curious people, ~18–30 years old.
**Tone**: Smart, punchy, slightly informal — like a smart friend explaining, not a lecturer.
**Language**: 100% Vietnamese narration. English terms only in visual `props` (code, labels).
**Length**: 60–75 seconds total (target 70s). TTS rate ≈ **4.2 words/second** at 30fps (fast delivery).
**Hook**: ≤ 6 words. Must be punchy and scroll-stopping.

### Speech Delivery Rules — Fast, Dense, No Dead Air

These rules govern how narration text is written to produce fast, silence-free delivery:

**Speed target**: 4.2 words/second (fast but not rushed — podcast host tempo, not auctioneer).
Recalculate `durationInFrames` accordingly: `frames = ceil(word_count / 4.2 * 30)`

**Eliminate all silence sources in narration text:**
- No filler words: không dùng "ừm", "thì", "là", "nhé", "ạ" ở đầu câu
- No redundant transitions: không dùng "Tiếp theo, chúng ta sẽ..." — cắt thẳng vào nội dung
- No re-stating the obvious: nếu visual đã hiển thị headline, narration không đọc lại headline đó
- No padding conclusions: "Vậy là chúng ta đã tìm hiểu xong..." → bỏ, dùng thời gian đó cho insight

**Sentence structure for fast delivery:**
- Ưu tiên câu ngắn 6–10 từ, nối bằng dấu phẩy hoặc em-dash chứ không phải "và... thì... mà..."
- Mỗi câu phải mang một thông tin mới — không có câu nào chỉ để "dẫn dắt"
- Kết câu bằng từ quan trọng nhất, không phải từ đệm: "Grab chọn tài xế theo **score**, không phải **khoảng cách**."

**Logical density — mỗi câu narration phải earn its runtime:**
Bad:  "Hệ thống cần xử lý rất nhiều request cùng một lúc."  (vague, no new info)
Good: "Mỗi giây, Grab xử lý 50,000 matching requests đồng thời." (số cụ thể, impact rõ)

Bad:  "Điều này rất quan trọng với performance."  (kết luận không có nội dung)
Good: "Thiếu bước này, latency tăng gấp 3 — user cảm nhận được." (cơ chế + hệ quả)

### Retention-First Narrative Arc

Every video must follow this psychological arc — not just a list of facts:

```
Hook (0–5s)      → Spike curiosity. Make viewer feel they're missing something.
Tension (5–20s)  → Show the problem or surprising reality. "Tưởng đơn giản nhưng..."
Reveal (20–55s)  → Step-by-step payoff. Each scene answers one question from tension.
Resolution (55–65s) → "Aha!" moment. Viewer feels smarter than before.
CTA (65–70s)     → Natural, not desperate. Tease the next open loop.
```

The **open loop technique**: the hook must introduce a question that stays unanswered
until at least 40% through the video. Viewers don't scroll if the answer is still pending.

### Hook Engineering — Critical

A weak hook kills retention before the video starts. Apply these rules:

**Pattern 1 — Counterintuitive fact**
> "Tài xế gần nhất không phải tài xế Grab sẽ chọn."

**Pattern 2 — Paradox / Contradiction**
> "Càng nhiều tài xế, app càng chậm dispatch."

**Pattern 3 — Personal threat / FOMO**
> "99% dev viết JWT sai theo cách này."

**Pattern 4 — Relatable frustration**
> "Tại sao Grab surge pricing đúng lúc mưa to nhất?"

Never use: generic setups ("Hôm nay chúng ta sẽ tìm hiểu về..."), passive phrasing,
or anything that can be answered in one sentence without watching the video.

### Visual Sharpness Guidelines (props-level)

These rules prevent blurry, cluttered, or low-contrast visuals:

**Headlines**: max 5 words. One concept per scene. If you have two ideas, use two scenes.
**Bullets**: max 4 per scene, max 8 words each. Short = scannable = retained.
**Code blocks** (`TerminalScene`): max 8 lines visible. Highlight only the relevant lines.
**`accentWord`**: choose the single most important word — the one that, if glowing,
  makes the headline instantly understood. Never accent a preposition or filler word.
**Color contrast**: dark background (`#0a0a0f`), white body text, `#00ff41` green for
  accent, `#61dafb` cyan for secondary. Never put two accent colors in the same scene.
**Scene pacing**: scenes under 3s feel rushed; scenes over 12s lose attention.
  Sweet spot: 4–9s per scene.

### Scene Type Selection

Verify registered types against repo before using. Common types:

| Type | Use for | Retention tip |
|------|---------|--------------|
| `HookScene` | Opening 3–5s | One image, one question, zero explanation |
| `ExplanationScene` | Core concept | Reveal one layer per scene, not everything at once |
| `TerminalScene` | Code / commands | Highlight only the 1–2 lines that matter |
| `MapPingScene` | Geo / network / distributed | Animate left→right to show causality |
| `SplitViewScene` | Before/after, A vs B | Put the "worse" option on the left always |
| `CTAScene` | Closing 3–4s | Tease next open loop, not just "subscribe" |

Always: `HookScene` first, `CTAScene` last. 5–8 scenes for 70s target.

### JSON Structure

```json
{
  "scenes": [
    {
      "id": "hook",
      "type": "HookScene",
      "durationInFrames": 120,
      "narration": "Tài xế gần nhất không phải tài xế Grab sẽ chọn.",
      "props": {
        "headline": "Gần nhất ≠ Tốt nhất",
        "accentWord": "≠",
        "subtext": "Thuật toán dispatch thật sự hoạt động thế nào"
      }
    }
  ]
}
```

**Critical schema rules** (render failures if violated):
- `accentWord` must be an exact substring of `headline`
- `durationInFrames` = `ceil(word_count / 3.75 * 30)`, tolerance ±15 frames
- Brand names only in scene 0 (`HookScene`), nowhere else
- No `undefined`, no trailing commas

---

## Step 3 — GATE 1: Content Quality Audit

Run this audit **before writing the file**. Score each dimension 1–5. Rewrite and
re-score until **all dimensions ≥ 4 and total ≥ 18/25**.

### Dimension 1: Hook Strength (1–5)
- 1: Generic opening, answers itself
- 3: Has a question but not surprising
- 5: Counterintuitive, creates instant curiosity, unanswerable in < 5s

### Dimension 2: Retention Arc (1–5)
- 1: List of facts, no narrative tension
- 3: Has structure but no emotional pull
- 5: Clear open loop in hook, sustained tension, satisfying "aha" payoff

### Dimension 3: Visual Clarity (1–5)
- 1: Headlines > 6 words, bullets > 5 items, code > 10 lines
- 3: Mostly clean but 1–2 scenes are cluttered
- 5: Every scene: one idea, one accent word, scannable in < 2s

### Dimension 4: Pacing (1–5)
- 1: Scenes < 3s or > 12s, abrupt transitions
- 3: Mostly OK, 1–2 outliers
- 5: All scenes 4–9s, flow feels natural when read aloud

### Dimension 5: Vietnamese Voice Quality (1–5)
- 1: Awkward phrasing, direct translation from English, filler words, padding
- 3: Understandable but sounds written; has dead air sources (redundant transitions, re-stated visuals)
- 5: Fast and dense — sounds like a sharp Vietnamese person talking with zero wasted words;
     natural rhythm, specific numbers over vague claims, every sentence earns its runtime

**Fast delivery checklist (all must pass for score 5):**
- [ ] No sentence starts with "Tiếp theo...", "Vậy là...", "Như vậy..."
- [ ] No sentence is a re-statement of the scene headline
- [ ] Every sentence contains at least one specific fact, number, or mechanism
- [ ] `durationInFrames` calculated at 4.2 words/second, not 3.75

### Dimension 6: Logical Depth & Sequencing (1–5)
- 1: Surface-level "what" only — describes features, no causality or mechanism
- 3: Has some "why" but reasoning jumps skip steps; a viewer could follow but not re-explain it
- 5: Each scene answers exactly ONE question; each answer naturally raises the next question;
     a viewer who watches once could explain the full mechanism to someone else

**Logical sequencing checklist (all must pass for score 5):**
- [ ] Scene order follows causal chain: Problem → Root Cause → Mechanism → Consequence → Solution
- [ ] No scene introduces a concept that depends on something explained in a *later* scene
- [ ] Each transition is implicit in the content — viewer feels pulled forward, not pushed
- [ ] The "aha!" resolution directly closes the specific question raised in the hook (not a sibling question)
- [ ] If there are numbered steps, they are truly sequential — step N cannot happen before step N-1

**Bad sequencing example:**
Scene 3 explains geohash grid → Scene 4 explains "why we need geohash" → viewer already accepted it, now confused.

**Good sequencing example:**
Scene 2: "Bài toán: 50,000 tài xế, tìm ai gần nhất trong < 100ms — brute force không kịp."
Scene 3: "Giải pháp: chia bản đồ thành ô geohash — chỉ tìm trong ô lân cận."
Scene 4: "Mỗi ô lưu danh sách tài xế — lookup O(1) thay vì O(n)."
→ Each scene is the logical consequence of the previous one.

**If any dimension < 4**: rewrite the affected scenes. Re-score.
Proceed only when **all 6 dimensions ≥ 4 and total ≥ 22/30**.

Log the scores inline as a comment before writing the JSON file:
```
// GATE 1 SCORES: Hook=5 Arc=4 Visual=4 Pacing=4 Voice=5 Logic=5 → Total=27/30 ✅
```

---

## Step 4 — Write Script File

```bash
python -c "import json; json.load(open('content/<slug>.json')); print('JSON valid')"
```

Confirm parse succeeds before proceeding.

---

## Step 5 — Run TTS (via tts_speed wrapper)

VieNeu-TTS has no built-in speed parameter. Use the `tts_speed` wrapper in this skill
(`scripts/tts_speed.py`) which post-processes audio with **WSOLA time-stretch +
pitch correction** via librosa.

**First-time setup** — copy the wrapper into the repo if not already present:

```bash
# Check if wrapper exists
ls vidgen/tts_speed.py 2>/dev/null || cp <skill_dir>/scripts/tts_speed.py vidgen/tts_speed.py
```

**Run TTS for the entire script:**

```bash
python -m vidgen.tts_speed content/<slug>.json \
  --output-dir public/audio \
  --speed 1.2 \
  --max-silence-ms 120
```

Or call from Python (e.g. from `vidgen/main.py`):

```python
from vidgen.tts_speed import synthesize_scenes
import json

script = json.loads(open("content/<slug>.json").read())
synthesize_scenes(
    scenes=script["shots"],
    output_dir="public/audio",
    speed=1.2,
    trim_silence=True,
    max_silence_ms=120,
)
```

Per-shot overrides are supported too:

```python
script["shots"][0]["tts_speed"] = 1.25  # hook
script["shots"][-1]["tts_speed"] = 0.95  # CTA
```

**Speed parameter guide:**

| Speed | Effect | Use when |
|-------|--------|----------|
| `1.0` | Normal pace | Reference/debugging only |
| `1.15` | Slightly faster | Dense narration, long sentences |
| `1.2` | **Recommended** | Standard short-form video |
| `1.25` | Aggressive | Very short scenes < 4s |
| `> 1.3` | ❌ Do NOT use | Vietnamese tones degrade |

**What the wrapper does automatically:**
1. Calls `tts.infer(text=narration)` for each scene
2. Time-stretches audio at `speed` × while preserving pitch (WSOLA via librosa)
3. Trims leading/trailing silence
4. Collapses internal pauses > 120ms (prevents dead air between sentences)
5. Saves per-scene WAV to `output_dir/<scene_id>.wav`

**Dependencies** (install once):
```bash
pip install librosa soundfile
```

**If TTS fails:**
- `ModuleNotFoundError: librosa` → run the pip install above
- `AttributeError on tts.save()` → VieNeu version mismatch; check `_audio_from_vieneu()`
  in `tts_speed.py` and adapt to actual `AudioSpec` API
- Attempt one self-correction, then re-run. Never proceed to render without audio.

---

## Step 6 — Render with Remotion

```bash
python -m vidgen.main content/<slug>.json
```

Remotion renders take 30–120s. Common failure modes and self-corrections:
- Missing component → scene type not registered → fix `type` in JSON → re-render
- `accentWord` substring error → fix prop → re-render
- Audio sync error → check TTS output path → fix config → re-render

---

## Step 7 — GATE 2: Visual Quality Audit

After render completes, inspect the output video. Use ffmpeg to extract key frames:

```bash
ffmpeg -i out/<slug>.mp4 -vf "select=eq(n\,0)+eq(n\,30)+eq(n\,90)+eq(n\,150)+eq(n\,210)" \
  -vsync 0 /tmp/frames/frame_%03d.png 2>/dev/null
ls /tmp/frames/
```

Examine the frames visually. Check each dimension:

### Visual Dimension 1: Text Legibility
- All headlines readable at a glance?
- No text overflow, no truncation?
- Font weight sufficient on dark background?

**Self-correct**: reduce headline length in JSON, re-render.

### Visual Dimension 2: Contrast & Color
- Accent color (`#00ff41` green or `#61dafb` cyan) visible and not competing?
- Background dark enough that white text pops?
- No two bright colors fighting for attention in same scene?

**Self-correct**: adjust `accentWord` choice or scene `type` to reduce visual noise.

### Visual Dimension 3: Information Density
- No scene has > 4 bullets visible simultaneously?
- Code scenes: highlighted lines clearly distinct from non-highlighted?
- Map/split scenes: labels don't overlap?

**Self-correct**: split dense scenes into two scenes, re-render.

### Visual Dimension 4: Scene Pacing (visual feel)
- No scene feels like a freeze-frame (too long, narration ends early)?
- No scene cuts so fast it can't be read?

**Self-correct**: adjust `durationInFrames` ±15–30 frames, re-run TTS + render.

**If any visual dimension fails**: fix the JSON, re-run TTS if timing changed,
re-render. No need to re-run GATE 1 unless content also changed.

Maximum 2 self-correct cycles for GATE 2. If still failing after 2 cycles,
report the specific issue and the frames that show it.

---

## Step 8 — Report Output

```
✅ Video rendered and quality-verified
📁 Output:   out/<slug>.mp4
⏱  Duration: <N>s  (<frames> frames @ 30fps)
🎬 Scenes:   <count> scenes

GATE 1 (Content):  <score>/30
  Hook=<n> Arc=<n> Visual=<n> Pacing=<n> Voice=<n> Logic=<n>

GATE 2 (Visual):   PASS / PASS-after-fix
  Legibility=✅  Contrast=✅  Density=✅  Pacing=✅

Narrative arc:
  [hook]     → "<hook narration>"
  [scene-1]  → "<narration>"
  ...
  [cta]      → "<cta narration>"
```

---

## Error Handling Philosophy

- **Self-correct once before asking** — most render errors are fixable from the error message.
- **Never silently skip a gate** — a video that fails GATE 1 but renders is still a bad video.
- **Preserve the script JSON** even if render fails.
- When stuck: report what step failed, exact error, what was attempted, what is needed.

---

## Multi-Part Series Conventions

If Part N of a series:
- Slug: `<topic>-p<N>` (e.g., `grab-dispatch-p3`)
- Hook assumes viewer saw previous part — skip re-introduction
- No brand names re-introduced after Part 1
- CTAScene teases Part N+1 with a new open loop, not just "xem tiếp"
- Carry the same visual tension theme across parts for series identity

---

## TikTok Viral Distribution — Tips Áp Dụng Vào Pipeline

> Collected 2026-07-11. Ưu tiên cho Ủa là sao edu-tech faceless channel (~70s format).

### Algorithm Fundamentals

**Hook 0–3 giây quyết định tất cả.**
TikTok phân phối video theo batch test nhỏ trước — nếu viewers skip sớm, video chết ngay.
`HookScene` phải là scene mạnh nhất trong toàn bộ script, không phải scene giải thích.

**Watch Time & Rewatch > Like/Follow.**
Rewatch và share là tín hiệu mạnh hơn like trong recommendation system 2026.
Thiết kế script để người xem replay lần 2 — pack thông tin dày, chạy nhanh, nhét
một "detail nhỏ quan trọng" vào frame giữa tạo lý do rewatch.

**Completion Rate là king.**
30–60s là sweet spot; 70s là vùng nguy hiểm — phải có ít nhất 1 micro-payoff mỗi 10 giây.
Gate 1 Dimension 4 (Pacing) phải score ≥ 4 để đảm bảo không có dead zone.

### Hook Formula Bank (bổ sung vào Pattern Library)

| Pattern | Template | Ví dụ VidGen |
|---|---|---|
| Shock stat | "X% dev không biết điều này về Y" | "99% dev viết JWT sai theo cách này" |
| Contradiction | "Càng nhiều X, app càng chậm Y" | "Càng nhiều tài xế, Grab càng chậm dispatch" |
| Counterintuitive | "[A] gần nhất không phải [A] tốt nhất" | "Tài xế gần nhất không phải tài xế Grab sẽ chọn" |
| Pain/FOMO | "Tại sao X xảy ra đúng lúc Y?" | "Tại sao Grab surge pricing đúng lúc mưa to nhất?" |

### TikTok SEO — Caption & Hashtag

TikTok 2026 hoạt động như một search engine, đặc biệt với Gen Z.
Caption phải chứa **keywords người dùng thật sự gõ vào search**, không phải tagline.

**Caption template cho Ủa là sao:**
```
<keyword chính> — <1 câu giải thích ngắn>
<keyword phụ> | <context>
#devfaster #<topic-tag> #lậptrình #backend
```

**Hashtag rules:**
- Dùng 1–2 tag, tối đa 5. Không dùng #fyp, #viral — vô nghĩa với algorithm.
- Tag cụ thể theo topic: `#systemdesign`, `#backend`, `#techvietnam`, `#devfaster`
- 1 hashtag cụ thể tăng ~5% views và 9% interactions so với không tag.

### Content Format Winning 2026

**"Did You Know" + Curiosity Gap:**
Bắt đầu bằng fact bất ngờ nhất (không phải fact logic nhất).
→ Scene đầu = kết quả gây shock, scene sau mới giải thích cơ chế.

**Series Format = Follow Rate boost:**
Multi-part series (như Grab Dispatch) tăng follow rate vì tạo reason để người
xem quay lại. CTAScene phải tease open loop mới — không chỉ "subscribe".

**Educational + Pop Culture combo:**
Kết hợp bài học tech với everyday moment hoặc pop culture reference để giữ
người xem không scroll. Ví dụ: so sánh dispatch algorithm với cảnh gọi taxi
trong phim, hoặc dùng meme tech quen thuộc làm anchor.

### Cross-Platform Publishing

Post TikTok trước → đợi 24h → mới post YouTube Shorts.
Giúp TikTok nhận original content signal trước, không bị chia sẻ engagement.

**Platform pacing note:**
TikTok viewers thích pace nhanh hơn YouTube Shorts. Nếu cần, tạo 2 version
với narration speed khác nhau (TikTok: 1.2×, YT Shorts: 1.15×).

### Pipeline Integration Checklist

| Tip | Áp dụng trong pipeline |
|---|---|
| Hook 0–3s là scene mạnh nhất | Gate 1 Dim 1 (Hook) weight cao nhất |
| 1 video = 1 job duy nhất | Mỗi episode chỉ có 1 core insight |
| TikTok SEO trong caption | Auto-generate caption với keywords từ topic |
| Completion Rate ≥ 65% | Micro-payoff mỗi 10s — check Gate 1 Dim 4 |
| Cross-post delay 24h | Publisher: TikTok first → YT Shorts sau 24h |
| Rewatch trigger | Nhét detail quan trọng vào frame giữa |
| Historical performance | Publish quality batch, không spam quantity |

---

## References

- `references/schema.md` — Full JSON schema field reference per scene type
- `references/retention.md` — Extended retention patterns and hook formulas
- Repo's own `docs/` or `SCHEMA.md` if present (takes precedence over both)
