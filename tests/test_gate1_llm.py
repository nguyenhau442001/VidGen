"""
tests/test_gate1_llm.py

Unit tests cho gate1_llm.py.
Không cần API key — mock toàn bộ _call_api.
"""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

# Ensure repo root is in path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from vidgen.gate1_llm import (
    MIN_DIMENSION_SCORE,
    MIN_TOTAL_SCORE,
    _format_report,
    _infer_beat,
    _summarize_script,
    gate1_llm_assert,
    viral_score,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

PASSING_SCRIPT = {
    "video_id": "test_pass",
    "title": "Grab không chọn tài xế gần nhất — đây là lý do",
    "fps": 30,
    "narration_language": "vi",
    "scenes": [
        {
            "id": "hook",
            "type": "CharacterIconScene",
            "duration_frames": 120,
            "narration": "Tài xế cách bạn 200m — Grab vẫn không chọn. Tại sao?",
            "props": {"headline": "Grab chọn ai?"},
        },
        {
            "id": "tension",
            "type": "ExplanationScene",
            "duration_frames": 210,
            "narration": "Bạn tưởng khoảng cách là yếu tố duy nhất. Thực ra không phải.",
            "props": {"headline": "Khoảng cách không phải tất cả"},
        },
        {
            "id": "reveal_1",
            "type": "ScoreCardScene",
            "duration_frames": 240,
            "narration": "Hóa ra Grab tính điểm từng tài xế: khoảng cách chỉ chiếm 30%.",
            "props": {"headline": "Dispatch score"},
        },
        {
            "id": "reveal_2",
            "type": "AnimatedFlowScene",
            "duration_frames": 210,
            "narration": "Tỉ lệ chấp nhận cuốc cao, hướng di chuyển, thời gian chờ — tất cả vào score.",
            "props": {"headline": "3 yếu tố quyết định"},
        },
        {
            "id": "cta",
            "type": "ExplanationScene",
            "duration_frames": 120,
            "narration": "Nhưng còn một yếu tố Grab không bao giờ công bố. Xem phần tiếp theo.",
            "props": {"headline": "Còn một bí mật nữa"},
        },
    ],
}

FAILING_SCRIPT = {
    "video_id": "test_fail",
    "title": "Giới thiệu về AI",
    "fps": 30,
    "narration_language": "vi",
    "scenes": [
        {
            "id": "intro",
            "type": "ExplanationScene",
            "duration_frames": 150,
            "narration": "Hôm nay chúng ta sẽ tìm hiểu về trí tuệ nhân tạo.",
            "props": {"headline": "AI là gì?"},
        },
        {
            "id": "explain",
            "type": "ExplanationScene",
            "duration_frames": 300,
            "narration": "AI là công nghệ rất quan trọng. Nó có nhiều ứng dụng trong cuộc sống.",
            "props": {"headline": "Ứng dụng của AI"},
        },
        {
            "id": "cta",
            "type": "ExplanationScene",
            "duration_frames": 90,
            "narration": "Cảm ơn bạn đã xem. Follow mình để xem thêm.",
            "props": {"headline": "Follow để xem thêm"},
        },
    ],
}

PASSING_LLM_RESPONSE = json.dumps({
    "scores": {"hook": 9, "arc": 8, "emotion": 8, "cta": 8},
    "total": 33,
    "issues": [],
    "strengths": ["Hook dùng counterintuitive fact hiệu quả", "CTA mở open loop mới"],
    "rewrites": [],
})

FAILING_LLM_RESPONSE = json.dumps({
    "scores": {"hook": 3, "arc": 4, "emotion": 3, "cta": 4},
    "total": 14,
    "issues": [
        "intro: 'Hôm nay chúng ta sẽ tìm hiểu' là hook rất yếu, không tạo curiosity",
        "explain: Không có số cụ thể, không có surprising fact",
        "cta: 'Follow mình để xem thêm' không có open loop mới",
    ],
    "strengths": [],
    "rewrites": [
        {
            "scene_id": "intro",
            "field": "narration",
            "current": "Hôm nay chúng ta sẽ tìm hiểu về trí tuệ nhân tạo.",
            "suggested": "AI đang thay thế 300 triệu việc làm — nhưng không phải theo cách bạn nghĩ.",
        }
    ],
})

