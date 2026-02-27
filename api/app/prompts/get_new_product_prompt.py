from app.prompts.base_prompt import base_prompt


def get_new_product_prompt(message: str) -> str:
    return f"""
    {base_prompt}
    The user wants to add a new product to the shopping list database.
    
    Rules:
    - If the user wants to cancel or resign (e.g. "cancel", "nevermind", "I changed my mind"), set status to "cancelled"
    - Check if this is a real product that can be bought in a store
    - If it is a valid product, return the corrected name and set status to "valid"
    - If it is NOT a valid store product (e.g. random word, sentence, inappropriate content), set status to "invalid"
    - Fix any typos in the product name

    Respond ONLY with raw JSON, no markdown, no backticks, no extra text.
    {{"status": "valid" or "invalid" or "cancelled", "name": "corrected product name or null"}}

    Message: {message}
    """
