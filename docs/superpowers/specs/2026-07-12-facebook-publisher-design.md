# Facebook Reels Auto-Publish (GAP 5) — Design

## Context

GAP 5 targets auto-publish to TikTok, YouTube, and Facebook. TikTok is
blocked on Content Posting API audit approval; YouTube shipped
(`vidgen/publisher_youtube.py`) and extracted `vidgen/publish_common.py`
for pieces that generalize across platforms. This is the Facebook leg.

Unlike TikTok's audit, Facebook's `pages_manage_posts` /
`pages_show_list` / `pages_read_engagement` permissions work immediately
for Pages the requesting account administers, with no App Review needed
— App Review is only required to publish to Pages the developer doesn't
manage. So this isn't blocked the way TikTok is.

## Scope

- Reels only, via the Graph API `video_reels` endpoint (Meta's current
  API for vertical short-form video — the old `/{page-id}/videos`
  endpoint is for feed/long-form video and out of scope). Same vertical
  (1080×1920, ≤3min) render output as TikTok/YouTube.
- Publishing target is a Facebook **Page**, not a personal profile —
  Graph API has no Reels-to-profile endpoint. One Page per repo,
  configured via `FACEBOOK_PAGE_ID`.
- Raw REST via `requests`, matching the codebase's existing no-SDK
  style (same choice made for YouTube).
- Reuses `vidgen/publish_common.py` as-is: `run_oauth_local_server`,
  `load_tokens`/`save_tokens`, `poll_until`, `notify_github`. No changes
  to that file — everything it exports already generalizes to Facebook's
  shapes.
- New `publish_video_on_facebook` entry point, joining
  `publish_video_on_youtube` for a future orchestrator.

## Files

### `vidgen/publisher_facebook.py` (new)

Mirrors `publisher_youtube.py`'s shape and CLI conventions.

**Config** (env/`.env`): `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`,
`FACEBOOK_PAGE_ID`. Tokens persisted to `.facebook_tokens.json` at repo
root (same pattern as `.youtube_tokens.json`).

**Auth model — long-lived Page token, no refresh flow:**

- `--oauth` builds a Facebook Login dialog URL
  (`https://www.facebook.com/v25.0/dialog/oauth`,
  `scope=pages_show_list,pages_read_engagement,pages_manage_posts`,
  `redirect_uri=http://localhost:8080/callback`), calls
  `publish_common.run_oauth_local_server` for the code.
- Exchanges the code for a short-lived user token
  (`GET /v25.0/oauth/access_token`), then exchanges that for a
  long-lived user token (`grant_type=fb_exchange_token`, ~60 days).
- Calls `GET /v25.0/me/accounts` with the long-lived user token, finds
  the entry matching `FACEBOOK_PAGE_ID`, and saves its `access_token`
  (the Page token) to `.facebook_tokens.json` as `{"page_access_token":
  ..., "page_id": ...}`. Page tokens derived from a long-lived user
  token are effectively permanent, so **no refresh logic is
  implemented** — `_get_page_token()` just loads and returns it, raising
  a clear error telling the user to re-run `--oauth` if the API ever
  rejects it (e.g. revoked access, password change).
- Errors clearly if `FACEBOOK_PAGE_ID` isn't found in the `/me/accounts`
  list (message: check the account has admin/editor role on that Page).

**Publish flow** (`publish_video_on_facebook(video_path, metadata) ->
dict`):

1. `POST https://graph.facebook.com/v25.0/{page_id}/video_reels`
   `upload_phase=start` → `video_id`, `upload_url`.
2. `_upload_video_chunks(upload_url, video_path, token)` — local
   chunked-upload loop, **not** `publish_common.chunked_resumable_upload`
   (Facebook's Resumable Upload protocol is a different shape: header
   `offset` + `file_size` per chunk instead of `Content-Range`, and a
   flat `{"success": true}` 200 response instead of Google's 308-means-
   continue signal — there's nothing to share with the Google-shaped
   helper). Chunk size 10MB, matching TikTok/YouTube's `CHUNK_SIZE`.
   Loop: PUT each chunk with `Authorization: OAuth {token}`,
   `offset: {start}`, `file_size: {total}`, advance `start` by the
   chunk's length after each `success: true` response; a failure
   mid-loop raises with the offset for debugging (no auto-resume via
   `bytes_transfered` query — matches the codebase's existing
   fail-fast-and-let-the-caller-retry pattern, same as TikTok/YouTube
   today, which also don't auto-resume across process restarts).
3. `POST .../video_reels` `upload_phase=finish`, `video_id`,
   `video_state`, `title`, `description` — built from `PublishMetadata`
   (mapping below).
4. `publish_common.poll_until` against
   `GET /v25.0/{video_id}?fields=status`, reused unmodified: done when
   `status.publishing_phase.status == "complete"`, terminal failure when
   it's `"error"` (surfacing `status.publishing_phase.error_reason` /
   `status.processing_phase.error_reason` in the raised message).
