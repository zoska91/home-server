def get_action_type_prompt(action_list, message):
    return f"""
    Analyze the user's message and determine the action.
    Available actions:
    {action_list}
    - none: message is not related to any action

    Respond ONLY with raw JSON, no markdown, no backticks, no extra text.
    {{
        "action": "one of the available actions or none",
    }}

    Message: {message}
    """