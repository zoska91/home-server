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
