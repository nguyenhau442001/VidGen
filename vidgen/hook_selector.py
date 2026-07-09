"""
Autonomous hook pattern selector for VidGen.

Given a topic string, scores all 20 patterns from references/hook-patterns.json
and returns the best fit. Intended to be run standalone (CLI) or imported while
authoring a new script's first scene, so the hook narration is chosen
systematically instead of by feel.
"""

import json
from pathlib import Path
from dataclasses import dataclass
from typing import Optional

PATTERNS_FILE = Path(__file__).parent.parent / "references" / "hook-patterns.json"

TOPIC_KEYWORDS: dict[str, list[str]] = {
    "algorithms":        ["thuật toán", "sort", "search", "graph", "tree", "binary", "dispatch", "matching", "routing"],
    "databases":         ["database", "db", "sql", "query", "index", "table", "join", "postgres", "mysql", "mongodb"],
    "distributed":       ["distributed", "service", "microservice", "kafka", "queue", "replication", "consensus", "raft"],
    "performance":       ["latency", "throughput", "cache", "memory", "cpu", "bottleneck", "profil", "benchmark", "fast"],
    "security":          ["security", "auth", "password", "hash", "jwt", "oauth", "ssl", "tls", "encrypt", "token"],
    "networking":        ["network", "http", "tcp", "dns", "cdn", "websocket", "grpc", "api", "rest", "packet"],
    "mobile":            ["mobile", "app", "ios", "android", "react native", "phone", "notification", "push"],
    "deployment":        ["deploy", "ci", "cd", "docker", "kubernetes", "k8s", "devops", "pipeline", "rollback", "canary"],
    "architecture":      ["architect", "design", "monolith", "scalab", "pattern", "clean", "domain", "ddd", "event"],
    "observability":     ["log", "metric", "trace", "monitor", "alert", "dashboard", "incident", "debug", "sre"],
    "ai_ml":             ["ai", "ml", "model", "llm", "gpt", "token", "embedding", "neural", "train", "infer"],
    "vietnam_context":   ["grab", "momo", "tiki", "shopee", "zalo", "viettel", "vnpay", "vn", "việt"],
}


@dataclass
class PatternScore:
    pattern_id: str
    pattern_name: str
    label: str
    score: float
    reason: str
    formula: str
    visual_hint: str
    example: str


def _topic_to_categories(topic: str) -> set[str]:
    topic_lower = topic.lower()
    matched = set()
    for category, keywords in TOPIC_KEYWORDS.items():
        if any(kw in topic_lower for kw in keywords):
            matched.add(category)
    return matched


def _score_pattern(pattern: dict, topic: str, categories: set[str], series_used_ids: list[str]) -> float:
    if pattern["id"] in series_used_ids:
        return -1.0

    weights = {"topic_fit": 0.4, "non_tech_accessible": 0.3, "curiosity_gap": 0.3}
    topic_lower = topic.lower()

    best_for_set = set(pattern["best_for"])
    keyword_hits = sum(1 for kw in pattern["best_for"] if kw.lower() in topic_lower)
    category_hits = sum(1 for bf in best_for_set if any(bf in cat or cat in bf for cat in categories))
    topic_fit = min(1.0, (category_hits * 0.4 + keyword_hits * 0.3))

    non_tech = pattern["non_tech_score"] / 5.0
    curiosity = pattern["curiosity_gap"] / 5.0

    return (
        weights["topic_fit"] * topic_fit
        + weights["non_tech_accessible"] * non_tech
        + weights["curiosity_gap"] * curiosity
    )


def select_hook_pattern(
    topic: str,
    series_used_ids: Optional[list[str]] = None,
    top_n: int = 1,
) -> list[PatternScore]:
    """
    Select the best hook pattern(s) for a given topic.

    Args:
        topic: The video topic string (Vietnamese or English).
        series_used_ids: Pattern IDs already used in previous parts of a series;
                          excluded from selection.
        top_n: Number of top patterns to return (default 1 for autonomous selection).

    Returns:
        List of PatternScore objects, sorted by score descending.
    """
    if series_used_ids is None:
        series_used_ids = []

    data = json.loads(PATTERNS_FILE.read_text(encoding="utf-8"))
    patterns = data["patterns"]
    categories = _topic_to_categories(topic)

    scored = []
    for p in patterns:
        score = _score_pattern(p, topic, categories, series_used_ids)
        if score < 0:
            continue
        best_example = p["examples"][0]
        scored.append(PatternScore(
            pattern_id=p["id"],
            pattern_name=p["name"],
            label=p["label"],
            score=round(score, 3),
            reason=f"Matched categories: {categories & set(p['best_for']) if categories else 'keyword overlap'}",
            formula=p["formula"],
            visual_hint=p["visual_hint"],
            example=best_example,
        ))

    scored.sort(key=lambda x: x.score, reverse=True)
    return scored[:top_n]


def format_for_prompt(result: PatternScore) -> str:
    """Format a PatternScore as an instruction block for script authoring."""
    return f"""## Selected Hook Pattern: {result.pattern_id} — {result.label}

**Formula:** {result.formula}

**Example narration:** "{result.example}"

**Visual hint:** {result.visual_hint}

**Why selected:** Score {result.score} — {result.reason}

Apply this pattern to the first scene. The hook narration must:
- Follow the formula above, adapted to the specific topic
- NOT answer the question it raises — that tension must persist until at least 40% through the video
- Be ≤ 12 words in the narration text
- The most surprising/contradictory word should be the visual accent (bold or on_screen_text emphasis)
"""


if __name__ == "__main__":
    import sys
    topic = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "Grab dispatch algorithm geohash"
    results = select_hook_pattern(topic, top_n=3)
    for r in results:
        print(f"{r.pattern_id} [{r.score:.3f}] {r.label}")
        print(f"  Formula: {r.formula}")
        print(f"  Example: {r.example}")
        print()
