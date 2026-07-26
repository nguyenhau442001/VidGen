import datetime

from vidgen.discovery.topic_harvester import (
    _clean_product_name,
    _hours_ago,
    _is_duplicate,
    _keyword_score,
    _recency_multiplier,
    _stars_bonus,
    _to_vn_topic,
    TopicCandidate,
)


# ── _keyword_score ───────────────────────────────────────────────────────────

def test_keyword_score_disqualify_short_circuits_even_with_other_matches():
    score, matched = _keyword_score("New Claude model but this is nsfw content")
    assert score == -999.0
    assert matched == ["disqualified:nsfw"]


def test_keyword_score_sums_multiple_matches():
    score, matched = _keyword_score("Claude agent with mcp support")
    assert score == 2.5 + 1.8 + 1.4
    assert set(matched) == {"claude", "agent", "mcp"}


def test_keyword_score_no_match_returns_zero():
    score, matched = _keyword_score("just some random unrelated text")
    assert score == 0.0
    assert matched == []


# ── _recency_multiplier ──────────────────────────────────────────────────────

def test_recency_multiplier_zero_hours_is_one():
    assert _recency_multiplier(0) == 1.0


def test_recency_multiplier_negative_hours_is_one():
    assert _recency_multiplier(-5) == 1.0


def test_recency_multiplier_decreases_with_time():
    assert _recency_multiplier(12) > _recency_multiplier(24) > _recency_multiplier(48)


def test_recency_multiplier_floors_at_point_one():
    assert _recency_multiplier(10_000) == 0.1


# ── _stars_bonus ──────────────────────────────────────────────────────────────

def test_stars_bonus_zero_stars_is_zero():
    assert _stars_bonus(0) == 0.0


def test_stars_bonus_negative_stars_is_zero():
    assert _stars_bonus(-10) == 0.0


def test_stars_bonus_capped_at_two():
    assert _stars_bonus(10_000_000) <= 2.0


def test_stars_bonus_monotonically_increases():
    assert _stars_bonus(10) < _stars_bonus(100) < _stars_bonus(1000)


# ── _hours_ago ────────────────────────────────────────────────────────────────

def test_hours_ago_none_returns_999():
    assert _hours_ago(None) == 999.0


def test_hours_ago_naive_datetime_treated_as_utc():
    # Callers only ever pass naive datetimes that are already UTC (e.g. parsed
    # from feed timestamps without an explicit offset) — never naive local time.
    naive_utc = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) - datetime.timedelta(hours=5)
    hours = _hours_ago(naive_utc)
    assert 4.9 <= hours <= 5.1


def test_hours_ago_aware_datetime_handled():
    aware = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=5)
    hours = _hours_ago(aware)
    assert 4.9 <= hours <= 5.1


# ── _clean_product_name ──────────────────────────────────────────────────────

def test_clean_product_name_splits_on_colon():
    assert _clean_product_name("MyTool: A great utility") == "MyTool"


def test_clean_product_name_splits_on_em_dash():
    assert _clean_product_name("MyTool — A great utility") == "MyTool"


def test_clean_product_name_strips_version_tag():
    assert _clean_product_name("mytool v1.2.3") == "Mytool"


def test_clean_product_name_strips_owner_prefix():
    assert _clean_product_name("anthropics/claude-code") == "Claude Code"


def test_clean_product_name_strips_filler_words():
    assert _clean_product_name("the awesome-lib") == "Awesome-Lib"


def test_clean_product_name_applies_product_map_exact():
    assert _clean_product_name("langchain") == "LangChain"


def test_clean_product_name_applies_product_map_substring():
    assert _clean_product_name("claude-code-extension") == "Claude Code"


def test_clean_product_name_caps_at_30_chars():
    long_name = "a" * 50
    assert len(_clean_product_name(long_name)) <= 30


def test_clean_product_name_titlecases_lowercase_input():
    assert _clean_product_name("some new tool") == "Some New Tool"


