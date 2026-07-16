"""
vidgen/tts_speed.py
───────────────────
Speed wrapper for VieNeu-TTS, optional Viettel AI TTS, and Gemini TTS.

VieNeu's `tts.infer()` has no built-in speed/rate parameter.
This module adds a post-processing step: WSOLA time-stretch via
librosa, which changes playback speed while preserving pitch
(pitch-corrected / "robot-free" speedup).

Usage (drop-in replacement for raw tts.infer + tts.save):
    from vidgen.tts_speed import synthesize

    synthesize(
        text="Grab chọn tài xế theo score, không phải khoảng cách.",
        output_path="audio/scene_01.wav",
        voice=my_voice,          # optional: VieNeu voice object
        speed=1.2,               # 1.0 = normal, 1.2 = 20% faster (recommended)
        trim_silence=True,       # strip leading/trailing silence
        max_silence_ms=120,      # max internal silence allowed (ms)
    )

Dependencies:
    pip install librosa soundfile numpy
    (vieneu is already installed in the VidGen env)

Speed guidance:
    1.0  → normal tempo
    1.15 → slightly faster, still sounds natural
    1.2  → recommended for short-form video (podcast host pace)
    1.25 → aggressive, acceptable for dense technical content
    1.3+ → do NOT exceed — Vietnamese tones degrade above this
"""

from __future__ import annotations

import base64
import binascii
import json
import os
import subprocess
import tempfile
import warnings
from pathlib import Path
from typing import Optional, Any
from urllib import error as urllib_error
from urllib import request as urllib_request

import numpy as np
import soundfile as sf

from vidgen.shot_api import script_shots

# ── optional heavy deps (fail loudly with helpful message) ────────────────────
try:
    import librosa
except ImportError as e:
    raise ImportError(
        "tts_speed requires librosa and soundfile.\n"
        "Install with: pip install librosa soundfile"
    ) from e

try:
    from vieneu import Vieneu
except ImportError as e:
    raise ImportError(
        "VieNeu-TTS is not installed or not on PYTHONPATH.\n"
        "See: https://github.com/pnnbao97/VieNeu-TTS"
    ) from e

# ── module-level singleton — reuse across calls to avoid re-loading model ─────
_tts_instance: Optional[Vieneu] = None
_gemini_sdk: Any = None
_gemini_types: Any = None
_gemini_client: Any = None


def _get_tts() -> Vieneu:
    global _tts_instance
    if _tts_instance is None:
        _tts_instance = Vieneu()
    return _tts_instance


def _get_gemini_sdk() -> tuple[Any, Any]:
    global _gemini_sdk, _gemini_types
    if _gemini_sdk is None or _gemini_types is None:
        try:
            from google import genai as genai_sdk
            from google.genai import types as genai_types
        except ImportError as e:
            raise ImportError(
                "Gemini TTS requires the google-genai package.\n"
                "Install with: pip install google-genai"
            ) from e
        _gemini_sdk = genai_sdk
        _gemini_types = genai_types
    return _gemini_sdk, _gemini_types


def _get_gemini_client() -> Any:
    global _gemini_client
    if _gemini_client is None:
        genai_sdk, _ = _get_gemini_sdk()
        api_key = (
            os.getenv("GEMINI_API_KEY")
            or os.getenv("GOOGLE_API_KEY")
            or os.getenv("GOOGLE_GENAI_API_KEY")
        )
        client_kwargs: dict[str, Any] = {}
        if api_key:
            client_kwargs["api_key"] = api_key
        _gemini_client = genai_sdk.Client(**client_kwargs)
    return _gemini_client


def normalize_tts_provider(provider: str | None) -> str:
    """Normalize provider aliases into the internal provider key."""
    value = (
        provider
        or os.getenv("VIDGEN_TTS_PROVIDER")
        or "vieneu"
    ).strip().lower().replace("-", "_").replace(".", "_")
    aliases = {
        "vie_neu": "vieneu",
        "vieneu_tts": "vieneu",
        "viettel": "viettel_ai",
        "viettel_ai": "viettel_ai",
        "gemini_tts": "gemini",
        "google_gemini": "gemini",
        "gemini_2_5_flash_tts": "gemini",
        "gemini_2_5_flash_preview_tts": "gemini",
    }
    normalized = aliases.get(value, value)
    if normalized not in {"vieneu", "viettel_ai", "gemini"}:
        raise ValueError(
            f"Unsupported TTS provider '{provider}'. "
            "Use 'vieneu', 'viettel_ai', or 'gemini'."
        )
    return normalized


