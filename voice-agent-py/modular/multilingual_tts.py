from __future__ import annotations

import asyncio
import logging

from livekit.agents import DEFAULT_API_CONNECT_OPTIONS, APIConnectOptions, tts
from livekit.plugins import sarvam

logger = logging.getLogger(__name__)

# All languages supported by Sarvam bulbul:v2
SARVAM_LANGUAGES = [
    "bn-IN",  # Bengali
    "en-IN",  # English (India)
    "gu-IN",  # Gujarati
    "hi-IN",  # Hindi
    "kn-IN",  # Kannada
    "ml-IN",  # Malayalam
    "mr-IN",  # Marathi (Devanagari — same script as Hindi; auto-detect falls back to hi-IN)
    "od-IN",  # Odia
    "pa-IN",  # Punjabi
    "ta-IN",  # Tamil
    "te-IN",  # Telugu
]

# (unicode_start, unicode_end, bcp47_code) — first match wins.
# Devanagari (Hindi/Marathi) is last so the other unique scripts take priority.
_SCRIPT_RANGES = [
    (0x0980, 0x09FF, "bn-IN"),  # Bengali
    (0x0A00, 0x0A7F, "pa-IN"),  # Gurmukhi (Punjabi)
    (0x0A80, 0x0AFF, "gu-IN"),  # Gujarati
    (0x0B00, 0x0B7F, "od-IN"),  # Odia
    (0x0B80, 0x0BFF, "ta-IN"),  # Tamil
    (0x0C00, 0x0C7F, "te-IN"),  # Telugu
    (0x0C80, 0x0CFF, "kn-IN"),  # Kannada
    (0x0D00, 0x0D7F, "ml-IN"),  # Malayalam
    (0x0900, 0x097F, "hi-IN"),  # Devanagari → Hindi (Marathi is also Devanagari; defaults here)
]


def detect_language(text: str, fallback: str = "en-IN") -> str:
    """Return BCP-47 code for the first non-Latin script found in text, else fallback."""
    for char in text:
        cp = ord(char)
        for start, end, lang in _SCRIPT_RANGES:
            if start <= cp <= end:
                return lang
    return fallback


class MultilingualSarvamTTS(tts.TTS):
    """Sarvam TTS that auto-selects the target language from Unicode script detection.

    Holds one sarvam.TTS instance per supported language. Each synthesize() call
    runs detect_language() on the text and delegates to the matching instance.
    """

    def __init__(
        self,
        *,
        speaker: str = "anushka",
        default_language: str = "hi-IN",
        model: str = "bulbul:v2",
    ) -> None:
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=22050,
            num_channels=1,
        )
        self._default_language = default_language
        self._instances: dict[str, sarvam.TTS] = {
            lang: sarvam.TTS(
                target_language_code=lang,
                speaker=speaker,
                model=model,
            )
            for lang in SARVAM_LANGUAGES
        }
        logger.info(
            "MultilingualSarvamTTS ready — %d languages, speaker=%s, default=%s",
            len(self._instances),
            speaker,
            default_language,
        )

    @property
    def provider(self) -> str:
        return "SarvamMultilingual"

    def synthesize(
        self, text: str, *, conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS
    ) -> tts.ChunkedStream:
        lang = detect_language(text, fallback=self._default_language)
        logger.debug("TTS language=%s for text: %.60s", lang, text)
        return self._instances[lang].synthesize(text, conn_options=conn_options)

    async def aclose(self) -> None:
        await asyncio.gather(
            *(inst.aclose() for inst in self._instances.values()),
            return_exceptions=True,
        )
        await super().aclose()
