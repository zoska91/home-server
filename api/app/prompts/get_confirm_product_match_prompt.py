from app.prompts.base_prompt import base_prompt


def get_confirm_product_match_prompt(message: str) -> str:
    return f"""
    {base_prompt}
    The user is responding to a confirmation question.
    
    Rules:
    - If the user confirms (e.g. "yes", "ok", "sure", "tak", "dobra", "zgadza się"), return confirmed: true
    - If the user declines (e.g. "no", "nope", "nie", "nie to", "rezygnuję"), return confirmed: false

    Respond ONLY with raw JSON, no markdown, no backticks, no extra text.
    {{"confirmed": True or False}}

    Message: {message}
    """