def _coerce_voice_name(voice: Any, env_var: str) -> str | None:
    if voice is None:
        value = os.getenv(env_var)
        return value.strip() if value and value.strip() else None
    if isinstance(voice, str):
        value = voice.strip()
        return value or None
    for attr in ("name", "display_name", "voice_id", "id"):
        value = getattr(voice, attr, None)
        if isinstance(value, str) and value.strip():
            return value.strip()
    value = str(voice).strip()
    return value or None


# ── core helpers ──────────────────────────────────────────────────────────────

def _audio_from_vieneu(audio_spec: Any, tts: Vieneu) -> tuple[np.ndarray, int]:
    """
    Convert whatever tts.infer() returns into (samples: np.ndarray, sample_rate: int).

    VieNeu returns an AudioSpec object. Its save() only accepts a filesystem
    path (a file-like object gets stringified and soundfile rejects it), so
    round-trip through a temp WAV and re-read with soundfile to get a clean
    numpy float32 array + sample rate. This avoids any assumption about the
    internal AudioSpec format.
    """
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        tts.save(audio_spec, tmp_path)
        samples, sr = sf.read(tmp_path, dtype="float32", always_2d=False)
    finally:
        os.unlink(tmp_path)
    return samples, sr


def _suffix_for_content_type(content_type: str | None) -> str:
    if not content_type:
        return ".bin"
    base_type = content_type.split(";", 1)[0].strip().lower()
    if base_type in {"audio/wav", "audio/x-wav"}:
        return ".wav"
    if base_type in {"audio/mpeg", "audio/mp3"}:
        return ".mp3"
    if base_type in {"audio/flac"}:
        return ".flac"
    if base_type in {"audio/ogg", "audio/opus", "audio/ogg_opus"}:
        return ".ogg"
    if base_type in {"audio/pcm", "audio/l16", "application/octet-stream"}:
        return ".bin"
    return ".bin"


def _suffix_for_audio_bytes(raw: bytes) -> str:
    if raw.startswith(b"RIFF"):
        return ".wav"
    if raw.startswith(b"fLaC"):
        return ".flac"
    if raw.startswith(b"OggS"):
        return ".ogg"
    if raw.startswith(b"ID3") or raw[:2] == b"\xff\xfb":
        return ".mp3"
    return ".bin"


def _read_audio_file(path: str | Path) -> tuple[np.ndarray, int]:
    try:
        samples, sr = sf.read(str(path), dtype="float32", always_2d=False)
        return samples, sr
    except Exception:
        converted_path = f"{path}.wav"
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(path), "-vn", converted_path],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        try:
            samples, sr = sf.read(converted_path, dtype="float32", always_2d=False)
            return samples, sr
        finally:
            try:
                os.unlink(converted_path)
            except FileNotFoundError:
                pass


def _content_type_params(content_type: str | None) -> dict[str, str]:
    if not content_type:
        return {}
    params = {}
    for raw_part in content_type.split(";")[1:]:
        key, _, value = raw_part.strip().partition("=")
        if key and value:
            params[key.lower()] = value.strip().strip('"')
    return params


