# Risk-weighted test coverage: publishing/, video_pipeline.py, topic_harvester.py

## Problem

Test coverage is inversely correlated with blast radius. `pipeline/` and
`quality/` (~2500 LOC) are well tested. `publishing/` (tiktok.py 976,
facebook.py 411, youtube.py 431, common.py 190 — ~2000 LOC), the
`video_pipeline.py` orchestrator (139 LOC), and `discovery/topic_harvester.py`
(799 LOC) have zero tests. `publishing/` is the highest-risk of the three: it
does OAuth token refresh, chunked resumable upload, and publish-status
polling against real TikTok/YouTube/Facebook accounts. A silent break there
(expired token, an API changing its response shape, a rate limit) fails
against production accounts with no test ever having caught it.

## Scope

Three areas, ordered by risk, each independently testable/PR-able:

1. `vidgen/publishing/` (common.py, tiktok.py, youtube.py, facebook.py)
2. `vidgen/pipeline/video_pipeline.py` — the checkpoint-skip branch in `main()`
3. `vidgen/discovery/topic_harvester.py` — pure scoring/dedup/formatting logic

All external calls (`requests`, `urllib`, `webbrowser`) are mocked via
pytest's `monkeypatch`, matching the existing convention in
`tests/test_pipeline_steps.py` and `tests/test_speech_providers.py`. No new
test dependency (no `responses`/`requests-mock`) is introduced. No test ever
makes a real network call or touches a real platform account.

One exception: `run_oauth_local_server` (common.py) is tested against a
**real** `http.server.HTTPServer` bound to an ephemeral localhost port,
driven from a background thread with a real `urllib.request` GET — this
exercises the actual `Handler.do_GET` parsing logic instead of mocking it
away, while `webbrowser.open` is monkeypatched to a no-op so no browser
actually opens.

## What's covered

### 1. `vidgen/publishing/common.py` — `tests/test_publish_common.py`

- `chunked_resumable_upload`: single-chunk success; multi-chunk with a 308
  continuation (asserts the next PUT starts at the byte offset from the
  `Range` header, not just `end+1`, to catch a server that skips ahead);
  non-2xx/non-308 response raises `RuntimeError`; empty file raises before
  any request is made.
- `poll_until`: returns data on `done=True`; raises `RuntimeError` on
  `terminal_failure=True`; raises after `max_attempts` exhausted with no
  terminal state (sleep monkeypatched to a no-op so the test doesn't
  actually wait).
- `load_tokens` / `save_tokens`: round-trip through `tmp_path`; missing file
  returns `{}`.
- `notify_github`: no-op (no request sent) when repo/token unset; swallows
  non-204 response; swallows a raised exception from `requests.post` — both
  non-fatal paths must not propagate.
- `run_oauth_local_server`: real HTTPServer — a background thread fires a GET
  to `/callback?code=xyz`, main thread's `handle_request()` returns, function
  returns `"xyz"`; a GET with no `code` param results in `RuntimeError`
  ("No auth code received").

### 2. `vidgen/publishing/youtube.py` — `tests/test_publish_youtube.py`

- `_build_video_resource`: appends `#Shorts` suffix and truncates base title
  so the suffix survives at 100 chars; leaves title alone (just truncates)
  if `#shorts` already present case-insensitively; naive `schedule_time` is
  treated as UTC (not host-local) and `privacyStatus` forced to `private`.
- `_refresh_access_token`: builds correct token-refresh POST body; non-200
  response raises `RuntimeError` with the response body in the message.
- `_get_valid_token`: no access token → `RuntimeError` telling the user to
  run `--setup-guide`; 401 from the channels check → refreshes and saves new
  tokens, returns the new access token; no refresh token available on a 401
  → `RuntimeError`.
- `_init_resumable_session`: 200 + `Location` header → returns upload URL;
  non-200 or missing `Location` → `RuntimeError`.
- `publish_video_on_youtube`: full happy path (token → init → chunked
  upload → poll succeeded → notify_github OK) returns
  `{video_id, status, url}`; an exception at any stage calls `notify_github`
  with `status="FAIL: ..."` and then re-raises (asserted via `pytest.raises`
  plus a spy on `notify_github`); missing video file raises
  `FileNotFoundError` before any network call.
