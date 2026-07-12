"""
vidgen/topic_harvester.py — AI News + Trending Topic Harvester

Scrapes AI release news, GitHub trending repos, and npm packages. Scores
each item and picks the best topic to push into topics_queue.json.

Sources (no API key required, no RSS that blocks scripts):
  • GitHub Search API  — AI/LLM repos created/updated this week
  • npm Registry API   — new packages with ai/llm keywords
  • GitHub Releases    — monitored repos (Anthropic, OpenAI, Google DeepMind)
  • Hacker News Firebase API — top stories mentioning AI keywords

Scoring:
  • AI release in 24h   → base score × 3.0  (overrides everything)
  • GitHub stars        → log-scaled boost
  • Keyword match       → per-keyword bonus
  • Recency             → decay by hours since published

Usage:
    python -m vidgen.topic_harvester              # score + push best topic
    python -m vidgen.topic_harvester --dry-run    # show top 5, don't push
    python -m vidgen.topic_harvester --top 10     # show top N topics
    python -m vidgen.topic_harvester --push N     # push top N to queue

Exit codes:
    0  — topic pushed (or dry-run completed)
    1  — no viable topic found
    2  — network/parse error
"""

from __future__ import annotations

import argparse
import json
import logging
import math
import sys
import urllib.request
import urllib.error
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

# ── Paths ─────────────────────────────────────────────────────────────────────
REPO_ROOT  = Path(__file__).resolve().parent.parent
QUEUE_FILE = REPO_ROOT / "topics_queue.json"
CACHE_FILE = REPO_ROOT / "output" / "harvester_cache.json"

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("harvester")

# ── Constants ─────────────────────────────────────────────────────────────────
HEADERS = {
    "User-Agent": "VidGen/1.0 (topic-harvester; github.com/nguyenhau442001/VidGen)",
    "Accept": "application/json",
}
REQUEST_TIMEOUT = 10  # seconds

# Priority multiplier: AI product release detected in last 24h → ×3.0
AI_RELEASE_MULTIPLIER = 3.0
AI_RELEASE_WINDOW_HOURS = 24

# Repos to watch for new releases (owner/repo)
WATCHED_RELEASE_REPOS = [
    "anthropics/claude-code",
    "openai/openai-python",
    "google/generative-ai-python",
    "mistralai/mistral-common",
    "ollama/ollama",
    "langchain-ai/langchain",
    "langflow-ai/langflow",
    "BerriAI/litellm",
    "continuedev/continue",
    "getcursor/cursor",           # Cursor releases
]

# Keywords that signal a high-value AI tech topic for Vietnamese dev audience
TOPIC_KEYWORDS: dict[str, float] = {
    # AI models & tools — highest value
    "claude":       2.5,
    "gpt":          2.5,
    "gemini":       2.0,
    "openai":       2.0,
    "anthropic":    2.0,
    "llm":          1.8,
    "agent":        1.8,
    "cursor":       1.6,
    "copilot":      1.5,
    "mistral":      1.5,
    "ollama":       1.4,
    "mcp":          1.4,
    "rag":          1.4,
    # Security + AI combo — very viral (JadePuffer pattern)
    "hack":         2.0,
    "ransomware":   2.0,
    "exploit":      1.8,
    "vulnerability":1.5,
    "attack":       1.5,
    "malware":      1.5,
    # High-interest dev topics
    "autonomous":   1.6,
    "agentic":      1.6,
    "multimodal":   1.4,
    "reasoning":    1.4,
    "benchmark":    1.3,
    "open source":  1.2,
    "free":         1.0,
    "launch":       1.2,
    "release":      1.2,
    "new":          0.8,
    # General tech — moderate
    "api":          0.8,
    "model":        1.0,
    "inference":    1.0,
    "fine-tuning":  1.0,
    "embedding":    0.9,
    "token":        0.8,
}

