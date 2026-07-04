# VidGen

Generate short-form videos from a JSON script — synthesizes Vietnamese voiceover, renders scenes with captions via Remotion, and opens the result in Remotion Studio.

## Usage

```bash
python -m vidgen.main content/script_<name>.json
```

Renders at full concurrency (`--concurrency=100%`) via Remotion.