- `delete_video_on_youtube`: 204 succeeds; non-204 raises `RuntimeError`.

### 3. `vidgen/publishing/facebook.py` — `tests/test_publish_facebook.py`

- `_build_publish_params`: `schedule_time` within [10min, 6mo) sets
  `published=false` + `scheduled_publish_time`; below 10min or above 6mo
  raises `ValueError`; warnings print (not raise) for ignored
  tags/privacy/made_for_kids but params still built.
- `_get_page_token`: `FACEBOOK_PAGE_ACCESS_TOKEN` env value takes priority
  over the token file; falls back to token file's `page_access_token`;
  neither set → `RuntimeError`.
- `_upload_video`: empty file raises before any request; non-200 or
  missing `id` in response raises `RuntimeError`; success returns the id.
- `_check_publishing_status`: `video_status="ready"` → done; a status in
  `FAILED_VIDEO_STATUSES` → terminal failure; anything else → not done, not
  terminal (still polling).
- `publish_video_on_facebook`: happy path and exception→notify-then-reraise,
  same shape as YouTube's.
- `delete_video_on_facebook`: success (`success: true`) vs failure paths.

### 4. `vidgen/publishing/tiktok.py` — `tests/test_publish_tiktok.py`

Pure helpers (no mocking needed):
- `_strip_markdown_fences`, `_normalize_hashtag`, `_dedupe_preserve_order`,
  `_topic_from_path`, `_scene_signal_score`, `_compose_caption` (asserts the
  2200-char TikTok limit is respected and hashtags aren't cut mid-token).

Network-backed (mocked):
- `_get_valid_token`: same 401→refresh shape as YouTube, but via TikTok's
  own `_load_tokens`/`_save_tokens`/`_refresh_access_token` (this file
  doesn't reuse common.py's token helpers — verify both independently).
- `_get_creator_info`: `error.code != "ok"` raises `RuntimeError`.
- `_init_upload`: computes `total_chunk_count` correctly from file size and
  chunk size (including the "exact multiple" edge case); non-"ok" error
  code raises.
- `_upload_chunks`: iterates the right number of chunks with correct
  `Content-Range` headers; a non-200/201/206 response raises mid-loop with
  the chunk index in the message.
- `_publish`: schedule_time converts to a Unix timestamp in `post_info`;
  non-"ok"/non-empty error code raises.
- `_poll_status`: `PUBLISH_COMPLETE` returns data; `FAILED`/`PUBLISH_FAILED`
  raises with `fail_reason`; exhausting `POLL_MAX` attempts without a
  terminal state raises (sleep monkeypatched away).
- `_notify_github`: same skip/non-fatal-swallow shape as common.py's
  version — verify TikTok's independent copy behaves identically.

### 5. OAuth flows — one test each in their respective files

- `_run_oauth_flow` (youtube.py, facebook.py, tiktok.py): missing
  client id/secret/app id → prints error and `sys.exit(1)` before any
  network call; happy path monkeypatches `run_oauth_local_server` to
  return a fixed code and asserts the resulting token-exchange request
  body and the shape of what's passed to `save_tokens` (facebook's is the
  most involved: code→short-lived→long-lived→page-token, 3 chained
  requests — assert each step's request uses the prior step's output).

### 6. `main()` argparse wiring — folded into each platform's existing test
   file (no new test module)

- `--setup-guide` prints the guide and returns without touching network
  or files.
- `--delete VIDEO_ID` calls the platform's `delete_video_on_*` (monkeypatched
  to a spy) and does not call publish.
- Normal invocation builds `PublishMetadata` correctly from args (title
  fallback to filename stem with underscores replaced, tags split/stripped,
  schedule passthrough) — verified by monkeypatching `publish_video_on_*`
  to a spy that captures its arguments instead of running the real thing.

### 7. `vidgen/pipeline/video_pipeline.py` — `tests/test_video_pipeline_main.py`

Only the checkpoint-skip branch at lines 91–106 (everything else in `main()`
is thin wiring already exercised indirectly via `pipeline_steps` tests):
- Hash matches state AND all WAV files exist → `synthesize_tts` is not
  called (spy asserts zero calls), state unchanged.
