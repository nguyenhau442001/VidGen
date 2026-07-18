#!/usr/bin/env bash
#
# scripts/ci_build_render.sh — build + render a VidGen script end to end.
#
# Wraps the same pipeline a human runs by hand (`python -m vidgen.pipeline.video_pipeline`),
# with a fast Gate 1 pre-check, timing, and a GitHub Actions notify.yml
# dispatch on completion — the same notify mechanism used by the publishers
# uses for TikTok publish results, so render and publish failures land in
# the same inbox the same way.
#
# Usage:
#   scripts/ci_build_render.sh content/script_grab_dispatch_p3.json
#   scripts/ci_build_render.sh content/script_grab_dispatch_p3.json --speed 1.1
#
# Requires VieNeu-TTS + Remotion + ffmpeg locally, so this is meant for a
# self-hosted runner (or a developer machine) — not a hosted GitHub runner.
#
# Env (optional, loaded from .env at repo root if present):
#   GITHUB_REPO, GITHUB_TOKEN, GITHUB_WORKFLOW (default notify.yml)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PYTHON_BIN="${VIDGEN_PYTHON:-/Users/haunguyen/miniconda3/bin/python}"
command -v "$PYTHON_BIN" >/dev/null 2>&1 || PYTHON_BIN="python3"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source <(grep -v '^\s*#' .env | grep -v '^\s*$')
  set +a
fi

SCRIPT_PATH="${1:-}"
if [[ -z "$SCRIPT_PATH" ]]; then
  echo "Usage: $0 <content/script_name.json> [extra video_pipeline args...]" >&2
  exit 2
fi
shift || true

if [[ ! -f "$SCRIPT_PATH" ]]; then
  echo "Script not found: $SCRIPT_PATH" >&2
  exit 2
fi

VIDEO_NAME="$(basename "$SCRIPT_PATH" .json)"
GITHUB_WORKFLOW="${GITHUB_WORKFLOW:-notify.yml}"

notify_github() {
  local status="$1" duration="$2"
  if [[ -z "${GITHUB_REPO:-}" || -z "${GITHUB_TOKEN:-}" ]]; then
    echo "[ci] GitHub notify skipped (GITHUB_REPO / GITHUB_TOKEN not set in .env)"
    return 0
  fi
  curl -s -o /dev/null -w "[ci] GitHub notify HTTP %{http_code}\n" \
    -X POST \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${GITHUB_WORKFLOW}/dispatches" \
    -d "{\"ref\":\"main\",\"inputs\":{\"video_name\":\"${VIDEO_NAME}\",\"tiktok_status\":\"${status}\",\"duration\":\"${duration}\"}}" \
    || echo "[ci] GitHub notify error (non-fatal)"
}

echo "── Gate 1 pre-check ─────────────────────────────────"
if ! "$PYTHON_BIN" -m vidgen.quality.script_quality_gate "$SCRIPT_PATH"; then
  notify_github "FAIL: gate1" "0"
  exit 1
fi

echo "── Build + render ───────────────────────────────────"
START_TS=$(date +%s)
if "$PYTHON_BIN" -m vidgen.pipeline.video_pipeline "$SCRIPT_PATH" "$@"; then
  DURATION=$(( $(date +%s) - START_TS ))
  echo "[ci] Pipeline OK in ${DURATION}s"
  echo "── Browser layout audit ─────────────────────────────"
  if ! npm --prefix remotion run audit:layout; then
    echo "[ci] Layout audit FAILED" >&2
    notify_github "FAIL: layout overflow" "$DURATION"
    exit 1
  fi
  notify_github "OK" "$DURATION"
  exit 0
else
  DURATION=$(( $(date +%s) - START_TS ))
  echo "[ci] Pipeline FAILED after ${DURATION}s" >&2
  notify_github "FAIL: pipeline" "$DURATION"
  exit 1
fi
