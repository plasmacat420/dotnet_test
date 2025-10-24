# agent.py - Main entry point for the Hindi/English voice agent
import asyncio
import logging
import os

from livekit import agents
from livekit.agents import JobContext
from livekit.plugins import deepgram, openai, silero, google, groq, sarvam, elevenlabs

import modular.config as config
from modular.conversation_manager import ConversationManager
from modular.utils import setup_logger

logger = setup_logger(__name__)


async def entrypoint(ctx: JobContext):
    """Main entry point for the agent"""
    agent_log_prefix = f"[{ctx.room.name}/AgentJob-{ctx.job.id[:7]}]"
    logger.info(f"{agent_log_prefix} Agent job starting...")

    # Initialize conversation manager
    conversation_manager = ConversationManager(ctx, config.AGENT_INSTRUCTIONS)

    # Connect to the room
    await conversation_manager.connect_to_room()
    logger.info(f"{agent_log_prefix} Connected to room")

    # Wait for participant to join if none present
    if not ctx.room.remote_participants:
        logger.info(f"{agent_log_prefix} Waiting for participant...")

        loop = asyncio.get_running_loop()
        fut = loop.create_future()

        @ctx.room.on("participant_connected")
        def on_participant_connected(participant):
            if not fut.done():
                fut.set_result(participant)

        participant = await fut
    else:
        participant = list(ctx.room.remote_participants.values())[0]

    logger.info(f"{agent_log_prefix} Participant joined: {participant.identity}")
    conversation_manager.participant = participant

    # Setup shutdown callback
    async def _shutdown_cb():
        try:
            await asyncio.shield(conversation_manager.cleanup())
        except Exception as e:
            logger.warning(f"{agent_log_prefix} Cleanup error: {e}")

    ctx.add_shutdown_callback(_shutdown_cb)

    try:
        # Initialize conversation system
        await conversation_manager.initialize()
        logger.info(f"{agent_log_prefix} Conversation initialized")

        # Start conversation with greeting
        await conversation_manager.start_conversation()
        logger.info(f"{agent_log_prefix} Conversation started")

        # Log stats
        stats = conversation_manager.get_conversation_stats()
        logger.info(f"{agent_log_prefix} Stats: {stats}")

        # Run main conversation loop
        await conversation_manager.run_conversation_loop()

    except Exception as e:
        logger.error(f"{agent_log_prefix} Fatal error: {e}", exc_info=True)
        raise
    finally:
        try:
            await asyncio.shield(conversation_manager.cleanup())
        except Exception as e:
            logger.warning(f"{agent_log_prefix} Final cleanup error: {e}")
        logger.info(f"{agent_log_prefix} Agent job completed")


# async def request_fnc(req: agents.JobRequest):
#     """Accept job requests"""
#     await req.accept(
#         name=config.AGENT_NAME,
#         identity=config.AGENT_NAME,
#         attributes={"language": "hi-en"}
#     )

async def request_fnc(req: agents.JobRequest):
      """Accept ALL job requests unconditionally"""
      # Always accept jobs - no conditions
      # This ensures the agent wakes up for any room
      logger.info(f"Received job request for room: {req.room.name}")
      await req.accept()


def prewarm_fnc(proc: agents.JobProcess):
    """Preload STT/LLM/TTS/VAD components - optimized for speed"""
    logger.info("Prewarming agent components...")

    # Use cached models if available to speed up subsequent connections
    if not hasattr(prewarm_fnc, '_cached_models'):
        logger.info("First-time model initialization - this may take a few seconds...")

        # Sarvam STT for English
        proc.userdata["stt"] = sarvam.STT(language="en-IN")

        # Groq LLM (fast and free)
        proc.userdata["llm"] = groq.LLM(
            model="llama-3.3-70b-versatile"  # Fast, accurate, great for voice
        )

        # TTS - Simple Sarvam-only configuration (reliable for Hindi/English)
        logger.info("Initializing Eleven Labs TTS for Hindi/English voice")
        proc.userdata["tts"] = sarvam.TTS(
            target_language_code="hi-IN",
            speaker="anushka",  # Female Hindi/English voice
        )
        # proc.userdata["tts"] = elevenlabs.TTS(
        #     voice_id="cgSgspJ2msm6clMCkdW9",
        #     model="eleven_multilingual_v2"
           
        # )
        logger.info("TTS initialized:Eleven labs jessica voice)")


        # Silero VAD
        proc.userdata["vad"] = silero.VAD.load(
            min_speech_duration=0.2,
            min_silence_duration=0.3,
            prefix_padding_duration=0.1,
            activation_threshold=0.55,
            sample_rate=16000
        )

        # Cache models for reuse
        prewarm_fnc._cached_models = {
            "stt": proc.userdata["stt"],
            "llm": proc.userdata["llm"],
            "tts": proc.userdata["tts"],
            "vad": proc.userdata["vad"]
        }
        logger.info("Models cached for future use")
    else:
        # Reuse cached models for faster startup
        logger.info("Reusing cached models...")
        proc.userdata["stt"] = prewarm_fnc._cached_models["stt"]
        proc.userdata["llm"] = prewarm_fnc._cached_models["llm"]
        proc.userdata["tts"] = prewarm_fnc._cached_models["tts"]
        proc.userdata["vad"] = prewarm_fnc._cached_models["vad"]

    logger.info("Prewarm completed")


def configure_logging():
    """Configure logging"""
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    numeric_level = getattr(logging, log_level, logging.INFO)

    logging.basicConfig(
        level=numeric_level,
        format='%(asctime)s - %(levelname)s - [%(name)s:%(lineno)d] - %(message)s'
    )

    logger.setLevel(numeric_level)
    logger.info(f"Logging configured at {log_level}")


def validate_environment():
    """Validate required environment variables"""
    required_vars = [
        "LIVEKIT_URL",
        "LIVEKIT_API_KEY",
        "LIVEKIT_API_SECRET",
        "DEEPGRAM_API_KEY",
        "GROQ_API_KEY",
        "SARVAM_API_KEY",
        "ELEVENLABS_API_KEY"
    ]

    missing = [var for var in required_vars if not os.getenv(var)]

    if missing:
        logger.error(f"Missing environment variables: {missing}")
        raise ValueError(f"Missing required environment variables: {missing}")


if __name__ == "__main__":
    try:
        configure_logging()
        validate_environment()

        logger.info(f"Starting agent worker... Playground mode: {config.PLAYGROUND_MODE}")

        # Build WorkerOptions - only set agent_name if NOT in playground mode
        worker_options = {
            "entrypoint_fnc": entrypoint,
            "port": config.AGENT_PORT,
            "request_fnc": request_fnc,
            "prewarm_fnc": prewarm_fnc
        }

        # Only add agent_name if not in playground mode (enables automatic dispatch)
        if not config.PLAYGROUND_MODE:
            worker_options["agent_name"] = config.AGENT_NAME
            logger.info(f"Agent registered with name: {config.AGENT_NAME}")
        else:
            logger.info("Playground mode: Using automatic dispatch (no agent_name)")

        agents.cli.run_app(agents.WorkerOptions(**worker_options))

    except Exception as e:
        logger.error(f"Failed to start agent: {e}", exc_info=True)
        raise