5. `publish_common.notify_github(platform="facebook", ...)` on both
   success and failure, same as YouTube.
6. Returns `{"video_id": id, "status": "succeeded", "url":
   f"https://www.facebook.com/reel/{id}"}`.

**Metadata mapping** (`PublishMetadata` → Reels `finish` params):

| `PublishMetadata` field | Reels API field | Notes |
|---|---|---|
| `title` | `title` | |
| `description` | `description` | falls back to `title` if empty, same as YouTube |
| `tags` | *(unused)* | Reels has no tags field; hashtags are just text in `description`. If `--tags` is passed, print a warning that it's ignored on Facebook. |
| `privacy` | *(unused)* | Reels have no per-post privacy status — visibility follows the Page's own settings. Warn if `--privacy` is passed as non-default (`public`). |
| `made_for_kids` | *(unused)* | No Facebook equivalent; warn if `True`. |
| `schedule_time` | `video_state=SCHEDULED` + `scheduled_publish_time` | Unix timestamp. Validated client-side before calling the API: must be >10 minutes and <29 days from now (Meta's own constraint) — raise a clear `ValueError` rather than letting the API reject it opaquely. Otherwise `video_state=PUBLISHED`. |

**CLI `main()`**: same flags as `publisher_youtube.py` for symmetry
(`--title`, `--description`, `--tags`, `--privacy`, `--made-for-kids`,
`--schedule`, `--setup-guide`, `--oauth`, `--delete`), with the unused
ones emitting the warnings noted above instead of being silently
dropped.

**`--delete VIDEO_ID`**: `DELETE /v25.0/{video_id}` with the Page token.

**`--setup-guide`**: printed instructions — create a Meta for Developers
app (type: **Business**) → add the **Facebook Login for Business**
product → under App Roles, confirm your account is Admin (or has a role
granting Page access) → find your Page ID (Page → About → Page
transparency, or `GET /me/accounts`) → copy `FACEBOOK_APP_ID` /
`FACEBOOK_APP_SECRET` (App Settings → Basic) and `FACEBOOK_PAGE_ID` into
`.env` → run `python -m vidgen.publisher_facebook --oauth`. Notes that
because the app stays in Development mode, this only works for accounts
with a role on the app (fine for a single-operator channel like this
one) — going public to Pages you don't administer would need App
Review, which is out of scope here.

## Error handling

Same try/except-then-notify shape as `publisher_youtube.py`: any
exception during token load / init / upload / finish / poll triggers
`publish_common.notify_github(status=f"FAIL: {e}")` then re-raises.
Known failure modes get specific messages:

- No page token found / `FACEBOOK_PAGE_ID` not in `/me/accounts` →
  "Run `python -m vidgen.publisher_facebook --oauth`" or "Account has no
  role on Page {id} — check Page admin/editor access."
- Chunk upload failure → offset included in the error.
- `scheduled_publish_time` outside the 10min–29day window → raised
  before any network call.
- `publishing_phase.status == "error"` → surface `error_reason` from
  the status response.
- Rate limit (Reels publish endpoint caps at 30 API-published
  posts/24h) → if the `finish` call returns a Graph API error with that
  reason, surface it verbatim with a note about the daily cap.

## Testing

Pytest, following `publisher_youtube.py`'s planned test structure
(mocked `requests`, no live network calls):

- `PublishMetadata` → Reels `finish`-params mapping: title/description
  fallback, schedule_time → `video_state=SCHEDULED` conversion,
  validation error for out-of-window `schedule_time`.
- `_upload_video_chunks`: offset advances correctly across a canned
  multi-chunk response sequence; a non-`success` response raises with
  the right offset.
- Facebook's `poll_until` `check_fn`: canned "processing → complete" and
  "processing → error" status payloads, asserting it stops at the right
  point.
- `--oauth` token exchange chain (code → short-lived → long-lived →
  `/me/accounts` → matching Page token saved) with each HTTP call
  mocked.

## Out of scope (this pass)

- Migrating `publisher.py` (TikTok) onto `publish_common.py` — still
  deferred pending its API audit.
- Wiring any publisher into `vidgen/runner.py`'s automatic pipeline —
  all three remain standalone CLIs.
- App Review submission for publishing to Pages beyond the ones the
  developer account administers — manual, outside this codebase, and
  unnecessary for a single-channel use case.
- Auto-resuming interrupted uploads via Facebook's `bytes_transfered`
  query — fail-fast matches existing TikTok/YouTube behavior; can be
  added later if flaky uploads become a real problem.