# Keywords that disqualify a topic (irrelevant / NSFW / too niche)
DISQUALIFY_KEYWORDS = [
    "nsfw", "adult", "gambling", "crypto scam", "nft",
    "celebrity", "politics", "election", "war", "weapon",
    "lawsuit", "acquisition", "earnings", "stock", "ipo",
]

# Maximum topics to add per run (prevent queue flooding)
MAX_PUSH_PER_RUN = 3

# ── Data model ────────────────────────────────────────────────────────────────

@dataclass
class TopicCandidate:
    title: str                          # Original English title
    vn_topic: str                       # Vietnamese topic string for VidGen
    score: float
    source: str                         # "github" | "npm" | "release" | "hn"
    url: str = ""
    published_at: Optional[datetime] = None
    stars: int = 0
    is_ai_release: bool = False
    reason: str = ""                    # human-readable scoring explanation

    def __lt__(self, other: "TopicCandidate") -> bool:
        return self.score < other.score


# ── HTTP helper ───────────────────────────────────────────────────────────────

def _fetch_json(url: str) -> Optional[dict | list]:
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        log.warning(f"HTTP {e.code} fetching {url}")
        return None
    except Exception as e:
        log.warning(f"Fetch error {url}: {e}")
        return None


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _hours_ago(dt: Optional[datetime]) -> float:
    """Hours since dt. Returns 999 if dt is None."""
    if dt is None:
        return 999.0
    delta = _now_utc() - dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else _now_utc() - dt
    return delta.total_seconds() / 3600


# ── Scoring ───────────────────────────────────────────────────────────────────

def _keyword_score(text: str) -> tuple[float, list[str]]:
    """Return (score, matched_keywords) for a text string."""
    text_lower = text.lower()

    # Disqualify check first
    for bad in DISQUALIFY_KEYWORDS:
        if bad in text_lower:
            return -999.0, [f"disqualified:{bad}"]

    total = 0.0
    matched = []
    for kw, weight in TOPIC_KEYWORDS.items():
        if kw in text_lower:
            total += weight
            matched.append(kw)

    return total, matched


def _recency_multiplier(hours: float) -> float:
    """Decay: 1.0 at 0h, ~0.7 at 12h, ~0.5 at 24h, ~0.25 at 48h."""
    if hours <= 0:
        return 1.0
    return max(0.1, math.exp(-0.015 * hours))


def _stars_bonus(stars: int) -> float:
    """Log-scaled stars bonus: 0 at 0★, 0.5 at 10★, 1.0 at 100★, 1.5 at 1000★."""
    if stars <= 0:
        return 0.0
    return min(2.0, math.log10(stars + 1) * 0.75)


# ── Vietnamese topic string generation ───────────────────────────────────────

import re as _re

# Friendly name map: repo/package name → display name for Vietnamese audience
_PRODUCT_NAME_MAP: dict[str, str] = {
    "claude-code":           "Claude Code",
    "openai-python":         "OpenAI SDK Python",
    "generative-ai-python":  "Gemini SDK",
    "litellm":               "LiteLLM",
    "langflow":              "Langflow",
    "langchain":             "LangChain",
    "ollama":                "Ollama",
    "continue":              "Continue.dev",
    "mistral-common":        "Mistral Common",
    "autogpt":               "AutoGPT",
    "hermes-agent":          "Hermes Agent",
    "pilotfish":             "Pilotfish",
    "fablecut":              "FableCut",
    "agentoria":             "Agentoria",
    "vercel/ai":             "Vercel AI SDK",
    "ai":                    "Vercel AI SDK",      # npm package "ai"
}


