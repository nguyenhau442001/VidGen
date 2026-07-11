# YouTube Auto-Publish (GAP 5) — Design

## Context

GAP 5 targets auto-publish to TikTok, YouTube, and Facebook. TikTok's
`vidgen/publisher.py` is in progress but blocked on Content Posting API
audit approval. While that's pending, we build the YouTube leg — YouTube
Data API v3 has no equivalent audit gate for the `youtube.upload` scope,
so it can ship and be exercised independently.

This is also the point where shared logic between platforms gets
extracted, since a third platform (Facebook) is already planned and
duplicating TikTok's chunked-upload/poll/notify code a second and third
time isn't worth it. TikTok's `publisher.py` itself is **not** migrated
in this pass — only the new library and the YouTube module are built now.
Migrating TikTok onto the shared library is deferred until after its API
audit lands.

## Scope

- YouTube Shorts only: the existing vertical (1080×1920, ≤3min) render
  output, same file that goes to TikTok. No 16:9 long-form path.
- Raw REST via `requests`, no `google-api-python-client` /
  `google-auth-oauthlib` — matches the codebase's existing lightweight,
  no-SDK style and avoids ~15 transitive dependencies for functionality
  we can hand-roll in a few hundred lines.
- New shared library (`vidgen/publish_common.py`) with the pieces that
  generalize across TikTok/YouTube/Facebook, used by the new YouTube
  module now and by TikTok/Facebook when they're migrated/built.
- Public entry points are named per-platform so a future orchestrator
  (`main.py`) can call all three for one render: `publish_video_on_youtube`,
  and later `publish_video_on_tiktok`, `publish_video_on_facebook`.

## Files

### `vidgen/publish_common.py` (new)

Shared primitives, extracted in spirit from `publisher.py`'s TikTok-specific
implementations but generalized:

- `PublishMetadata` — dataclass: `title: str`, `description: str = ""`,
  `tags: list[str] = []`, `privacy: str = "public"`,
  `made_for_kids: bool = False`, `schedule_time: str | None = None`
  (ISO-8601). One instance is built from CLI args and passed to whichever
  platform's publish function is called; each platform maps only the
  fields its API understands.
- `run_oauth_local_server(auth_url: str, port: int = 8080) -> str` —
  opens `auth_url` in the browser, spins up a one-shot
  `http.server.HTTPServer` on `localhost:{port}/callback`, returns the
  `code` query param. Extracted from TikTok's `_run_oauth_flow` inner
  handler, generalized to not assume TikTok's token-exchange call.
- `load_tokens(path: Path) -> dict` / `save_tokens(path: Path, tokens: dict)`
  — generic JSON file read/write, same shape as TikTok's
  `_load_tokens`/`_save_tokens` but parameterized on file path instead of
  a hardcoded module-level constant.
