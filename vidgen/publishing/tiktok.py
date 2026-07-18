"""
vidgen/publishing/tiktok.py — Publish to TikTok (Direct Post mode)

Flow:
    1. Initialize upload session  → TikTok returns upload_url
    2. PUT video chunks           → TikTok stores the file
    3. POST publish               → video goes live on profile
    4. Poll status                → wait until PUBLISH_COMPLETE
    5. GitHub Actions notification → trigger workflow, email on failure

Setup (one-time):
    See SETUP.md or run: python -m vidgen.publishing.tiktok --setup-guide

Usage:
    python -m vidgen.publishing.tiktok out/my-topic.mp4 --title "Tiêu đề video #tech"
    python -m vidgen.publishing.tiktok out/my-topic.mp4 --title "..." --schedule "2026-07-11T20:00:00"
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
import time
from pathlib import Path
from typing import Optional

import requests

# ── Config (set via env vars or .env file) ────────────────────────────────────
TIKTOK_CLIENT_KEY    = os.getenv("TIKTOK_CLIENT_KEY", "")
TIKTOK_CLIENT_SECRET = os.getenv("TIKTOK_CLIENT_SECRET", "")
TIKTOK_ACCESS_TOKEN  = os.getenv("TIKTOK_ACCESS_TOKEN", "")   # from OAuth flow
TIKTOK_REFRESH_TOKEN = os.getenv("TIKTOK_REFRESH_TOKEN", "")  # for auto-renew

GITHUB_REPO          = os.getenv("GITHUB_REPO", "")          # e.g. "nguyenhau442001/VidGen"
GITHUB_TOKEN         = os.getenv("GITHUB_TOKEN", "")          # Personal Access Token (classic)
GITHUB_WORKFLOW      = os.getenv("GITHUB_WORKFLOW", "notify.yml")

TOKENS_FILE = Path(__file__).parent.parent / ".tiktok_tokens.json"

# ── TikTok API constants ──────────────────────────────────────────────────────
API_BASE        = "https://open.tiktokapis.com/v2"
UPLOAD_BASE     = "https://open-upload.tiktokapis.com"
CHUNK_SIZE      = 10 * 1024 * 1024   # 10 MB per chunk (TikTok min: 5 MB)
POLL_INTERVAL   = 5                   # seconds between status checks
POLL_MAX        = 60                  # max poll attempts (~5 minutes)

CAPTION_MODEL = os.getenv("ANTHROPIC_CAPTION_MODEL", "claude-sonnet-4-6")
CAPTION_API_URL = "https://api.anthropic.com/v1/messages"
CAPTION_API_VERSION = "2023-06-01"
CAPTION_MAX_TOKENS = 512

# ── Privacy options ───────────────────────────────────────────────────────────
PRIVACY_PUBLIC       = "PUBLIC_TO_EVERYONE"
PRIVACY_FRIENDS      = "MUTUAL_FOLLOW_FRIENDS"
PRIVACY_FOLLOWERS    = "FOLLOWER_OF_CREATOR"
PRIVACY_SELF         = "SELF_ONLY"


# ── Token management ──────────────────────────────────────────────────────────

def _load_tokens() -> dict:
    """Load tokens from file (preferred) or env vars."""
    if TOKENS_FILE.exists():
        with open(TOKENS_FILE) as f:
            return json.load(f)
    return {
        "access_token":  TIKTOK_ACCESS_TOKEN,
        "refresh_token": TIKTOK_REFRESH_TOKEN,
    }


def _save_tokens(tokens: dict) -> None:
    with open(TOKENS_FILE, "w") as f:
        json.dump(tokens, f, indent=2)
    print(f"[publisher] Tokens saved to {TOKENS_FILE}")


def _refresh_access_token(refresh_token: str) -> dict:
    """Exchange refresh token for a new access token."""
    resp = requests.post(
        "https://open.tiktokapis.com/v2/oauth/token/",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={
            "client_key":    TIKTOK_CLIENT_KEY,
            "client_secret": TIKTOK_CLIENT_SECRET,
            "grant_type":    "refresh_token",
            "refresh_token": refresh_token,
        },
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("error"):
        raise RuntimeError(f"Token refresh failed: {data}")
    return {
        "access_token":  data["access_token"],
        "refresh_token": data.get("refresh_token", refresh_token),
        "expires_in":    data.get("expires_in", 86400),
    }


def _get_valid_token() -> str:
    """Return a valid access token, refreshing if needed."""
    tokens = _load_tokens()
    access_token = tokens.get("access_token", "")

    if not access_token:
        raise RuntimeError(
            "No TikTok access token found.\n"
            "Run: python -m vidgen.publishing.tiktok --setup-guide\n"
            "to complete the OAuth flow and get your tokens."
        )

    # Quick validity check — call creator info endpoint
    resp = requests.post(
        f"{API_BASE}/post/publish/creator_info/query/",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type":  "application/json; charset=UTF-8",
        },
    )

    if resp.status_code == 401:
        print("[publisher] Access token expired — refreshing...")
        refresh_token = tokens.get("refresh_token", "")
        if not refresh_token:
            raise RuntimeError("No refresh token available. Re-run OAuth flow.")
        new_tokens = _refresh_access_token(refresh_token)
        _save_tokens(new_tokens)
        return new_tokens["access_token"]

    return access_token


# ── Creator info ──────────────────────────────────────────────────────────────

def _get_creator_info(access_token: str) -> dict:
    """Fetch creator's privacy options and posting constraints."""
    resp = requests.post(
        f"{API_BASE}/post/publish/creator_info/query/",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type":  "application/json; charset=UTF-8",
        },
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("error", {}).get("code") != "ok":
        raise RuntimeError(f"Creator info failed: {data}")
    return data["data"]