def _clean_product_name(raw: str) -> str:
    """
    Extract a clean, short product name from raw GitHub/npm title.
    Rules:
      - Take only the part before ":" or "—" or "–"
      - Strip version tags (v1.2.3, rc.1)
      - Strip common English filler words
      - Cap at 30 chars
      - Apply _PRODUCT_NAME_MAP if key matches
    """
    # Take before separators
    name = _re.split(r'[:\—\–]', raw)[0].strip()
    # Strip version tags
    name = _re.sub(r'\s+v\d+[\w.\-]*', '', name, flags=_re.IGNORECASE).strip()
    # Strip repo owner prefix (owner/repo → repo)
    if '/' in name:
        name = name.split('/')[-1].strip()
    # Strip common filler
    for filler in ["npm:", "github:", "the ", "a ", "an "]:
        if name.lower().startswith(filler):
            name = name[len(filler):].strip()
    # Apply friendly name map
    key = name.lower().replace('-', '').replace('_', '').replace(' ', '')
    for map_key, display in _PRODUCT_NAME_MAP.items():
        map_key_norm = map_key.lower().replace('-', '').replace('_', '').replace(' ', '')
        if map_key_norm == key or map_key_norm in key:
            return display
    # Title-case if all lowercase
    if name == name.lower():
        name = name.title()
    return name[:30].strip()


def _to_vn_topic(product_name: str, desc: str, source: str, is_ai_release: bool) -> str:
    """
    Generate Vietnamese topic string matching DevFaster's 4 viral patterns.

    Args:
        product_name: Clean product name (already processed by _clean_product_name)
        desc:         Original English description/title for signal detection
        source:       "github" | "npm" | "release" | "hn"
        is_ai_release: True → Pattern B with urgency tag
    """
    d = desc.lower()

    # ── Pattern B: Breaking news ── (highest priority)
    is_version = bool(_re.search(r'\bv\d+\.\d+', d))
    is_launch_kw = any(kw in d for kw in ["launch", "release", "announce",
                                            "introduce", "ships", "now available"])
    if is_ai_release or source == "release" or is_version or is_launch_kw:
        if is_ai_release:
            return f"{product_name} vừa ra — điều này thay đổi gì với dev?"
        return f"{product_name} vừa có tính năng mới — dev cần biết ngay"

    # ── Pattern C: Hidden truth / Security ──
    if any(kw in d for kw in ["hack", "exploit", "vulnerab", "attack",
                               "ransomware", "malware", "breach", "leak",
                               "bypass", "injection", "jailbreak"]):
        return f"Lỗ hổng bảo mật mới trong {product_name} — bạn có đang dùng không?"

    # ── Pattern A: Myth-bust ──
    if any(kw in d for kw in ["wrong", "mistake", "bad practice", "anti-pattern",
                               "should not", "don't", "avoid", "deprecated",
                               "stop using", "considered harmful"]):
        return f"Đừng dùng {product_name} theo cách này nữa"

    # ── Pattern D: Số cụ thể ──
    numbers = _re.findall(r'\b(\d+(?:\.\d+)?)\s*[xX%]?\b', desc)
    big_nums = [n for n in numbers if float(n) >= 10]
    if big_nums:
        n = big_nums[0]
        return f"{product_name}: {n}{'x' if 'x' in desc[desc.find(n):desc.find(n)+3].lower() else ''} — con số thật sự là gì?"

    # ── Agent framing ──
    if any(kw in d for kw in ["agent", "agentic", "autonomous", "multi-agent",
                               "orchestrat", "workflow"]):
        return f"{product_name} — AI agent giải quyết được gì mà tool cũ không làm được?"

    # ── MCP / tool integration ──
    if any(kw in d for kw in ["mcp", "model context protocol", "tool use",
                               "function call", "plugin"]):
        return f"{product_name} và MCP — cách tích hợp AI vào workflow của bạn"

    # ── Default: evergreen ──
    return f"{product_name} — tại sao dev đang nói về cái này?"


# ── Sources ───────────────────────────────────────────────────────────────────

