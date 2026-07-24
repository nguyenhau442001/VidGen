#!/usr/bin/env python3
"""
validate_research_output.py

Validates the 5-file output contract of the vidgen-content-researcher skill:
  research-brief.md, audience-pain-map.json, angle-matrix.json,
  source-log.md, video-opportunity.json

Usage:
  python3 validate_research_output.py --dir <output_dir>
  python3 validate_research_output.py \
      --brief research-brief.md --audience audience-pain-map.json \
      --angles angle-matrix.json --sources source-log.md --opportunity video-opportunity.json

Exit code 0 = all checks passed. Exit code 1 = at least one error found.
Only Python standard library is used — no external dependencies.
"""
import argparse
import json
import os
import re
import sys

SCORE_FIELDS = [
    "pain_recognition", "relevance", "novelty", "emotional_tension",
    "credibility", "proof_potential", "visual_potential", "shareability",
    "save_value", "channel_fit", "vidgen_fit", "exaggeration_risk",
]

VALID_CONFIDENCE = {"low", "medium", "high"}

VALID_NARRATIVE_FUNCTIONS = {
    "pain_recognition", "escalation", "failed_solution", "reframe",
    "mechanism", "proof", "payoff", "cta",
}

REQUIRED_BRIEF_SECTIONS = [
    "Executive Summary", "Research Question", "Audience", "Market Context",
    "Main Pains", "Jobs to Be Done", "Triggers", "Objections",
    "Current Alternatives", "Customer Language", "Core Tension",
    "Key Findings", "Contradictions", "Facts", "Expert Opinions",
    "Community Observations", "Hypotheses", "Evidence Gaps",
    "Recommended Direction", "Directions to Avoid", "Source List",
]

STAT_PATTERN = re.compile(r"\b\d+([.,]\d+)?\s?%|\b\d{2,}\b")


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


def load_json(path, report):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        report.error(f"[{path}] file not found")
    except json.JSONDecodeError as e:
        report.error(f"[{path}] invalid JSON syntax: {e}")
    return None


def load_text(path, report):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        report.error(f"[{path}] file not found")
        return None


def validate_brief(path, report):
    text = load_text(path, report)
    if text is None:
        return
    for section in REQUIRED_BRIEF_SECTIONS:
        # Accept "## N. Section" or "## Section" headers, order not strictly enforced here
        if section.lower() not in text.lower():
            report.error(f"[{path}] missing required section: '{section}'")

    # Guard against unlabeled hypotheses: look for stat-looking numbers outside
    # the Facts / Hypotheses sections is hard to do reliably with plain text,
    # so we do a lighter check: warn if "Hypotheses" section looks empty.
    hyp_match = re.search(r"##\s*\d*\.?\s*Hypotheses(.*?)(\n##|\Z)", text, re.S | re.I)
    if hyp_match and not hyp_match.group(1).strip():
        report.warn(f"[{path}] 'Hypotheses' section appears empty — "
                    f"confirm there truly are no unverified claims")


def validate_audience_map(path, report):
    data = load_json(path, report)
    if data is None:
        return None
    segments = data.get("segments")
    if not isinstance(segments, list) or not segments:
        report.error(f"[{path}] 'segments' must be a non-empty list")
        return data
    if len(segments) > 3:
        report.error(f"[{path}] at most 3 segments allowed, found {len(segments)}")

    required_fields = [
        "name", "role", "experience_level", "current_workflow", "trigger_events",
        "functional_pains", "emotional_pains", "professional_pains",
        "current_alternatives", "desired_outcomes", "objections",
        "customer_language", "awareness_stage", "evidence", "confidence",
    ]
    for i, seg in enumerate(segments):
        for field in required_fields:
            if field not in seg:
                report.error(f"[{path}] segment[{i}] missing field '{field}'")
        conf = seg.get("confidence")
        if conf is not None and conf not in VALID_CONFIDENCE:
            report.error(f"[{path}] segment[{i}] confidence must be one of "
                         f"{sorted(VALID_CONFIDENCE)}, got '{conf}'")
        if seg.get("evidence") == [] and conf == "high":
            report.error(f"[{path}] segment[{i}] has confidence='high' but no evidence sources")
    return data