# ── Auto caption generation ──────────────────────────────────────────────────

CAPTION_SYSTEM_PROMPT = """Bạn là copywriter TikTok cho video công nghệ ngắn.
Trả về JSON thuần túy, không markdown, không giải thích ngoài JSON.

Mục tiêu:
- Viết một caption ngắn, tự nhiên, gây tò mò.
- Sinh đúng 3 hashtag liên quan, không generic rác.
- Ưu tiên topic + hook narration + key scenes đã cung cấp.

Output format:
{
  "caption": "chuỗi text caption",
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}

Rules:
- caption nên gọn, sắc, dễ đọc trên mobile.
- hashtags phải chính xác 3 phần tử, mỗi phần tử là một hashtag hợp lệ.
- Không dùng markdown, list, hay code fence."""


def _strip_markdown_fences(text: str) -> str:
    """Remove ```json fences while preserving plain text."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = "\n".join(cleaned.split("\n")[1:])
    if cleaned.endswith("```"):
        cleaned = "\n".join(cleaned.split("\n")[:-1])
    return cleaned.strip()


def _normalize_hashtag(tag: str) -> str:
    """Coerce a model-generated token into a plain hashtag."""
    cleaned = re.sub(r"\s+", "", str(tag)).strip().lstrip("#")
    cleaned = re.sub(r"[^\wÀ-ỹ]+", "", cleaned, flags=re.UNICODE)
    return f"#{cleaned}" if cleaned else ""


def _dedupe_preserve_order(items: list[str]) -> list[str]:
    seen = set()
    result = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            result.append(item)
    return result


def _caption_source_candidates(video_path: Path, source_path: str | Path | None = None) -> list[Path]:
    repo_root = Path(__file__).parent.parent
    stem = video_path.stem
    candidates: list[Path] = []

    if source_path:
        candidates.append(Path(source_path))

    candidates.extend([
        repo_root / "content" / f"script_{stem}.json",
        repo_root / "content" / f"{stem}.json",
        repo_root / "output" / "render_manifest.json",
    ])

    return candidates


def _load_caption_source(video_path: Path, source_path: str | Path | None = None) -> tuple[dict, Path | None]:
    for candidate in _caption_source_candidates(video_path, source_path):
        if candidate.exists():
            with open(candidate, encoding="utf-8") as f:
                return json.load(f), candidate
    return {}, None


def _topic_from_path(path: str | Path | None) -> str:
    if not path:
        return ""

    stem = Path(path).stem
    if stem == "render_manifest":
        return ""
    if stem.startswith("script_"):
        stem = stem[len("script_"):]

    return re.sub(r"[_-]+", " ", stem).strip()


def _scene_signal_score(scene: dict) -> int:
    score = 0
    for key in ("narration", "on_screen_text", "caption"):
        value = scene.get(key)
        if value:
            score += len(str(value).split())
    visual = scene.get("props") or scene.get("visual") or {}
    for key in ("headline", "body", "topicLabel", "partLabel", "leftCaption", "rightCaption"):
        if visual.get(key):
            score += 2
    return score


def _scene_summary(scene: dict) -> str:
    visual = scene.get("props") or scene.get("visual") or {}
    parts = [
        f"id={scene.get('id', '?')}",
        f"type={scene.get('type', '?')}",
    ]

    for key in ("narration", "on_screen_text", "caption"):
        value = scene.get(key)
        if value:
            parts.append(f"{key}={value}")

    for key in ("headline", "body", "topicLabel", "partLabel", "leftCaption", "rightCaption", "screenState"):
        value = visual.get(key)
        if value:
            parts.append(f"{key}={value}")

    return " | ".join(parts)


def _build_caption_brief(source: dict, video_path: Path, source_path: str | Path | None = None) -> dict:
    shots = source.get("shots") or source.get("scenes") or []
    topic = (
        source.get("title")
        or source.get("meta", {}).get("title")
        or _topic_from_path(source_path)
        or _topic_from_path(video_path)
    ).strip()

    scored = [(idx, shot, _scene_signal_score(shot)) for idx, shot in enumerate(shots)]
    signal_shots = [item for item in scored if item[2] > 0]
    if not signal_shots:
        signal_shots = scored

    key_indices: list[int] = []
    if signal_shots:
        anchors = [signal_shots[0][0], signal_shots[len(signal_shots) // 2][0], signal_shots[-1][0]]
        for idx in anchors:
            if idx not in key_indices:
                key_indices.append(idx)

    key_scenes = [_scene_summary(shots[idx]) for idx in key_indices if idx < len(shots)]
    hook_narration = ""
    for shot in shots:
        hook_narration = shot.get("narration") or shot.get("on_screen_text") or shot.get("caption") or ""
        if hook_narration:
            break

    return {
        "topic": topic,
        "hook_narration": hook_narration,
        "key_scenes": key_scenes,
        "source_count": len(shots),
    }


def _build_caption_messages(brief: dict) -> list[dict]:
    key_scenes = "\n".join(
        f"{i + 1}. {scene}" for i, scene in enumerate(brief["key_scenes"])
    ) or "1. Không có key scenes rõ ràng."

    user_prompt = f"""Tạo caption TikTok bằng tiếng Việt từ dữ liệu sau.

