import json
import os
import re
import subprocess
from pathlib import Path

SCENE_TYPE_TO_STYLE = {
    "CharacterIconScene": "characterIcon",
}

BOLD_RE = re.compile(r"\*\*([^*]+)\*\*")


def _style_for_scene(scene_type: str) -> str:
    return SCENE_TYPE_TO_STYLE.get(scene_type, "generic")


def _longest_bold_span(text: str) -> str | None:
    matches = BOLD_RE.findall(text)
    if not matches:
        return None
    return max(matches, key=len)


def _strip_bold_markers(text: str) -> str:
    return BOLD_RE.sub(r"\1", text)


def _extract_generic_props(script: dict, scene_index: int = 0) -> dict:
    scene = script["scenes"][scene_index]
    props = scene.get("props", {})
    raw_headline = props.get("headline", "")

    headline = (scene.get("narration") or "").rstrip(".")

    accent_word = props.get("accentWord") or _longest_bold_span(raw_headline)

    subtext = _strip_bold_markers(props.get("body") or raw_headline)

    part_label = None
    for s in script["scenes"]:
        label = s.get("props", {}).get("partLabel")
        if label:
            part_label = label
            break

    result = {"headline": headline, "subtext": subtext}
    if accent_word:
        result["accentWord"] = accent_word
    if part_label:
        result["partLabel"] = part_label
    return result


def _split_into_three_lines(text: str) -> tuple[str, str, str]:
    """Greedy word-boundary packing into 3 lines. line2's budget is tight
    (10 chars) because CharacterIconCoverScene highlights it in a fixed
    214px-wide box — overflow there looks broken, unlike lines 1/3."""

    def fill(budget: int, words: list, target: list) -> None:
        length = 0
        while words:
            candidate_len = length + len(words[0]) + (1 if length else 0)
            if candidate_len > budget:
                break
            length = candidate_len
            target.append(words.pop(0))

    remaining = text.split()
    line1_words: list = []
    line2_words: list = []
    fill(18, remaining, line1_words)
    fill(10, remaining, line2_words)
    line3_words = remaining

    line3 = " ".join(line3_words)
    if len(line3) > 24:
        truncated = line3[:24].rsplit(" ", 1)[0]
        line3 = truncated + "…"

    return " ".join(line1_words), " ".join(line2_words), line3


def _extract_character_icon_props(
    script: dict, scene_index: int = 0, channel_name: str = "DevFasterr"
) -> dict:
    scene = script["scenes"][scene_index]
    props = scene.get("props", {})

    headline_source = scene.get("on_screen_text") or scene.get("narration") or ""
    line1, line2, line3 = _split_into_three_lines(headline_source)

    result = {
        "eyebrowText": channel_name,
        "line1": line1,
        "line2": line2,
        "line3": line3,
        "subtitle": scene.get("narration") or "",
    }

    if props.get("accentColor"):
        result["accentColor"] = props["accentColor"]
    if props.get("partLabel"):
        result["seriesLabel"] = props["partLabel"]
    if props.get("rejectedPin", {}).get("label"):
        result["rejectedLabel"] = f"{props['rejectedPin']['label']} ✕"
    if props.get("selectedPin", {}).get("label"):
        result["selectedLabel"] = f"{props['selectedPin']['label']} ✓"

    return result
