# VidGen directory restructure — design spec

Date: 2026-08-14

## Problem

Repo root has too many overlapping/confusing top-level directories:

- Generated/build output scattered across root: `output/`, `remotion/out/`, `public/audio/`, `input/`.
- Three similarly-named source dirs with unrelated purposes: `resources/` (runtime config data), `references/` (pipeline-read schema/retention docs), `research/` (per-video research briefs).
- Stray untracked cache/worktree dirs at root: `.cache/`, `.remotion/`, `.worktrees/`.
- Two directories both named `scripts/` (root: Python HSK-promo helper scripts; `remotion/scripts/`: Node/Remotion scripts), invoked from different call sites, easy to confuse.

`remotion/out/*.mp4` and `*_thumb.png` clutter has already been deleted (all regeneratable from `content/json/<slug>.json` via the pipeline).

## Verified facts before design

- `output/`, `remotion/public/audio/`, `public/audio/`, `remotion/out/`, `input/` are all listed in `.gitignore` — pure build/cache, not source.
- No runtime Python code hardcodes `resources/`, `references/`, `research/`, or `scripts/` as literal path strings used for file I/O logic — only docstrings, comments, and print/log strings reference them (verified via grep across `vidgen/`). Renaming these is a documentation/comment-string change, not a logic change.
- `vidgen/pipeline/chunked_video_renderer.py` and `vidgen/pipeline/check_scene_types.py` invoke `scripts/render-chunks.mjs` / `scripts/check_scene_types.mjs` — these resolve relative to `remotion/` (Node context), i.e. `remotion/scripts/`, not root `scripts/`. Confirmed as the source of the naming collision.
- `.worktrees/thumbnail-generation` (branch `thumbnail-generation`) has zero commits not already in `main` (main is 285 commits ahead, branch has 0 unique commits) — safe to remove worktree and branch.
- `public/audio/*.wav` are Remotion Studio asset files — Remotion serves static assets from `public/`, so this path cannot move without changing Remotion's public dir config; out of scope.
- `remotion/out/` is Remotion CLI's own render-output convention; changing it means passing `--output-dir` on every render invocation. Out of scope for this pass — left as-is.

## Changes

### A. Consolidate generated pipeline output under `build/`

- `output/` → `build/pipeline/` (subdirs preserved as-is: `audits/`, `inspection/`, `previews/`, `thumbnails/`, `render_cache/`, `audio/`, `publishing/`, `.fonts_cache/`, `.hsk_promo_work_v3/`)
- `input/` → `build/reference-audio/` (personal voice-cloning reference audio; "input" was ambiguous — this is not pipeline input, it's local reference material)
- `remotion/out/` — unchanged (Remotion-owned convention)
- `public/audio/` — unchanged (Remotion static-asset requirement)

Update `.gitignore` entries for `output/` → `build/`, add `build/reference-audio/` in place of `input/`.

### B. Rename ambiguous source dirs

- `resources/` → `config/` (contains `topics_queue.json`, `colors.json` — runtime config data, not "resources")
- `references/` — unchanged (already correctly named: pipeline-read schema/retention/audit docs)
- `research/` — unchanged (already correctly named: per-video research briefs)

### C. Cleanup

- Remove git worktree `.worktrees/thumbnail-generation` and local branch `thumbnail-generation` (fully merged, verified above).
- Remove untracked `.cache/` and `.remotion/` from the working tree if they are pure rebuildable caches (confirm each is gitignored or add gitignore entries so they don't reappear as untracked clutter).
- Rename root `scripts/` → `tools/` to eliminate the name collision with `remotion/scripts/`.

## Path reference updates required

Grep-and-replace pass across:
- `skills/vidgen/SKILL.md` — all `output/`, `input/`, `resources/`, `scripts/` (root-relative) mentions.
- `vidgen/discovery/topic_harvester.py`, `vidgen/quality/rendered_video_audit.py` — comment/docstring/print-string mentions of `resources/`.
- Any Python CLI default arguments (`--output-dir`, etc.) that currently default to `output/` — update defaults to `build/pipeline/`.
- `scripts/*.py` (HSK promo scripts) — check for relative-path assumptions before the `scripts/` → `tools/` rename; update any self-referential paths.
- `.gitignore`.
- CI workflow files under `.github/` if they reference `output/`, `input/`, or `scripts/` paths.

## Out of scope

- `remotion/out/` and `public/audio/` (Remotion tooling constraints).
- `content/`, `docs/`, `website/`, `remotion/`, `vidgen/`, `tests/`, `template/` — already correctly scoped, no change.
- Any behavioral/logic change to the pipeline itself.

## Testing / verification

- After moves: `npx --prefix remotion tsc --noEmit -p remotion/tsconfig.json` (should be unaffected, but run per standing project rule).
- Run existing test suite (`tests/`) to confirm no hardcoded old paths broke.
- Grep the full repo for leftover literal `output/`, `resources/`, root `scripts/` path strings post-rename to catch anything missed.
- Manually invoke one pipeline command end-to-end (e.g. quality gate on an existing `content/json/<slug>.json`) to confirm it still writes to `build/pipeline/audits/`.