def validate_angle_matrix(path, report):
    data = load_json(path, report)
    if data is None:
        return None
    angles = data.get("angles")
    if not isinstance(angles, list) or not angles:
        report.error(f"[{path}] 'angles' must be a non-empty list")
        return data
    if not (5 <= len(angles) <= 8):
        report.warn(f"[{path}] expected 5-8 angles, found {len(angles)}")

    titles = []
    for i, angle in enumerate(angles):
        title = angle.get("title", "")
        titles.append(title)
        if not title:
            report.error(f"[{path}] angles[{i}] missing 'title'")
        if not angle.get("risks"):
            report.error(f"[{path}] angle '{title or i}' must list at least one risk")
        if not angle.get("proof_mechanism"):
            report.warn(f"[{path}] angle '{title or i}' has no proof_mechanism — "
                        f"cannot be recommended_angle without one")
        if angle.get("evidence") == [] and angle.get("proof_mechanism"):
            report.warn(f"[{path}] angle '{title or i}' has a proof_mechanism but no "
                        f"linked evidence source IDs")

        scores = angle.get("scores", {})
        for field in SCORE_FIELDS:
            if field not in scores:
                report.error(f"[{path}] angle '{title or i}' scores missing '{field}'")
                continue
            val = scores[field]
            if not isinstance(val, (int, float)) or not (1 <= val <= 10):
                report.error(f"[{path}] angle '{title or i}' score '{field}'={val} "
                             f"out of range 1-10")

    recommended = data.get("recommended_angle", "")
    if not recommended:
        report.error(f"[{path}] 'recommended_angle' is empty")
    elif recommended not in titles:
        report.error(f"[{path}] 'recommended_angle'='{recommended}' does not match "
                     f"any angle title")
    else:
        rec_angle = next(a for a in angles if a.get("title") == recommended)
        if not rec_angle.get("proof_mechanism"):
            report.error(f"[{path}] recommended_angle '{recommended}' has no "
                         f"proof_mechanism — not allowed")

    if not data.get("reasoning"):
        report.error(f"[{path}] 'reasoning' for recommended_angle is empty")
    if not data.get("tradeoffs"):
        report.warn(f"[{path}] 'tradeoffs' is empty — explain why other angles "
                    f"were not chosen")
    return data


def validate_source_log(path, report):
    text = load_text(path, report)
    if text is None:
        return set()
    ids = set(re.findall(r"^##\s*(S\d+)", text, re.M))
    if not ids:
        report.error(f"[{path}] no source entries found (expected headers like '## S001')")
        return ids
    for sid in ids:
        block_match = re.search(rf"##\s*{sid}(.*?)(\n##\s*S\d+|\Z)", text, re.S)
        block = block_match.group(1) if block_match else ""
        for field in ["Title", "URL", "Source type", "Reliability", "Claims supported"]:
            if field.lower() not in block.lower():
                report.warn(f"[{path}] source {sid} missing field '{field}'")
        rel_match = re.search(r"Reliability:\s*(.+)", block)
        if rel_match:
            rel = rel_match.group(1).strip().lower()
            valid = {"fact", "expert_opinion", "community_observation", "hypothesis"}
            if rel not in valid:
                report.warn(f"[{path}] source {sid} reliability '{rel}' not one of {sorted(valid)}")
    return ids


def validate_video_opportunity(path, report, angle_titles, source_ids):
    data = load_json(path, report)
    if data is None:
        return

    recommended = data.get("recommended_angle", "")
    if not recommended:
        report.error(f"[{path}] 'recommended_angle' is empty")
    elif angle_titles and recommended not in angle_titles:
        report.error(f"[{path}] 'recommended_angle'='{recommended}' does not match "
                     f"any title in angle-matrix.json")

    for field in ["viewer_belief_before", "viewer_belief_after", "core_argument"]:
        if not data.get(field):
            report.error(f"[{path}] '{field}' is empty")

    opportunities = data.get("visual_opportunities")
    if not isinstance(opportunities, list) or not opportunities:
        report.error(f"[{path}] 'visual_opportunities' must be a non-empty list")
        return
    for i, opp in enumerate(opportunities):
        func = opp.get("narrative_function")
        if func not in VALID_NARRATIVE_FUNCTIONS:
            report.error(f"[{path}] visual_opportunities[{i}] invalid "
                         f"narrative_function '{func}', must be one of "
                         f"{sorted(VALID_NARRATIVE_FUNCTIONS)}")
        if not opp.get("concept"):
            report.error(f"[{path}] visual_opportunities[{i}] missing 'concept'")
        if not opp.get("risk"):
            report.warn(f"[{path}] visual_opportunities[{i}] missing 'risk'")


def main():
    parser = argparse.ArgumentParser(description="Validate vidgen-content-researcher output")
    parser.add_argument("--dir", help="Directory containing all 5 default-named output files")
    parser.add_argument("--brief", default=None)
    parser.add_argument("--audience", default=None)
    parser.add_argument("--angles", default=None)
    parser.add_argument("--sources", default=None)
    parser.add_argument("--opportunity", default=None)
    args = parser.parse_args()

    if args.dir:
        d = args.dir
        brief = args.brief or os.path.join(d, "research-brief.md")
        audience = args.audience or os.path.join(d, "audience-pain-map.json")
        angles = args.angles or os.path.join(d, "angle-matrix.json")
        sources = args.sources or os.path.join(d, "source-log.md")
        opportunity = args.opportunity or os.path.join(d, "video-opportunity.json")
    else:
        brief, audience, angles, sources, opportunity = (
            args.brief, args.audience, args.angles, args.sources, args.opportunity
        )
        if not all([brief, audience, angles, sources, opportunity]):
            parser.error("Provide --dir, or all five individual file paths")

    report = Report()
    validate_brief(brief, report)
    validate_audience_map(audience, report)
    angle_data = validate_angle_matrix(angles, report)
    source_ids = validate_source_log(sources, report)
    angle_titles = {a.get("title") for a in (angle_data or {}).get("angles", [])} if angle_data else set()
    validate_video_opportunity(opportunity, report, angle_titles, source_ids)

    print(f"\n=== Validation Report ===")
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
        print("❌ Validation failed — fix errors above before handing off output.")

    sys.exit(0 if report.ok() else 1)


if __name__ == "__main__":
    main()
