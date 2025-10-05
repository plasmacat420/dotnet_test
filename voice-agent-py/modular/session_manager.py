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

        # Start the session with room and agent
        from livekit.agents import Agent
        agent = Agent(instructions=instructions)

        await self.agent_session.start(
            room=ctx.room,
            agent=agent
        )

        self.logger.info("Agent session started successfully")

    def setup_transcript_handler(self, callback):
        """Setup transcript event handler"""
        if self.agent_session:
            self._transcript_handler = callback

            @self.agent_session.on("user_input_transcribed")
            def on_transcript(transcript):
                if transcript.is_final:
                    callback(transcript)

            # Capture agent speech as soon as it starts
            @self.agent_session.on("agent_speech_committed")
            def on_agent_speech(speech):
                self.logger.info(f"Agent speech committed: {speech.text[:100]}")
                self._send_agent_message_to_frontend(speech.text)

            self.logger.info("Transcript handler configured")

    def _send_agent_message_to_frontend(self, text: str):
        """Send agent message to frontend immediately"""
        import json
        from datetime import datetime
        import asyncio

        if not text:
            return

        self.logger.info(f"Sending agent speech to frontend: {text[:100]}")
        data = json.dumps({
            "type": "transcript",
            "text": text,
            "role": "assistant",
            "timestamp": datetime.now().isoformat()
        })

        if self.conversation_manager.ctx.room:
            asyncio.create_task(
                self.conversation_manager.ctx.room.local_participant.publish_data(data.encode('utf-8'))
            )
            self.logger.debug("Agent speech data published")

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
