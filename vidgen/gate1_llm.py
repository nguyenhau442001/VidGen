"""
vidgen/gate1_llm.py — Gate 1 LLM: Viral Score Evaluator

Rule-based gate1.py kiểm tra schema/syntax. Module này kiểm tra CONTENT:
hook có thật sự gây curiosity không, arc có đúng nhịp tâm lý không,
CTA có mở open loop không. Những thứ rule-based không thể phán xét được.

Chạy SAU gate1.py (schema pass), TRƯỚC TTS. Nếu score < threshold thì
yêu cầu LLM tự viết lại script và retry — không cần human intervention.

Architecture:
    main.py
        → gate1_assert()          # schema / syntax (rule-based, hiện có)
        → gate1_llm_assert()      # content / viral quality  ← module này
        → TTS → Render → gate2

Usage:
    from vidgen.gate1_llm import gate1_llm_assert, viral_score

    # Chỉ evaluate (không raise):
    result = viral_score(script)
    print(result["report"])

    # Assert + auto-rewrite loop (dùng trong main.py):
    rewritten_script = gate1_llm_assert(script, max_retries=2)

    # CLI:
    python -m vidgen.gate1_llm content/my-topic.json [--rewrite] [--retries 2]

Environment:
    Không cần ANTHROPIC_API_KEY trong environment nếu chạy trong claude.ai.
    Nếu chạy standalone: export ANTHROPIC_API_KEY=sk-ant-...
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 2048
API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"

# Score thresholds — tương tự gate1.py nhưng scale 1-10 mỗi dimension
MIN_DIMENSION_SCORE = 7     # mỗi dimension phải ≥ 7/10
MIN_TOTAL_SCORE = 30        # tổng 4 dims phải ≥ 30/40

# Dimensions được evaluate
DIMENSIONS = ["hook", "arc", "emotion", "cta"]

# ---------------------------------------------------------------------------
# Prompt engineering
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """Bạn là một chuyên gia TikTok content strategy và viral video editor,
có kinh nghiệm thực chiến sản xuất short-form video Vietnamese tech education.

Nhiệm vụ: đánh giá viral potential của một script video ~70 giây theo 4 dimensions.
Trả về JSON thuần túy, không markdown, không giải thích ngoài JSON.

Scoring rubric (1–10 mỗi dimension):

HOOK (0–3 giây đầu):
  10: Ngay câu đầu tạo câu hỏi chưa có câu trả lời, dùng contradiction/shock/FOMO rõ ràng
  7–9: Hook có tension nhưng có thể đoán được một phần
  4–6: Hook generic, dùng cấu trúc "Hôm nay chúng ta sẽ..." hoặc tương tự
  1–3: Không có hook thật sự, bắt đầu bằng giải thích ngay

ARC (nhịp tâm lý toàn bộ video):
  10: Rõ ràng Hook→Tension→Reveal→Aha→CTA, open loop duy trì đến ít nhất 40% video
  7–9: Arc có nhưng một số beat bị thiếu hoặc thứ tự chưa tối ưu
  4–6: Script là list of facts, không có tension được giữ qua nhiều scene
  1–3: Không có arc, chỉ là enumerate thông tin

EMOTION (density cảm xúc — không phải sentimentality):
  10: Mỗi scene pack ít nhất 1 concrete number/example/surprising fact, zero dead air
  7–9: Phần lớn scenes có emotional anchor nhưng vài scene vẫn vague
  4–6: Nhiều câu generic ("Điều này rất quan trọng", "Như vậy chúng ta thấy")
  1–3: Script thiếu specifics, cảm giác như reading a textbook

CTA (call to action chất lượng):
  10: CTA tease open loop mới ("Nhưng còn một thứ Grab không muốn bạn biết"), không cầu xin follow
  7–9: CTA rõ ràng nhưng hơi formulaic
  4–6: CTA generic ("Follow để xem thêm"), không có hook mới
  1–3: Không có CTA, hoặc CTA quá ngắn/yếu

Quan trọng:
- Đánh giá dựa trên hiệu quả TikTok thực tế với viewer Vietnamese tech-curious 18–30 tuổi
- Không khoan nhượng: score 7+ chỉ khi thật sự tốt
- issues[] phải cụ thể: trích dẫn scene id và narration có vấn đề
- rewrites[] chỉ đề xuất khi cần thiết, cụ thể và actionable"""

EVAL_PROMPT_TEMPLATE = """Đây là script VidGen cần đánh giá:

VIDEO TITLE: {title}
TOTAL SCENES: {scene_count}
ESTIMATED DURATION: ~{duration_s:.0f}s

SCRIPT (narration theo từng scene):
{script_summary}

