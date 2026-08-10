"""Small, server-only client for TikTok OAuth and Content Posting API v2."""

from __future__ import annotations

import math
import mimetypes
from pathlib import Path
from urllib.parse import urlencode

import requests

API_BASE = "https://open.tiktokapis.com/v2"
AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/"
TOKEN_URL = f"{API_BASE}/oauth/token/"
REVOKE_URL = f"{API_BASE}/oauth/revoke/"
SCOPES = ("user.info.basic", "video.publish")
MIN_CHUNK_SIZE = 5 * 1024 * 1024
DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024
MAX_CHUNK_SIZE = 64 * 1024 * 1024


class TikTokAPIError(RuntimeError):
    def __init__(self, operation: str, payload: dict | str, status_code: int = 0):
        super().__init__(f"TikTok {operation} failed: {payload}")
        self.operation = operation
        self.payload = payload
        self.status_code = status_code


def authorization_url(client_key: str, redirect_uri: str, state: str) -> str:
    return f"{AUTHORIZE_URL}?{urlencode({
        'client_key': client_key,
        'scope': ','.join(SCOPES),
        'response_type': 'code',
        'redirect_uri': redirect_uri,
        'state': state,
    })}"


def _token_request(payload: dict) -> dict:
    response = requests.post(
        TOKEN_URL,
        headers={"Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache"},
        data=payload,
        timeout=30,
    )
    data = response.json()
    if not response.ok or data.get("error"):
        raise TikTokAPIError("token exchange", data, response.status_code)
    return data


def exchange_code(client_key: str, client_secret: str, redirect_uri: str, code: str) -> dict:
    return _token_request({
        "client_key": client_key,
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    })


def refresh_token(client_key: str, client_secret: str, refresh: str) -> dict:
    return _token_request({
        "client_key": client_key,
        "client_secret": client_secret,
        "grant_type": "refresh_token",
        "refresh_token": refresh,
    })


def revoke_token(client_key: str, client_secret: str, access_token: str) -> None:
    response = requests.post(
        REVOKE_URL,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={"client_key": client_key, "client_secret": client_secret, "token": access_token},
        timeout=30,
    )
    if not response.ok:
        raise TikTokAPIError("token revoke", response.text, response.status_code)


def _api_post(path: str, access_token: str, payload: dict | None = None) -> dict:
    response = requests.post(
        f"{API_BASE}{path}",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json; charset=UTF-8",
        },
        json=payload,
        timeout=30,
    )
    data = response.json()
    error = data.get("error", {})
    if not response.ok or error.get("code") not in (None, "", "ok"):
        raise TikTokAPIError(path, data, response.status_code)
    return data.get("data", {})


def query_creator_info(access_token: str) -> dict:
    return _api_post("/post/publish/creator_info/query/", access_token)


def fetch_publish_status(access_token: str, publish_id: str) -> dict:
    return _api_post("/post/publish/status/fetch/", access_token, {"publish_id": publish_id})


def _file_source_info(video_path: Path, preferred_chunk_size: int = DEFAULT_CHUNK_SIZE) -> dict:
    size = video_path.stat().st_size
    if size <= 0:
        raise ValueError("Video file is empty")
    if size < MIN_CHUNK_SIZE:
        chunk_size = size
        count = 1
    else:
        chunk_size = min(max(preferred_chunk_size, MIN_CHUNK_SIZE), MAX_CHUNK_SIZE)
        count = max(1, size // chunk_size)
        # TikTok expects the short remainder to be merged into the final full chunk.
        if count > 1000:
            chunk_size = math.ceil(size / 1000)
            count = size // chunk_size
    return {
        "source": "FILE_UPLOAD",
        "video_size": size,
        "chunk_size": chunk_size,
        "total_chunk_count": count,
    }


def initialize_direct_post(
    access_token: str,
    post_info: dict,
    *,
    video_path: Path | None = None,
    video_url: str | None = None,
) -> dict:
    if (video_path is None) == (video_url is None):
        raise ValueError("Provide exactly one of video_path or video_url")
    source_info = (
        _file_source_info(video_path)
        if video_path is not None
        else {"source": "PULL_FROM_URL", "video_url": video_url}
    )
    return _api_post(
        "/post/publish/video/init/",
        access_token,
        {"post_info": post_info, "source_info": source_info},
    )


def upload_file(video_path: Path, upload_url: str, source_info: dict) -> None:
    size = source_info["video_size"]
    chunk_size = source_info["chunk_size"]
    count = source_info["total_chunk_count"]
    mime = mimetypes.guess_type(video_path.name)[0] or "video/mp4"
    with video_path.open("rb") as handle:
        start = 0
        for index in range(count):
            if index == count - 1:
                chunk = handle.read()
            else:
                chunk = handle.read(chunk_size)
            end = start + len(chunk) - 1
            response = requests.put(
                upload_url,
                headers={
                    "Content-Type": mime,
                    "Content-Length": str(len(chunk)),
                    "Content-Range": f"bytes {start}-{end}/{size}",
                },
                data=chunk,
                timeout=120,
            )
            if response.status_code not in (200, 201, 206):
                raise TikTokAPIError(
                    f"file upload chunk {index + 1}/{count}", response.text, response.status_code
                )
            start = end + 1
