# modular/config.py
import os
from dotenv import load_dotenv

load_dotenv("../.env.local")

# Agent Configuration
AGENT_NAME = "hindi-voice-agent"
AGENT_PORT = 8765
PLAYGROUND_MODE = True  # Set to False for production/SIP mode

# LiveKit Configuration
LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

***REMOVED*** Configuration
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

***REMOVED*** Configuration
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")  # Fallback for standard OpenAI

# Agent Instructions
AGENT_INSTRUCTIONS = """greet with a hi and ask for name"""

# Language Configuration
PRIMARY_LANGUAGE = "hi"  # Hindi
SECONDARY_LANGUAGE = "en"  # English
TERTIARY_LANGUAGE = "mr"  # Marathi
