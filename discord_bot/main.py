import discord
import os
from dotenv import load_dotenv
from api_client import register_user, send_message

load_dotenv()

intents = discord.Intents.default()
intents.message_content = True

client = discord.Client(intents=intents)
token = os.getenv("DISCORD_TOKEN")
if not token:
    raise RuntimeError("DISCORD_TOKEN is not set")


@client.event
async def on_ready():
    print(f"Login as  {client.user}")


@client.event
async def on_message(message):
    if message.author == client.user:
        return

    await register_user(message)

    result = await send_message(message.content, str(message.author.id))
    print(f"AI response: {result}")
    await message.reply(f"{result}")


client.run(token)
