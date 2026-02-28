from app.prompts.base_prompt import base_prompt


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
