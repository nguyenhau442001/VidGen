#!/usr/bin/env python3
"""
validate_narrative_outline.py

Validates a narrative-outline.md produced by the vidgen-narrative-director skill.

Usage:
  python3 validate_narrative_outline.py --file research/<topic-slug>/narrative-outline.md

Checks:
  - All 5 required beats present (Hook, Tension, Reveal, Resolution, CTA)
  - Hook narration draft is <= 6 words (vidgen's hard rule)
  - No filler words at the start of any narration line
  - Hidden Objective Function mapping section present (wrong belief / true objective / aha)
  - No JSON-specific fields leaked into the outline (durationInFrames, "type":, props)
    since that is vidgen's job, not narrative-director's

Only Python standard library is used — no external dependencies.
"""
import argparse
import re
import sys

REQUIRED_BEATS = ["Hook", "Tension", "Reveal", "Resolution", "CTA"]

FILLER_STARTS = ["ừm", "thì", "là", "nhé", "ạ"]

FORBIDDEN_JSON_FIELDS = ["durationInFrames", '"type":', "props:", "props ="]

HOOK_WORD_LIMIT = 6


class Report:
    def __init__(self):
        self.errors = []
        self.warnings = []

    def error(self, msg):
        self.errors.append(msg)

    def warn(self, msg):
        self.warnings.append(msg)

    def ok(self):
        return not self.errors


def extract_section(text, heading_pattern):
    match = re.search(rf"###?\s*{heading_pattern}(.*?)(\n##|\Z)", text, re.S | re.I)
    return match.group(1) if match else None


def extract_narration_lines(section_text):
    if not section_text:
        return []
    return re.findall(r"Narration draft:\s*\"(.+?)\"", section_text)


def validate(path, report):
    try:
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
    except FileNotFoundError:
        report.error(f"[{path}] file not found")
        return

    for beat in REQUIRED_BEATS:
        section = extract_section(text, beat)
        if section is None:
            report.error(f"[{path}] missing required beat section: '{beat}'")
            continue

        narration_lines = extract_narration_lines(section)
        if not narration_lines:
            report.warn(f"[{path}] beat '{beat}' has no narration draft line "
                        f"in the expected 'Narration draft: \"...\"' format")

        for line in narration_lines:
            first_word = line.strip().split(" ")[0].lower().strip(",.:;!?")
            if first_word in FILLER_STARTS:
                report.error(f"[{path}] beat '{beat}' narration starts with filler "
                             f"word '{first_word}': \"{line}\"")

        if beat == "Hook":
            for line in narration_lines:
                word_count = len(line.strip().split())
                if word_count > HOOK_WORD_LIMIT:
                    report.error(f"[{path}] Hook narration has {word_count} words "
                                 f"(limit {HOOK_WORD_LIMIT}): \"{line}\"")

    dna_section = None
    for pattern in ["Hidden Objective Function Mapping", "Hidden Objective Function"]:
        dna_section = extract_section(text, pattern)
        if dna_section:
            break
    if dna_section is None:
        report.error(f"[{path}] missing 'Hidden Objective Function Mapping' section")
    else:
        for slot in ["Wrong belief", "True objective", "Aha moment"]:
            if slot.lower() not in dna_section.lower():
                report.error(f"[{path}] Hidden Objective Function Mapping missing '{slot}'")

    for field in FORBIDDEN_JSON_FIELDS:
        if field in text:
            report.error(f"[{path}] contains JSON-schema-specific field '{field}' — "
                         f"narrative-director should not produce VidGen JSON, that is "
                         f"the 'vidgen' skill's job")

    if "recommended_angle" not in text and "Angle:" not in text:
        report.warn(f"[{path}] does not reference which angle this outline is based on "
                    f"— add an 'Angle:' line for traceability back to angle-matrix.json")


def main():
    parser = argparse.ArgumentParser(description="Validate a vidgen-narrative-director outline")
    parser.add_argument("--file", required=True, help="Path to narrative-outline.md")
    args = parser.parse_args()

    report = Report()
    validate(args.file, report)

    print("\n=== Validation Report ===")
    print(f"Errors:   {len(report.errors)}")
    print(f"Warnings: {len(report.warnings)}\n")

    if report.errors:
        print("ERRORS:")
        for e in report.errors:
            print(f"  ✗ {e}")
        print()
    if report.warnings:
        print("WARNINGS:")
        for w in report.warnings:
            print(f"  ! {w}")
        print()

    if report.ok():
        print("✅ All required checks passed.")
    else:
        print("❌ Validation failed — fix errors above before handing off to vidgen.")

    sys.exit(0 if report.ok() else 1)


if __name__ == "__main__":
    main()
