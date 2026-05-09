# modular/transcript_manager.py
import asyncio
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

        # Sort by timestamp (handle both ISO strings and numeric timestamps)
        def get_sort_key(msg):
            ts = msg.get("timestamp", "")
            if isinstance(ts, (int, float)):
                return ts
            elif isinstance(ts, str):
                try:
                    from dateutil import parser
                    return parser.parse(ts).timestamp()
                except:
                    return 0
            return 0

        all_messages.sort(key=get_sort_key)

        # Convert all timestamps to ISO strings for API compatibility
        for msg in all_messages:
            ts = msg.get("timestamp", "")
            if isinstance(ts, (int, float)):
                msg["timestamp"] = datetime.fromtimestamp(ts).isoformat()
            else:
                msg["timestamp"] = str(ts)

        return {
            "messages": all_messages,
            "metadata": {
                "total_messages": len(all_messages),
                "user_messages": len(user_transcripts),
                "agent_messages": len(agent_messages),
                "conversation_start": str(all_messages[0]["timestamp"]) if all_messages else None,
                "conversation_end": str(all_messages[-1]["timestamp"]) if all_messages else None
            }
        }

    async def send_transcript_email(self, room_name: str, user_transcripts: List[Dict],
                                    agent_messages: List[Dict], email: str) -> bool:
        """Send transcript via email through .NET API, with retries for Render cold-start."""

        try:
            transcript_data = self.format_transcript(user_transcripts, agent_messages)
            payload = {
                "to": email,
                "roomName": room_name,
                "transcript": transcript_data
            }
            url = f"{self.api_base_url}/api/transcript/send"
            # 90s timeout: Render free-tier cold-start takes up to ~60s
            timeout = aiohttp.ClientTimeout(total=90)

            for attempt in range(3):
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.post(url, json=payload, timeout=timeout) as response:
                            if response.status == 200:
                                self.logger.info(f"Transcript sent to {email} (attempt {attempt + 1})")
                                return True
                            error_text = await response.text()
                            self.logger.error(f"Transcript POST failed ({response.status}): {error_text}")
                except asyncio.TimeoutError:
                    self.logger.warning(f"Transcript POST timed out (attempt {attempt + 1}/3)")
                except Exception as e:
                    self.logger.warning(f"Transcript POST error (attempt {attempt + 1}/3): {e}")

                if attempt < 2:
                    wait = (attempt + 1) * 10  # 10s, 20s between retries
                    self.logger.info(f"Retrying transcript in {wait}s...")
                    await asyncio.sleep(wait)

            self.logger.error("All 3 transcript attempts failed")
            return False

        except Exception as e:
            self.logger.error(f"Error sending transcript email: {e}", exc_info=True)
            return False
