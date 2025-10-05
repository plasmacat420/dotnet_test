# modular/transcript_manager.py
import json
from datetime import datetime
from typing import List, Dict
import aiohttp
from modular.utils import setup_logger


class TranscriptManager:
    """Handles transcript generation and sending"""

    def __init__(self, api_base_url: str = "http://localhost:5264"):
        self.logger = setup_logger(__name__)
        self.api_base_url = api_base_url

    def format_transcript(self, user_transcripts: List[Dict], agent_messages: List[Dict]) -> Dict:
        """Format transcripts from user and agent into a structured format"""

        # Combine and sort all messages by timestamp
        all_messages = []

        # Add user messages
        for ut in user_transcripts:
            all_messages.append({
                "role": "user",
                "text": ut.get("text", ""),
                "timestamp": ut.get("timestamp", datetime.now().isoformat())
            })

        # Add agent messages
        for am in agent_messages:
            # Extract text from agent message structure
            text = ""
            if isinstance(am.get("content"), str):
                text = am["content"]
            elif isinstance(am.get("content"), list):
                text = " ".join(str(c) for c in am["content"])

            all_messages.append({
                "role": "assistant",
                "text": text,
                "timestamp": am.get("created_at", datetime.now().isoformat())
            })

        # Sort by timestamp
        all_messages.sort(key=lambda x: x.get("timestamp", ""))

        return {
            "messages": all_messages,
            "metadata": {
                "total_messages": len(all_messages),
                "user_messages": len(user_transcripts),
                "agent_messages": len(agent_messages),
                "conversation_start": all_messages[0]["timestamp"] if all_messages else None,
                "conversation_end": all_messages[-1]["timestamp"] if all_messages else None
            }
        }

    async def send_transcript_email(self, room_name: str, user_transcripts: List[Dict],
                                    agent_messages: List[Dict], email: str) -> bool:
        """Send transcript via email through .NET API"""

        try:
            # Format transcript
            transcript_data = self.format_transcript(user_transcripts, agent_messages)

            # Prepare payload for email API
            payload = {
                "to": email,
                "roomName": room_name,
                "transcript": transcript_data
            }

            # Send to .NET API
            url = f"{self.api_base_url}/api/transcript/send"

            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, timeout=30) as response:
                    if response.status == 200:
                        self.logger.info(f"Transcript sent successfully to {email}")
                        return True
                    else:
                        error_text = await response.text()
                        self.logger.error(f"Failed to send transcript: {response.status} - {error_text}")
                        return False

        except Exception as e:
            self.logger.error(f"Error sending transcript email: {e}", exc_info=True)
            return False
