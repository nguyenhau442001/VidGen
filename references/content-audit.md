# Content Audit

Lifecycle grouping for historical generated JSON files currently in `content/json/`. Human-approved source scripts live in `content/text/` with the same filename stem. Existing JSON files are not inputs to the new workflow and do not need bulk audit or migration before new productions begin.

## Production

These are usable video scripts or script packs, even if some use legacy metadata fields:

- `content/json/android_auto_vs_automotive.json`
- `content/json/chatgpt_guess_words.json`
- `content/json/grabfood_wait_time_p1.json`
- `content/json/homebrew_tap_security.json`
- `content/json/hsk_flashcard.json`
- `content/json/if_technology_could_talk_ep01_crush_seen_shots.json`
- `content/json/jadepuffer.json`
- `content/json/maps_route_p1.json`
- `content/json/maps_route_p2.json`
- `content/json/maps_route_p3_final.json`
- `content/json/script_grab_dispatch_p1.json`
- `content/json/script_grab_dispatch_p2.json`
- `content/json/script_grab_dispatch_p3.json`
- `content/json/script_grab_dispatch_p4.json`
- `content/json/worldcup.json`

## Fixture / demo

These are intentionally small or demo-shaped files used for examples and pipeline sanity:

- `content/json/sample_script.json`
- `content/json/script_radar_hook_demo.json`

## Draft / placeholder

These are not production-ready:

- `content/json/vidgen_football.json`

## Notes

- New productions start from `content/text/<slug>.txt`; older JSON-only productions remain historical outputs and can be ignored unless explicitly revisited.
- `content/text/grabfood_wait_time_p1.txt` is the first source file following the new contract.
- `worldcup_elevenlabs_script.md` is no longer in `content/`; it now lives in `references/`.
- Several production scripts still mix metadata styles (`meta`, `editorial_notes`, `visual` vs `props`). That is a schema-consistency issue, not a lifecycle issue.
