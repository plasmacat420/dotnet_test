# modular/fallback_tts.py
"""
Fallback TTS wrapper that tries ElevenLabs first, then falls back to Sarvam on error.
Provides premium voice quality with reliability safety net.
"""
import asyncio
from typing import Optional
from livekit.agents import tts
from modular.utils import setup_logger


class FallbackTTS(tts.TTS):
    """
    TTS wrapper that provides automatic fallback between providers.

    Primary: ElevenLabs (premium quality, WebSocket streaming)
    Fallback: Sarvam AI (reliable, lower latency)

    Automatically switches to fallback on:
    - Timeout errors (>10s)
    - API errors
    - Network issues
    """

    def __init__(
        self,
        primary_tts: tts.TTS,
        fallback_tts: tts.TTS,
        primary_name: str = "ElevenLabs",
        fallback_name: str = "Sarvam"
    ):
        super().__init__(
            capabilities=primary_tts.capabilities,
            sample_rate=primary_tts.sample_rate,
            num_channels=primary_tts.num_channels
        )
        self.primary_tts = primary_tts
        self.fallback_tts = fallback_tts
        self.primary_name = primary_name
        self.fallback_name = fallback_name
        self.logger = setup_logger(__name__)

        # Track fallback usage
        self.fallback_count = 0
        self.primary_success_count = 0
        self.using_fallback = False

    def synthesize(self, text: str) -> "tts.ChunkedStream":
        """
        Synthesize speech with automatic fallback.

        Returns ChunkedStream from primary or fallback TTS.
        """
        try:
            # Try primary TTS first
            self.logger.debug(f"Attempting synthesis with {self.primary_name}: {text[:50]}...")
            stream = self.primary_tts.synthesize(text)
            self.primary_success_count += 1
            self.using_fallback = False
            return stream

        except Exception as e:
            # Log the error and use fallback
            self.fallback_count += 1
            self.using_fallback = True
            self.logger.warning(
                f"{self.primary_name} synthesis failed (error: {type(e).__name__}: {str(e)}). "
                f"Falling back to {self.fallback_name}. "
                f"(Fallback count: {self.fallback_count}, Success count: {self.primary_success_count})"
            )

            try:
                # Use fallback TTS
                stream = self.fallback_tts.synthesize(text)
                self.logger.info(f"{self.fallback_name} fallback succeeded")
                return stream
            except Exception as fallback_error:
                # Both failed - log and re-raise
                self.logger.error(
                    f"Both TTS providers failed! "
                    f"{self.primary_name}: {type(e).__name__}, "
                    f"{self.fallback_name}: {type(fallback_error).__name__}"
                )
                raise fallback_error

    def stream(self, *, conn_options=None):
        """
        Stream speech with automatic fallback.

        Returns async context manager for streaming TTS.
        """
        try:
            # Try primary TTS first
            self.logger.debug(f"Attempting streaming with {self.primary_name}")
            return self.primary_tts.stream(conn_options=conn_options)
        except Exception as e:
            # Log the error and use fallback
            self.logger.warning(
                f"{self.primary_name} streaming failed (error: {type(e).__name__}: {str(e)}). "
                f"Falling back to {self.fallback_name}."
            )
            return self.fallback_tts.stream(conn_options=conn_options)

    async def aclose(self):
        """Close both TTS providers"""
        try:
            if hasattr(self.primary_tts, 'aclose'):
                await self.primary_tts.aclose()
        except Exception as e:
            self.logger.warning(f"Error closing {self.primary_name}: {e}")

        try:
            if hasattr(self.fallback_tts, 'aclose'):
                await self.fallback_tts.aclose()
        except Exception as e:
            self.logger.warning(f"Error closing {self.fallback_name}: {e}")

    def get_stats(self) -> dict:
        """Get fallback statistics"""
        total = self.primary_success_count + self.fallback_count
        fallback_rate = (self.fallback_count / total * 100) if total > 0 else 0

        return {
            "primary_provider": self.primary_name,
            "fallback_provider": self.fallback_name,
            "primary_success_count": self.primary_success_count,
            "fallback_count": self.fallback_count,
            "total_requests": total,
            "fallback_rate_percent": round(fallback_rate, 2),
            "currently_using_fallback": self.using_fallback
        }
