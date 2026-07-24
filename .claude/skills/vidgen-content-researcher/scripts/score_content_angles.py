#!/usr/bin/env python3
"""
score_content_angles.py

Computes a weighted score for each angle in angle-matrix.json and prints a
ranked table plus trade-off warnings. exaggeration_risk is subtracted, never
added, so a hyped-but-unproven angle cannot out-rank a credible one just by
also scoring high on shareability/novelty.

Usage:
  python3 score_content_angles.py --dir <output_dir>          # reads angle-matrix.json in dir
  python3 score_content_angles.py --file angle-matrix.json

Weights are defined in WEIGHTS below — edit freely, values are relative and
do not need to sum to 1.
Only Python standard library is used — no external dependencies.
"""
import argparse
import json
import os
import sys

# Positive-contribution weights. exaggeration_risk is handled separately as a penalty.
WEIGHTS = {
    "pain_recognition": 1.2,
    "relevance": 1.2,
    "novelty": 0.8,
    "emotional_tension": 0.8,
    "credibility": 1.5,     # weighted highest — this skill prioritizes trustworthiness
    "proof_potential": 1.3,
    "visual_potential": 1.0,
    "shareability": 0.7,
    "save_value": 0.8,
    "channel_fit": 1.1,
    "vidgen_fit": 0.9,
}
EXAGGERATION_PENALTY_WEIGHT = 1.5  # multiplied against exaggeration_risk, then subtracted

HIGH = 7   # >= this counts as "high" for trade-off warnings
LOW = 4    # <= this counts as "low" for trade-off warnings

OVERPROMISE_KEYWORDS = [
    "chắc chắn", "100%", "luôn luôn", "không bao giờ sai", "tuyệt đối",
    "thay thế toàn bộ", "duy nhất", "tốt nhất mọi", "guaranteed", "always",
]


def load_angles(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


def weighted_score(scores):
    positive = sum(WEIGHTS[k] * scores.get(k, 0) for k in WEIGHTS)
    penalty = EXAGGERATION_PENALTY_WEIGHT * scores.get("exaggeration_risk", 0)
    return round(positive - penalty, 2)


def overpromise_flag(angle):
    haystack = " ".join([
        angle.get("title", ""),
        angle.get("new_belief", ""),
        angle.get("one_sentence_concept", ""),
    ]).lower()
    return any(kw in haystack for kw in OVERPROMISE_KEYWORDS)


def tradeoff_warnings(angle):
    s = angle.get("scores", {})
    title = angle.get("title", "(untitled)")
    warnings = []

    if s.get("novelty", 0) >= HIGH and s.get("credibility", 0) <= LOW:
        warnings.append(f"'{title}': novelty cao nhưng credibility thấp — cần thêm evidence trước khi dùng")
    if s.get("shareability", 0) >= HIGH and s.get("proof_potential", 0) <= LOW:
        warnings.append(f"'{title}': shareability cao nhưng proof_potential thấp — rủi ro bị coi là clickbait")
    if s.get("visual_potential", 0) >= HIGH and s.get("relevance", 0) <= LOW:
        warnings.append(f"'{title}': visual_potential cao nhưng relevance thấp — đẹp nhưng lạc đề với audience")
    if s.get("exaggeration_risk", 0) >= HIGH:
        warnings.append(f"'{title}': exaggeration_risk cao — cần disclaimer rõ ràng hoặc hạ tông tuyên bố")
    if not angle.get("proof_mechanism"):
        warnings.append(f"'{title}': không có proof_mechanism — không thể là recommended_angle")
    if overpromise_flag(angle):
        warnings.append(f"'{title}': ngôn ngữ có dấu hiệu hứa hẹn quá mức (từ khóa tuyệt đối) — rà soát lại")

    return warnings


def main():
    parser = argparse.ArgumentParser(description="Score and rank VidGen content angles")
    parser.add_argument("--dir", help="Directory containing angle-matrix.json")
    parser.add_argument("--file", help="Path directly to angle-matrix.json")
    args = parser.parse_args()

    if args.file:
        path = args.file
    elif args.dir:
        path = os.path.join(args.dir, "angle-matrix.json")
    else:
        parser.error("Provide --dir or --file")

    if not os.path.exists(path):
        print(f"File not found: {path}", file=sys.stderr)
        sys.exit(1)

    data = load_angles(path)
    angles = data.get("angles", [])
    if not angles:
        print("No angles found in file.", file=sys.stderr)
        sys.exit(1)

    ranked = sorted(
        angles,
        key=lambda a: weighted_score(a.get("scores", {})),
        reverse=True,
    )

    print("=== Angle Ranking (weighted, exaggeration_risk penalized) ===\n")
    print(f"{'Rank':<5}{'Score':<8}{'Title':<50}")
    for i, angle in enumerate(ranked, 1):
        score = weighted_score(angle.get("scores", {}))
        print(f"{i:<5}{score:<8}{angle.get('title', '(untitled)')[:48]:<50}")

    print("\n=== Trade-off Warnings ===\n")
    any_warning = False
    for angle in angles:
        for w in tradeoff_warnings(angle):
            print(f"  ! {w}")
            any_warning = True
    if not any_warning:
        print("  (none)")

    recommended = data.get("recommended_angle", "")
    if recommended:
        top_title = ranked[0].get("title", "")
        print(f"\nrecommended_angle in file: '{recommended}'")
        print(f"top-ranked by weighted score: '{top_title}'")
        if recommended != top_title:
            print("  Note: recommended_angle is not the top-ranked angle. "
                  "This is fine IF angle-matrix.json 'reasoning'/'tradeoffs' "
                  "explain why (e.g. channel_fit or credibility took priority "
                  "over raw score).")


if __name__ == "__main__":
    main()