def _fetch_atom(url: str) -> list[dict]:
    """Fetch a GitHub Atom feed and return list of {title, link, updated} dicts."""
    NS = "http://www.w3.org/2005/Atom"
    try:
        req = urllib.request.Request(url, headers={
            **HEADERS,
            "Accept": "application/atom+xml, application/xml",
        })
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as r:
            import xml.etree.ElementTree as _ET
            root = _ET.fromstring(r.read())
        entries = root.findall(f"{{{NS}}}entry")
        result = []
        for entry in entries:
            title_el = entry.find(f"{{{NS}}}title")
            link_el = entry.find(f"{{{NS}}}link")
            updated_el = entry.find(f"{{{NS}}}updated")
            content_el = entry.find(f"{{{NS}}}content")
            result.append({
                "title": title_el.text if title_el is not None else "",
                "link": link_el.get("href", "") if link_el is not None else "",
                "updated": updated_el.text if updated_el is not None else "",
                "content": content_el.text[:300] if content_el is not None and content_el.text else "",
            })
        return result
    except Exception as e:
        log.debug(f"Atom fetch error {url}: {e}")
        return []


def _fetch_github_releases() -> list[TopicCandidate]:
    """
    Check watched repos for new releases via GitHub Atom feeds.
    Atom feeds don't require auth and aren't rate-limited like the REST API.
    """
    candidates = []
    for repo in WATCHED_RELEASE_REPOS:
        url = f"https://github.com/{repo}/releases.atom"
        entries = _fetch_atom(url)
        if not entries:
            continue

        # Only look at the most recent release
        entry = entries[0]
        updated_str = entry["updated"]
        try:
            published = datetime.fromisoformat(updated_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            continue

        hours = _hours_ago(published)
        if hours > AI_RELEASE_WINDOW_HOURS * 4:  # skip releases older than 4 days
            continue

        repo_name = repo.split("/")[-1]
        tag = entry["link"].split("/")[-1]  # e.g. "v2.1.207"
        title = f"{repo_name} {tag}"
        text_for_scoring = f"{repo_name} {tag} {entry['content']} claude openai llm ai agent"

        kw_score, matched = _keyword_score(text_for_scoring)
        if kw_score < 0:
            continue

        is_release_24h = hours <= AI_RELEASE_WINDOW_HOURS
        base = max(2.0, kw_score) * _recency_multiplier(hours)
        final = base * (AI_RELEASE_MULTIPLIER if is_release_24h else 1.2)

        product = _clean_product_name(repo_name)
        vn_topic = _to_vn_topic(product, f"{repo_name} {tag} {entry['content']}", "release", True)
        reason = f"release {hours:.1f}h ago | {tag} | score={final:.1f}"
        if is_release_24h:
            reason = "🔴 AI RELEASE 24H | " + reason

        candidates.append(TopicCandidate(
            title=f"{repo}: {title}",
            vn_topic=vn_topic,
            score=final,
            source="release",
            url=entry["link"],
            published_at=published,
            is_ai_release=is_release_24h,
            reason=reason,
        ))

    return candidates


def _fetch_github_trending() -> list[TopicCandidate]:
    """Fetch recently created/updated AI repos via GitHub Search API."""
    candidates = []
    now = _now_utc()
    week_ago = (now - timedelta(days=7)).strftime("%Y-%m-%d")

    queries = [
        # New AI/LLM repos this week
        f"https://api.github.com/search/repositories?q=llm+OR+ai+agent+OR+claude+OR+openai+created:>{week_ago}+stars:>20&sort=stars&per_page=12",
        # Trending AI tools
        f"https://api.github.com/search/repositories?q=ai+tool+OR+mcp+OR+cursor+pushed:>{week_ago}+stars:>50&sort=stars&per_page=8",
    ]

    seen_repos: set[str] = set()
    for url in queries:
        data = _fetch_json(url)
        if not data or "items" not in data:
            continue

        for item in data["items"]:
            full_name = item.get("full_name", "")
            if full_name in seen_repos:
                continue
            seen_repos.add(full_name)

            text = f"{item.get('name', '')} {item.get('description', '') or ''} {' '.join(item.get('topics', []))}"
            kw_score, matched = _keyword_score(text)

            if kw_score < 0 or kw_score < 0.5:  # too weak
                continue

            stars = item.get("stargazers_count", 0)
            pushed_str = item.get("pushed_at", "")
            try:
                pushed = datetime.fromisoformat(pushed_str.replace("Z", "+00:00"))
                hours = _hours_ago(pushed)
            except (ValueError, AttributeError):
                hours = 72.0

            base = kw_score + _stars_bonus(stars)
            final = base * _recency_multiplier(hours)

            title = f"{full_name}: {item.get('description', '')[:80] or item.get('name', '')}"
            product = _clean_product_name(item.get("name", full_name))
            desc_text = (item.get("description") or "") + " " + " ".join(item.get("topics", []))
            vn_topic = _to_vn_topic(product, desc_text, "github", False)

            candidates.append(TopicCandidate(
                title=title,
                vn_topic=vn_topic,
                score=final,
                source="github",
                url=item.get("html_url", ""),
                stars=stars,
                reason=f"★{stars} | kw={matched[:3]} | {hours:.0f}h ago | score={final:.1f}",
            ))

    return candidates


def _fetch_npm_trending() -> list[TopicCandidate]:
    """Fetch new npm packages with AI/LLM keywords."""
    candidates = []
    queries = [
        "https://registry.npmjs.org/-/v1/search?text=llm+ai+agent&quality=0.5&size=15&ranking=0.5",
        "https://registry.npmjs.org/-/v1/search?text=claude+openai+sdk&size=10",
        "https://registry.npmjs.org/-/v1/search?text=mcp+model+context&size=10",
    ]

    seen: set[str] = set()
    for url in queries:
        data = _fetch_json(url)
        if not data or "objects" not in data:
            continue

        for obj in data["objects"]:
            pkg = obj.get("package", {})
            name = pkg.get("name", "")
            if name in seen or not name:
                continue
            seen.add(name)

            desc = pkg.get("description") or ""
            keywords = " ".join(pkg.get("keywords", []))
            text = f"{name} {desc} {keywords}"
            kw_score, matched = _keyword_score(text)

            if kw_score < 0 or kw_score < 0.8:
                continue

            date_str = pkg.get("date", "")
            try:
                published = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                hours = _hours_ago(published)
            except (ValueError, AttributeError):
                hours = 168.0

            # npm packages are niche — only surface very recent ones
            if hours > 72:
                continue

            base = kw_score * _recency_multiplier(hours)
            title = f"npm:{name} — {desc[:70]}"
            product = _clean_product_name(name)
            vn_topic = _to_vn_topic(product, f"{desc} {keywords}", "npm", False)

            candidates.append(TopicCandidate(
                title=title,
                vn_topic=vn_topic,
                score=base,
                source="npm",
                url=f"https://www.npmjs.com/package/{name}",
                published_at=published if "published" in locals() else None,
                reason=f"npm {hours:.0f}h ago | kw={matched[:3]} | score={base:.1f}",
            ))

    return candidates


def _fetch_hacker_news() -> list[TopicCandidate]:
    """
    Fetch Hacker News top stories via Firebase API (no auth needed).
    Filter for AI/tech topics relevant to Vietnamese dev audience.
    """
    candidates = []

    # HN Firebase API — returns list of story IDs
    ids_data = _fetch_json("https://hacker-news.firebaseio.com/v0/topstories.json?limitToFirst=30&orderBy=\"$key\"")
    if not ids_data or not isinstance(ids_data, list):
        # Fallback: try newstories
        ids_data = _fetch_json("https://hacker-news.firebaseio.com/v0/newstories.json?limitToFirst=30&orderBy=\"$key\"")

    if not ids_data or not isinstance(ids_data, list):
        log.warning("HN Firebase API unavailable")
        return candidates

    # Fetch individual stories (limit to first 20 to avoid rate limiting)
    for story_id in ids_data[:20]:
        story = _fetch_json(f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json")
        if not story or story.get("type") != "story":
            continue

        title = story.get("title", "")
        url = story.get("url", f"https://news.ycombinator.com/item?id={story_id}")
        score_hn = story.get("score", 0)  # HN upvotes
        time_unix = story.get("time", 0)
        comments = story.get("descendants", 0)

        if not title:
            continue

        kw_score, matched = _keyword_score(title)
        if kw_score < 0 or kw_score < 1.0:  # HN needs higher bar
            continue

        hours = _hours_ago(datetime.fromtimestamp(time_unix, tz=timezone.utc)) if time_unix else 48.0

        # HN engagement signals
        engagement_bonus = math.log10(score_hn + 1) * 0.3 + math.log10(comments + 1) * 0.2

        base = kw_score + engagement_bonus
        final = base * _recency_multiplier(hours)

        # Check if AI release news (higher bar — title must mention release/launch)
        is_release = any(kw in title.lower() for kw in ["release", "launch", "announce", "introduce", "new model"])
        if is_release:
            final *= AI_RELEASE_MULTIPLIER

        product = _clean_product_name(title)
        vn_topic = _to_vn_topic(product, title, "hn", is_release)

        candidates.append(TopicCandidate(
            title=title,
            vn_topic=vn_topic,
            score=final,
            source="hn",
            url=url,
            is_ai_release=is_release,
            reason=f"HN ↑{score_hn} 💬{comments} | {hours:.0f}h ago | kw={matched[:3]} | score={final:.1f}",
        ))

    return candidates


# ── Deduplication ─────────────────────────────────────────────────────────────

def _load_cache() -> set[str]:
    """Load previously pushed topics to avoid duplicates."""
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not CACHE_FILE.exists():
        return set()
    try:
        with open(CACHE_FILE) as f:
            data = json.load(f)
        return set(data.get("pushed", []))
    except Exception:
        return set()


def _save_cache(pushed: set[str]) -> None:
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    # Keep last 100 entries to prevent unbounded growth
    pushed_list = list(pushed)[-100:]
    with open(CACHE_FILE, "w") as f:
        json.dump({"pushed": pushed_list, "updated_at": _now_utc().isoformat()}, f, ensure_ascii=False, indent=2)


def _is_duplicate(candidate: TopicCandidate, already_in_queue: list[str], cache: set[str]) -> bool:
    """Check if this topic is too similar to something already queued/done."""
    vn_lower = candidate.vn_topic.lower()
    title_lower = candidate.title.lower()

    for existing in already_in_queue:
        existing_lower = existing.lower()
        # Simple overlap check: share 3+ words → likely duplicate
        words_a = set(vn_lower.split())
        words_b = set(existing_lower.split())
        if len(words_a & words_b) >= 3:
            return True

    # Check cache (previously pushed topics)
    for cached in cache:
        words_a = set(title_lower.split())
        words_b = set(cached.lower().split())
        if len(words_a & words_b) >= 3:
            return True

    return False


# ── Queue helpers ─────────────────────────────────────────────────────────────

def _load_queue() -> dict:
    if not QUEUE_FILE.exists():
        log.warning(f"Queue file not found: {QUEUE_FILE} — creating empty queue")
        empty = {"_comment": "VidGen topic queue", "pending": [], "done": []}
        with open(QUEUE_FILE, "w", encoding="utf-8") as f:
            json.dump(empty, f, ensure_ascii=False, indent=2)
        return empty
    with open(QUEUE_FILE, encoding="utf-8") as f:
        return json.load(f)


def _save_queue(queue: dict) -> None:
    with open(QUEUE_FILE, "w", encoding="utf-8") as f:
        json.dump(queue, f, ensure_ascii=False, indent=2)


def _push_to_queue(topics: list[str]) -> None:
    queue = _load_queue()
    queue.setdefault("pending", [])
    existing = set(queue["pending"])
    added = []
    for t in topics:
        if t not in existing:
            queue["pending"].append(t)
            existing.add(t)
            added.append(t)
    _save_queue(queue)
    for t in added:
        log.info(f"  → Pushed: {t}")


# ── Main harvest ──────────────────────────────────────────────────────────────

def harvest(dry_run: bool = False, top_n: int = 5, push_n: int = 1) -> list[TopicCandidate]:
    """
    Run all scrapers, score, deduplicate, and optionally push to queue.
    Returns sorted list of TopicCandidate (best first).
    """
    log.info("─" * 55)
    log.info("VidGen Topic Harvester — starting")
    log.info("─" * 55)

    # ── Scrape all sources ────────────────────────────────────────────────────
    all_candidates: list[TopicCandidate] = []

    log.info("Fetching GitHub releases (watched repos)...")
    releases = _fetch_github_releases()
    log.info(f"  {len(releases)} release candidates")
    all_candidates.extend(releases)

    log.info("Fetching GitHub trending (AI repos)...")
    gh = _fetch_github_trending()
    log.info(f"  {len(gh)} GitHub candidates")
    all_candidates.extend(gh)

    log.info("Fetching npm trending (AI packages)...")
    npm = _fetch_npm_trending()
    log.info(f"  {len(npm)} npm candidates")
    all_candidates.extend(npm)

    log.info("Fetching Hacker News top stories...")
    hn = _fetch_hacker_news()
    log.info(f"  {len(hn)} HN candidates")
    all_candidates.extend(hn)

    if not all_candidates:
        log.warning("No candidates found from any source.")
        return []

    # ── Sort by score (desc) ──────────────────────────────────────────────────
    all_candidates.sort(key=lambda c: c.score, reverse=True)

    # ── Deduplicate ───────────────────────────────────────────────────────────
    queue = _load_queue()
    in_queue = queue.get("pending", []) + [e["topic"] for e in queue.get("done", [])]
    cache = _load_cache()

    unique: list[TopicCandidate] = []
    seen_vn: set[str] = set()
    for c in all_candidates:
        if c.vn_topic in seen_vn:
            continue
        if _is_duplicate(c, in_queue, cache):
            log.debug(f"  skip duplicate: {c.vn_topic[:60]}")
            continue
        seen_vn.add(c.vn_topic)
        unique.append(c)

    # ── Display top N ─────────────────────────────────────────────────────────
    display_n = max(top_n, push_n)
    log.info(f"\n{'─'*55}")
    log.info(f"TOP {display_n} TOPICS (scored)")
    log.info(f"{'─'*55}")

    for i, c in enumerate(unique[:display_n], 1):
        release_tag = " 🔴 AI RELEASE" if c.is_ai_release else ""
        log.info(f"\n#{i} [{c.source.upper()}] score={c.score:.1f}{release_tag}")
        log.info(f"   EN:  {c.title[:80]}")
        log.info(f"   VN:  {c.vn_topic}")
        log.info(f"   why: {c.reason}")
        if c.url:
            log.info(f"   url: {c.url}")

    log.info(f"\n{'─'*55}")

    # ── Push to queue ─────────────────────────────────────────────────────────
    to_push = [c.vn_topic for c in unique[:push_n]]

    if dry_run:
        log.info(f"[dry-run] Would push {len(to_push)} topic(s):")
        for t in to_push:
            log.info(f"  → {t}")
    else:
        log.info(f"Pushing {len(to_push)} topic(s) to queue...")
        _push_to_queue(to_push)
        # Update cache
        new_cache = cache | {c.title for c in unique[:push_n]}
        _save_cache(new_cache)
        log.info("Done ✅")

    return unique


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Harvest AI news topics and push to VidGen queue",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--dry-run", action="store_true", help="Score and display without pushing to queue")
    parser.add_argument("--top", type=int, default=5, metavar="N", help="Display top N topics (default: 5)")
    parser.add_argument("--push", type=int, default=1, metavar="N", help="Push top N topics to queue (default: 1)")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    args = parser.parse_args()

    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)

    push_n = min(args.push, MAX_PUSH_PER_RUN)
    results = harvest(dry_run=args.dry_run, top_n=args.top, push_n=push_n)

    if not results:
        log.error("No topics found — check network and try again.")
        sys.exit(1)


if __name__ == "__main__":
    main()