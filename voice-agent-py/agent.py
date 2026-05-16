import asyncio
import logging
import os
from datetime import datetime, timezone
import aiohttp

from livekit import agents
from livekit.agents import AgentSession, Agent, JobContext
from livekit.agents.voice.room_io import RoomOptions
from livekit.plugins import silero, groq, sarvam

import modular.config as config
from modular.multilingual_tts import MultilingualSarvamTTS
from modular.transcript_manager import TranscriptManager
from modular.utils import setup_logger

logger = setup_logger(__name__)


async def _warm_render(api_base_url: str):
    try:
        async with aiohttp.ClientSession() as s:
            await s.get(f"{api_base_url}/health", timeout=aiohttp.ClientTimeout(total=60))
        logger.info("Render warmed up")
    except Exception:
        pass


async def entrypoint(ctx: JobContext):
    await ctx.connect()

    transcript_manager = TranscriptManager(api_base_url=config.API_BASE_URL)
    user_transcripts = []

    asyncio.ensure_future(_warm_render(config.API_BASE_URL))

    session = AgentSession(
        stt=ctx.proc.userdata["stt"],
        llm=ctx.proc.userdata["llm"],
        tts=ctx.proc.userdata["tts"],
        vad=ctx.proc.userdata["vad"],
    )

    @session.on("user_input_transcribed")
    def on_transcript(ev):
        if ev.is_final:
            user_transcripts.append({
                "text": ev.transcript.strip(),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

    agent = Agent(instructions=config.AGENT_INSTRUCTIONS)
    await session.start(
        room=ctx.room,
        agent=agent,
        room_options=RoomOptions(text_output=True),
    )

    await session.generate_reply(instructions="Greet the user warmly and introduce yourself.")

    async def _on_shutdown():
        agent_messages = []
        try:
            if hasattr(session, "history"):
                agent_messages = session.history.to_dict().get("items", [])
        except Exception as e:
            logger.warning(f"Could not extract agent history: {e}")

        async def _send():
            if config.TRANSCRIPT_WEBHOOK_URL:
                await transcript_manager.send_to_webhook(
                    room_name=ctx.room.name,
                    user_transcripts=user_transcripts,
                    agent_messages=agent_messages,
                    webhook_url=config.TRANSCRIPT_WEBHOOK_URL,
                    groq_api_key=os.getenv("GROQ_API_KEY", ""),
                    transcript_secret=os.getenv("TRANSCRIPT_SECRET", ""),
                )
            else:
                await transcript_manager.send_transcript_email(
                    room_name=ctx.room.name,
                    user_transcripts=user_transcripts,
                    agent_messages=agent_messages,
                    email="prepreater1@gmail.com",
                )

        try:
            await asyncio.wait_for(_send(), timeout=28)
        except asyncio.TimeoutError:
            logger.warning("Shutdown: transcript send timed out after 28s")

    ctx.add_shutdown_callback(_on_shutdown)

    try:
        await asyncio.Future()
    except asyncio.CancelledError:
        pass


def prewarm_fnc(proc: agents.JobProcess):
    logger.info("Prewarming agent components...")
    proc.userdata["stt"] = sarvam.STT(language="", model="saarika:v2.5")
    proc.userdata["llm"] = groq.LLM(model="llama-3.3-70b-versatile")
    proc.userdata["tts"] = MultilingualSarvamTTS(
        speaker="anushka",
        default_language="hi-IN",
        model="bulbul:v2",
    )
    proc.userdata["vad"] = silero.VAD.load(
        min_speech_duration=0.2,
        min_silence_duration=0.3,
        prefix_padding_duration=0.1,
        activation_threshold=0.55,
        sample_rate=16000,
    )
    logger.info("Prewarm complete")


async def request_fnc(req: agents.JobRequest):
    logger.info(f"Job request for room: {req.room.name}")
    await req.accept()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - [%(name)s:%(lineno)d] - %(message)s",
    )

    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm_fnc,
            request_fnc=request_fnc,
            agent_name=config.AGENT_NAME,
            port=config.AGENT_PORT,
            num_idle_processes=1,
        )
    )
