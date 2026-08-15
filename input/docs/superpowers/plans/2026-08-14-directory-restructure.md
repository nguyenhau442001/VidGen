# Directory Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate scattered generated/build output under `build/`, rename ambiguous source dirs (`resources/` → `config/`, root `scripts/` → `tools/`), and remove stale git worktree + untracked caches, without changing any pipeline behavior.

**Architecture:** Pure filesystem moves (`git mv` for tracked files, `mv`/`rm` for untracked/cache dirs) plus a literal path-string substitution pass across code, docs, and CI config. No logic changes. Each task is independently verifiable (typecheck / test run / grep sweep) and independently committable.

**Tech Stack:** Python (vidgen pipeline), Node/Remotion, bash (CI scripts), GitHub Actions.

**Spec:** [docs/superpowers/specs/2026-08-14-directory-restructure-design.md](../specs/2026-08-14-directory-restructure-design.md)

## Global Constraints

- `remotion/out/` and `public/audio/` are OUT OF SCOPE — do not move (Remotion tooling constraints, per spec).
- `content/`, `docs/`, `website/`, `remotion/`, `vidgen/`, `tests/`, `template/`, `references/`, `research/` are OUT OF SCOPE — no change.
- No behavioral/logic change anywhere — this is a rename/move pass only. If a step would change behavior (e.g. the stale `output/video/mp4/` CI artifact path), preserve the existing (even if seemingly wrong) relative structure — just substitute the path prefix, do not "fix" unrelated bugs.
- Per project CLAUDE.md: after any edit, run `npx --prefix remotion tsc --noEmit -p remotion/tsconfig.json` where Remotion-relevant, and run the Python test suite where Python-relevant, before committing.
- Never use `git add -A` / `git add .` — stage files by exact name.
- Create a new commit per task; do not amend.

---

## File Inventory (what moves where)

| From | To | Git-tracked? |
|---|---|---|
| `output/` (all subdirs: `audits/`, `inspection/`, `previews/`, `thumbnails/`, `render_cache/`, `audio/`, `publishing/`, `.fonts_cache/`, `.hsk_promo_work_v3/`, loose files) | `build/pipeline/` | No (gitignored) |
| `input/` (`footage/`, loose files) | `build/reference-audio/` | No (gitignored) |
| `resources/colors.json`, `resources/topics_queue.json` | `config/colors.json`, `config/topics_queue.json` | Yes |
| `scripts/*.py`, `scripts/ci_build_render.sh` (root only, NOT `remotion/scripts/`) | `tools/*` | Yes |
| `.worktrees/thumbnail-generation` + branch `thumbnail-generation` | removed | N/A (worktree, fully merged, 0 unique commits) |
| `.cache/`, `.remotion/` (repo root) | removed | No (untracked) |

### Runtime code / config / docs that reference old paths (must update)

- `vidgen/presentation/thumbnail_renderer.py:221` — default output path `output/thumbnails/...`
- `vidgen/publisher/app.py:125,128` — `PUBLISHER_DB_PATH` / `PUBLISHER_UPLOAD_DIR` defaults under `output/publisher/`
- `vidgen/quality/retention_beatmap.py:15` — `write_beatmap(beatmap, "output/beatmap.json")`
- `vidgen/discovery/topic_harvester.py:5` — docstring mentioning `resources/topics_queue.json`
- `vidgen/quality/rendered_video_audit.py:65,296` — comment + printed hint mentioning `resources/colors.json`
- `.github/workflows/build_render.yml:30,32,43` — `scripts/ci_build_render.sh` invocation (×2) + `output/video/mp4/*.mp4` artifact path
- `tools/ci_build_render.sh` (after move) — self-referential header comments say `scripts/ci_build_render.sh`
- `skills/vidgen/SKILL.md` — all `output/`, `input/`, `resources/`, root-relative `scripts/` mentions
- `.gitignore` — `output/`, `input/` entries
- `README.md`, `AGENTS.md`, `CLAUDE.md` — check for path mentions
- `.claude/skills/vidgen-*/SKILL.md` and `README.md` (5 skill dirs) — check for path mentions

### Explicitly OUT of scope (do not touch)