- `chunked_resumable_upload(upload_url, file_path, chunk_size, put_headers_fn, is_complete_fn) -> requests.Response`
  — the shared chunked-PUT loop (Option B from brainstorming): PUTs
  `Content-Range: bytes {start}-{end}/{total}` per chunk; a `308 Resume
  Incomplete` response's `Range` header determines the next chunk's
  start offset (retry only the failed chunk, not the whole file); a
  200/201 response means `is_complete_fn` should be checked and the loop
  exits. `put_headers_fn(start, end, total, chunk_bytes) -> dict` lets
  each platform set its own headers (YouTube needs `Content-Range` +
  `Content-Length`; TikTok's existing chunker maps onto the same shape
  when it's migrated later).
- `poll_until(check_fn, interval=5, max_attempts=60) -> dict` — generic
  polling loop; `check_fn() -> (done: bool, terminal_failure: bool, data: dict)`.
  Used for YouTube's post-upload processing-status check; TikTok's
  `_poll_status` maps onto this shape when migrated.
- `notify_github(video_name, platform, status, extra: dict = {}, ...)` —
  generalization of TikTok's `_notify_github`: same `workflow_dispatch`
  call, but `platform` is now a field in `inputs` instead of a
  hardcoded `tiktok_status` key. Silently no-ops if `GITHUB_REPO`/
  `GITHUB_TOKEN` aren't set, same as today.

### `vidgen/publisher_youtube.py` (new)

Mirrors `publisher.py`'s shape and CLI conventions:

- Config from env/`.env`: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`,
  tokens persisted to `.youtube_tokens.json` at repo root (same pattern
  as `.tiktok_tokens.json`).
- `_get_valid_token() -> str` — loads tokens via `publish_common.load_tokens`;
  refreshes via `POST https://oauth2.googleapis.com/token` with
  `grant_type=refresh_token` when the access token is expired/invalid
  (checked with a cheap authenticated call, same 401-triggers-refresh
  pattern as TikTok).
- `_init_resumable_session(token, video_path, metadata) -> str` (returns
  the resumable upload URL) — `POST
  https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`
  with a JSON body built from `PublishMetadata`:
  - `snippet.title` (auto-suffixed with `#Shorts` if not already present),
    `snippet.description`, `snippet.tags`, `snippet.categoryId = "28"`
    ("Science & Technology", hardcoded — not exposed as a metadata
    field since only YouTube has categories)
  - `status.privacyStatus`, `status.selfDeclaredMadeForKids`,
    `status.publishAt` (RFC3339, set only if `schedule_time` is given;
    forces `privacyStatus = "private"` per YouTube's requirement that
    scheduled videos stay private until `publishAt`)
  - Upload URL comes from the response's `Location` header.
- `publish_video_on_youtube(video_path: str | Path, metadata: PublishMetadata) -> dict`
  — full flow: `_get_valid_token` → `_init_resumable_session` →
  `publish_common.chunked_resumable_upload` (chunk size 10MB, matching
  TikTok's existing `CHUNK_SIZE` constant) → extract `id` from the final
  chunk's response body → `publish_common.poll_until` against `GET
  videos?part=status,processingDetails&id={id}` until
  `processingDetails.processingStatus` is `"succeeded"` (done) or
  `"failed"`/`"terminated"` (terminal failure) → `publish_common.notify_github(platform="youtube", ...)`
  on both success and failure paths → returns
  `{"video_id": id, "status": "succeeded", "url": f"https://youtu.be/{id}"}`.
- `--setup-guide` — printed instructions: create/select a Google Cloud
  project → enable "YouTube Data API v3" in APIs & Services → configure
  OAuth consent screen (External, Testing mode, add your own account as
  a test user) → create OAuth Client ID (Application type: Desktop app)
  → copy Client ID/Secret into `.env` as `YOUTUBE_CLIENT_ID` /
  `YOUTUBE_CLIENT_SECRET` → run `python -m vidgen.publisher_youtube --oauth`.
  Explicitly notes: while the app is in Testing (pre-verification, same
  situation as TikTok's pending audit), Google expires refresh tokens
  after 7 days, so `--oauth` needs to be re-run weekly until the app is
  submitted for verification.
- `--oauth` — builds the Google auth URL (`scope=https://www.googleapis.com/auth/youtube.upload`,
  `access_type=offline`, `redirect_uri=http://localhost:8080/callback`),
  calls `publish_common.run_oauth_local_server`, exchanges the code for
  tokens via `POST https://oauth2.googleapis.com/token`
  (`grant_type=authorization_code`), saves via `publish_common.save_tokens`.
- CLI `main()`: flags `--title`, `--description` (default: falls back to
  `--title`), `--tags` (comma-separated, default empty), `--privacy`
  (`public`/`unlisted`/`private`, default `public`), `--made-for-kids`
  (store_true, default False), `--schedule` (ISO-8601, same semantics as
  TikTok's `--schedule`). Builds one `PublishMetadata`, calls
  `publish_video_on_youtube`. Same `.env`-loading and filename-stem
  title fallback as `publisher.py`'s `main()`.

## Error handling

Same try/except-then-notify shape as `publish_tiktok`: any exception
during token refresh / init / upload / poll triggers
`publish_common.notify_github(status=f"FAIL: {e}")` then re-raises.
Known failure modes get specific, actionable messages instead of a raw
traceback:

- Refresh token expired/revoked (`invalid_grant` from the token
  endpoint) → "Refresh token expired — run `python -m
  vidgen.publisher_youtube --oauth` again." (expected weekly in Testing
  mode, see setup guide note above).
- Quota exceeded (`quotaExceeded` reason in the API error body; a
  resumable upload costs ~1600 of the default 10,000 units/day, so this
  should only happen if publishing more than ~6 videos/day) → message
  includes that this resets at midnight Pacific time (Google's quota
  reset).
- Processing failed (`processingDetails.processingStatus == "failed"`)
  → surface `processingDetails.processingFailureReason` from the API
  response.

## Testing

First publisher tests in the repo (`tests/` has none for `publisher.py`
today). Pytest, following `test_main.py`/`test_chunked_render.py`'s
structure, with `requests` calls mocked — no live network/API calls:

- `PublishMetadata` construction/defaults.
- `_init_resumable_session`: request body shape for a few metadata
  combinations (with/without schedule_time, made_for_kids, tags).
- `publish_common.chunked_resumable_upload`: offset/retry logic driven
  by a canned response sequence (200 → simulated `308` mid-upload with a
  `Range` header → 200 final), asserting the right byte ranges get sent
  and a failed chunk is retried without re-sending earlier ones.
- `publish_common.poll_until`: canned "processing → succeeded" and
  "processing → failed" sequences, asserting it stops at the right
  point and returns/raises correctly.
- `publish_common.notify_github`: asserts it no-ops when env vars are
  unset and builds the right payload when they are.

## Out of scope (this pass)

- Migrating `publisher.py` (TikTok) onto `publish_common.py` — deferred
  until after Content Posting API audit approval.
- Facebook Graph API publisher.
- Wiring any publisher into `vidgen/runner.py`'s automatic pipeline —
  neither TikTok's `publisher.py` nor this YouTube module are called
  from `runner.py` today; both remain standalone CLIs until an
  orchestration step (`main.py` calling all three) is explicitly
  scoped.
- Submitting the Google Cloud OAuth consent screen for verification
  (removes the 7-day refresh-token expiry) — manual action for the user
  outside this codebase.