- Hash matches but a WAV file is missing → `synthesize_tts` is called, then
  state is updated with the new hash.
- Hash doesn't match state → `synthesize_tts` is called regardless of file
  presence.
- No prior state entry → `synthesize_tts` is called.

This requires refactoring `main()`'s script/CLI parsing out of the loop, or
testing through a thin wrapper — resolved during planning by extracting the
checkpoint-skip decision into a small pure function
(`should_skip_tts(state_entry, computed_hash, wav_files_present) -> bool`)
that `main()` calls, matching the existing pattern of extracting pure logic
into `pipeline_steps.py`. This is a minimal, in-scope refactor (the
condition already exists as an inline boolean expression) — not a rewrite of
`main()`.

### 8. `vidgen/discovery/topic_harvester.py` — `tests/test_topic_harvester.py`

Pure logic only — no network:
- `_keyword_score`: disqualify keyword short-circuits to `-999.0` even if
  other keywords also match; multiple keyword matches sum weights; no match
  → `(0.0, [])`.
- `_recency_multiplier`: `hours<=0` → `1.0`; monotonically decreasing; floor
  at `0.1`.
- `_stars_bonus`: `0` stars → `0.0`; capped at `2.0`; log-scaled (spot-check
  the documented 10★/100★/1000★ values in the docstring).
- `_hours_ago`: `None` → `999.0`; naive vs aware datetimes both handled
  (assert no `TypeError` from mixing naive/aware subtraction).
- `_clean_product_name`: separator split (`:`, em/en dash), version-tag
  strip, owner-prefix strip (`owner/repo` → `repo`), filler-word strip,
  `_PRODUCT_NAME_MAP` exact and substring match, 30-char cap, title-casing
  of all-lowercase input.
- `_to_vn_topic`: one test per pattern branch (B breaking-news incl.
  is_ai_release vs version/launch-keyword sub-cases, C security, A
  myth-bust, D number-extraction incl. the `x`-suffix detection, agent
  framing, MCP framing, default evergreen) — and a priority-order test
  confirming B beats C beats A beats D when multiple keyword sets match the
  same description.
- `_is_duplicate`: 3+ shared words against queue → duplicate; 3+ shared
  words against cache → duplicate; 2 shared words → not duplicate (boundary
  check); empty queue/cache → never duplicate.

Excluded: all `_fetch_*` functions (network I/O with no pure logic worth
isolating beyond what's already covered by their callers' tests above),
`_load_cache`/`_save_cache`/`_load_queue`/`_save_queue`/`_push_to_queue`
(thin JSON file I/O, lower risk, deferred), `harvest()` end-to-end
orchestration, and `main()`.

## Out of scope for this pass

- `tiktok.py`'s Anthropic caption-model call (`_call_caption_model`) and its
  prompt-building (`_build_caption_messages`) — covered only insofar as
  `_fallback_caption` and the pure formatting helpers above are tested;
  mocking the Anthropic API response shape is deferred to a follow-up.
- `harvest()`/`main()` full orchestration in topic_harvester.py.
- `publish_all.py` (79 LOC dispatcher) — thin enough to defer; revisit if
  time remains after the above.
- Any test infrastructure change (conftest.py, fixtures directory) beyond
  what's needed inline — if shared fixtures emerge (e.g. a fake `Response`
  object builder), they go in a new `tests/conftest.py`, added when the
  duplication actually appears rather than pre-built.

## Testing approach

- `pytest.monkeypatch` for all `requests.get/post/put/delete` calls,
  matching existing repo convention — no new dependency.
- A small local helper (likely in the new `tests/conftest.py`) building a
  fake `requests.Response`-like object (`.status_code`, `.json()`, `.text`,
  `.headers`, `.raise_for_status()`) shared across the four publishing test
  files, since all four need it repeatedly.
- `time.sleep` monkeypatched to a no-op in every polling test so tests run
  in milliseconds, not real poll intervals.
- Real `HTTPServer` only for `run_oauth_local_server`, as agreed above.

## Verification

- `pytest tests/` — all new and existing tests pass.
- No test spawns a real network connection (verified by inspection — every
  `requests.*` call site in the covered modules is monkeypatched in its
  corresponding test).
- `git diff --check` clean.