REWRITE_LLM_RESPONSE = json.dumps({
    **FAILING_SCRIPT,
    "scenes": [
        {
            **FAILING_SCRIPT["scenes"][0],
            "narration": "AI đang thay thế 300 triệu việc làm — nhưng không phải theo cách bạn nghĩ.",
        },
        FAILING_SCRIPT["scenes"][1],
        {
            **FAILING_SCRIPT["scenes"][2],
            "narration": "Nhưng có một loại công việc AI không thể thay thế. Xem phần tiếp theo.",
        },
    ],
})

PASSING_AFTER_REWRITE_RESPONSE = json.dumps({
    "scores": {"hook": 8, "arc": 7, "emotion": 7, "cta": 8},
    "total": 30,
    "issues": [],
    "strengths": ["Hook đã được cải thiện đáng kể"],
    "rewrites": [],
})


# ---------------------------------------------------------------------------
# Tests: _infer_beat
# ---------------------------------------------------------------------------

class TestInferBeat(unittest.TestCase):
    def test_first_scene_is_hook(self):
        self.assertEqual(_infer_beat(0, 5, "bất kỳ narration gì"), "HOOK")

    def test_last_scene_is_cta(self):
        self.assertEqual(_infer_beat(4, 5, "bất kỳ narration gì"), "CTA")

    def test_follow_keyword_is_cta(self):
        self.assertEqual(_infer_beat(3, 10, "Follow mình để xem thêm"), "CTA")

    def test_hoa_ra_is_reveal(self):
        self.assertEqual(_infer_beat(5, 10, "Hóa ra Grab không chọn theo khoảng cách"), "REVEAL")

    def test_nhung_is_tension(self):
        self.assertEqual(_infer_beat(2, 10, "Nhưng điều này không đơn giản như vậy"), "TENSION")

    def test_middle_scene_without_keywords(self):
        # 50% qua video → REVEAL
        result = _infer_beat(5, 10, "Grab tính điểm dispatch như sau")
        self.assertEqual(result, "REVEAL")


# ---------------------------------------------------------------------------
# Tests: _summarize_script
# ---------------------------------------------------------------------------

class TestSummarizeScript(unittest.TestCase):
    def test_returns_correct_scene_count(self):
        title, summary, scene_count, duration_s = _summarize_script(PASSING_SCRIPT)
        self.assertEqual(scene_count, 5)

    def test_calculates_duration(self):
        title, summary, scene_count, duration_s = _summarize_script(PASSING_SCRIPT)
        # total frames = 120+210+240+210+120 = 900, fps=30 → 30s
        self.assertAlmostEqual(duration_s, 30.0, places=1)

    def test_title_extraction(self):
        title, _, _, _ = _summarize_script(PASSING_SCRIPT)
        self.assertEqual(title, "Grab không chọn tài xế gần nhất — đây là lý do")

    def test_title_falls_back_to_video_id(self):
        script = {**PASSING_SCRIPT}
        del script["title"]
        title, _, _, _ = _summarize_script(script)
        self.assertEqual(title, "test_pass")

    def test_summary_contains_beat_labels(self):
        _, summary, _, _ = _summarize_script(PASSING_SCRIPT)
        self.assertIn("HOOK", summary)
        self.assertIn("CTA", summary)

    def test_summary_contains_narration(self):
        _, summary, _, _ = _summarize_script(PASSING_SCRIPT)
        self.assertIn("Tài xế cách bạn", summary)


# ---------------------------------------------------------------------------
# Tests: _format_report
# ---------------------------------------------------------------------------