def _audio_from_pcm_bytes(raw: bytes, content_type: str | None) -> tuple[np.ndarray, int]:
    params = _content_type_params(content_type)
    sr = int(params.get("rate") or params.get("sample_rate") or "24000")
    channels = int(params.get("channels") or "1")
    base_type = (content_type or "").split(";", 1)[0].strip().lower()
    endian = ">i2" if base_type == "audio/l16" else "<i2"
    samples = np.frombuffer(raw, dtype=np.dtype(endian)).astype(np.float32) / 32768.0
    if channels > 1:
        usable = (len(samples) // channels) * channels
        samples = samples[:usable].reshape(-1, channels)
    return samples, sr


def _audio_from_bytes(raw: bytes, content_type: str | None = None) -> tuple[np.ndarray, int]:
    base_type = (content_type or "").split(";", 1)[0].strip().lower()
    if base_type in {"audio/pcm", "audio/l16"}:
        return _audio_from_pcm_bytes(raw, content_type)

    suffix = _suffix_for_content_type(content_type)
    if suffix == ".bin":
        suffix = _suffix_for_audio_bytes(raw)
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(raw)
        tmp_path = tmp.name
    try:
        return _read_audio_file(tmp_path)
    finally:
        try:
            os.unlink(tmp_path)
        except FileNotFoundError:
            pass


def _decode_base64_string(value: str) -> bytes | None:
    compact = "".join(value.split())
    if len(compact) < 16:
        return None
    try:
        return base64.b64decode(compact, validate=True)
    except (binascii.Error, ValueError):
        return None


def _extract_remote_audio_source(payload: Any) -> tuple[str, str | bytes] | None:
    if isinstance(payload, dict):
        for key in ("audio_url", "download_url", "url", "file_url", "audioUri"):
            value = payload.get(key)
            if isinstance(value, str) and value.startswith(("http://", "https://")):
                return ("url", value)

        for key in ("audio", "audio_base64", "base64", "data", "result", "content"):
            value = payload.get(key)
            if isinstance(value, str):
                if value.startswith("data:"):
                    _, _, encoded = value.partition(",")
                    decoded = _decode_base64_string(encoded)
                    if decoded is not None:
                        return ("bytes", decoded)
                decoded = _decode_base64_string(value)
                if decoded is not None:
                    return ("bytes", decoded)

        for value in payload.values():
            nested = _extract_remote_audio_source(value)
            if nested is not None:
                return nested

    if isinstance(payload, list):
        for item in payload:
            nested = _extract_remote_audio_source(item)
            if nested is not None:
                return nested

    return None


def _download_url_audio(url: str) -> tuple[np.ndarray, int]:
    with urllib_request.urlopen(url, timeout=120) as resp:
        raw = resp.read()
        content_type = resp.headers.get_content_type()
    return _audio_from_bytes(raw, content_type)


def _audio_from_viettel_ai_response(raw: bytes, content_type: str | None) -> tuple[np.ndarray, int]:
    if content_type and content_type.startswith("audio/"):
        return _audio_from_bytes(raw, content_type)

    stripped = raw.lstrip()
    if stripped.startswith((b"{", b"[")):
        payload = json.loads(raw.decode("utf-8"))
        source = _extract_remote_audio_source(payload)
        if source is None:
            raise RuntimeError(
                "Viettel AI TTS response did not contain audio. "
                f"Top-level keys: {list(payload)[:8] if isinstance(payload, dict) else type(payload).__name__}"
            )
        kind, value = source
        if kind == "url":
            return _download_url_audio(value)
        return _audio_from_bytes(value, content_type)

    return _audio_from_bytes(raw, content_type)


def _lookup_field(obj: Any, *names: str) -> Any:
    if obj is None:
        return None
    if isinstance(obj, dict):
        for name in names:
            if name in obj:
                return obj[name]
        return None
    for name in names:
        try:
            return getattr(obj, name)
        except AttributeError:
            continue
        except Exception:
            continue
    return None


def _blob_to_bytes(blob: Any) -> tuple[bytes | None, str | None]:
    if blob is None:
        return None, None
    data = _lookup_field(blob, "data")
    mime_type = _lookup_field(blob, "mime_type", "mimeType")
    if data is None:
        return None, mime_type
    if isinstance(data, memoryview):
        data = data.tobytes()
    if isinstance(data, bytearray):
        data = bytes(data)
    if isinstance(data, str):
        decoded = _decode_base64_string(data)
        if decoded is not None:
            data = decoded
        else:
            data = data.encode("utf-8")
    if isinstance(data, list):
        try:
            data = bytes(data)
        except Exception:
            return None, mime_type
    if not isinstance(data, (bytes, bytearray)):
        return None, mime_type
    return bytes(data), mime_type


def _extract_gemini_audio_response(response: Any) -> tuple[bytes, str | None] | None:
    candidates = _lookup_field(response, "candidates") or []
    for candidate in candidates:
        content = _lookup_field(candidate, "content")
        parts = _lookup_field(content, "parts") or []
        for part in parts:
            raw, mime_type = _blob_to_bytes(_lookup_field(part, "inline_data", "inlineData"))
            if raw is not None:
                return raw, mime_type

    raw, mime_type = _blob_to_bytes(_lookup_field(response, "inline_data", "inlineData"))
    if raw is not None:
        return raw, mime_type
    return None


def _clip_debug_value(value: Any, max_len: int = 180) -> str:
    if value is None:
        return "None"
    text = str(value).replace("\n", "\\n")
    return text if len(text) <= max_len else f"{text[:max_len]}..."


def _summarize_gemini_response(response: Any) -> str:
    lines = []
    for field in ("response_id", "model_version"):
        value = _lookup_field(response, field)
        if value is not None:
            lines.append(f"{field}={_clip_debug_value(value)}")

    for field in ("prompt_feedback", "model_status"):
        value = _lookup_field(response, field)
        if value is not None:
            lines.append(f"{field}={_clip_debug_value(value)}")

    candidates = _lookup_field(response, "candidates") or []
    lines.append(f"candidates={len(candidates)}")
    for i, candidate in enumerate(candidates[:3]):
        lines.append(
            "candidate[{i}]: finish_reason={reason}, finish_message={message}".format(
                i=i,
                reason=_clip_debug_value(_lookup_field(candidate, "finish_reason")),
                message=_clip_debug_value(_lookup_field(candidate, "finish_message")),
            )
        )
        content = _lookup_field(candidate, "content")
        parts = _lookup_field(content, "parts") or []
        lines.append(f"candidate[{i}].parts={len(parts)}")
        for j, part in enumerate(parts[:5]):
            text = _lookup_field(part, "text")
            inline_data = _lookup_field(part, "inline_data", "inlineData")
            if inline_data is not None:
                blob_data = _lookup_field(inline_data, "data")
                blob_len = len(blob_data) if isinstance(blob_data, (bytes, bytearray, str, list)) else "unknown"
                lines.append(
                    "candidate[{i}].part[{j}]: inline_data mime={mime}, data_len={length}".format(
                        i=i,
                        j=j,
                        mime=_clip_debug_value(_lookup_field(inline_data, "mime_type", "mimeType")),
                        length=blob_len,
                    )
                )
            elif text is not None:
                lines.append(f"candidate[{i}].part[{j}]: text={_clip_debug_value(text)}")
            else:
                lines.append(f"candidate[{i}].part[{j}]: no text/inline_data")
    return "; ".join(lines)


def _audio_from_gemini_response(response: Any) -> tuple[np.ndarray, int]:
    extracted = _extract_gemini_audio_response(response)
    if extracted is None:
        raise RuntimeError(
            "Gemini TTS response did not contain inline audio data. "
            f"Response summary: {_summarize_gemini_response(response)}"
        )
    raw, content_type = extracted
    return _audio_from_bytes(raw, content_type)


def _gemini_tts_prompt(text: str) -> str:
    template = os.getenv(
        "GEMINI_TTS_PROMPT_TEMPLATE",
        "Say the following Vietnamese text exactly as written, as a native Vietnamese speaker, "
        "with natural short-form video delivery:\n{text}",
    )
    return template.format(text=text)


def _is_gemini_shout_text(text: str) -> bool:
    compact = " ".join(text.strip().lower().split())
    if len(compact) > 36 or len(compact.split()) > 2:
        return False
    return ("vào" in compact or "vao" in compact) and ("ooo" in compact or "!" in compact)


def _gemini_shout_prompt(text: str) -> str:
    template = os.getenv(
        "GEMINI_TTS_SHOUT_PROMPT_TEMPLATE",
        "Produce a single excited Vietnamese football goal shout as a native Vietnamese speaker. "
        "Say 'Vào!' with the final vowel stretched naturally for about two seconds. "
        "Do not say anything else.",
    )
    return template.format(text=text)


def _synthesize_with_gemini(text: str, voice: Any = None) -> tuple[np.ndarray, int]:
    _, genai_types = _get_gemini_sdk()
    client = _get_gemini_client()
    model = os.getenv("GEMINI_TTS_MODEL", "gemini-2.5-flash-preview-tts")
    voice_name = _coerce_voice_name(voice, "GEMINI_TTS_VOICE")
    speech_config_kwargs: dict[str, Any] = {}
    if voice_name:
        speech_config_kwargs["voice_config"] = genai_types.VoiceConfig(
            prebuilt_voice_config=genai_types.PrebuiltVoiceConfig(voice_name=voice_name)
        )
    language_code = (os.getenv("GEMINI_TTS_LANGUAGE_CODE") or "vi-VN").strip()
    if language_code:
        speech_config_kwargs["language_code"] = language_code

    config = genai_types.GenerateContentConfig(
        response_modalities=["audio"],
        speech_config=genai_types.SpeechConfig(**speech_config_kwargs),
    )
    response = client.models.generate_content(
        model=model,
        contents=_gemini_tts_prompt(text),
        config=config,
    )
    try:
        return _audio_from_gemini_response(response)
    except RuntimeError as first_exc:
        if not _is_gemini_shout_text(text):
            raise

        print("[tts_speed] Gemini TTS exact shout returned no audio; retrying as performed shout")
        retry_response = client.models.generate_content(
            model=model,
            contents=_gemini_shout_prompt(text),
            config=config,
        )
        try:
            return _audio_from_gemini_response(retry_response)
        except RuntimeError as retry_exc:
            raise RuntimeError(
                f"{first_exc} Retry as performed shout also failed: {retry_exc}"
            ) from retry_exc


def _synthesize_with_viettel_ai(text: str, voice: Any = None) -> tuple[np.ndarray, int]:
    endpoint = os.getenv("VIETTEL_AI_TTS_URL", "https://viettelai.vn/tts/speech_synthesis")

    payload: dict[str, Any] = {
        "text": text,
        "speed": 1.0,
        "tts_return_option": int(os.getenv("VIETTEL_AI_RETURN_OPTION", "3")),
        "without_filter": os.getenv("VIETTEL_AI_WITHOUT_FILTER", "false").lower() == "true",
    }
    voice_name = _coerce_voice_name(voice, "VIETTEL_AI_VOICE")
    if voice_name:
        payload["voice"] = voice_name

    token = os.getenv("VIETTEL_AI_TOKEN") or os.getenv("VIETTEL_AI_API_KEY")
    if token:
        payload["token"] = token

    extra_body = os.getenv("VIETTEL_AI_EXTRA_BODY_JSON")
    if extra_body:
        payload.update(json.loads(extra_body))

    headers: dict[str, str] = {
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "audio/*, application/json",
    }

    extra_headers = os.getenv("VIETTEL_AI_EXTRA_HEADERS_JSON")
    if extra_headers:
        headers.update(json.loads(extra_headers))

    request = urllib_request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    timeout_s = float(os.getenv("VIETTEL_AI_TIMEOUT_SECONDS", "120"))
    try:
        with urllib_request.urlopen(request, timeout=timeout_s) as resp:
            raw = resp.read()
            content_type = resp.headers.get_content_type()
    except urllib_error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"Viettel AI TTS failed with HTTP {exc.code}: {body[:500]}"
        ) from exc

    return _audio_from_viettel_ai_response(raw, content_type)


