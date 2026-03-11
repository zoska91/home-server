from app.prompts.base_prompt import base_prompt


def get_confirm_product_match_prompt(message: str) -> str:
    return f"""
    {base_prompt}
    The user is responding to a confirmation question.
    
    Rules:
    - Return decision = "confirm" only when the user clearly confirms adding the previously suggested product.
    - Return decision = "decline" when the user clearly rejects/cancels adding the previously suggested product.
    - Return decision = "new_product" when user provides a different product (even with words like "tak"), e.g. "tak, dodaj indyka".
    - You MUST always choose one decision: "confirm", "decline" or "new_product".
    - If decision is "new_product", set product_text to the user's intended product phrase (corrected, concise, Polish). Otherwise product_text = null.

    Respond ONLY with raw JSON, no markdown, no backticks, no extra text.
    {{"decision": "confirm" or "decline" or "new_product", "product_text": "string or null"}}

    Message: {message}
    """


def get_delete_product_prompt(products_list, message):
    return f"""
    {base_prompt}
    The user wants to remove a product from the shopping list.
    Available products on the shopping list:
    {products_list}

    Match the user's message to one of the available products. If you don't find match return null.
    
    Respond ONLY with raw JSON, no markdown, no backticks, no extra text.
    {{"product_id": 1 or null}}

    Message: {message}
    """


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
    - Product must be always in Polish language, if user writes in another language, translate it to Polish

    Respond ONLY with raw JSON, no markdown, no backticks, no extra text.
    {{"status": "valid" or "invalid" or "cancelled", "name": "corrected product name or null"}}

    Message: {message}
    """


from app.prompts.base_prompt import base_prompt


def get_product_match_prompt(product_list: str, message: str) -> str:
    return f"""
    {base_prompt}
    The user wants to add a product to their shopping list.
    Available products in database:
    {product_list}

    Match the user's message to one of the available products.
    
    Rules:
    - If you find a clear match, return its id, set confident to true, status to "found"
    - If you find a possible match but are not sure, return its id, status to "confirm"
    - If no matching product exists in the list, set product_id to null, status to "not_found"

    Respond ONLY with raw JSON, no markdown, no backticks, no extra text.
    {{"product_id": 1 or null, "status": "found" or "confirm" or "not_found"}}

    Message: {message}
    """