TOPIC:
{brief['topic']}

HOOK NARRATION:
{brief['hook_narration'] or 'N/A'}

KEY SCENES:
{key_scenes}

Yêu cầu:
- Viết caption tự nhiên, sắc, có curiosity.
- Dựa trên topic + hook + key scenes, không lan man.
- Sinh đúng 3 hashtag, liên quan trực tiếp.
- Trả về JSON với keys caption và hashtags."""

    return [{"role": "user", "content": user_prompt}]


def _call_caption_model(messages: list[dict]) -> str:
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not set")

    resp = requests.post(
        CAPTION_API_URL,
        headers={
            "Content-Type": "application/json",
            "anthropic-version": CAPTION_API_VERSION,
            "x-api-key": api_key,
        },
        json={
            "model": CAPTION_MODEL,
            "max_tokens": CAPTION_MAX_TOKENS,
            "system": CAPTION_SYSTEM_PROMPT,
            "messages": messages,
        },
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("error"):
        raise RuntimeError(f"Caption generation failed: {data}")

    content = data.get("content", [])
    return "".join(block.get("text", "") for block in content if block.get("type") == "text")


def _fallback_caption(brief: dict) -> tuple[str, list[str]]:
    topic_words = [w for w in re.findall(r"[\wÀ-ỹ]+", brief["topic"].lower()) if len(w) > 2]
    topic_hash = _normalize_hashtag("".join(topic_words[:2])) if topic_words else "#vidgen"
    hook_hash = _normalize_hashtag("".join(re.findall(r"[\wÀ-ỹ]+", brief["hook_narration"].lower())[:2])) if brief["hook_narration"] else "#tiktoktech"
    scene_words = []
    for scene in brief["key_scenes"]:
        scene_words.extend(re.findall(r"[\wÀ-ỹ]+", scene.lower()))
    scene_hash = _normalize_hashtag("".join(w for w in scene_words if len(w) > 2)[:18]) if scene_words else "#congnghe"

    hashtags = _dedupe_preserve_order([tag for tag in [topic_hash, hook_hash, scene_hash] if tag])[:3]
    while len(hashtags) < 3:
        hashtags.append(["#vidgen", "#congnghe", "#tiktoktech"][len(hashtags)])

    caption = brief["hook_narration"] or brief["topic"]
    return caption, hashtags[:3]


def _compose_caption(caption: str, hashtags: list[str], limit: int = 2200) -> str:
    hashtags = _dedupe_preserve_order([tag for tag in (_normalize_hashtag(tag) for tag in hashtags) if tag])[:3]
    if len(hashtags) < 3:
        fallback = ["#vidgen", "#congnghe", "#tiktoktech"]
        for tag in fallback:
            if len(hashtags) >= 3:
                break
            if tag not in hashtags:
                hashtags.append(tag)

    tag_block = " ".join(hashtags)
    caption = caption.strip()
    if not caption:
        return tag_block[:limit]

    room = max(0, limit - len(tag_block) - 1)
    if len(caption) > room:
        caption = caption[: max(0, room - 1)].rstrip(" ,;:-—")
        caption = caption + "…"

    return f"{caption}\n{tag_block}"


def _generate_tiktok_caption(video_path: Path, source_path: str | Path | None = None) -> str:
    source, resolved_source = _load_caption_source(video_path, source_path)
    brief = _build_caption_brief(source, video_path, resolved_source or source_path)

    try:
        raw = _call_caption_model(_build_caption_messages(brief))
        payload = json.loads(_strip_markdown_fences(raw))
        caption = str(payload.get("caption", "")).strip()
        hashtags = [tag for tag in (_normalize_hashtag(tag) for tag in payload.get("hashtags", [])) if tag]
        hashtags = _dedupe_preserve_order(hashtags)[:3]
        if len(hashtags) < 3:
            _, fallback_hashtags = _fallback_caption(brief)
            for tag in fallback_hashtags:
                if len(hashtags) >= 3:
                    break
                if tag not in hashtags:
                    hashtags.append(tag)

        if not caption:
            raise RuntimeError("Caption model returned an empty caption")

        final_caption = _compose_caption(caption, hashtags)
        print(
            "[publisher] Caption generated"
            + (f" from {resolved_source.name}" if resolved_source else " from auto-detect")
        )
        return final_caption
    except Exception as e:
        fallback_caption, fallback_hashtags = _fallback_caption(brief)
        print(f"[publisher] Caption generation failed ({e}) — using fallback")
        return _compose_caption(fallback_caption, fallback_hashtags)


# ── Step 1: Initialize upload ─────────────────────────────────────────────────

def _init_upload(
    access_token: str,
    video_path: Path,
    chunk_size: int,
) -> tuple[str, str]:
    """
    Initialize a Direct Post upload session.
    Returns (publish_id, upload_url).
    """
    video_size = video_path.stat().st_size
    total_chunks = math.ceil(video_size / chunk_size)

    resp = requests.post(
        f"{API_BASE}/post/publish/video/init/",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type":  "application/json; charset=UTF-8",
        },
        json={
            "post_info": {
                "title":          "",   # filled later in publish step
                "privacy_level":  PRIVACY_PUBLIC,
                "disable_duet":   False,
                "disable_stitch": False,
                "disable_comment": False,
            },
            "source_info": {
                "source":            "FILE_UPLOAD",
                "video_size":        video_size,
                "chunk_size":        chunk_size,
                "total_chunk_count": total_chunks,
            },
        },
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("error", {}).get("code") != "ok":
        raise RuntimeError(f"Upload init failed: {data}")

    publish_id = data["data"]["publish_id"]
    upload_url = data["data"]["upload_url"]
    print(f"[publisher] Upload initialized — publish_id={publish_id}")
    return publish_id, upload_url


# ── Step 2: Upload video in chunks ────────────────────────────────────────────

def _upload_chunks(video_path: Path, upload_url: str, chunk_size: int) -> None:
    """PUT video file to TikTok in chunks."""
    video_size = video_path.stat().st_size
    total_chunks = math.ceil(video_size / chunk_size)

    with open(video_path, "rb") as f:
        for i in range(total_chunks):
            start = i * chunk_size
            end   = min(start + chunk_size, video_size) - 1
            chunk = f.read(chunk_size)

            resp = requests.put(
                upload_url,
                headers={
                    "Content-Range":  f"bytes {start}-{end}/{video_size}",
                    "Content-Length": str(len(chunk)),
                    "Content-Type":   "video/mp4",
                },
                data=chunk,
            )

            if resp.status_code not in (200, 201, 206):
                raise RuntimeError(
                    f"Chunk {i+1}/{total_chunks} upload failed "
                    f"(HTTP {resp.status_code}): {resp.text[:200]}"
                )

            pct = round((i + 1) / total_chunks * 100)
            print(f"[publisher] Uploading... {pct}% ({i+1}/{total_chunks} chunks)", end="\r")

    print(f"\n[publisher] Upload complete: {video_path.name} ({video_size // 1024 // 1024} MB)")


# ── Step 3: Publish (set title, privacy, schedule) ────────────────────────────

def _publish(
    access_token: str,
    publish_id: str,
    title: str,
    privacy: str = PRIVACY_PUBLIC,
    schedule_time: Optional[str] = None,   # ISO-8601 e.g. "2026-07-11T20:00:00"
) -> None:
    """
    Finalize the post with title, privacy, and optional schedule.
    schedule_time: ISO-8601 string in your local time; will be converted to Unix timestamp.
    """
    post_info: dict = {
        "title":          title[:2200],   # TikTok max caption length
        "privacy_level":  privacy,
        "disable_duet":   False,
        "disable_stitch": False,
        "disable_comment": False,
        "is_aigc":        True,           # flag as AI-generated content (policy compliance)
    }

    if schedule_time:
        import datetime
        dt = datetime.datetime.fromisoformat(schedule_time)
        post_info["scheduled_publish_time"] = int(dt.timestamp())
        print(f"[publisher] Scheduled for: {schedule_time}")

    resp = requests.post(
        f"{API_BASE}/post/publish/video/init/",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type":  "application/json; charset=UTF-8",
        },
        json={
            "publish_id": publish_id,
            "post_info":  post_info,
        },
    )
    # TikTok returns 200 even on success here; check error field
    data = resp.json()
    err = data.get("error", {})
    if err.get("code") not in ("ok", ""):
        raise RuntimeError(f"Publish step failed: {data}")
    print(f"[publisher] Post submitted — publish_id={publish_id}")


# ── Step 4: Poll publish status ───────────────────────────────────────────────

def _poll_status(access_token: str, publish_id: str) -> dict:
    """Poll until status is PUBLISH_COMPLETE or FAILED."""
    print(f"[publisher] Polling publish status...")

    for attempt in range(1, POLL_MAX + 1):
        resp = requests.post(
            f"{API_BASE}/post/publish/status/fetch/",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type":  "application/json; charset=UTF-8",
            },
            json={"publish_id": publish_id},
        )
        resp.raise_for_status()
        data = resp.json()
        status = data.get("data", {}).get("status", "UNKNOWN")

        print(f"[publisher] Status [{attempt}/{POLL_MAX}]: {status}")

        if status == "PUBLISH_COMPLETE":
            return data["data"]
        if status in ("FAILED", "PUBLISH_FAILED"):
            fail_reason = data.get("data", {}).get("fail_reason", "unknown")
            raise RuntimeError(f"TikTok publish failed: {fail_reason}")

        time.sleep(POLL_INTERVAL)

    raise RuntimeError(f"Publish did not complete after {POLL_MAX * POLL_INTERVAL}s")


# ── Step 5: GitHub Actions notification ──────────────────────────────────────

def _notify_github(
    video_name: str,
    status: str,           # "OK" hoặc "FAIL: <reason>"
    publish_id: str = "",
    share_url: str = "",
    duration: str = "",
) -> None:
    """
    Trigger GitHub Actions workflow_dispatch để gửi notification.
    - Nếu status=OK   → workflow job pass → GitHub KHÔNG gửi email (silent success)
    - Nếu status=FAIL → workflow job exit 1 → GitHub gửi email thất bại tới bạn
    Silently skip nếu GITHUB_REPO / GITHUB_TOKEN chưa được set.
    """
    if not GITHUB_REPO or not GITHUB_TOKEN:
        print("[publisher] GitHub notify skipped (GITHUB_REPO / GITHUB_TOKEN not set in .env)")
        return

    url = (
        f"https://api.github.com/repos/{GITHUB_REPO}"
        f"/actions/workflows/{GITHUB_WORKFLOW}/dispatches"
    )

    try:
        resp = requests.post(
            url,
            headers={
                "Authorization":        f"Bearer {GITHUB_TOKEN}",
                "Accept":               "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            json={
                "ref": "main",
                "inputs": {
                    "video_name":    video_name,
                    "tiktok_status": status,
                    "publish_id":    publish_id,
                    "share_url":     share_url,
                    "duration":      duration,
                },
            },
            timeout=10,
        )
        if resp.status_code == 204:
            print("[publisher] GitHub notification triggered → check Actions tab")
        else:
            print(f"[publisher] GitHub notify failed (non-fatal): HTTP {resp.status_code} {resp.text[:100]}")
    except Exception as e:
        print(f"[publisher] GitHub notify error (non-fatal): {e}")


# ── Main publish function ─────────────────────────────────────────────────────

def publish_tiktok(
    video_path: str | Path,
    title: str,
    privacy: str = PRIVACY_PUBLIC,
    schedule_time: Optional[str] = None,
    source_path: str | Path | None = None,
    auto_caption: bool = False,
) -> dict:
    """
    Full pipeline: token check → init → upload → publish → poll → notify.

    Args:
        video_path:    Path to the rendered .mp4
        title:         Caption override; when blank, auto-generate from the source script
        privacy:       One of PRIVACY_PUBLIC / PRIVACY_FRIENDS / PRIVACY_FOLLOWERS / PRIVACY_SELF
        schedule_time: ISO-8601 string for scheduled post, or None for immediate
        source_path:   Optional script/manifest JSON used for caption generation
        auto_caption:  Force LLM caption generation even when title is provided

    Returns:
        dict with publish_id, status, and share_url (if available)
    """
    video_path = Path(video_path)
    if not video_path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    print(f"\n── TikTok Publish ───────────────────────────────────")
    print(f"   File:    {video_path.name} ({video_path.stat().st_size // 1024 // 1024} MB)")
    should_auto_caption = auto_caption or not title.strip()
    caption_preview = "<auto-generate>" if should_auto_caption else title[:60] + ("..." if len(title) > 60 else "")
    print(f"   Caption: {caption_preview}")
    print(f"   Privacy: {privacy}")

    _start_time = time.time()

    try:
        # 1. Get valid token
        access_token = _get_valid_token()

        # 2. Check creator info (ensure direct post is available)
        creator = _get_creator_info(access_token)
        print(f"   Creator: @{creator.get('creator_username', '?')}")
        available_privacy = creator.get("privacy_level_options", [])
        if privacy not in available_privacy and privacy != PRIVACY_SELF:
            print(f"[publisher] WARNING: '{privacy}' not in creator's options {available_privacy}")
            print(f"[publisher] Falling back to SELF_ONLY (app not yet audited?)")
            privacy = PRIVACY_SELF

        # 3. Init upload
        publish_id, upload_url = _init_upload(access_token, video_path, CHUNK_SIZE)

        # 4. Upload chunks
        _upload_chunks(video_path, upload_url, CHUNK_SIZE)

        # 5. Build caption right before publish, then post it
        caption = _generate_tiktok_caption(video_path, source_path) if should_auto_caption else title.strip()
        print(f"   Final caption: {caption[:80]}{'...' if len(caption) > 80 else ''}")
        _publish(access_token, publish_id, caption, privacy, schedule_time)

        # 6. Poll status
        result = _poll_status(access_token, publish_id)

        share_url = result.get("share_url", "")
        duration  = str(int(time.time() - _start_time))
        print(f"\n[publisher] DONE in {duration}s: {share_url or publish_id}")

        # 7. GitHub notification — success (silent, no email)
        _notify_github(
            video_name=video_path.name,
            status="OK",
            publish_id=publish_id,
            share_url=share_url,
            duration=duration,
        )

        return {"publish_id": publish_id, "status": "PUBLISH_COMPLETE", "share_url": share_url}

    except Exception as e:
        # 7. GitHub notification — failure (triggers email to you)
        _notify_github(
            video_name=video_path.name,
            status=f"FAIL: {e}",
            duration=str(int(time.time() - _start_time)),
        )
        raise


# ── Setup guide ───────────────────────────────────────────────────────────────

SETUP_GUIDE = """
╔══ TikTok Publisher — One-time Setup Guide ══════════════════════════════
║
║  STEP 1 — Create TikTok Developer App
║  ─────────────────────────────────────
║  1. Go to https://developers.tiktok.com/
║  2. Log in with your TikTok account
║  3. Click "Manage apps" → "Connect an app" → "Create a new app"
║  4. Fill in:
║       App name:     VidGen Publisher (or anything)
║       Category:     Entertainment / Education
║       Description:  Automated short-form video publishing pipeline
║  5. Under "Products", add:  Content Posting API
║  6. Under "Content Posting API", enable:
║       - video.publish  (for direct post)
║       - video.upload   (for inbox mode fallback)
║  7. Set Redirect URI to:  http://localhost:8080/callback
║  8. Save → copy your CLIENT KEY and CLIENT SECRET
║
║  STEP 2 — Add credentials to .env
║  ──────────────────────────────────
║  Create a file called .env at your repo root:
║
║    TIKTOK_CLIENT_KEY=your_client_key_here
║    TIKTOK_CLIENT_SECRET=your_client_secret_here
║    GITHUB_REPO=nguyenhau442001/VidGen   # your repo (for notifications)
║    GITHUB_TOKEN=ghp_xxxxxxxxxxxx        # Personal Access Token (classic)
║    # Tạo token tại: Settings → Developer settings → Personal access tokens
║    # Scope cần chọn: repo → workflow
║
║  STEP 3 — Run OAuth flow to get access token
║  ─────────────────────────────────────────────
║  Run this helper to open the auth URL and exchange the code:
║
║    python -m vidgen.publishing.tiktok --oauth
║
║  This saves access_token + refresh_token to .tiktok_tokens.json
║
║  STEP 4 — Submit app for audit (for PUBLIC posts)
║  ──────────────────────────────────────────────────
║  Until your app passes TikTok's audit, posts are SELF_ONLY.
║  publisher.py detects this and falls back automatically.
║
║  To submit for audit:
║  1. In TikTok Developer Console → your app → "Audit"
║  2. Record a short demo video showing the upload flow
║  3. Submit — review takes 1-7 business days
║
║  STEP 5 — Test
║  ───────────────
║    python -m vidgen.publishing.tiktok out/test.mp4 --title "Test #60scongnghe"
║
╚═════════════════════════════════════════════════════════════════════════
"""


def _run_oauth_flow() -> None:
    """Interactive OAuth flow — opens browser, waits for redirect, saves tokens."""
    import urllib.parse
    import webbrowser
    from http.server import BaseHTTPRequestHandler, HTTPServer

    if not TIKTOK_CLIENT_KEY:
        print("ERROR: TIKTOK_CLIENT_KEY not set. Add it to your .env file first.")
        sys.exit(1)

    scopes = "video.publish,video.upload,user.info.basic"
    auth_url = (
        "https://www.tiktok.com/v2/auth/authorize/"
        f"?client_key={TIKTOK_CLIENT_KEY}"
        f"&scope={urllib.parse.quote(scopes)}"
        "&response_type=code"
        "&redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Fcallback"
    )

    print(f"\nOpening TikTok auth page in browser...")
    print(f"If it doesn't open, visit:\n{auth_url}\n")
    webbrowser.open(auth_url)

    auth_code = None

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            nonlocal auth_code
            parsed = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            if "code" in params:
                auth_code = params["code"][0]
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"<h2>Auth successful! You can close this tab.</h2>")
            else:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"<h2>Auth failed - no code received.</h2>")

        def log_message(self, *args):
            pass   # suppress server logs

    print("Waiting for TikTok to redirect to localhost:8080/callback ...")
    server = HTTPServer(("localhost", 8080), Handler)
    server.handle_request()

    if not auth_code:
        print("ERROR: No auth code received.")
        sys.exit(1)

    print(f"Auth code received. Exchanging for tokens...")
    resp = requests.post(
        "https://open.tiktokapis.com/v2/oauth/token/",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={
            "client_key":    TIKTOK_CLIENT_KEY,
            "client_secret": TIKTOK_CLIENT_SECRET,
            "code":          auth_code,
            "grant_type":    "authorization_code",
            "redirect_uri":  "http://localhost:8080/callback",
        },
    )
    resp.raise_for_status()
    data = resp.json()

    if data.get("error"):
        print(f"ERROR: Token exchange failed: {data}")
        sys.exit(1)

    tokens = {
        "access_token":  data["access_token"],
        "refresh_token": data["refresh_token"],
        "expires_in":    data.get("expires_in", 86400),
        "open_id":       data.get("open_id", ""),
    }
    _save_tokens(tokens)
    print(f"\nTokens saved to {TOKENS_FILE}")
    print("Setup complete! You can now run:")
    print("  python -m vidgen.publishing.tiktok out/video.mp4 --title 'Your title #hashtag'")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    # Load .env if present
    env_file = Path(__file__).parent.parent / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

    parser = argparse.ArgumentParser(description="VidGen TikTok publisher")
    parser.add_argument("video", nargs="?", help="Path to .mp4 file")
    parser.add_argument("--title", default="", help="Manual caption override")
    parser.add_argument(
        "--auto-caption",
        action="store_true",
        help="Generate caption + 3 hashtags from topic, hook narration, and key scenes",
    )
    parser.add_argument("--source", default=None, help="Optional script/manifest JSON for auto caption generation")
    parser.add_argument(
        "--privacy",
        default=PRIVACY_PUBLIC,
        choices=[PRIVACY_PUBLIC, PRIVACY_FRIENDS, PRIVACY_FOLLOWERS, PRIVACY_SELF],
        help="Post privacy level",
    )
    parser.add_argument(
        "--schedule",
        default=None,
        metavar="ISO_DATETIME",
        help="Schedule post e.g. '2026-07-11T20:00:00'",
    )
    parser.add_argument("--setup-guide", action="store_true", help="Print setup instructions")
    parser.add_argument("--oauth", action="store_true", help="Run OAuth flow to get tokens")

    args = parser.parse_args()

    if args.setup_guide:
        print(SETUP_GUIDE)
        return

    if args.oauth:
        _run_oauth_flow()
        return

    if not args.video:
        parser.print_help()
        sys.exit(1)

    title = args.title or ""

    try:
        result = publish_tiktok(
            video_path=args.video,
            title=title,
            privacy=args.privacy,
            schedule_time=args.schedule,
            source_path=args.source,
            auto_caption=args.auto_caption,
        )
        print(f"\nResult: {result}")
    except Exception as e:
        print(f"\n[publisher] FAILED: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
