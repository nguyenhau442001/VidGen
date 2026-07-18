"""Validate narration timing and silence in a render manifest."""

from __future__ import annotations

from vidgen.pipeline.render_manifest_builder import (
    MAX_DEAD_AIR_FRAMES,
    detect_transition_silence,
)
from vidgen.pipeline.shot_schema import script_shots

MIN_FRAMES_PER_WORD = 8

def validate_manifest(manifest: dict) -> None:
    rows = []
    errors = []
    warnings = []
    for shot in script_shots(manifest):
        narration = shot.get("narration")
        timing = shot.get("narration_timing_frames")
        duration_frames = shot.get("duration_frames")
        if not narration or timing is None or duration_frames is None:
            continue
        scene_id = shot.get("id")
        words = len(narration.split())
        if not isinstance(timing, list) or len(timing) != 2:
            raise ValueError(f"{scene_id}: invalid narration_timing_frames = {timing}")
        start, end = timing
        alloc_frames = end - start
        transition_delay = shot.get("transition_out_delay_frames", 0)
        safe_end = duration_frames - transition_delay
        dead_air = duration_frames - end - transition_delay
        statuses = []
        frames_per_word = alloc_frames / words if words else None
        if frames_per_word is not None and frames_per_word < MIN_FRAMES_PER_WORD:
            errors.append(
                f"{scene_id}: word-count drift ({frames_per_word:.1f} f/word < "
                f"{MIN_FRAMES_PER_WORD} threshold — {words} words in {alloc_frames} frames)"
            )
            statuses.append("ERROR word-count")
        if end > safe_end:
            errors.append(f"{scene_id}: narration overflow (ends frame {end}, safe end {safe_end})")
            statuses.append("ERROR overflow")
        if dead_air > MAX_DEAD_AIR_FRAMES:
            warnings.append(f"{scene_id}: {dead_air} frames of dead air after narration ends")
            statuses.append("WARNING dead-air")
        rows.append((scene_id, words, alloc_frames, frames_per_word, ", ".join(statuses) or "OK"))

    print(f"{'scene_id':<15}{'words':>6}{'alloc_f':>9}{'f/word':>9} status")
    for scene_id, words, alloc_frames, frames_per_word, status in rows:
        f_per_word_str = f"{frames_per_word:.1f}" if frames_per_word is not None else "n/a"
        print(f"{str(scene_id):<15}{words:>6}{alloc_frames:>9}{f_per_word_str:>9} {status}")

    transition_findings = detect_transition_silence(manifest)
    for tf in transition_findings:
        warnings.append(
            f"{tf['from_scene']} -> {tf['to_scene']}: {tf['gap_frames']} frames "
            f"({tf['gap_seconds']}s) of silence across the scene boundary"
        )

    if warnings:
        print("\nWarnings:")
        for w in warnings:
            print(f"  - {w}")
    if errors:
        raise ValueError("Manifest validation failed:\n" + "\n".join(f"  - {e}" for e in errors))


