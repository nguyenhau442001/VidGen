"""Review-ready creator web flow for TikTok Direct Post.

Run locally with: uvicorn vidgen.publisher.app:app --reload --port 8000
"""

from __future__ import annotations

import os
import secrets
import subprocess
import time
import uuid
from pathlib import Path
from urllib.parse import urlparse

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, HttpUrl
from starlette.middleware.sessions import SessionMiddleware

from vidgen.publisher import tiktok_client
from vidgen.publisher.store import PublisherStore

REPO_ROOT = Path(__file__).resolve().parents[3]
WEBSITE_DIR = REPO_ROOT / "tool" / "website"
ALLOWED_VIDEO_ROOTS = (REPO_ROOT / "tool" / "remotion" / "out", REPO_ROOT / "output")
VIDEO_MIME_TYPES = {"video/mp4", "video/quicktime", "video/webm"}
MAX_UPLOAD_BYTES = 4 * 1024 * 1024 * 1024
PRIVACY_VALUES = {
    "PUBLIC_TO_EVERYONE",
    "MUTUAL_FOLLOW_FRIENDS",
    "FOLLOWER_OF_CREATOR",
    "SELF_ONLY",
}


class PublishRequest(BaseModel):
    video_id: str
    caption: str = Field(max_length=2200)
    privacy_level: str
    allow_comment: bool = False
    allow_duet: bool = False
    allow_stitch: bool = False
    commercial_content: bool = False
    your_brand: bool = False
    branded_content: bool = False
    is_aigc: bool = False
    confirmed: bool = False


class HandoffRequest(BaseModel):
    video_path: str | None = None
    video_url: HttpUrl | None = None
    title: str = ""
    caption: str = ""
    hashtags: list[str] = Field(default_factory=list, max_length=5)
    metadata: dict = Field(default_factory=dict)


def _required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def _session_id(request: Request) -> str:
    value = request.session.get("publisher_session_id")
    if not value:
        value = secrets.token_urlsafe(32)
        request.session["publisher_session_id"] = value
    return value


def _video_duration(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(path),
        ],
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    if result.returncode != 0:
        raise HTTPException(422, "The selected file is not a readable video")
    try:
        duration = float(result.stdout.strip())
    except ValueError as exc:
        raise HTTPException(422, "Could not determine video duration") from exc
    if duration <= 0:
        raise HTTPException(422, "Video duration must be greater than zero")
    return duration


def _safe_local_video(value: str) -> Path:
    path = Path(value).expanduser().resolve()
    if not any(path.is_relative_to(root.resolve()) for root in ALLOWED_VIDEO_ROOTS):
        raise HTTPException(400, "video_path must be inside remotion/out or output")
    if not path.is_file():
        raise HTTPException(404, "VidGen video was not found")
    return path


def _validate_owned_url(value: str, app_url: str) -> None:
    video = urlparse(value)
    app = urlparse(app_url)
    if video.scheme != "https" or video.hostname != app.hostname:
        raise HTTPException(400, "PULL_FROM_URL requires HTTPS on the verified APP_URL domain")


def _utf16_length(value: str) -> int:
    return len(value.encode("utf-16-le")) // 2


