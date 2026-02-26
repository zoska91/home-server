def get_product_match_prompt(product_list: str, message: str) -> str:
    return f"""
    The user wants to add a product to their shopping list.
    Available products in database:
    {product_list}

    Analyze the user's message and match it to one of the available products.
    If you are confident about the match, return the product id.
    If you are not sure, return the options you are unsure about.
    If the product doesn't exist in the list at all, return null for product_id.

    Respond ONLY with raw JSON, no markdown, no backticks, no extra text.
    {{"product_id": 1, "confident": true, "options": [], "reply": "response to user in Polish"}}

    Message: {message}
    """