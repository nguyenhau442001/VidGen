from vidgen.beatmap import TOP_N_HOT, format_report, score_beatmap
from vidgen.manifest import build_render_manifest


def _script(shots):
    return {"title": "Test Video", "fps": 30, "shots": shots}


def test_empty_shots_returns_empty_beatmap():
    script = _script([])
    manifest = build_render_manifest(script, {})
    beatmap = score_beatmap(script, manifest)
    assert beatmap == {"video_title": "Test Video", "scenes": []}


def test_opening_scene_gets_hook_bonus():
    script = _script([
        {"id": "s1", "type": "explanation", "narration": "Mở đầu video này.",
         "duration_frames": 150, "visual": {"headline": "H"}},
        {"id": "s2", "type": "explanation", "narration": "Nội dung tiếp theo đây.",
         "duration_frames": 150, "visual": {"headline": "H2"}},
    ])
    manifest = build_render_manifest(script, {})
    beatmap = score_beatmap(script, manifest)
    scenes = beatmap["scenes"]
    assert "opening hook" in scenes[0]["reasons"]
    assert "opening hook" not in scenes[1]["reasons"]


def test_numeric_payoff_scene_scores_higher():
    script = _script([
        {"id": "s1", "type": "explanation", "narration": "Giới thiệu.",
         "duration_frames": 150, "visual": {"headline": "H"}},
        {"id": "s2", "type": "stat_comparator", "narration": "So sánh số liệu.",
         "duration_frames": 150, "visual": {}},
        {"id": "s3", "type": "explanation", "narration": "Kết thúc.",
         "duration_frames": 150, "visual": {"headline": "H2"}},
    ])
    manifest = build_render_manifest(script, {})
    beatmap = score_beatmap(script, manifest)
    scenes = beatmap["scenes"]
    assert "numeric payoff" in scenes[1]["reasons"]
    assert scenes[1]["score"] > scenes[2]["score"]


def test_pattern_interrupt_flagged_when_type_differs_from_neighbors():
    script = _script([
        {"id": "s1", "type": "explanation", "narration": "Một.",
         "duration_frames": 150, "visual": {"headline": "H"}},
        {"id": "s2", "type": "counter_blast", "narration": "Hai.",
         "duration_frames": 150, "visual": {}},
        {"id": "s3", "type": "explanation", "narration": "Ba.",
         "duration_frames": 150, "visual": {"headline": "H2"}},
        {"id": "s4", "type": "explanation", "narration": "Bốn.",
         "duration_frames": 150, "visual": {"headline": "H4"}},
    ])
    manifest = build_render_manifest(script, {})
    beatmap = score_beatmap(script, manifest)
    assert "pattern interrupt" in beatmap["scenes"][1]["reasons"]
    # scene 3 (index 2) sits between counter_blast(neighbor differs) and
    # explanation(neighbor matches) — only a scene matching BOTH neighbors
    # should be interrupt-free; scene 4 matches its only neighbor (scene 3).
    assert "pattern interrupt" not in beatmap["scenes"][3]["reasons"]


def test_hot_flags_exactly_top_n_scenes():
    shots = [
        {"id": f"s{i}", "type": "explanation", "narration": f"Câu chuyện số {i}.",
         "duration_frames": 150, "visual": {"headline": f"H{i}"}}
        for i in range(6)
    ]
    # Make one scene an unambiguous standout: numeric payoff + fast + dense.
    shots[3] = {"id": "s3", "type": "stat_comparator",
                "narration": "Con số này thay đổi mọi thứ hoàn toàn bất ngờ luôn đó bạn ơi thật sự.",
                "duration_frames": 90, "visual": {}}
    script = _script(shots)
    manifest = build_render_manifest(script, {})
    beatmap = score_beatmap(script, manifest)
    hot = [s for s in beatmap["scenes"] if s["hot"]]
    assert len(hot) == TOP_N_HOT
    assert beatmap["scenes"][3]["hot"] is True
    scores = [s["score"] for s in beatmap["scenes"]]
    hot_scores = sorted([s["score"] for s in hot], reverse=True)
    assert hot_scores == sorted(scores, reverse=True)[:TOP_N_HOT]


def test_score_beatmap_accepts_canonical_shots_schema():
    script = _script([
        {"id": "s1", "type": "explanation", "narration": "Mở đầu.", "duration_frames": 150, "visual": {"headline": "H"}},
        {"id": "s2", "type": "stat_comparator", "narration": "Con số.",
         "duration_frames": 150, "visual": {}},
    ])
    manifest = build_render_manifest(script, {})
    beatmap = score_beatmap(script, manifest)
    assert len(beatmap["scenes"]) == 2
    assert "numeric payoff" in beatmap["scenes"][1]["reasons"]


def test_format_report_contains_scene_ids_and_scores():
    script = _script([
        {"id": "s1", "type": "explanation", "narration": "Chào bạn.",
         "duration_frames": 150, "visual": {"headline": "H"}},
    ])
    manifest = build_render_manifest(script, {})
    beatmap = score_beatmap(script, manifest)
    report = format_report(beatmap)
    assert "BEAT MAP" in report
    assert "s1" in report
    assert "/100" in report


def test_format_report_handles_empty_beatmap():
    report = format_report({"video_title": "Empty", "scenes": []})
    assert "no scenes scored" in report
