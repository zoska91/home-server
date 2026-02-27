import time

conversation_states = {}


def set_state(discord_id: str, state: dict):
    conversation_states[discord_id] = {**state, "expires_at": time.time() + 300}


def get_state(discord_id: str) -> dict | None:
    state = conversation_states.get(discord_id)
    if not state:
        return None
    if time.time() > state["expires_at"]:
        del conversation_states[discord_id]
        return None
    return state


def clear_state(discord_id: str):
    conversation_states.pop(discord_id, None)
