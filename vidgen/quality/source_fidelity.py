"""Verify that generated JSON preserves approved TXT voice-over verbatim."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from vidgen.pipeline.shot_schema import script_shots


_SCENE_HEADING_RE = re.compile(r"^##\s+(?:Cảnh\b|Teaser\b)", re.IGNORECASE)
_FIELD_LABEL_RE = re.compile(r"^\*\*([^*]+):\*\*\s*$")


def _normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _clean_voiceover_block(lines: list[str]) -> str:
    paragraphs: list[str] = []
    paragraph_lines: list[str] = []

    def flush_paragraph() -> None:
        if not paragraph_lines:
            return
        paragraph = _normalize_whitespace(" ".join(paragraph_lines))
        paragraph = paragraph.removeprefix("**").removesuffix("**").strip()
        if len(paragraph) >= 2 and (
            (paragraph.startswith("“") and paragraph.endswith("”"))
            or (paragraph.startswith('"') and paragraph.endswith('"'))
        ):
            paragraph = paragraph[1:-1].strip()
        if paragraph:
            paragraphs.append(paragraph)
        paragraph_lines.clear()

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            flush_paragraph()
        elif line != "---":
            paragraph_lines.append(line)
    flush_paragraph()
    return _normalize_whitespace(" ".join(paragraphs))


def extract_voiceover_scenes(source_text: str) -> list[str]:
    """Extract one combined voice-over string per narrated TXT scene."""
    sections: list[list[str]] = []
    current_section: list[str] | None = None

    for line in source_text.splitlines():
        if _SCENE_HEADING_RE.match(line.strip()):
            if current_section is not None:
                sections.append(current_section)
            current_section = []
        elif current_section is not None:
            current_section.append(line)
    if current_section is not None:
        sections.append(current_section)

    narrated_scenes: list[str] = []
    for section in sections:
        voiceover_blocks: list[str] = []
        active_lines: list[str] | None = None

        def flush_block() -> None:
            nonlocal active_lines
            if active_lines is None:
                return
            block = _clean_voiceover_block(active_lines)
            if block:
                voiceover_blocks.append(block)
            active_lines = None

        for line in section:
            stripped = line.strip()
            field_match = _FIELD_LABEL_RE.match(stripped)
            if field_match:
                flush_block()
                label = field_match.group(1).casefold()
                if "voice-over" in label:
                    active_lines = []
            elif stripped.startswith("##") or stripped == "---":
                flush_block()
            elif active_lines is not None:
                active_lines.append(line)
        flush_block()

        combined = _normalize_whitespace(" ".join(voiceover_blocks))
        if combined:
            narrated_scenes.append(combined)

    return narrated_scenes


def audit_source_fidelity(source_path: str | Path, json_path: str | Path) -> dict:
    """Return a passing audit or raise ValueError with every fidelity mismatch."""
    source = Path(source_path)
    generated = Path(json_path)
    issues: list[str] = []

    if source.stem != generated.stem:
        issues.append(
            f"filename stems differ: TXT={source.stem!r}, JSON={generated.stem!r}"
        )

    source_narrations = extract_voiceover_scenes(source.read_text(encoding="utf-8"))
    script = json.loads(generated.read_text(encoding="utf-8"))
    json_narrations = [
        _normalize_whitespace(str(shot.get("narration", "")))
        for shot in script_shots(script)
        if str(shot.get("narration", "")).strip()
    ]

    if len(source_narrations) != len(json_narrations):
        issues.append(
            "narrated scene count differs: "
            f"TXT={len(source_narrations)}, JSON={len(json_narrations)}"
        )

    for index, (approved, generated_narration) in enumerate(
        zip(source_narrations, json_narrations, strict=False), start=1
    ):
        if approved != generated_narration:
            issues.append(
                f"narration {index} differs: TXT={approved!r}; JSON={generated_narration!r}"
            )

    if issues:
        details = "\n".join(f"- {issue}" for issue in issues)
        raise ValueError(f"Source fidelity audit FAILED\n{details}")

    return {
        "source": str(source),
        "generated_json": str(generated),
        "narrated_scenes": len(source_narrations),
        "status": "PASS",
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Verify generated VidGen JSON narration against its approved TXT source"
    )
    parser.add_argument("source_txt", help="Path to content/text/<slug>.txt")
    parser.add_argument("generated_json", help="Path to content/json/<slug>.json")
    args = parser.parse_args()

    try:
        result = audit_source_fidelity(args.source_txt, args.generated_json)
    except (FileNotFoundError, json.JSONDecodeError, ValueError) as exc:
        print(exc, file=sys.stderr)
        raise SystemExit(1) from exc

    print(
        "Source fidelity PASS: "
        f"{result['narrated_scenes']} narrated scenes match verbatim"
    )


if __name__ == "__main__":
    main()
