# modular/session_manager.py
from typing import Optional
from livekit.agents import AgentSession, JobContext
from modular.utils import setup_logger


class SessionManager:
    """Manages the agent session and conversation state"""

    def __init__(self, conversation_manager):
        self.conversation_manager = conversation_manager
        self.logger = setup_logger(__name__)
        self.agent_session: Optional[AgentSession] = None
        self._transcript_handler = None

    async def start_session(self, ctx: JobContext, instructions: str):
        """Start the agent session with STT/LLM/TTS"""
        self.logger.info("Starting agent session...")

        # Get prewarmed components from userdata
        stt = ctx.proc.userdata.get("stt")
        llm = ctx.proc.userdata.get("llm")
        tts = ctx.proc.userdata.get("tts")
        vad = ctx.proc.userdata.get("vad")

        # Create agent session
        self.agent_session = AgentSession(
            stt=stt,
            llm=llm,
            tts=tts,
            vad=vad,
        )

        # Start the session with basic agent
        from livekit.agents import Agent, RoomOutputOptions
        agent = Agent(instructions=instructions)

        # Enable LiveKit track transcription (like reference implementation)
        await self.agent_session.start(
            room=ctx.room,
            agent=agent,
            room_output_options=RoomOutputOptions(
                transcription_enabled=True,  # Enable automatic track transcription
            )
        )

        self.logger.info("Agent session started with track transcription enabled")

    def setup_transcript_handler(self, callback):
        """Setup transcript event handler for backend logging"""
        if self.agent_session:
            self._transcript_handler = callback

            # User transcripts (for backend logging only)
            # Frontend gets transcripts via LiveKit track transcription
            @self.agent_session.on("user_input_transcribed")
            def on_transcript(transcript):
                if transcript.is_final:
                    callback(transcript)

            self.logger.info("Transcript handler configured (track transcription enabled)")

    def setup_metrics_collector(self):
        """Setup metrics collection (placeholder)"""
        pass

    async def generate_initial_reply(self):
        """Generate initial greeting"""
        if self.agent_session:
            # generate_reply returns a SpeechHandle, not a coroutine
            # The monitor task will detect the message and send it to frontend
            self.agent_session.generate_reply(
                instructions="Greet the user and offer your assistance."
            )
            self.logger.info("Greeting generation started")

    def is_session_active(self) -> bool:
        """Check if session is active"""
        return self.agent_session is not None

    def get_session_history(self) -> list:
        """Get conversation history from session"""
        if self.agent_session and hasattr(self.agent_session, 'history'):
            return self.agent_session.history.to_dict(exclude_timestamp=False).get("items", [])
        return []

    async def cleanup_session(self):
        """Cleanup session resources"""
        if self.agent_session:
            # Add any cleanup logic here
            self.logger.info("Session cleanup completed")
