export function getFeedCatPrompt(message: string, optionsList: string): string {
  return `The user wants to feed the cat. Based on the message, determine the portion size.

Available options in database (format: name - duration_ms):
${optionsList}

Rules:
- Match the user's intent to the most appropriate 'name' from the list.
- If the user says "dużo", "pełna miska", "jest bardzo głodny" -> match to 'lg'.
- If the user says "trochę", "mało", "przekąska", "skromnie" -> match to 'sm'.
- If the user just says "nakarm go", "daj jeść" without specifics -> match to 'md' (or default).
- If the message is completely unrelated to feeding or you cannot find a match, return null.

Respond ONLY with raw JSON, no markdown, no backticks, no extra text.
{"config_name": "name_from_list" or null}

Message: ${message}`;
}

export function getTurnOnLightPrompt(message: string, optionsList: string): string {
  return `The user wants to turn on the light on the feeder. Determine the duration.

Available options in database (format: name - duration_sec):
${optionsList}

Rules:
- Match the user's intent to the most appropriate 'name' from the list.
- If the user implies a long time ("na całą noc", "długo") -> match to 'lg' or 'none'.
- If the user implies a short time ("na chwilę", "tylko sprawdzę") -> match to 'dm'.
- If no duration is specified, return 'sm' (or default).
- If the message is unrelated to lighting, return null.

Respond ONLY with raw JSON, no markdown, no backticks, no extra text.
{"config_name": "name_from_list" or null}

Message: ${message}`;
}
