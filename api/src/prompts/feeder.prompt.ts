export function getFeedCatPrompt(message: string, optionsList: string): string {
  return `The user wants to feed the cat. Determine the portion size.

Available options (format: name - duration_ms):
${optionsList}

Rules:
- "dużo", "pełna miska", "głodny" -> 'lg'
- "trochę", "mało", "przekąska" -> 'sm'
- "nakarm go", "daj jeść" without specifics -> 'md' (default)
- If unrelated or no match, return null.

Respond ONLY with raw JSON, no markdown, no backticks, no extra text.
{"config_name": "name_from_list" or null}

Message: ${message}`;
}

export function getTurnOnLightPrompt(message: string, optionsList: string): string {
  return `The user wants to turn on the feeder light. Determine the duration.

Available options (format: name - duration_sec):
${optionsList}

Rules:
- "na całą noc", "długo" -> 'lg' or 'none'
- "na chwilę", "tylko sprawdzę" -> 'dm'
- No duration specified -> 'sm' (default)
- If unrelated, return null.

Respond ONLY with raw JSON, no markdown, no backticks, no extra text.
{"config_name": "name_from_list" or null}

Message: ${message}`;
}
