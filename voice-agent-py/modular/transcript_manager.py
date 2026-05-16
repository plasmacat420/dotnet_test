# modular/transcript_manager.py
import asyncio
import json
from datetime import datetime, timezone
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
            content = am.get("content", "")
            if isinstance(content, str):
                text = content
            elif isinstance(content, list):
                parts = []
                for item in content:
                    if isinstance(item, str):
                        parts.append(item)
                    elif isinstance(item, dict):
                        # livekit-agents SDK serializes as {"type": "text", "text": "..."}
                        parts.append(item.get("text", "") or str(item))
                text = " ".join(p for p in parts if p)
            else:
                text = str(content) if content else ""

            if not text.strip():
                continue  # skip empty messages — would fail [Required] validation

            all_messages.append({
                "role": "assistant",
                "text": text.strip(),
                "timestamp": am.get("created_at", datetime.now(timezone.utc).isoformat())
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

    async def _generate_summary(self, messages: List[Dict], groq_api_key: str) -> str:
        """Generate an AI summary of the conversation using Groq."""
        if not messages or not groq_api_key:
            return ""
        convo = "\n".join(
            f"{'Visitor' if m['role'] == 'user' else 'Anushka'}: {m['text']}"
            for m in messages[:50]
        )
        prompt = (
            "Summarize this visitor conversation with Anushka, the AI voice assistant for Prepreater "
            "(a software development studio based in Pune, India).\n\n"
            f"Conversation:\n{convo}\n\n"
            "Write a concise summary (3–5 sentences) covering:\n"
            "1. Who the visitor is (name / email if mentioned)\n"
            "2. What they want to build or need help with\n"
            "3. Key requirements or constraints they mentioned\n"
            "4. Suggested next step for the Prepreater team\n\n"
            "Be direct. If key info is missing, note that briefly."
        )
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_api_key}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 350,
                        "temperature": 0.3,
                    },
                    timeout=aiohttp.ClientTimeout(total=8),
                ) as resp:
                    data = await resp.json()
                    return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            self.logger.error(f"Summary generation failed: {e}")
            return ""

    async def send_to_webhook(self, room_name: str, user_transcripts: List[Dict],
                              agent_messages: List[Dict], webhook_url: str,
                              groq_api_key: str = "", transcript_secret: str = "") -> bool:
        """Generate a summary and POST transcript to a Vercel webhook (uses Resend to email)."""
        try:
            transcript_data = self.format_transcript(user_transcripts, agent_messages)
            messages = transcript_data.get("messages", [])
            summary = await self._generate_summary(messages, groq_api_key)
            payload = {"roomName": room_name, "summary": summary, "messages": messages}
            url = f"{webhook_url.rstrip('/')}/api/transcript"
            headers = {"Content-Type": "application/json"}
            if transcript_secret:
                headers["X-Transcript-Secret"] = transcript_secret
            timeout = aiohttp.ClientTimeout(total=15)
            for attempt in range(2):
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.post(url, json=payload, headers=headers, timeout=timeout) as resp:
                            if resp.status == 200:
                                self.logger.info(f"Transcript webhook sent (attempt {attempt + 1})")
                                return True
                            error_text = await resp.text()
                            self.logger.error(f"Webhook POST failed ({resp.status}): {error_text}")
                except asyncio.TimeoutError:
                    self.logger.warning(f"Webhook POST timed out (attempt {attempt + 1}/2)")
                except Exception as e:
                    self.logger.warning(f"Webhook POST error (attempt {attempt + 1}/2): {e}")
                if attempt < 1:
                    await asyncio.sleep(2)
            self.logger.error("All webhook attempts failed")
            return False
        except Exception as e:
            self.logger.error(f"send_to_webhook error: {e}", exc_info=True)
            return False

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
            # 12s timeout: Render should be warm (pinged at call start)
            timeout = aiohttp.ClientTimeout(total=12)

            for attempt in range(2):
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.post(url, json=payload, timeout=timeout) as response:
                            if response.status == 200:
                                self.logger.info(f"Transcript sent to {email} (attempt {attempt + 1})")
                                return True
                            error_text = await response.text()
                            self.logger.error(f"Transcript POST failed ({response.status}): {error_text}")
                except asyncio.TimeoutError:
                    self.logger.warning(f"Transcript POST timed out (attempt {attempt + 1}/2)")
                except Exception as e:
                    self.logger.warning(f"Transcript POST error (attempt {attempt + 1}/2): {e}")

                if attempt < 1:
                    self.logger.info("Retrying transcript in 2s...")
                    await asyncio.sleep(2)

            self.logger.error("All transcript attempts failed")
            return False

        except Exception as e:
            self.logger.error(f"Error sending transcript email: {e}", exc_info=True)
            return False