Trả về JSON với format sau (không thêm gì ngoài JSON):
{{
  "scores": {{
    "hook": <1-10>,
    "arc": <1-10>,
    "emotion": <1-10>,
    "cta": <1-10>
  }},
  "total": <sum of 4 scores>,
  "issues": [
    "<scene_id>: <vấn đề cụ thể và tại sao nó làm giảm viral potential>"
  ],
  "strengths": [
    "<điều script làm tốt>"
  ],
  "rewrites": [
    {{
      "scene_id": "<id>",
      "field": "narration",
      "current": "<text hiện tại>",
      "suggested": "<text được đề xuất, cải thiện hook/arc/emotion>"
    }}
  ]
}}"""

REWRITE_PROMPT_TEMPLATE = """Script VidGen sau đây failed viral score (total {total}/40, min {min_total}/40).

Issues cần fix:
{issues}

Script JSON hiện tại:
{script_json}

Viết lại script JSON để fix tất cả issues trên. Giữ nguyên:
- Cấu trúc JSON (scene ids, types, props, duration_frames)
- Số lượng scene
- Ngôn ngữ Vietnamese
- Độ dài narration (~4.2 words/second với duration_frames của scene)

Chỉ thay đổi:
- narration text của các scene có vấn đề
- headline/subtext trong props nếu cần align với narration mới

Trả về JSON script hoàn chỉnh, không markdown, không giải thích."""

# ---------------------------------------------------------------------------
# API caller
# ---------------------------------------------------------------------------

def _call_api(messages: list[dict], system: str = SYSTEM_PROMPT) -> str:
    """Call Anthropic API. Returns text content string."""
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    headers = {
        "Content-Type": "application/json",
        "anthropic-version": ANTHROPIC_VERSION,
    }
    if api_key:
        headers["x-api-key"] = api_key

    payload = json.dumps({
        "model": MODEL,
        "max_tokens": MAX_TOKENS,
        "system": system,
        "messages": messages,
    }).encode("utf-8")

    req = urllib.request.Request(API_URL, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"API error {e.code}: {body}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"Network error: {e.reason}") from e

    # Extract text from content blocks
    content = data.get("content", [])
    return "".join(block.get("text", "") for block in content if block.get("type") == "text")


def _strip_markdown_fences(text: str) -> str:
    """Remove ```json fences while preserving plain JSON text."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = "\n".join(cleaned.split("\n")[1:])
    if cleaned.endswith("```"):
        cleaned = "\n".join(cleaned.split("\n")[:-1])
    return cleaned.strip()


def _coerce_score(value: object) -> int:
    """Convert model scores to a bounded int, defaulting to 0 on bad input."""
    try:
        return max(0, min(10, int(value)))
    except (TypeError, ValueError):
        return 0


def _normalize_scores(raw_scores: object) -> dict[str, int]:
    if not isinstance(raw_scores, dict):
        return {d: 0 for d in DIMENSIONS}
    return {dim: _coerce_score(raw_scores.get(dim, 0)) for dim in DIMENSIONS}


def _normalize_text_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if str(item).strip()]


def _normalize_rewrites(value: object) -> list[dict]:
    if not isinstance(value, list):
        return []
    normalized = []
    for item in value:
        if isinstance(item, dict):
            normalized.append(item)
    return normalized


# ---------------------------------------------------------------------------
# Script summarizer (cho prompt — không gửi toàn bộ JSON thô)
# ---------------------------------------------------------------------------

def _summarize_script(script: dict) -> tuple[str, str, int, float]:
    """
    Trả về (title, script_summary, scene_count, duration_s).
    summary là dạng dễ đọc cho LLM — không phải raw JSON.
    """
    scenes = script.get("scenes", [])
    title = (
        script.get("title")
        or script.get("meta", {}).get("title")
        or script.get("video_id", "untitled")
    )
    fps = script.get("fps", 30)
    total_frames = sum(s.get("duration_frames", 0) for s in scenes)
    duration_s = total_frames / fps

    lines = []
    for i, s in enumerate(scenes):
        sid = s.get("id", f"scene_{i}")
        stype = s.get("type", "?")
        frames = s.get("duration_frames", 0)
        secs = frames / fps
        narration = (s.get("narration") or "").strip()
        headline = s.get("props", {}).get("headline", "")
        beat_label = _infer_beat(i, len(scenes), narration)
        lines.append(
            f"[{beat_label}] {sid} ({stype}, {secs:.1f}s)\n"
            f"  narration: {narration or '(none)'}\n"
            + (f"  headline:  {headline}\n" if headline else "")
        )

    return title, "\n".join(lines), len(scenes), duration_s


