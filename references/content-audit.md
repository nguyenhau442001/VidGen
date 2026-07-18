# Content Audit

Lifecycle grouping for everything currently in `content/`.

## Production

These are usable video scripts or script packs, even if some use legacy metadata fields:

- `android_auto_vs_automotive.json`
- `chatgpt_guess_words.json`
- `grabfood_wait_time_p1.json`
- `homebrew_tap_security.json`
- `hsk_flashcard.json`
- `if_technology_could_talk_ep01_crush_seen_shots.json`
- `jadepuffer.json`
- `maps_route_p1.json`
- `maps_route_p2.json`
- `maps_route_p3_final.json`
- `script_grab_dispatch_p1.json`
- `script_grab_dispatch_p2.json`
- `script_grab_dispatch_p3.json`
- `script_grab_dispatch_p4.json`
- `worldcup.json`

## Fixture / demo

These are intentionally small or demo-shaped files used for examples and pipeline sanity:

- `sample_script.json`
- `script_radar_hook_demo.json`

## Draft / placeholder

These are not production-ready:

- `vidgen_football.json`

## Notes

- `worldcup_elevenlabs_script.md` is no longer in `content/`; it now lives in `references/`.
- Several production scripts still mix metadata styles (`meta`, `editorial_notes`, `visual` vs `props`). That is a schema-consistency issue, not a lifecycle issue.
