"""Google Gemini TTS provider."""

from __future__ import annotations

import base64
import binascii
import os
from typing import Any

import numpy as np

from vidgen.audio.audio_processing import audio_from_bytes
from vidgen.audio.providers.common import coerce_voice_name

_gemini_sdk: Any = None
_gemini_types: Any = None
_gemini_client: Any = None

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




def _decode_base64_string(value: str) -> bytes | None:
    compact = "".join(value.split())
    if len(compact) < 16:
        return None
    try:
        return base64.b64decode(compact, validate=True)
    except (binascii.Error, ValueError):
        return None


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


def audio_from_response(response: Any) -> tuple[np.ndarray, int]:
    extracted = _extract_gemini_audio_response(response)
    if extracted is None:
        raise RuntimeError(
            "Gemini TTS response did not contain inline audio data. "
            f"Response summary: {_summarize_gemini_response(response)}"
        )
    raw, content_type = extracted
    return audio_from_bytes(raw, content_type)


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


def synthesize(text: str, voice: Any = None) -> tuple[np.ndarray, int]:
    _, genai_types = _get_gemini_sdk()
    client = _get_gemini_client()
    model = os.getenv("GEMINI_TTS_MODEL", "gemini-2.5-flash-preview-tts")
    voice_name = coerce_voice_name(voice, "GEMINI_TTS_VOICE")
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
        return audio_from_response(response)
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
            return audio_from_response(retry_response)
        except RuntimeError as retry_exc:
            raise RuntimeError(
                f"{first_exc} Retry as performed shout also failed: {retry_exc}"
            ) from retry_exc