- `docs/superpowers/plans/2026-07-19-*.md`, `2026-07-26-*.md` and `docs/superpowers/specs/2026-07-26-*.md` — historical records, must not be edited retroactively.
- `references/worldcup_elevenlabs_script.md` — content file, any `scripts/` mention there is prose, not a path reference to the repo's `scripts/` dir (verify in Task 5, don't assume).

---

### Task 1: Remove stale worktree and branch

**Files:** none (git plumbing only)

- [ ] **Step 1: Verify worktree has no unmerged commits (re-confirm before deleting)**

Run: `git -C /Users/haunguyen/GitHub/VidGen log --oneline main..thumbnail-generation`
Expected: empty output (already confirmed during brainstorming, re-check immediately before delete in case of drift).

- [ ] **Step 2: Remove the worktree**

Run: `git -C /Users/haunguyen/GitHub/VidGen worktree remove .worktrees/thumbnail-generation`
Expected: command succeeds, `.worktrees/thumbnail-generation` no longer exists on disk.

- [ ] **Step 3: Delete the local branch**

Run: `git -C /Users/haunguyen/GitHub/VidGen branch -d thumbnail-generation`
Expected: `Deleted branch thumbnail-generation (was <sha>).`

- [ ] **Step 4: Confirm `.worktrees/` is now empty and remove it if so**

Run: `ls -la /Users/haunguyen/GitHub/VidGen/.worktrees`
Expected: empty (or only `.` / `..`). If empty, `rmdir /Users/haunguyen/GitHub/VidGen/.worktrees`.

No commit needed — this task has no tracked file changes (worktree removal and branch deletion are git-internal state, not working-tree content).

---

### Task 2: Remove untracked root caches

**Files:** none (untracked directories only)

- [ ] **Step 1: Confirm both dirs are untracked**

Run: `git -C /Users/haunguyen/GitHub/VidGen status --short .cache .remotion`
Expected: both show as `??` (untracked) or produce no tracked-file output — confirms deleting them touches no git history.

- [ ] **Step 2: Delete them**

Run: `rm -rf /Users/haunguyen/GitHub/VidGen/.cache /Users/haunguyen/GitHub/VidGen/.remotion`
Expected: both paths no longer exist.

- [ ] **Step 3: Confirm `.gitignore` already covers regeneration (add entries if missing)**

Run: `grep -n '^\.cache/\|^\.remotion/' /Users/haunguyen/GitHub/VidGen/.gitignore`
Expected: if no match, add `.cache/` and `.remotion/` as new lines to `.gitignore` (use Edit tool) so they don't reappear as untracked clutter.

- [ ] **Step 4: Commit (only if `.gitignore` changed)**

```bash
git add .gitignore
git commit -m "chore: ignore .cache/ and .remotion/ build caches"
```

If `.gitignore` already covered them, skip the commit — nothing changed.

---

### Task 3: Move generated output dirs (`output/` → `build/pipeline/`, `input/` → `build/reference-audio/`)

**Files:**
- Move (untracked, plain `mv`): `output/*` → `build/pipeline/*`
- Move (untracked, plain `mv`): `input/*` → `build/reference-audio/*`
- Modify: `/Users/haunguyen/GitHub/VidGen/.gitignore`

**Interfaces:**
- Produces: `build/pipeline/` as the new root for all pipeline-generated artifacts (audits, inspection, previews, thumbnails, render_cache, audio, publishing, fonts cache). `build/reference-audio/` as the new root for personal voice-cloning reference audio. Task 6 (code path updates) consumes these exact path strings.

- [ ] **Step 1: Confirm both source dirs are fully untracked**

Run: `git -C /Users/haunguyen/GitHub/VidGen ls-files output/ input/`
Expected: empty output (already confirmed during brainstorming — re-verify before a bulk `mv`).

