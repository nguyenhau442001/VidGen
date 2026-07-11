"""
vidgen/publish_common.py — shared primitives for platform publishers
(TikTok/YouTube/Facebook): metadata shape, OAuth local-server callback,
token file I/O, chunked resumable upload, generic status polling, and a
generalized GitHub Actions failure notification.
"""

from __future__ import annotations

import json
import requests
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Optional, Tuple


@dataclass
class PublishMetadata:
    title: str
    description: str = ""
    tags: list[str] = field(default_factory=list)
    privacy: str = "public"
    made_for_kids: bool = False
    schedule_time: Optional[str] = None  # ISO-8601, e.g. "2026-07-11T20:00:00"


def load_tokens(path: Path) -> dict:
    """Load a token dict from a JSON file, or {} if it doesn't exist yet."""
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return {}


def save_tokens(path: Path, tokens: dict) -> None:
    """Persist a token dict to a JSON file."""
    with open(path, "w") as f:
        json.dump(tokens, f, indent=2)
    print(f"[publish_common] Tokens saved to {path}")


def notify_github(
    video_name: str,
    platform: str,
    status: str,
    github_repo: str,
    github_token: str,
    github_workflow: str = "notify.yml",
    extra: Optional[dict] = None,
) -> None:
    """
    Trigger a GitHub Actions workflow_dispatch for publish success/failure
    notification. Silently no-ops if repo/token aren't configured.
    """
    if not github_repo or not github_token:
        print("[publish_common] GitHub notify skipped (repo/token not set)")
        return

    url = (
        f"https://api.github.com/repos/{github_repo}"
        f"/actions/workflows/{github_workflow}/dispatches"
    )
    inputs = {"video_name": video_name, "platform": platform, "status": status}
    inputs.update(extra or {})

    try:
        resp = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {github_token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            json={"ref": "main", "inputs": inputs},
            timeout=10,
        )
        if resp.status_code == 204:
            print("[publish_common] GitHub notification triggered")
        else:
            print(f"[publish_common] GitHub notify failed (non-fatal): HTTP {resp.status_code} {resp.text[:100]}")
    except Exception as e:
        print(f"[publish_common] GitHub notify error (non-fatal): {e}")


def poll_until(
    check_fn: Callable[[], Tuple[bool, bool, dict]],
    interval: int = 5,
    max_attempts: int = 60,
) -> dict:
    """
    Calls check_fn() repeatedly until it reports done or a terminal failure.
    check_fn() -> (done, terminal_failure, data).
    """
    for attempt in range(1, max_attempts + 1):
        done, terminal_failure, data = check_fn()
        if done:
            return data
        if terminal_failure:
            raise RuntimeError(f"Polling failed: {data}")
        time.sleep(interval)

    raise RuntimeError(f"Polling did not complete after {max_attempts * interval}s")


def chunked_resumable_upload(
    upload_url: str,
    file_path,
    chunk_size: int,
    put_headers_fn: Callable[[int, int, int], dict],
):
    """
    PUTs file_path to upload_url following the resumable-upload protocol:
    a 308 response's Range header gives the next start offset (retry only
    the unsent remainder, not the whole file); any other 2xx response ends
    the loop and is returned to the caller.

    put_headers_fn(start, end, total_size) -> headers dict for that PUT.
    """
    file_path = Path(file_path)
    total_size = file_path.stat().st_size
    start = 0
    last_resp = None

    with open(file_path, "rb") as f:
        while start < total_size:
            end = min(start + chunk_size, total_size) - 1
            f.seek(start)
            chunk = f.read(end - start + 1)

            resp = requests.put(upload_url, headers=put_headers_fn(start, end, total_size), data=chunk)
            last_resp = resp

            if resp.status_code == 308:
                range_header = resp.headers.get("Range")
                start = int(range_header.split("-")[1]) + 1 if range_header else end + 1
                continue

            if not (200 <= resp.status_code < 300):
                raise RuntimeError(
                    f"Chunk upload failed at offset {start} (HTTP {resp.status_code}): {resp.text[:200]}"
                )

            start = end + 1

    return last_resp