class TestFormatReport(unittest.TestCase):
    def test_pass_report_contains_pass(self):
        report = _format_report(
            {"hook": 9, "arc": 8, "emotion": 8, "cta": 8},
            33, True, [], ["Good hook"], {},
        )
        self.assertIn("PASS", report)
        self.assertIn("33/40", report)

    def test_fail_report_contains_fail(self):
        report = _format_report(
            {"hook": 3, "arc": 4, "emotion": 3, "cta": 4},
            14, False,
            ["hook: quá yếu"],
            [],
            {"hook": 3, "emotion": 3},
        )
        self.assertIn("FAIL", report)
        self.assertIn("14/40", report)
        self.assertIn("hook: quá yếu", report)

    def test_all_dimensions_in_report(self):
        report = _format_report(
            {"hook": 8, "arc": 7, "emotion": 8, "cta": 9},
            32, True, [], [], {},
        )
        for dim in ["hook", "arc", "emotion", "cta"]:
            self.assertIn(dim, report)

    def test_strengths_appear_when_present(self):
        report = _format_report(
            {"hook": 9, "arc": 8, "emotion": 8, "cta": 8},
            33, True, [], ["CTA mở open loop hiệu quả"], {},
        )
        self.assertIn("CTA mở open loop", report)


# ---------------------------------------------------------------------------
# Tests: viral_score (mocked API)
# ---------------------------------------------------------------------------

class TestViralScore(unittest.TestCase):
    @patch("vidgen.gate1_llm._call_api", return_value=PASSING_LLM_RESPONSE)
    def test_passing_script_returns_pass_true(self, mock_api):
        result = viral_score(PASSING_SCRIPT)
        self.assertTrue(result["pass"])
        self.assertEqual(result["total"], 33)
        self.assertEqual(result["scores"]["hook"], 9)

    @patch("vidgen.gate1_llm._call_api", return_value=FAILING_LLM_RESPONSE)
    def test_failing_script_returns_pass_false(self, mock_api):
        result = viral_score(FAILING_SCRIPT)
        self.assertFalse(result["pass"])
        self.assertEqual(result["total"], 14)
        self.assertEqual(len(result["issues"]), 3)

    @patch("vidgen.gate1_llm._call_api", return_value=PASSING_LLM_RESPONSE)
    def test_result_contains_report_string(self, mock_api):
        result = viral_score(PASSING_SCRIPT)
        self.assertIsInstance(result["report"], str)
        self.assertIn("GATE 1 LLM", result["report"])

    @patch("vidgen.gate1_llm._call_api", return_value=PASSING_LLM_RESPONSE)
    def test_custom_min_total_is_honored(self, mock_api):
        result = viral_score(PASSING_SCRIPT, min_total=34)
        self.assertFalse(result["pass"])
        self.assertEqual(result["total"], 33)

    @patch("vidgen.gate1_llm._call_api", return_value=PASSING_LLM_RESPONSE)
    def test_custom_min_dimension_is_honored(self, mock_api):
        result = viral_score(PASSING_SCRIPT, min_dimension=9)
        self.assertFalse(result["pass"])
        self.assertEqual(result["scores"]["arc"], 8)

    @patch("vidgen.gate1_llm._call_api", return_value='{"broken json":}')
    def test_invalid_json_returns_graceful_error(self, mock_api):
        result = viral_score(PASSING_SCRIPT)
        self.assertFalse(result["pass"])
        self.assertEqual(result["total"], 0)
        self.assertTrue(any("invalid JSON" in i for i in result["issues"]))

    @patch("vidgen.gate1_llm._call_api", return_value="```json\n" + PASSING_LLM_RESPONSE + "\n```")
    def test_strips_markdown_fences(self, mock_api):
        result = viral_score(PASSING_SCRIPT)
        self.assertTrue(result["pass"])

    @patch("vidgen.gate1_llm._call_api", return_value=FAILING_LLM_RESPONSE)
    def test_rewrites_included_in_result(self, mock_api):
        result = viral_score(FAILING_SCRIPT)
        self.assertEqual(len(result["rewrites"]), 1)
        self.assertEqual(result["rewrites"][0]["scene_id"], "intro")


# ---------------------------------------------------------------------------
# Tests: gate1_llm_assert
# ---------------------------------------------------------------------------