def _synthesize_with_vieneu(text: str, voice: Any = None) -> tuple[np.ndarray, int]:
    tts = _get_tts()
    infer_kwargs: dict[str, Any] = {"text": text}
    if voice is not None:
        infer_kwargs["voice"] = voice
    audio_spec = tts.infer(**infer_kwargs)
    return _audio_from_vieneu(audio_spec, tts)


def _time_stretch(samples: np.ndarray, sr: int, speed: float) -> np.ndarray:
    """
    Pitch-preserving time-stretch using librosa's WSOLA implementation.

    rate > 1.0  → faster (shorter duration, same pitch)
    rate < 1.0  → slower (longer duration, same pitch)
    """
    if abs(speed - 1.0) < 0.01:
        return samples  # no-op
    if speed > 1.35:
        warnings.warn(
            f"speed={speed} exceeds recommended maximum of 1.3. "
            "Vietnamese tonal quality may degrade.",
            UserWarning,
            stacklevel=3,
        )
    try:
        # librosa.effects.time_stretch takes rate as the stretch factor
        # rate=1.2 → play 20% faster (output is shorter)
        stretched = librosa.effects.time_stretch(y=samples, rate=speed)

        # The phase-vocoder stretch attenuates energy (~5 dB RMS at 1.2×),
        # leaving the sped clip audibly quieter than unprocessed ones — restore
        # the input's RMS, backing gain off if that would clip peaks.
        in_rms = float(np.sqrt(np.mean(samples**2)))
        out_rms = float(np.sqrt(np.mean(stretched**2)))
        if out_rms > 0.0 and in_rms > 0.0:
            gain = in_rms / out_rms
            peak = float(np.max(np.abs(stretched))) * gain
            if peak > 0.99:
                gain *= 0.99 / peak
            stretched = stretched * gain
        return stretched
    except Exception as exc:
        warnings.warn(
            f"librosa time_stretch failed ({exc}); falling back to ffmpeg atempo.",
            UserWarning,
            stacklevel=3,
        )
        return _time_stretch_ffmpeg(samples, sr, speed)