- [ ] **Step 2: Create the new build root and move output/**

```bash
mkdir -p /Users/haunguyen/GitHub/VidGen/build
mv /Users/haunguyen/GitHub/VidGen/output /Users/haunguyen/GitHub/VidGen/build/pipeline
```

Expected: `/Users/haunguyen/GitHub/VidGen/output` no longer exists; `/Users/haunguyen/GitHub/VidGen/build/pipeline/` contains everything `output/` had (spot check: `ls build/pipeline` shows `audits/ audio/ inspection/ previews/ publishing/ render_cache/ thumbnails/` plus loose files).

- [ ] **Step 3: Move input/**

```bash
mv /Users/haunguyen/GitHub/VidGen/input /Users/haunguyen/GitHub/VidGen/build/reference-audio
```

Expected: `/Users/haunguyen/GitHub/VidGen/input` no longer exists; `build/reference-audio/footage/` present.

- [ ] **Step 4: Update `.gitignore`**

Change:
```
# Generated output files
output/
remotion/public/audio/
public/audio/
```
to:
```
# Generated output files
build/
remotion/public/audio/
public/audio/
```
And change:
```
# Personal reference audio (voice cloning tests, etc.)
input/
```
to:
```
# Personal reference audio (voice cloning tests, etc.)
build/reference-audio/
```

Use the Edit tool on `/Users/haunguyen/GitHub/VidGen/.gitignore` for both changes.

- [ ] **Step 5: Verify git sees no unexpected tracked changes**

Run: `git -C /Users/haunguyen/GitHub/VidGen status --short`
Expected: only `.gitignore` shown as modified; `build/` does not appear (now ignored).

- [ ] **Step 6: Commit**

```bash
git add .gitignore
git commit -m "chore: consolidate output/ and input/ under build/"
```

---

### Task 4: Rename `resources/` → `config/` (git-tracked move)

**Files:**
- Move: `resources/colors.json` → `config/colors.json`
- Move: `resources/topics_queue.json` → `config/topics_queue.json`
- Modify: `vidgen/discovery/topic_harvester.py:5`
- Modify: `vidgen/quality/rendered_video_audit.py:65,296`

**Interfaces:**
- Produces: `config/colors.json`, `config/topics_queue.json` as the new canonical paths. Task 6 verifies no other file still references `resources/`.

- [ ] **Step 1: git mv both tracked files**

```bash
cd /Users/haunguyen/GitHub/VidGen
git mv resources/colors.json config/colors.json
git mv resources/topics_queue.json config/topics_queue.json
```

Expected: `git status --short` shows two `R` (renamed) entries; `resources/` directory no longer exists (git mv removes the now-empty dir).

- [ ] **Step 2: Update docstring in topic_harvester.py**

In `vidgen/discovery/topic_harvester.py` line 5, change:
```
each item and writes optional ideas to resources/topics_queue.json for human review.
```
to:
```
each item and writes optional ideas to config/topics_queue.json for human review.
```

- [ ] **Step 3: Update comment + print string in rendered_video_audit.py**

In `vidgen/quality/rendered_video_audit.py` line 65, change:
```
# resources/colors.json (the project's shared name → hex registry) so new scripts can
```
to:
```
# config/colors.json (the project's shared name → hex registry) so new scripts can
```

Line 296, change:
```
"║    • No accent     → verify accentColor in JSON is a hex from resources/colors.json",
```
to:
```
"║    • No accent     → verify accentColor in JSON is a hex from config/colors.json",
```

- [ ] **Step 4: Grep for any remaining literal `resources/` mentions in runtime code**

Run: `grep -rn 'resources/' /Users/haunguyen/GitHub/VidGen/vidgen/`
Expected: no matches. If any remain, update them the same way (path-string substitution only).

- [ ] **Step 5: Run the Python test suite**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/ -q`
Expected: same pass/fail state as before this task (no new failures introduced by the rename — these files aren't covered by tests directly, this just confirms nothing else broke).

- [ ] **Step 6: Commit**

```bash
git add resources config vidgen/discovery/topic_harvester.py vidgen/quality/rendered_video_audit.py
git commit -m "chore: rename resources/ to config/"
```

---

### Task 5: Rename root `scripts/` → `tools/` (git-tracked move)

**Files:**
- Move: `scripts/build_hsk_flashcards_promo_assets.py` → `tools/build_hsk_flashcards_promo_assets.py`
- Move: `scripts/ci_build_render.sh` → `tools/ci_build_render.sh`
- Move: `scripts/hsk_promo_final_cut.py` → `tools/hsk_promo_final_cut.py`
- Move: `scripts/hsk_promo_final_cut_v3.py` → `tools/hsk_promo_final_cut_v3.py`
- Move: `scripts/hsk_promo_render.py` → `tools/hsk_promo_render.py`
- Move: `scripts/hsk_promo_scenes.py` → `tools/hsk_promo_scenes.py`
- Move: `scripts/hsk_promo_textfit.py` → `tools/hsk_promo_textfit.py`
- Move: `scripts/hsk_promo_tts_v3.py` → `tools/hsk_promo_tts_v3.py`
- Move: `scripts/test_voice_clone.py` → `tools/test_voice_clone.py`
- Modify: `tools/ci_build_render.sh` (self-referential header comment + usage lines)
- Modify: `.github/workflows/build_render.yml:30,32`

**Interfaces:**
- Produces: `tools/` as the new root for standalone Python/bash helper scripts, disambiguated from `remotion/scripts/` (Node/Remotion-internal scripts — NOT moved, out of scope).

- [ ] **Step 1: Confirm `remotion/scripts/` is a distinct, separate directory (do not touch it)**

Run: `ls /Users/haunguyen/GitHub/VidGen/remotion/scripts/`
Expected: shows `render-chunks.mjs`, `check_scene_types.mjs` or similar — confirms this is untouched by this task.

- [ ] **Step 2: git mv all 9 tracked files from scripts/ to tools/**

```bash
cd /Users/haunguyen/GitHub/VidGen
mkdir -p tools
git mv scripts/build_hsk_flashcards_promo_assets.py tools/build_hsk_flashcards_promo_assets.py
git mv scripts/ci_build_render.sh tools/ci_build_render.sh
git mv scripts/hsk_promo_final_cut.py tools/hsk_promo_final_cut.py
git mv scripts/hsk_promo_final_cut_v3.py tools/hsk_promo_final_cut_v3.py
git mv scripts/hsk_promo_render.py tools/hsk_promo_render.py
git mv scripts/hsk_promo_scenes.py tools/hsk_promo_scenes.py
git mv scripts/hsk_promo_textfit.py tools/hsk_promo_textfit.py
git mv scripts/hsk_promo_tts_v3.py tools/hsk_promo_tts_v3.py
git mv scripts/test_voice_clone.py tools/test_voice_clone.py
```

Expected: `git status --short` shows 9 `R` (renamed) entries; root `scripts/` directory no longer exists (and `scripts/__pycache__` — untracked — should be deleted separately, see Step 3).

- [ ] **Step 3: Clean up leftover untracked `scripts/__pycache__`**

Run: `rm -rf /Users/haunguyen/GitHub/VidGen/scripts` (only if it still exists after the git mv — the `__pycache__` subdir is untracked bytecode and git mv won't remove it, leaving an empty-of-tracked-files but non-empty `scripts/` dir).

Expected: `/Users/haunguyen/GitHub/VidGen/scripts` no longer exists.

- [ ] **Step 4: Update self-referential paths in tools/ci_build_render.sh**

In `tools/ci_build_render.sh`, update the header comment and usage examples that say `scripts/ci_build_render.sh`:

Line with `# scripts/ci_build_render.sh — build + render...` → `# tools/ci_build_render.sh — build + render...`

Usage block:
```
# Usage:
#   scripts/ci_build_render.sh content/json/script_grab_dispatch_p3.json
#   scripts/ci_build_render.sh content/json/script_grab_dispatch_p3.json --speed 1.1
```
→
```
# Usage:
#   tools/ci_build_render.sh content/json/script_grab_dispatch_p3.json
#   tools/ci_build_render.sh content/json/script_grab_dispatch_p3.json --speed 1.1
```

And the runtime usage-error line:
```
  echo "Usage: $0 <content/json/script_name.json> [extra video_pipeline args...]" >&2
```
This one uses `$0` (dynamic), no change needed — confirm it still reads `$0` unmodified.

- [ ] **Step 5: Update `.github/workflows/build_render.yml`**

Lines 30 and 32, change both:
```
            scripts/ci_build_render.sh "${{ inputs.script }}" --speed "${{ inputs.speed }}"
```
and
```
            scripts/ci_build_render.sh "${{ inputs.script }}"
```
to use `tools/ci_build_render.sh` instead of `scripts/ci_build_render.sh`.

Leave line 43 (`path: output/video/mp4/*.mp4`) for Task 6 — it's an `output/` reference, handled in the sweep task, not a `scripts/` reference.

- [ ] **Step 6: Grep for any remaining literal root-relative `scripts/` mentions (excluding `remotion/scripts/`)**

Run: `grep -rn '\bscripts/' /Users/haunguyen/GitHub/VidGen --include="*.py" --include="*.sh" --include="*.yml" --include="*.md" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=remotion | grep -v 'remotion/scripts/'`
Expected: no matches left pointing at the old root `scripts/` path (SKILL.md and other docs are handled in Task 6 — if this grep surfaces any, note them for Task 6 rather than fixing here, to keep this task's diff scoped to the move + CI + self-reference).

- [ ] **Step 7: Commit**

```bash
git add tools .github/workflows/build_render.yml
git commit -m "chore: rename root scripts/ to tools/"
```

---

### Task 6: Sweep remaining doc/comment references to old paths

**Files:**
- Modify: `skills/vidgen/SKILL.md`
- Modify: `vidgen/presentation/thumbnail_renderer.py:221`
- Modify: `vidgen/publisher/app.py:125,128`
- Modify: `vidgen/quality/retention_beatmap.py:15`
- Modify: `.github/workflows/build_render.yml:43`
- Modify (conditionally): `README.md`, `AGENTS.md`, `CLAUDE.md`, `.claude/skills/vidgen-*/SKILL.md`, `.claude/skills/vidgen-*/README.md` — only if they contain literal path references to the moved dirs (verify first, don't assume).

**Interfaces:**
- Consumes: `build/pipeline/` and `config/` path strings from Tasks 3–4.

- [ ] **Step 1: Update runtime default-path code**

`vidgen/presentation/thumbnail_renderer.py:221`, change:
```python
output = args.output or f"output/thumbnails/{Path(args.script).stem}_thumb.png"
```
to:
```python
output = args.output or f"build/pipeline/thumbnails/{Path(args.script).stem}_thumb.png"
```

`vidgen/publisher/app.py:125,128`, change:
```python
db_path = Path(os.getenv("PUBLISHER_DB_PATH", "output/publisher/publisher.db"))
```
and
```python
upload_dir = Path(os.getenv("PUBLISHER_UPLOAD_DIR", "output/publisher/uploads"))
```
to:
```python
db_path = Path(os.getenv("PUBLISHER_DB_PATH", "build/pipeline/publisher/publisher.db"))
```
and
```python
upload_dir = Path(os.getenv("PUBLISHER_UPLOAD_DIR", "build/pipeline/publisher/uploads"))
```

`vidgen/quality/retention_beatmap.py:15`, change:
```python
write_beatmap(beatmap, "output/beatmap.json")
```
to:
```python
write_beatmap(beatmap, "build/pipeline/beatmap.json")
```

- [ ] **Step 2: Update CI artifact path**

`.github/workflows/build_render.yml:43`, change:
```
          path: output/video/mp4/*.mp4
```
to:
```
          path: build/pipeline/video/mp4/*.mp4
```

(This preserves the existing — possibly already-stale — subpath structure verbatim, per Global Constraints: substitute the prefix only, do not correct unrelated pre-existing bugs.)

- [ ] **Step 3: Update skills/vidgen/SKILL.md**

Run: `grep -n '\boutput/\|\binput/\|\bresources/\|\bscripts/' /Users/haunguyen/GitHub/VidGen/skills/vidgen/SKILL.md`

For each match, apply the same literal substitution: `output/` → `build/pipeline/`, `input/` → `build/reference-audio/`, `resources/` → `config/`, root-relative `scripts/` → `tools/` (verify each `scripts/` hit isn't actually meaning `remotion/scripts/` before changing it — check surrounding context).

Use Edit tool for each distinct occurrence (or `replace_all` per exact string where the string is unambiguous and repeats verbatim).

- [ ] **Step 4: Check top-level docs for path mentions**

Run: `grep -n '\boutput/\|\binput/\|\bresources/\|\bscripts/' /Users/haunguyen/GitHub/VidGen/README.md /Users/haunguyen/GitHub/VidGen/AGENTS.md /Users/haunguyen/GitHub/VidGen/CLAUDE.md`

For any real path references found (not prose false-positives), apply the same substitution. If a file has no matches, skip it — do not touch files with nothing to change.

- [ ] **Step 5: Check `.claude/skills/vidgen-*/` skill docs for path mentions**

Run: `grep -rln '\boutput/\|\binput/\|\bresources/\|\bscripts/' /Users/haunguyen/GitHub/VidGen/.claude/skills/`

For each file found, inspect the matches and apply the same substitution only where they're real repo-relative path references (these are skill instruction docs — verify context, since "resources" or "output" may appear as ordinary English words too).

- [ ] **Step 6: Verify `references/worldcup_elevenlabs_script.md` mention is prose, not a path (per plan's out-of-scope note)**

Run: `grep -n 'scripts/' /Users/haunguyen/GitHub/VidGen/references/worldcup_elevenlabs_script.md`
Expected: confirm it's not a literal repo path reference (e.g. it's the word "scripts" in a sentence about voiceover scripts). Leave untouched either way — this file is out of scope per the plan.

- [ ] **Step 7: Full-repo final grep sweep for anything missed**

Run:
```bash
grep -rn '"output/\|'"'"'output/\| output/\|"input/\|'"'"'input/\| input/\|"resources/\|'"'"'resources/\| resources/' \
  /Users/haunguyen/GitHub/VidGen \
  --include="*.py" --include="*.md" --include="*.sh" --include="*.yml" --include="*.yaml" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=build --exclude-dir=remotion \
  --exclude-dir=docs