class TestGate1LlmAssert(unittest.TestCase):
    @patch("vidgen.gate1_llm._call_api", return_value=PASSING_LLM_RESPONSE)
    def test_passing_script_returns_script_unchanged(self, mock_api):
        result = gate1_llm_assert(PASSING_SCRIPT, auto_rewrite=False)
        self.assertEqual(result["video_id"], "test_pass")
        mock_api.assert_called_once()  # one eval, no rewrite

    @patch("vidgen.gate1_llm._call_api", return_value=PASSING_LLM_RESPONSE)
    def test_custom_threshold_for_assert_is_honored(self, mock_api):
        with self.assertRaises(ValueError):
            gate1_llm_assert(PASSING_SCRIPT, min_total=34, auto_rewrite=False)

    @patch("vidgen.gate1_llm._call_api", return_value=FAILING_LLM_RESPONSE)
    def test_failing_script_no_rewrite_raises(self, mock_api):
        with self.assertRaises(ValueError) as ctx:
            gate1_llm_assert(FAILING_SCRIPT, max_retries=0, auto_rewrite=False)
        self.assertIn("failed viral score", str(ctx.exception))

    @patch("vidgen.gate1_llm._call_api")
    def test_rewrite_on_first_fail_then_pass(self, mock_api):
        # Call 1: eval → fail; Call 2: rewrite; Call 3: eval → pass
        mock_api.side_effect = [
            FAILING_LLM_RESPONSE,       # eval attempt 1 → fail
            REWRITE_LLM_RESPONSE,       # rewrite
            PASSING_AFTER_REWRITE_RESPONSE,  # eval attempt 2 → pass
        ]
        result = gate1_llm_assert(FAILING_SCRIPT, max_retries=2, auto_rewrite=True)
        self.assertEqual(mock_api.call_count, 3)
        # Narration in returned script should be the rewritten version
        self.assertIn("300 triệu", result["scenes"][0]["narration"])

    @patch("vidgen.gate1_llm._call_api", return_value=FAILING_LLM_RESPONSE)
    def test_exhaust_retries_raises(self, mock_api):
        with self.assertRaises(ValueError) as ctx:
            gate1_llm_assert(FAILING_SCRIPT, max_retries=1, auto_rewrite=True)
        self.assertIn("failed viral score", str(ctx.exception))

    @patch("vidgen.gate1_llm._call_api")
    def test_rewrite_invalid_json_raises_value_error(self, mock_api):
        mock_api.side_effect = [
            FAILING_LLM_RESPONSE,  # eval → fail
            "{broken}",            # rewrite returns garbage
        ]
        with self.assertRaises(ValueError) as ctx:
            gate1_llm_assert(FAILING_SCRIPT, max_retries=1, auto_rewrite=True)
        self.assertIn("invalid JSON", str(ctx.exception))


# ---------------------------------------------------------------------------
# Tests: threshold constants
# ---------------------------------------------------------------------------

class TestThresholds(unittest.TestCase):
    def test_min_dimension_score_is_7(self):
        self.assertEqual(MIN_DIMENSION_SCORE, 7)

    def test_min_total_score_is_30(self):
        self.assertEqual(MIN_TOTAL_SCORE, 30)

    def test_boundary_total_exactly_at_threshold_passes(self):
        """Tổng = 30 với mọi dim ≥ 7 phải pass."""
        scores = {"hook": 8, "arc": 7, "emotion": 8, "cta": 7}
        total = sum(scores.values())
        self.assertEqual(total, 30)
        failed_dims = {d: v for d, v in scores.items() if v < MIN_DIMENSION_SCORE}
        self.assertFalse(failed_dims)  # không dim nào fail

    def test_boundary_one_dim_below_threshold_fails(self):
        """Tổng 31 nhưng một dim = 6 → fail."""
        scores = {"hook": 10, "arc": 8, "emotion": 7, "cta": 6}
        failed_dims = {d: v for d, v in scores.items() if v < MIN_DIMENSION_SCORE}
        self.assertIn("cta", failed_dims)


if __name__ == "__main__":
    unittest.main(verbosity=2)