def _time_stretch_ffmpeg(samples: np.ndarray, sr: int, speed: float) -> np.ndarray:
    """
    Pitch-preserving fallback using ffmpeg's atempo filter.

    This avoids librosa/numba cache issues in constrained environments while
    keeping the output usable for the render pipeline.
    """
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as src:
        src_path = src.name
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as dst:
        dst_path = dst.name
    try:
        sf.write(src_path, samples, sr)
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                src_path,
                "-filter:a",
                f"atempo={speed}",
                "-vn",
                dst_path,
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        stretched, out_sr = sf.read(dst_path, dtype="float32", always_2d=False)
        if out_sr != sr:
            warnings.warn(
                f"ffmpeg atempo returned sample rate {out_sr} instead of {sr}; using original.",
                UserWarning,
                stacklevel=3,
            )
            return samples
        return stretched
    finally:
        for path in (src_path, dst_path):
            try:
                os.unlink(path)
            except FileNotFoundError:
                pass


def _trim_silence(
    samples: np.ndarray,
    sr: int,
    top_db: int = 30,
    max_silence_ms: int = 120,
) -> np.ndarray:
    """
    1. Strip leading and trailing silence (librosa.effects.trim).
    2. Collapse any internal silence runs longer than max_silence_ms
       down to max_silence_ms.

    top_db: threshold in dB below reference — increase to be more aggressive.
    max_silence_ms: maximum allowed internal pause length.
    """
    try:
        # Step 1: trim edges
        trimmed, _ = librosa.effects.trim(samples, top_db=top_db)

        # Step 2: collapse long internal silences
        max_silence_samples = int(sr * max_silence_ms / 1000)
        silence_threshold = librosa.db_to_amplitude(-top_db)

        result_chunks: list[np.ndarray] = []
        i = 0
        n = len(trimmed)

        while i < n:
          # find start of a silence run
            if abs(trimmed[i]) < silence_threshold:
                silence_start = i
                while i < n and abs(trimmed[i]) < silence_threshold:
                    i += 1
                silence_len = i - silence_start
                # keep up to max_silence_samples of the silence
                keep = min(silence_len, max_silence_samples)
                result_chunks.append(trimmed[silence_start: silence_start + keep])
            else:
                chunk_start = i
                while i < n and abs(trimmed[i]) >= silence_threshold:
                    i += 1
                result_chunks.append(trimmed[chunk_start:i])

        return np.concatenate(result_chunks) if result_chunks else trimmed
    except Exception as exc:
        warnings.warn(
            f"librosa trim failed ({exc}); falling back to numpy silence trim.",
            UserWarning,
            stacklevel=3,
        )
        return _trim_silence_numpy(samples, sr, top_db=top_db, max_silence_ms=max_silence_ms)