def create_app() -> FastAPI:
    mode = os.getenv("TIKTOK_MODE", "live").strip().lower()
    if mode not in {"live", "demo"}:
        raise RuntimeError("TIKTOK_MODE must be 'live' or 'demo'")
    session_secret = _required_env("SESSION_SECRET")
    encryption_key = _required_env("TOKEN_ENCRYPTION_KEY")
    app_url = os.getenv("APP_URL", "http://localhost:8000").rstrip("/")
    db_path = Path(os.getenv("PUBLISHER_DB_PATH", "output/build/pipeline/publisher/publisher.db"))
    if not db_path.is_absolute():
        db_path = REPO_ROOT / db_path
    upload_dir = Path(os.getenv("PUBLISHER_UPLOAD_DIR", "output/build/pipeline/publisher/uploads"))
    if not upload_dir.is_absolute():
        upload_dir = REPO_ROOT / upload_dir
    upload_dir.mkdir(parents=True, exist_ok=True)
    store = PublisherStore(db_path, encryption_key)

    web = FastAPI(title="VidGen Publisher", docs_url=None, redoc_url=None)
    web.state.publisher_store = store
    web.add_middleware(
        SessionMiddleware,
        secret_key=session_secret,
        same_site="lax",
        https_only=app_url.startswith("https://"),
        max_age=60 * 60 * 24 * 30,
    )

    @web.exception_handler(tiktok_client.TikTokAPIError)
    async def tiktok_api_error(_request: Request, exc: tiktok_client.TikTokAPIError):
        status_code = 401 if exc.status_code == 401 else 502
        return JSONResponse(
            status_code=status_code,
            content={"detail": f"TikTok could not complete {exc.operation}. Please review your account settings and try again."},
        )

    def valid_tokens(request: Request) -> dict:
        tokens = store.get_tokens(_session_id(request))
        if not tokens:
            raise HTTPException(401, "Connect a TikTok account first")
        if int(tokens.get("expires_at", 0)) <= int(time.time()) + 60:
            refreshed = tiktok_client.refresh_token(
                _required_env("TIKTOK_CLIENT_KEY"),
                _required_env("TIKTOK_CLIENT_SECRET"),
                tokens["refresh_token"],
            )
            refreshed["expires_at"] = int(time.time()) + int(refreshed.get("expires_in", 86400))
            store.put_tokens(_session_id(request), refreshed)
            tokens = refreshed
        return tokens

    def creator_info(request: Request) -> dict:
        if mode == "demo":
            if not request.session.get("demo_connected"):
                raise HTTPException(401, "Start the demo connection first")
            return {
                "creator_avatar_url": "",
                "creator_username": "demo_creator",
                "creator_nickname": "Demo Creator",
                "privacy_level_options": ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"],
                "comment_disabled": False,
                "duet_disabled": False,
                "stitch_disabled": True,
                "max_video_post_duration_sec": 180,
                "demo": True,
            }
        return tiktok_client.query_creator_info(valid_tokens(request)["access_token"])

    @web.get("/health")
    def health() -> dict:
        return {"status": "ok", "mode": mode}

    @web.get("/api/publisher/config")
    def publisher_config(request: Request) -> dict:
        connected = bool(request.session.get("demo_connected")) if mode == "demo" else bool(
            store.get_tokens(_session_id(request))
        )
        return {"mode": mode, "connected": connected, "app_name": "VidGen Publisher"}

    @web.get("/auth/tiktok")
    def connect_tiktok(request: Request):
        if mode == "demo":
            request.session["demo_connected"] = True
            return RedirectResponse("/publisher?demo=connected", status_code=303)
        state = secrets.token_urlsafe(32)
        request.session["oauth_state"] = state
        return RedirectResponse(tiktok_client.authorization_url(
            _required_env("TIKTOK_CLIENT_KEY"),
            _required_env("TIKTOK_REDIRECT_URI"),
            state,
        ))

    @web.get("/auth/tiktok/callback")
    def tiktok_callback(request: Request, code: str = "", state: str = "", error: str = ""):
        expected = request.session.pop("oauth_state", "")
        if error:
            return RedirectResponse(f"/publisher?oauth_error={error}", status_code=303)
        if not code or not state or not secrets.compare_digest(state, expected):
            raise HTTPException(400, "Invalid TikTok OAuth callback state")
        tokens = tiktok_client.exchange_code(
            _required_env("TIKTOK_CLIENT_KEY"),
            _required_env("TIKTOK_CLIENT_SECRET"),
            _required_env("TIKTOK_REDIRECT_URI"),
            code,
        )
        granted = {scope.strip() for scope in tokens.get("scope", "").split(",") if scope.strip()}
        if "video.publish" not in granted:
            raise HTTPException(403, "TikTok authorization did not grant video.publish")
        tokens["expires_at"] = int(time.time()) + int(tokens.get("expires_in", 86400))
        store.put_tokens(_session_id(request), tokens)
        return RedirectResponse("/publisher?connected=1", status_code=303)

    @web.post("/api/tiktok/disconnect")
    def disconnect(request: Request) -> dict:
        if mode == "demo":
            request.session.pop("demo_connected", None)
            return {"disconnected": True, "demo": True}
        tokens = store.get_tokens(_session_id(request))
        if tokens:
            tiktok_client.revoke_token(
                _required_env("TIKTOK_CLIENT_KEY"),
                _required_env("TIKTOK_CLIENT_SECRET"),
                tokens["access_token"],
            )
            store.delete_tokens(_session_id(request))
        return {"disconnected": True}

    @web.post("/api/tiktok/creator-info")
    def latest_creator_info(request: Request) -> dict:
        return creator_info(request)

    @web.put("/api/publisher/video")
    async def upload_video(request: Request, x_filename: str = Header("video.mp4")) -> dict:
        content_type = request.headers.get("content-type", "").split(";", 1)[0]
        if content_type not in VIDEO_MIME_TYPES:
            raise HTTPException(415, "Use MP4, MOV, or WebM video")
        suffix = {"video/mp4": ".mp4", "video/quicktime": ".mov", "video/webm": ".webm"}[content_type]
        video_id = uuid.uuid4().hex
        destination = upload_dir / f"{video_id}{suffix}"
        size = 0
        try:
            with destination.open("wb") as output:
                async for chunk in request.stream():
                    size += len(chunk)
                    if size > MAX_UPLOAD_BYTES:
                        raise HTTPException(413, "TikTok video uploads may not exceed 4 GB")
                    output.write(chunk)
            duration = _video_duration(destination)
        except Exception:
            destination.unlink(missing_ok=True)
            raise
        store.put_video(
            video_id, _session_id(request), file_path=str(destination), remote_url=None,
            duration_sec=duration, mime_type=content_type,
        )
        return {
            "video_id": video_id,
            "filename": Path(x_filename).name,
            "duration_sec": duration,
            "preview_url": f"/api/publisher/video/{video_id}",
        }

    @web.get("/api/publisher/video/{video_id}")
    def video_preview(video_id: str, request: Request):
        video = store.get_video(video_id, _session_id(request))
        if not video or not video["file_path"]:
            raise HTTPException(404, "Video not found")
        return FileResponse(video["file_path"], media_type=video["mime_type"])

    @web.post("/api/vidgen/handoff")
    def vidgen_handoff(payload: HandoffRequest, x_vidgen_handoff_secret: str = Header("")) -> dict:
        expected = os.getenv("VIDGEN_HANDOFF_SECRET", "")
        if not expected or not secrets.compare_digest(x_vidgen_handoff_secret, expected):
            raise HTTPException(401, "Invalid VidGen handoff credential")
        if (payload.video_path is None) == (payload.video_url is None):
            raise HTTPException(400, "Provide exactly one video_path or video_url")
        data = payload.model_dump(mode="json")
        if payload.video_path:
            path = _safe_local_video(payload.video_path)
            data["duration_sec"] = _video_duration(path)
            data["video_path"] = str(path)
        else:
            _validate_owned_url(str(payload.video_url), app_url)
            duration = payload.metadata.get("duration_sec")
            if not isinstance(duration, (int, float)) or duration <= 0:
                raise HTTPException(400, "metadata.duration_sec is required for video_url handoff")
            data["duration_sec"] = float(duration)
        draft_id = uuid.uuid4().hex
        store.put_draft(draft_id, "handoff", data)
        return {"draft_id": draft_id, "publisher_url": f"{app_url}/publisher?draft={draft_id}"}

    @web.post("/api/publisher/drafts/{draft_id}/claim")
    def claim_draft(draft_id: str, request: Request) -> dict:
        draft = store.claim_draft(draft_id, _session_id(request))
        if not draft:
            raise HTTPException(404, "Draft not found or already claimed")
        video_id = uuid.uuid4().hex
        store.put_video(
            video_id,
            _session_id(request),
            file_path=draft.get("video_path"),
            remote_url=draft.get("video_url"),
            duration_sec=float(draft["duration_sec"]),
            mime_type="video/mp4",
        )
        caption = draft.get("caption", "")
        hashtags = " ".join(tag if tag.startswith("#") else f"#{tag}" for tag in draft.get("hashtags", []))
        return {
            **draft,
            "video_id": video_id,
            "caption": "\n".join(part for part in (caption, hashtags) if part),
            "preview_url": f"/api/publisher/video/{video_id}" if draft.get("video_path") else draft.get("video_url"),
        }

    @web.post("/api/tiktok/publish")
    def publish(payload: PublishRequest, request: Request) -> dict:
        if mode == "demo":
            raise HTTPException(409, "Demo mode never sends content to TikTok. Switch TIKTOK_MODE=live to publish.")
        if not payload.confirmed:
            raise HTTPException(400, "Explicit creator confirmation is required")
        if _utf16_length(payload.caption) > 2200:
            raise HTTPException(400, "Caption exceeds TikTok's 2200 UTF-16 character limit")
        video = store.get_video(payload.video_id, _session_id(request))
        if not video:
            raise HTTPException(404, "Video not found")

        # Required immediately-before-publish refresh. No cached creator constraints are trusted.
        tokens = valid_tokens(request)
        creator = tiktok_client.query_creator_info(tokens["access_token"])
        privacy_options = creator.get("privacy_level_options", [])
        if payload.privacy_level not in PRIVACY_VALUES or payload.privacy_level not in privacy_options:
            raise HTTPException(400, "Select a privacy option currently allowed for this creator")
        if video["duration_sec"] > float(creator.get("max_video_post_duration_sec", 0)):
            raise HTTPException(400, "Video exceeds this creator's current maximum duration")
        unsupported = (
            (payload.allow_comment and creator.get("comment_disabled"))
            or (payload.allow_duet and creator.get("duet_disabled"))
            or (payload.allow_stitch and creator.get("stitch_disabled"))
        )
        if unsupported:
            raise HTTPException(400, "An enabled interaction is not supported by the creator's current settings")
        if payload.commercial_content and not (payload.your_brand or payload.branded_content):
            raise HTTPException(400, "Choose Your brand, Branded content, or both")
        if not payload.commercial_content and (payload.your_brand or payload.branded_content):
            raise HTTPException(400, "Enable commercial content disclosure first")
        if payload.branded_content and payload.privacy_level == "SELF_ONLY":
            raise HTTPException(400, "Branded content visibility cannot be private")

        post_info = {
            "title": payload.caption,
            "privacy_level": payload.privacy_level,
            "disable_comment": not payload.allow_comment or bool(creator.get("comment_disabled")),
            "disable_duet": not payload.allow_duet or bool(creator.get("duet_disabled")),
            "disable_stitch": not payload.allow_stitch or bool(creator.get("stitch_disabled")),
            "brand_content_toggle": payload.branded_content,
            "brand_organic_toggle": payload.your_brand,
            "is_aigc": payload.is_aigc,
        }
        path = Path(video["file_path"]) if video["file_path"] else None
        initialized = tiktok_client.initialize_direct_post(
            tokens["access_token"], post_info,
            video_path=path, video_url=video["remote_url"],
        )
        if path:
            tiktok_client.upload_file(path, initialized["upload_url"], tiktok_client._file_source_info(path))
        publish_id = initialized["publish_id"]
        store.put_publication(publish_id, _session_id(request))
        return {"publish_id": publish_id, "status": "PROCESSING", "message": "TikTok is processing the post."}

    @web.post("/api/tiktok/status/{publish_id}")
    def status(publish_id: str, request: Request) -> dict:
        if mode == "demo":
            raise HTTPException(409, "Demo mode has no TikTok publish status")
        if not store.owns_publication(publish_id, _session_id(request)):
            raise HTTPException(404, "Publication not found")
        return tiktok_client.fetch_publish_status(valid_tokens(request)["access_token"], publish_id)

    @web.get("/")
    def home_page():
        return FileResponse(WEBSITE_DIR / "index.html")

    @web.get("/features")
    def features_page():
        return FileResponse(WEBSITE_DIR / "features.html")

    @web.get("/publisher")
    def publisher_page():
        return FileResponse(WEBSITE_DIR / "publisher.html")

    @web.get("/privacy")
    def privacy_page():
        return FileResponse(WEBSITE_DIR / "privacy.html")

    @web.get("/terms")
    def terms_page():
        return FileResponse(WEBSITE_DIR / "terms.html")

    web.mount("/", StaticFiles(directory=WEBSITE_DIR, html=True), name="website")
    return web


app = create_app()