# ── _to_vn_topic ──────────────────────────────────────────────────────────────

def test_to_vn_topic_ai_release_pattern_b():
    result = _to_vn_topic("Claude", "Claude 5 launch announcement", "release", is_ai_release=True)
    assert "vừa ra" in result


def test_to_vn_topic_version_bump_pattern_b():
    result = _to_vn_topic("MyTool", "MyTool v2.0 released with new features", "github", is_ai_release=False)
    assert "tính năng mới" in result


def test_to_vn_topic_security_pattern_c():
    result = _to_vn_topic("MyTool", "critical vulnerability found in MyTool", "github", is_ai_release=False)
    assert "Lỗ hổng bảo mật" in result


def test_to_vn_topic_myth_bust_pattern_a():
    result = _to_vn_topic("MyTool", "why you should avoid MyTool in production", "hn", is_ai_release=False)
    assert "Đừng dùng" in result


def test_to_vn_topic_number_pattern_d():
    result = _to_vn_topic("MyTool", "MyTool is 50x faster than alternatives", "hn", is_ai_release=False)
    assert "50" in result


def test_to_vn_topic_agent_framing():
    result = _to_vn_topic("MyTool", "an autonomous agent for coding tasks", "hn", is_ai_release=False)
    assert "AI agent" in result


def test_to_vn_topic_mcp_framing():
    result = _to_vn_topic("MyTool", "MCP integration for tool use", "hn", is_ai_release=False)
    assert "MCP" in result


def test_to_vn_topic_default_evergreen():
    result = _to_vn_topic("MyTool", "a generic description with no signal keywords", "hn", is_ai_release=False)
    assert "tại sao dev đang nói về" in result


def test_to_vn_topic_priority_breaking_news_beats_security():
    # Both "release" and "vulnerability" keywords present — B must win over C.
    result = _to_vn_topic("MyTool", "MyTool v2.0 fixes a vulnerability", "github", is_ai_release=False)
    assert "tính năng mới" in result
    assert "Lỗ hổng" not in result


def test_to_vn_topic_priority_security_beats_myth_bust():
    # Both "exploit" and "deprecated" keywords present — C must win over A.
    result = _to_vn_topic("MyTool", "an exploit shows why this is now deprecated", "hn", is_ai_release=False)
    assert "Lỗ hổng bảo mật" in result


def test_to_vn_topic_priority_myth_bust_beats_number():
    # Both "avoid" and a big number present — A must win over D.
    result = _to_vn_topic("MyTool", "avoid this pattern, it is 20x slower", "hn", is_ai_release=False)
    assert "Đừng dùng" in result


# ── _is_duplicate ─────────────────────────────────────────────────────────────

def test_is_duplicate_three_shared_words_in_queue():
    candidate = TopicCandidate(
        title="Claude Code new feature launch",
        vn_topic="Claude Code có tính năng mới",
        score=1.0, source="github",
    )
    already_in_queue = ["Claude Code có tính năng hay"]
    assert _is_duplicate(candidate, already_in_queue, cache=set()) is True


def test_is_duplicate_three_shared_words_in_cache():
    candidate = TopicCandidate(
        title="Claude Code new release today",
        vn_topic="x",
        score=1.0, source="github",
    )
    cache = {"Claude Code new major release"}
    assert _is_duplicate(candidate, already_in_queue=[], cache=cache) is True


def test_is_duplicate_two_shared_words_is_not_duplicate():
    candidate = TopicCandidate(
        title="Claude Code update",
        vn_topic="Claude Code cập nhật",
        score=1.0, source="github",
    )
    already_in_queue = ["Claude Code hoàn toàn khác biệt"]
    assert _is_duplicate(candidate, already_in_queue, cache=set()) is False


def test_is_duplicate_empty_queue_and_cache_never_duplicate():
    candidate = TopicCandidate(title="Anything", vn_topic="Bất kỳ điều gì", score=1.0, source="github")
    assert _is_duplicate(candidate, already_in_queue=[], cache=set()) is False