```

(`docs/` excluded deliberately — historical plans/specs are out of scope per Global Constraints.)

Expected: no remaining matches pointing at old paths. If any are found, fix them with the same literal substitution and re-run this grep until clean.

- [ ] **Step 8: Typecheck (Remotion side unaffected, but confirm)**

Run: `npx --prefix remotion tsc --noEmit -p remotion/tsconfig.json`
Expected: same pass/fail state as before this plan (no TS files touched in this task, this is a safety check per project standing rule).

- [ ] **Step 9: Run Python test suite**

Run: `/Users/haunguyen/miniconda3/bin/python -m pytest tests/ -q`
Expected: same pass/fail state as before this task.

- [ ] **Step 10: Manual smoke test — invoke one pipeline command end to end**

Run: `/Users/haunguyen/miniconda3/bin/python -m vidgen.quality.script_quality_gate content/json/lazada_sale_van_lo.json`
Expected: gate runs successfully against the existing approved script (this file already exists per current repo state) — confirms the quality-gate module still imports and runs cleanly after all path edits (it doesn't write to `output/`/`build/` itself, but this confirms no import-time breakage from the sweep).

- [ ] **Step 11: Commit**

```bash
git add skills/vidgen/SKILL.md vidgen/presentation/thumbnail_renderer.py vidgen/publisher/app.py vidgen/quality/retention_beatmap.py .github/workflows/build_render.yml
# Add README.md / AGENTS.md / CLAUDE.md / .claude/skills/vidgen-*/ files only if Steps 4-5 actually modified them
git commit -m "chore: update path references to build/, config/, tools/"
```

---

### Task 7: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Confirm final top-level directory listing matches the design**

Run: `ls -la /Users/haunguyen/GitHub/VidGen | grep -v '^\.git$'`
Expected: `output/`, `input/`, `resources/`, root `scripts/`, `.cache/`, `.remotion/`, `.worktrees/` no longer present; `build/`, `config/`, `tools/` present.

- [ ] **Step 2: Confirm git status is clean (no stray untracked files from the restructure itself)**

Run: `git -C /Users/haunguyen/GitHub/VidGen status --short`
Expected: only pre-existing unrelated modifications from before this plan started (the scene TSX/pipeline WIP changes noted in the session's initial git status) — no leftover restructure artifacts.

- [ ] **Step 3: Confirm `build/` is gitignored and doesn't show as untracked**

Run: `git -C /Users/haunguyen/GitHub/VidGen status --short build/`
Expected: empty output.

- [ ] **Step 4: Final full-repo grep for old path prefixes (last-chance safety net)**

Run:
```bash
grep -rln '\boutput/\|\binput/\|\bresources/' /Users/haunguyen/GitHub/VidGen \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=build --exclude-dir=remotion --exclude-dir=docs 2>/dev/null
```
Expected: no output. If anything shows up, investigate and fix before considering the plan complete.

No commit — this is a read-only verification task.
