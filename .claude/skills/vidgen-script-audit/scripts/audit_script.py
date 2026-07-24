#!/usr/bin/env python3
"""
audit_script.py

Heuristic support tool for vidgen-script-audit. Extracts narration text from either
a VidGen script JSON (content/<slug>.json) or a narrative-outline.md (from
vidgen-narrative-director), then reports:

  - Per-sentence word counts and filler-word warnings
  - All numeric/statistic tokens found in narration (for manual fact-check against
    source-log.md — this script does NOT judge truthfulness, it only surfaces candidates)
  - Estimated reading duration at 4.2 words/second, compared against durationInFrames
    fields in the JSON if present (assumes 30fps unless --fps given)
  - Hook word count check (first narration line found)

This script does NOT decide pass/fail — it surfaces data for Claude (or a human) to
reason over when writing the audit report. Only Python standard library is used.

Usage:
  python3 audit_script.py --script content/<slug>.json [--source-log research/<slug>/source-log.md] [--fps 30]
  python3 audit_script.py --script research/<slug>/narrative-outline.md
"""
import argparse
import json
import re
import sys

FILLER_STARTS = {"ừm", "thì", "là", "nhé", "ạ"}
WORDS_PER_SECOND = 4.2
NARRATION_KEYS = {"narration", "text", "voiceover", "voOver", "vo", "script", "line"}
NUMBER_PATTERN = re.compile(r"\d+([.,]\d+)?\s?%|\b\d{1,3}(?:[.,]\d{3})*\b")


def find_narration_in_json(obj, results, duration_context=None):
    """Recursively walk a JSON structure collecting narration-like strings, and
    track any sibling durationInFrames found alongside them."""
    if isinstance(obj, dict):
        local_narration = None
        local_duration = obj.get("durationInFrames")
        for key, val in obj.items():
            if key in NARRATION_KEYS and isinstance(val, str) and val.strip():
                local_narration = val.strip()
        if local_narration:
            results.append({"text": local_narration, "durationInFrames": local_duration})
        for val in obj.values():
            find_narration_in_json(val, results, duration_context)
    elif isinstance(obj, list):
        for item in obj:
            find_narration_in_json(item, results, duration_context)


def find_narration_in_markdown(text):
    """Extract 'Narration draft: "..."' lines in order from a narrative-outline.md."""
    lines = re.findall(r'Narration draft:\s*"(.+?)"', text)
    return [{"text": line, "durationInFrames": None} for line in lines]


def split_sentences(text):
    # Simple splitter on ., !, ? and em-dash-separated clauses treated as one unit
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [p for p in parts if p]


def analyze(narration_items, fps):
    report_lines = []
    total_words = 0

    for i, item in enumerate(narration_items):
        text = item["text"]
        duration_frames = item.get("durationInFrames")
        sentences = split_sentences(text)
        word_count = len(text.split())
        total_words += word_count

        report_lines.append(f"\n--- Narration block {i+1} ---")
        report_lines.append(f'Text: "{text}"')
        report_lines.append(f"Word count: {word_count}")

        for s in sentences:
            first_word = s.strip().split(" ")[0].lower().strip(",.:;!?\u2014-")
            if first_word in FILLER_STARTS:
                report_lines.append(f"  ⚠ filler start detected: \"{s}\" (starts with '{first_word}')")

        numeric_tokens = [m.group(0) for m in NUMBER_PATTERN.finditer(text)]
        if numeric_tokens:
            report_lines.append(f"  🔢 numeric tokens found (cross-check against source-log.md): {numeric_tokens}")

        est_seconds = word_count / WORDS_PER_SECOND
        report_lines.append(f"  Estimated read time: {est_seconds:.1f}s (at {WORDS_PER_SECOND} words/sec)")

        if duration_frames is not None:
            actual_seconds = duration_frames / fps
            diff = actual_seconds - est_seconds
            flag = "⚠ MISMATCH" if abs(diff) > 1.0 else "OK"
            report_lines.append(f"  durationInFrames: {duration_frames} → {actual_seconds:.1f}s "
                                 f"(diff vs estimate: {diff:+.1f}s) [{flag}]")

        if i == 0:
            hook_word_count = word_count
            hook_flag = "⚠ exceeds 6-word hook limit" if hook_word_count > 6 else "OK"
            report_lines.append(f"  Hook check: {hook_word_count} words [{hook_flag}]")

    report_lines.append(f"\n=== Totals ===")
    report_lines.append(f"Total narration blocks: {len(narration_items)}")
    report_lines.append(f"Total words: {total_words}")
    report_lines.append(f"Total estimated duration: {total_words / WORDS_PER_SECOND:.1f}s "
                         f"(target 60-75s per vidgen standard)")

    return "\n".join(report_lines)


def load_source_log_ids(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
    except FileNotFoundError:
        return None
    ids = re.findall(r"^##\s*(S\d+)", text, re.M)
    return ids


def main():
    parser = argparse.ArgumentParser(description="Extract narration data for script audit")
    parser.add_argument("--script", required=True, help="Path to script JSON or narrative-outline.md")
    parser.add_argument("--source-log", default=None, help="Optional path to source-log.md for context")
    parser.add_argument("--fps", type=int, default=30)
    args = parser.parse_args()

    narration_items = []

    if args.script.endswith(".json"):
        try:
            with open(args.script, "r", encoding="utf-8") as f:
                data = json.load(f)
        except FileNotFoundError:
            print(f"File not found: {args.script}", file=sys.stderr)
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"Invalid JSON in {args.script}: {e}", file=sys.stderr)
            sys.exit(1)
        find_narration_in_json(data, narration_items)
    else:
        try:
            with open(args.script, "r", encoding="utf-8") as f:
                text = f.read()
        except FileNotFoundError:
            print(f"File not found: {args.script}", file=sys.stderr)
            sys.exit(1)
        narration_items = find_narration_in_markdown(text)

    if not narration_items:
        print("No narration text found — check that the script uses one of the "
              f"recognized keys {sorted(NARRATION_KEYS)} (for JSON) or the "
              "'Narration draft: \"...\"' format (for markdown outlines).", file=sys.stderr)
        sys.exit(1)

    print(f"=== Script Audit — Extraction Report ({args.script}) ===")
    print(analyze(narration_items, args.fps))

    if args.source_log:
        ids = load_source_log_ids(args.source_log)
        if ids is None:
            print(f"\n⚠ source-log not found at {args.source_log} — fact-check group "
                  "should be marked N/A in the audit report.")
        else:
            print(f"\n=== Source Log Reference ===")
            print(f"Available source IDs in {args.source_log}: {ids}")
            print("Manually cross-check each numeric token above against these sources' "
                  "'Claims supported' and 'Reliability' fields — this script does not "
                  "auto-verify semantic correctness.")
    else:
        print("\n(No --source-log provided — fact-check group should be marked N/A "
              "in the audit report unless one is supplied.)")


if __name__ == "__main__":
    main()