def _infer_beat(index: int, total: int, narration: str) -> str:
    """Gán beat label heuristic để giúp LLM orient."""
    narration_lower = narration.lower()
    if index == 0:
        return "HOOK"
    if index == total - 1:
        return "CTA"
    # Vietnamese CTA / follow markers
    cta_markers = ["follow", "subscribe", "comment", "bình luận", "xem phần", "để xem"]
    if any(m in narration_lower for m in cta_markers):
        return "CTA"
    # Reveal markers
    reveal_markers = ["hóa ra", "hoá ra", "sự thật", "thực ra", "thực chất", "thực tế là"]
    if any(m in narration_lower for m in reveal_markers):
        return "REVEAL"
    # Tension markers
    tension_markers = ["nhưng", "tưởng", "vấn đề", "điều kỳ lạ", "thực ra không"]
    if any(m in narration_lower for m in tension_markers):
        return "TENSION"
    # Position heuristic
    pct = index / (total - 1) if total > 1 else 0
    if pct < 0.2:
        return "TENSION"
    if pct < 0.75:
        return "REVEAL"
    return "RESOLUTION"


# ---------------------------------------------------------------------------
# Core evaluator
# ---------------------------------------------------------------------------

def viral_score(
    script: dict,
    min_total: int = MIN_TOTAL_SCORE,
    min_dimension: int = MIN_DIMENSION_SCORE,
) -> dict:
    """
    Evaluate viral potential via LLM. Never raises — returns result dict.

    Returns:
        {
            "scores": {"hook": int, "arc": int, "emotion": int, "cta": int},
            "total": int,
            "pass": bool,
            "issues": [str],
            "strengths": [str],
            "rewrites": [{"scene_id", "field", "current", "suggested"}],
            "report": str,
            "raw_response": str,
        }
    """
    title, summary, scene_count, duration_s = _summarize_script(script)

    prompt = EVAL_PROMPT_TEMPLATE.format(
        title=title,
        scene_count=scene_count,
        duration_s=duration_s,
        script_summary=summary,
    )

    raw = _call_api([{"role": "user", "content": prompt}])
    cleaned = _strip_markdown_fences(raw)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        return {
            "scores": {d: 0 for d in DIMENSIONS},
            "total": 0,
            "pass": False,
            "issues": [f"LLM returned invalid JSON: {e}"],
            "strengths": [],
            "rewrites": [],
            "report": f"[gate1_llm] Parse error — raw response:\n{raw[:500]}",
            "raw_response": raw,
        }

    if not isinstance(data, dict):
        return {
            "scores": {d: 0 for d in DIMENSIONS},
            "total": 0,
            "pass": False,
            "issues": ["LLM returned a non-object JSON payload"],
            "strengths": [],
            "rewrites": [],
            "report": f"[gate1_llm] Parse error — response was not a JSON object:\n{raw[:500]}",
            "raw_response": raw,
        }

    scores = _normalize_scores(data.get("scores", {}))
    total = data.get("total", sum(scores.get(d, 0) for d in DIMENSIONS))
    try:
        total = int(total)
    except (TypeError, ValueError):
        total = sum(scores.get(d, 0) for d in DIMENSIONS)
    issues = _normalize_text_list(data.get("issues", []))
    strengths = _normalize_text_list(data.get("strengths", []))
    rewrites = _normalize_rewrites(data.get("rewrites", []))

    failed_dims = {d: score for d, score in scores.items() if score < min_dimension}
    passed = total >= min_total and not failed_dims

    report = _format_report(scores, total, passed, issues, strengths, failed_dims, min_total=min_total)

    return {
        "scores": scores,
        "total": total,
        "pass": passed,
        "issues": issues,
        "strengths": strengths,
        "rewrites": rewrites,
        "report": report,
        "raw_response": raw,
    }


