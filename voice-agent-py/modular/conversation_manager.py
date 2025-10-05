# modular/conversation_manager.py
import asyncio
from datetime import datetime
from typing import Optional
from livekit import rtc
from livekit.agents import JobContext
from modular.session_manager import SessionManager
from modular.transcript_manager import TranscriptManager
from modular.utils import setup_logger


class ConversationManager:
    """Manages the overall conversation flow and coordination"""

    def __init__(self, ctx: JobContext, instructions: str):
        self.ctx = ctx
        self.instructions = instructions
        self.logger = setup_logger(__name__)
        self.session_manager = SessionManager(self)
        self.transcript_manager = TranscriptManager()
        self.participant: Optional[rtc.Participant] = None
        self.log_prefix = f"[{ctx.room.name}/AgentJob-{ctx.job.id[:7]}]"
        self.is_connected = False
        self.user_transcripts = []

    async def connect_to_room(self) -> None:
        """Connect agent to the RTC session"""
        self.logger.info(f"{self.log_prefix} Connecting to room...")

        try:
            await self.ctx.connect()
            self.is_connected = True

            if self.ctx.room.local_participant:
                participant_id = self.ctx.room.local_participant.identity
                self.log_prefix = f"[{self.ctx.room.name}/{participant_id}]"
                self.logger.info(f"{self.log_prefix} Connected successfully")

        except Exception as e:
            self.logger.error(f"{self.log_prefix} Failed to connect: {e}", exc_info=True)
            raise

    async def initialize(self) -> None:
        """Initialize the conversation manager"""
        self.logger.info(f"{self.log_prefix} Initializing conversation...")

        try:
            await self.session_manager.start_session(self.ctx, self.instructions)
            self.session_manager.setup_transcript_handler(self._on_transcript_received)
            self.logger.info(f"{self.log_prefix} Initialized successfully")

        except Exception as e:
            self.logger.error(f"{self.log_prefix} Failed to initialize: {e}", exc_info=True)
            raise

    def _on_transcript_received(self, transcript) -> None:
        """Handle received transcript"""
        text = transcript.transcript.strip()
        timestamp = datetime.now().isoformat()
        self.logger.debug(f"{self.log_prefix} User: {text}")
        self.user_transcripts.append({"text": text, "timestamp": timestamp})

        # Send transcript to frontend via data channel
        if self.ctx.room:
            import json
            data = json.dumps({
                "type": "transcript",
                "text": text,
                "role": "user",
                "timestamp": timestamp
            })
            asyncio.create_task(
                self.ctx.room.local_participant.publish_data(data.encode('utf-8'))
            )

    async def start_conversation(self) -> None:
        """Start the conversation with initial greeting"""
        self.logger.info(f"{self.log_prefix} Starting conversation...")

        try:
            await self.session_manager.generate_initial_reply()
            self.logger.info(f"{self.log_prefix} Greeting sent")

        except Exception as e:
            self.logger.error(f"{self.log_prefix} Error starting conversation: {e}", exc_info=True)

    async def run_conversation_loop(self) -> None:
        """Run the main conversation loop"""
        self.logger.info(f"{self.log_prefix} Running conversation loop...")

        try:
            await asyncio.Future()  # Keep alive until cancelled
        except asyncio.CancelledError:
            self.logger.info(f"{self.log_prefix} Conversation loop cancelled")
        finally:
            await self.cleanup()

    async def cleanup(self) -> None:
        """Cleanup resources and send transcript"""
        self.logger.info(f"{self.log_prefix} Cleaning up...")

        try:
            # Send transcript email if configured
            await self.send_transcript_email()

            await self.session_manager.cleanup_session()
            if self.ctx.room:
                await self.ctx.room.disconnect()
        except Exception as e:
            self.logger.error(f"{self.log_prefix} Cleanup error: {e}", exc_info=True)

    async def send_transcript_email(self, email: str = "faiz.corsair@gmail.com") -> bool:
        """Send transcript via email"""
        try:
            agent_messages = self.session_manager.get_session_history()

            if not self.user_transcripts and not agent_messages:
                self.logger.info(f"{self.log_prefix} No transcript to send")
                return False

            success = await self.transcript_manager.send_transcript_email(
                room_name=self.ctx.room.name,
                user_transcripts=self.user_transcripts,
                agent_messages=agent_messages,
                email=email
            )

            if success:
                self.logger.info(f"{self.log_prefix} Transcript sent to {email}")
            else:
                self.logger.warning(f"{self.log_prefix} Failed to send transcript")

            return success

        except Exception as e:
            self.logger.error(f"{self.log_prefix} Error sending transcript: {e}", exc_info=True)
            return False

    def get_conversation_stats(self) -> dict:
        """Get conversation statistics"""
        return {
            "room_name": self.ctx.room.name,
            "is_connected": self.is_connected,
            "session_active": self.session_manager.is_session_active(),
            "user_transcripts_count": len(self.user_transcripts),
        }