def _trim_silence_numpy(
    samples: np.ndarray,
    sr: int,
    top_db: int = 30,
    max_silence_ms: int = 120,
) -> np.ndarray:
    """Lightweight fallback that trims leading/trailing silence and caps long pauses."""
    silence_threshold = 10 ** (-top_db / 20)
    max_silence_samples = int(sr * max_silence_ms / 1000)

    mono = samples if samples.ndim == 1 else np.max(np.abs(samples), axis=1)
    active = np.where(np.abs(mono) >= silence_threshold)[0]
    if active.size == 0:
        return samples

    start = max(0, active[0] - 1)
    end = min(len(samples), active[-1] + 2)
    trimmed = samples[start:end]

    mono_trimmed = mono[start:end]
    chunks: list[np.ndarray] = []
    i = 0
    n = len(trimmed)
    while i < n:
        if abs(mono_trimmed[i]) < silence_threshold:
            silence_start = i
            while i < n and abs(mono_trimmed[i]) < silence_threshold:
                i += 1
            silence_len = i - silence_start
            keep = min(silence_len, max_silence_samples)
            chunks.append(trimmed[silence_start:silence_start + keep])
        else:
            chunk_start = i
            while i < n and abs(mono_trimmed[i]) >= silence_threshold:
                i += 1
            chunks.append(trimmed[chunk_start:i])

    return np.concatenate(chunks) if chunks else trimmed


def _apply_gain(samples: np.ndarray, gain_db: float, ceiling: float = 0.99) -> np.ndarray:
    """
    Boost (or cut) by gain_db, soft-limiting anything the boost pushes past
    `ceiling` instead of hard-clipping. The limiter is a tanh knee that only
    touches samples above 0.95 — speech below the knee passes through linear.
    """
    if abs(gain_db) < 0.01:
        return samples
    y = samples * (10.0 ** (gain_db / 20.0))
    knee = 0.95
    over = np.abs(y) > knee
    if np.any(over):
        span = ceiling - knee
        y[over] = np.sign(y[over]) * (knee + span * np.tanh((np.abs(y[over]) - knee) / span))
    return y


# ── public API ────────────────────────────────────────────────────────────────

