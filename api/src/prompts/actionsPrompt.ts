export function getActionTypePrompt(actionList: string, message: string): string {
  return `Analyze the user's message and determine the action.
Available actions:
${actionList}
- none: message is not related to any action

Respond ONLY with raw JSON, no markdown, no backticks, no extra text.
{"action": "one of the available actions or none"}

Message: ${message}`;
}
