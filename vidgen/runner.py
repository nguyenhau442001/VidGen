"""
vidgen/runner.py — Autonomous Pipeline Trigger

Pops a topic from topics_queue.json, generates a script JSON via the
hook_selector, then hands off to main.py for TTS + render + gate checks.

No Claude API needed — script generation uses your existing local pipeline.

Usage:
    python -m vidgen.runner --pick-next          # pop next topic and run
    python -m vidgen.runner --pick-next --dry-run # show what would run, no execution
    python -m vidgen.runner --topic "Redis pub/sub hoạt động thế nào"  # one-off topic
    python -m vidgen.runner --list               # show pending queue

Cron setup (runs every evening at 8pm):
    crontab -e
    0 20 * * * cd /path/to/VidGen && python -m vidgen.runner --pick-next >> logs/runner.log 2>&1
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────────────────
REPO_ROOT      = Path(__file__).resolve().parent.parent
QUEUE_FILE     = REPO_ROOT / "topics_queue.json"
CONTENT_DIR    = REPO_ROOT / "content"
LOGS_DIR       = REPO_ROOT / "logs"
SCRIPT_GEN     = REPO_ROOT / "vidgen" / "hook_selector.py"   # your existing script gen
MAIN_MODULE    = "vidgen.main"

TTS_SPEED      = 1.2   # standard for ~70s format — do not exceed 1.3
MAX_RETRIES    = 2     # retry pipeline this many times on non-gate failures

# ── Logging ──────────────────────────────────────────────────────────────────
LOGS_DIR.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOGS_DIR / "runner.log", encoding="utf-8"),
    ],
)
log = logging.getLogger("runner")


# ── Queue helpers ─────────────────────────────────────────────────────────────

def _load_queue() -> dict:
    if not QUEUE_FILE.exists():
        log.error(f"Queue file not found: {QUEUE_FILE}")
        log.error("Create topics_queue.json at the repo root first.")
        sys.exit(1)
    with open(QUEUE_FILE, encoding="utf-8") as f:
        return json.load(f)


def _save_queue(queue: dict) -> None:
    with open(QUEUE_FILE, "w", encoding="utf-8") as f:
        json.dump(queue, f, ensure_ascii=False, indent=2)


def _pop_next_topic(queue: dict) -> str | None:
    pending = queue.get("pending", [])
    if not pending:
        return None
    topic = pending.pop(0)
    queue.setdefault("done", [])
    queue["done"].append({
        "topic": topic,
        "started_at": datetime.now().isoformat(timespec="seconds"),
    })
    _save_queue(queue)
    return topic


def _mark_done(queue: dict, topic: str, status: str) -> None:
    """Update the last done entry with final status and timestamp."""
    for entry in reversed(queue.get("done", [])):
        if entry.get("topic") == topic and "status" not in entry:
            entry["status"] = status
            entry["finished_at"] = datetime.now().isoformat(timespec="seconds")
            break
    _save_queue(queue)


def _list_queue(queue: dict) -> None:
    pending = queue.get("pending", [])
    done = queue.get("done", [])
    print(f"\n{'─'*50}")
    print(f"  Pending ({len(pending)} topics):")
    for i, t in enumerate(pending, 1):
        print(f"    {i:>2}. {t}")
    if not pending:
        print("    (empty)")
    print(f"\n  Done ({len(done)} topics):")
    for entry in done[-5:]:        # show last 5
        status = entry.get("status", "running")
        ts = entry.get("finished_at") or entry.get("started_at", "")
        print(f"    [{status:>7}]  {entry['topic']}  ({ts})")
    print(f"{'─'*50}\n")


# ── Slug helper ───────────────────────────────────────────────────────────────

def _topic_to_slug(topic: str) -> str:
    """Convert a Vietnamese topic string to a safe filename slug."""
    slug = topic.lower()
    # Transliterate common Vietnamese diacritics → ASCII approximations
    _map = str.maketrans(
        "àáâãäåèéêëìíîïòóôõöùúûüýđăắặẳẵặâấầẩẫậêếềểễệôốồổỗộơớờởỡợưứừửữựịọụ"
        "ÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝĐĂẮẶẲẴẶÂẤẦẨẪẬÊẾỀỂỄỆÔỐỒỔỖỘƠỚỜỞỠỢƯỨỪỬỮỰỊỌỤ",
        "aaaaaaeeeeiiiioooouuuuydaaaaaaaaaaaaeeeeeeoooooooooouuuuuuiou"
        "AAAAAAEEEEIIIIOOOOUUUUYDAAAAAAAAAAAAEEEEEEOOOOOOOOOOUUUUUUIOU",
    )
    slug = slug.translate(_map)
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug[:60]   # cap length


# ── Script generation ─────────────────────────────────────────────────────────

def _generate_script(topic: str, slug: str, dry_run: bool) -> Path:
    """
    Call hook_selector.py to generate a shot JSON for the given topic.
    Returns the path to the written JSON file.
    """
    CONTENT_DIR.mkdir(parents=True, exist_ok=True)
    script_path = CONTENT_DIR / f"{slug}.json"

    if dry_run:
        log.info(f"[dry-run] Would generate script: {script_path}")
        return script_path

    if not SCRIPT_GEN.exists():
        # Fallback: write a minimal stub so the pipeline can be tested
        log.warning(
            f"hook_selector.py not found at {SCRIPT_GEN}. "
            "Writing a stub script — replace with real generation."
        )
        stub = {
            "video_id": slug,
            "title": topic,
            "fps": 30,
            "narration_language": "vi",
            "shots": [
                {
                    "id": "hook",
                    "type": "HookScene",
                    "duration_frames": 150,
                    "narration": f"[TODO: hook narration for '{topic}']",
                    "props": {
                        "headline": topic[:30],
                        "accentWord": topic.split()[0][:10],
                        "subtext": "Cùng tìm hiểu nhé",
                    },
                },
                {
                    "id": "cta",
                    "type": "CTAScene",
                    "duration_frames": 90,
                    "narration": "Follow để xem thêm.",
                    "props": {"headline": "Follow ngay"},
                },
            ],
        }
        with open(script_path, "w", encoding="utf-8") as f:
            json.dump(stub, f, ensure_ascii=False, indent=2)
        log.info(f"Stub script written: {script_path}")
        return script_path

    log.info(f"Generating script via hook_selector: topic='{topic}'")
    result = subprocess.run(
        [sys.executable, str(SCRIPT_GEN), "--topic", topic, "--output", str(script_path)],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        log.error(f"hook_selector.py failed:\n{result.stderr}")
        raise RuntimeError(f"Script generation failed for topic: {topic}")

    log.info(f"Script generated: {script_path}")
    return script_path


# ── Pipeline runner ───────────────────────────────────────────────────────────

def _run_pipeline(script_path: Path, dry_run: bool) -> bool:
    """
    Invoke vidgen.main for the given script path.
    Returns True on success, False on failure.
    """
    cmd = [
        sys.executable, "-m", MAIN_MODULE,
        str(script_path),
        "--speed", str(TTS_SPEED),
    ]

    if dry_run:
        log.info(f"[dry-run] Would run: {' '.join(cmd)}")
        return True

    log.info(f"Running pipeline: {' '.join(cmd)}")

    for attempt in range(1, MAX_RETRIES + 1):
        result = subprocess.run(cmd, text=True)

        if result.returncode == 0:
            log.info("Pipeline completed successfully.")
            return True

        log.warning(f"Pipeline attempt {attempt}/{MAX_RETRIES} failed (exit {result.returncode})")

        if attempt < MAX_RETRIES:
            log.info("Retrying...")

    log.error(f"Pipeline failed after {MAX_RETRIES} attempt(s). Manual intervention required.")
    return False


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="VidGen autonomous pipeline runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--pick-next",
        action="store_true",
        help="Pop the next topic from topics_queue.json and run the full pipeline",
    )
    group.add_argument(
        "--topic",
        metavar="TOPIC",
        help="Run the pipeline for a specific topic (does not modify the queue)",
    )
    group.add_argument(
        "--list",
        action="store_true",
        help="Show the current queue status and exit",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would happen without executing anything",
    )
    args = parser.parse_args()

    # ── List queue ────────────────────────────────────────────────────────────
    if args.list:
        queue = _load_queue()
        _list_queue(queue)
        return

    # ── Resolve topic ─────────────────────────────────────────────────────────
    queue = _load_queue()

    if args.pick_next:
        topic = _pop_next_topic(queue)
        if topic is None:
            log.info("Queue is empty — nothing to run. Add topics to topics_queue.json.")
            return
        log.info(f"Picked topic from queue: '{topic}'")
    else:
        topic = args.topic
        log.info(f"One-off topic: '{topic}'")

    slug = _topic_to_slug(topic)
    log.info(f"Slug: {slug}")

    # ── Generate script ───────────────────────────────────────────────────────
    try:
        script_path = _generate_script(topic, slug, dry_run=args.dry_run)
    except RuntimeError as e:
        log.error(str(e))
        if args.pick_next:
            _mark_done(queue, topic, "FAIL:script-gen")
        sys.exit(1)

    # ── Run pipeline ──────────────────────────────────────────────────────────
    success = _run_pipeline(script_path, dry_run=args.dry_run)

    if args.pick_next:
        _mark_done(queue, topic, "OK" if success else "FAIL:pipeline")

    if not success:
        sys.exit(1)

    log.info(f"Done. ✅ '{topic}'")


if __name__ == "__main__":
    main()
