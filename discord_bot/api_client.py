import aiohttp
import os

API_URL = os.getenv("API_URL", "http://api:8000")

async def register_user(message):
    async with aiohttp.ClientSession() as session:
        
        data = {
            "discord_id": str(message.author.id),
            "username": message.author.name,
            "display_name": message.author.display_name
        }

        async with session.post(f"{API_URL}/users/", json=data) as response:
            return await response.json()
        
async def send_message(text: str) -> str:
    async with aiohttp.ClientSession() as session:
        data = {
            "text": text,
        }
        async with session.post(f"{API_URL}/ai/message", json=data) as response:
            result = await response.json()
            print(f"API response: {result}")
            return result["reply"]