def _format_report(
    scores: dict,
    total: int,
    passed: bool,
    issues: list,
    strengths: list,
    failed_dims: dict,
    min_total: int = MIN_TOTAL_SCORE,
) -> str:
    status = "PASS" if passed else "FAIL"
    bar_chars = 10
    lines = [
        f"╔══ GATE 1 LLM {status} {'═' * 34}",
        f"║  Total: {total}/40  (min {min_total})"
        + ("  ✅" if total >= min_total else "  ❌"),
    ]
    for dim in DIMENSIONS:
        sc = scores.get(dim, 0)
        filled = round(sc / 10 * bar_chars)
        bar = "█" * filled + "░" * (bar_chars - filled)
        flag = "  ❌" if dim in failed_dims else "  ✅"
        lines.append(f"║  {dim:<8} {bar}  {sc}/10{flag}")

    if issues:
        lines.append("║")
        lines.append("║  Issues:")
        for issue in issues:
            lines.append(f"║    • {issue}")

    if strengths:
        lines.append("║")
        lines.append("║  Strengths:")
        for s in strengths:
            lines.append(f"║    ✓ {s}")

    lines.append(f"╚{'═' * 50}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Auto-rewrite
# ---------------------------------------------------------------------------

def _rewrite_script(script: dict, issues: list[str], total: int, min_total: int = MIN_TOTAL_SCORE) -> dict:
    """Ask LLM to rewrite the script fixing the listed issues. Returns new script dict."""
    issues_text = "\n".join(f"- {issue}" for issue in issues)
    script_json = json.dumps(script, ensure_ascii=False, indent=2)

    prompt = REWRITE_PROMPT_TEMPLATE.format(
        total=total,
        min_total=min_total,
        issues=issues_text,
        script_json=script_json,
    )

    raw = _call_api(
        [{"role": "user", "content": prompt}],
        system=(
            "Bạn là Vietnamese short-form video script writer chuyên về TikTok viral content. "
            "Trả về JSON script hoàn chỉnh. Không có markdown, không có giải thích."
        ),
    )

    cleaned = _strip_markdown_fences(raw)

    return json.loads(cleaned)


# ---------------------------------------------------------------------------
# Assert gate (dùng trong main.py)
# ---------------------------------------------------------------------------

def gate1_llm_assert(
    script: dict,
    max_retries: int = 2,
    min_total: int = MIN_TOTAL_SCORE,
    min_dimension: int = MIN_DIMENSION_SCORE,
    auto_rewrite: bool = True,
) -> dict:
    """
    Run LLM viral score check. Optionally auto-rewrites script if it fails.

    Args:
        script:        Parsed VidGen script JSON.
        max_retries:   How many rewrite attempts before giving up.
        min_total:     Minimum total score (default 30/40).
        min_dimension: Minimum per-dimension score (default 7/10).
        auto_rewrite:  If True, call LLM to rewrite failing scripts.

    Returns:
        The (possibly rewritten) script dict that passed the gate.

    Raises:
        ValueError: if script fails after all retries.
        RuntimeError: if API call fails.
    """
    current_script = script

    for attempt in range(1, max_retries + 2):  # +2: first eval + max_retries rewrites
        print(f"\n── Gate 1 LLM: Viral Score (attempt {attempt}) ──────────────")
        result = viral_score(current_script, min_total=min_total, min_dimension=min_dimension)
        print(result["report"])

        if result["pass"]:
            return current_script

        # Failed
        if attempt > max_retries or not auto_rewrite:
            issues_str = "\n".join(f"  • {i}" for i in result["issues"])
            raise ValueError(
                f"\n[Gate 1 LLM] Script failed viral score after {attempt} attempt(s).\n"
                f"Total: {result['total']}/40 (min {min_total})\n"
                f"Issues:\n{issues_str}\n"
                "Fix the script manually and re-run."
            )

        print(f"\n[Gate 1 LLM] Score too low ({result['total']}/40). Rewriting script...")
        try:
            current_script = _rewrite_script(current_script, result["issues"], result["total"], min_total=min_total)
            print("[Gate 1 LLM] Rewrite complete. Re-evaluating...")
        except (json.JSONDecodeError, KeyError) as e:
            raise ValueError(f"[Gate 1 LLM] Rewrite produced invalid JSON: {e}") from e

    # Should never reach here
    raise ValueError("[Gate 1 LLM] Exhausted retries without passing.")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(
        description="Gate 1 LLM — viral score evaluator for VidGen scripts",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("script", help="Path to script JSON file")
    parser.add_argument(
        "--rewrite",
        action="store_true",
        help="If score fails, ask LLM to rewrite script and save to same path",
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=2,
        help="Max rewrite attempts (default 2)",
    )
    parser.add_argument(
        "--out",
        default=None,
        help="Save (possibly rewritten) script to this path instead of overwriting",
    )
    args = parser.parse_args()

    path = Path(args.script)
    if not path.exists():
        print(f"Error: file not found — {path}")
        sys.exit(1)

    with open(path, encoding="utf-8") as f:
        script = json.load(f)

    if args.rewrite:
        try:
            final_script = gate1_llm_assert(script, max_retries=args.retries, auto_rewrite=True)
            out_path = Path(args.out) if args.out else path
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(final_script, f, ensure_ascii=False, indent=2)
            print(f"\n[Gate 1 LLM] ✅ Script saved to {out_path}")
            sys.exit(0)
        except ValueError as e:
            print(e)
            sys.exit(1)
        except RuntimeError as e:
            print(f"[Gate 1 LLM] API error: {e}")
            sys.exit(2)
    else:
        # Eval only — no rewrite
        try:
            result = viral_score(script)
            print(result["report"])
            if result.get("rewrites"):
                print("\nSuggested rewrites:")
                for rw in result["rewrites"]:
                    print(f"\n  [{rw['scene_id']}] {rw['field']}:")
                    print(f"    Before: {rw['current']}")
                    print(f"    After:  {rw['suggested']}")
            sys.exit(0 if result["pass"] else 1)
        except RuntimeError as e:
            print(f"[Gate 1 LLM] API error: {e}")
            sys.exit(2)


if __name__ == "__main__":
    main()