def synthesize(
    text: str,
    output_path: str | Path,
    voice: Any = None,
    speed: float = 1.2,
    trim_silence: bool = True,
    max_silence_ms: int = 120,
    top_db: int = 30,
    target_dbfs: float | None = -15.0,
    provider: str = "vieneu",
) -> Path:
    """
    Synthesize text with VieNeu-TTS, Viettel AI TTS, or Gemini TTS, apply
    speed-up and silence trimming, then save to output_path as a WAV file.

    Parameters
    ----------
    text : str
        Vietnamese narration text. English terms are OK inline.
    output_path : str | Path
        Destination .wav file. Parent directory is created if needed.
    voice : Any, optional
        Provider-specific voice token or object. VieNeu accepts a preset voice
        object, Viettel AI accepts a voice name, and Gemini accepts a prebuilt
        voice name when explicitly configured.
    speed : float
        Playback speed multiplier. Default 1.2 (20% faster, pitch-preserved).
        Recommended range: 1.0–1.3. Do NOT exceed 1.3 for Vietnamese.
    trim_silence : bool
        Whether to trim leading/trailing silence and collapse long internal pauses.
    max_silence_ms : int
        Maximum internal pause duration in milliseconds (default 120ms ≈ 3 frames @25fps).
    top_db : int
        Silence detection threshold. Higher = more aggressive trimming.
    target_dbfs : float | None
        Normalize the finished clip to this RMS level (dBFS), soft-limited
        near full scale so it never hard-clips. Fixed target = every scene
        lands at the same loudness regardless of TTS take variation, near
        the ~-14 LUFS platforms normalize to. None disables normalization
        (clip keeps the model's native level, RMS-restored after stretch).
    provider : str
        Internal TTS backend. ``vieneu`` keeps the current default behavior.
        ``viettel_ai`` uses the Viettel AI HTTP endpoint configured through
        environment variables. ``gemini`` uses Gemini 2.5 Flash TTS via the
        Google GenAI SDK.

    Returns
    -------
    Path
        Absolute path to the saved audio file.
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    provider_key = normalize_tts_provider(provider)

    # ── 1. Synthesize ──────────────────────────────────────────────────────────
    if provider_key == "vieneu":
        samples, sr = _synthesize_with_vieneu(text, voice)
    elif provider_key == "viettel_ai":
        samples, sr = _synthesize_with_viettel_ai(text, voice)
    else:
        samples, sr = _synthesize_with_gemini(text, voice)

    # ── 2. Time-stretch (pitch-corrected speedup) ──────────────────────────────
    samples = _time_stretch(samples, sr, speed)

    # ── 3. Silence trimming ────────────────────────────────────────────────────
    if trim_silence:
        samples = _trim_silence(samples, sr, top_db=top_db, max_silence_ms=max_silence_ms)

    # ── 3b. Target loudness normalization (soft-limited) ───────────────────────
    # Measured after trim so the level reflects actual speech content.
    if target_dbfs is not None:
        rms = float(np.sqrt(np.mean(samples**2)))
        if rms > 0.0:
            samples = _apply_gain(samples, target_dbfs - 20.0 * np.log10(rms))

    # ── 4. Save ────────────────────────────────────────────────────────────────
    sf.write(str(output_path), samples, sr, subtype="PCM_16")

    duration_s = len(samples) / sr
    print(f"[tts_speed] ✅ {output_path.name}  {duration_s:.2f}s  (speed={speed}×)")

    return output_path.resolve()


def resolve_scene_tts_speed(scene: dict, default_speed: float) -> float:
    """Return the per-scene TTS speed, falling back to the global default."""
    raw_speed = scene.get("tts_speed", default_speed)
    if raw_speed is None:
        raw_speed = default_speed
    try:
        speed = float(raw_speed)
    except (TypeError, ValueError) as exc:
        raise ValueError(
            f"Invalid tts_speed for scene {scene.get('id', '?')}: {raw_speed!r}"
        ) from exc
    if speed <= 0:
        raise ValueError(f"Invalid tts_speed for scene {scene.get('id', '?')}: {speed}")
    return speed


def fit_wav_to_duration(
    wav_path: str | Path,
    max_duration_seconds: float,
    max_speed: float = 1.3,
) -> tuple[float, float]:
    """Pitch-preserve a generated WAV so it cannot overrun its shot window.

    VieNeu output length varies slightly between takes. Authored timelines
    must therefore be enforced against the real WAV, not estimated words.
    Returns ``(final_duration_seconds, applied_speed)``; speed is 1.0 when
    the file already fits.
    """
    if max_duration_seconds <= 0:
        raise ValueError(f"max_duration_seconds must be positive, got {max_duration_seconds}")

    wav_path = Path(wav_path)
    samples, sr = sf.read(str(wav_path), dtype="float32", always_2d=False)
    duration = len(samples) / sr
    if duration <= max_duration_seconds:
        return duration, 1.0

    required_speed = duration / max_duration_seconds
    if required_speed > max_speed:
        raise ValueError(
            f"{wav_path.name} needs {required_speed:.2f}x to fit "
            f"{max_duration_seconds:.2f}s (maximum {max_speed:.2f}x); shorten narration"
        )

    samples = _time_stretch(samples, sr, required_speed)
    # Time-stretch rounding can leave a handful of samples over the exact
    # target. Trim only that fractional tail so ffmpeg never clips speech.
    max_samples = int(max_duration_seconds * sr)
    if len(samples) > max_samples:
        samples = samples[:max_samples]
    sf.write(str(wav_path), samples, sr, subtype="PCM_16")
    final_duration = len(samples) / sr
    print(
        f"[tts_speed] fit {wav_path.name}: {duration:.2f}s -> "
        f"{final_duration:.2f}s ({required_speed:.2f}x)"
    )
    return final_duration, required_speed


def synthesize_scenes(
    scenes: list[dict],
    output_dir: str | Path,
    voice: Any = None,
    speed: float = 1.2,
    trim_silence: bool = True,
    max_silence_ms: int = 120,
    target_dbfs: float | None = -15.0,
    provider: str = "vieneu",
) -> dict[str, Path]:
    """
    Batch synthesize all scenes from a VidGen script dict.

    Parameters
    ----------
    scenes : list[dict]
        List of shot objects from script JSON (each must have 'id' and 'narration').
    output_dir : str | Path
        Directory where per-scene .wav files are saved.
        Files are named: <scene_id>.wav
    voice : Any, optional
        Shared voice token for all scenes, interpreted by the selected provider.
    speed, trim_silence, max_silence_ms :
        Forwarded to synthesize() unless a scene provides its own ``tts_speed``.
    provider : str
        Internal TTS backend. ``vieneu`` keeps the current default behavior.
        ``viettel_ai`` and ``gemini`` follow the same provider contract.
        ``gemini`` uses Gemini 2.5 Flash TTS.

    Returns
    -------
    dict[str, Path]
        Mapping of scene_id → output WAV path.
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    results: dict[str, Path] = {}
    for scene in scenes:
        scene_id = scene.get("id", "unknown")
        narration = scene.get("narration", "").strip()
        if not narration:
            print(f"[tts_speed] ⚠️  Shot '{scene_id}' has no narration — skipping.")
            continue

        out_path = output_dir / f"{scene_id}.wav"
        scene_speed = resolve_scene_tts_speed(scene, speed)
        synthesize(
            text=narration,
            output_path=out_path,
            voice=voice,
            speed=scene_speed,
            trim_silence=trim_silence,
            max_silence_ms=max_silence_ms,
            target_dbfs=target_dbfs,
            provider=provider,
        )
        results[scene_id] = out_path

    print(f"[tts_speed] 🎙  {len(results)}/{len(scenes)} shots synthesized → {output_dir}")
    return results


