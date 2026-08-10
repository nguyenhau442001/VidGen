"""Encrypted server-side storage for creator tokens and publisher drafts."""

from __future__ import annotations

import json
import sqlite3
import time
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken


class PublisherStore:
    def __init__(self, db_path: Path, encryption_key: str):
        if not encryption_key:
            raise RuntimeError("TOKEN_ENCRYPTION_KEY is required")
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            self.cipher = Fernet(encryption_key.encode())
        except (ValueError, TypeError) as exc:
            raise RuntimeError("TOKEN_ENCRYPTION_KEY must be a valid Fernet key") from exc
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _init_db(self) -> None:
        with self._connect() as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS creator_tokens (
                    session_id TEXT PRIMARY KEY,
                    open_id TEXT NOT NULL,
                    encrypted_payload BLOB NOT NULL,
                    updated_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS drafts (
                    draft_id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    created_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS videos (
                    video_id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    file_path TEXT,
                    remote_url TEXT,
                    duration_sec REAL NOT NULL,
                    mime_type TEXT,
                    created_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS publications (
                    publish_id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    created_at INTEGER NOT NULL
                );
            """)

    def put_tokens(self, session_id: str, tokens: dict) -> None:
        encrypted = self.cipher.encrypt(json.dumps(tokens).encode())
        with self._connect() as db:
            db.execute(
                "INSERT OR REPLACE INTO creator_tokens VALUES (?, ?, ?, ?)",
                (session_id, tokens.get("open_id", ""), encrypted, int(time.time())),
            )

    def get_tokens(self, session_id: str) -> dict | None:
        with self._connect() as db:
            row = db.execute(
                "SELECT encrypted_payload FROM creator_tokens WHERE session_id = ?", (session_id,)
            ).fetchone()
        if not row:
            return None
        try:
            return json.loads(self.cipher.decrypt(row["encrypted_payload"]).decode())
        except InvalidToken as exc:
            raise RuntimeError("Stored TikTok token could not be decrypted") from exc

    def delete_tokens(self, session_id: str) -> None:
        with self._connect() as db:
            db.execute("DELETE FROM creator_tokens WHERE session_id = ?", (session_id,))

    def put_draft(self, draft_id: str, session_id: str, payload: dict) -> None:
        with self._connect() as db:
            db.execute(
                "INSERT INTO drafts VALUES (?, ?, ?, ?)",
                (draft_id, session_id, json.dumps(payload), int(time.time())),
            )

    def get_draft(self, draft_id: str, session_id: str) -> dict | None:
        with self._connect() as db:
            row = db.execute(
                "SELECT payload FROM drafts WHERE draft_id = ? AND session_id = ?",
                (draft_id, session_id),
            ).fetchone()
        return json.loads(row["payload"]) if row else None

    def claim_draft(self, draft_id: str, session_id: str) -> dict | None:
        """Bind an unguessable handoff draft to the creator's browser session."""
        with self._connect() as db:
            row = db.execute("SELECT payload, session_id FROM drafts WHERE draft_id = ?", (draft_id,)).fetchone()
            if not row or row["session_id"] not in ("handoff", session_id):
                return None
            db.execute("UPDATE drafts SET session_id = ? WHERE draft_id = ?", (session_id, draft_id))
        return json.loads(row["payload"])

    def put_video(self, video_id: str, session_id: str, *, file_path: str | None,
                  remote_url: str | None, duration_sec: float, mime_type: str | None) -> None:
        with self._connect() as db:
            db.execute(
                "INSERT INTO videos VALUES (?, ?, ?, ?, ?, ?, ?)",
                (video_id, session_id, file_path, remote_url, duration_sec, mime_type, int(time.time())),
            )

    def get_video(self, video_id: str, session_id: str) -> dict | None:
        with self._connect() as db:
            row = db.execute(
                "SELECT * FROM videos WHERE video_id = ? AND session_id = ?", (video_id, session_id)
            ).fetchone()
        return dict(row) if row else None

    def put_publication(self, publish_id: str, session_id: str) -> None:
        with self._connect() as db:
            db.execute(
                "INSERT OR REPLACE INTO publications VALUES (?, ?, ?)",
                (publish_id, session_id, int(time.time())),
            )

    def owns_publication(self, publish_id: str, session_id: str) -> bool:
        with self._connect() as db:
            row = db.execute(
                "SELECT 1 FROM publications WHERE publish_id = ? AND session_id = ?",
                (publish_id, session_id),
            ).fetchone()
        return row is not None
