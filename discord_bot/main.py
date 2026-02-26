import discord
import os
from dotenv import load_dotenv
from api_client import register_user, send_message

load_dotenv()

intents = discord.Intents.default()
intents.message_content = True

client = discord.Client(intents=intents)

@client.event
async def on_ready():
    print(f"Login as  {client.user}")

@client.event
async def on_message(message):
    if message.author == client.user:
        return
    
    await register_user(message)

    result = await send_message(message.content)
    print(f"AI response: {result}")
    await message.reply(f"{result}")

client.run(os.getenv("DISCORD_TOKEN"))