# ── CLI entry point ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(
        description="VieNeu / Viettel AI / Gemini TTS speed wrapper — synthesize a VidGen script JSON"
    )
    parser.add_argument("script", help="Path to VidGen script JSON (content/*.json)")
    parser.add_argument("--output-dir", default="audio", help="Output directory for WAV files")
    parser.add_argument("--speed", type=float, default=1.2, help="Speed multiplier (default 1.2)")
    parser.add_argument("--voice", default=None, help="Voice name / preset ID for the selected provider")
    parser.add_argument("--provider", default=None, help="TTS provider: vieneu, viettel_ai, or gemini")
    parser.add_argument("--no-trim", action="store_true", help="Disable silence trimming")
    parser.add_argument("--max-silence-ms", type=int, default=120)
    args = parser.parse_args()

    script_path = Path(args.script)
    script = json.loads(script_path.read_text(encoding="utf-8"))
    scenes = script_shots(script)

    voice_obj = None
    if args.voice:
        tts_instance = _get_tts()
        voice_obj = tts_instance.get_preset_voice(args.voice)
        print(f"[tts_speed] 🎤 Using preset voice: {args.voice}")

    synthesize_scenes(
        scenes=scenes,
        output_dir=args.output_dir,
        voice=voice_obj,
        speed=args.speed,
        trim_silence=not args.no_trim,
        max_silence_ms=args.max_silence_ms,
        provider=normalize_tts_provider(args.provider),
    )
