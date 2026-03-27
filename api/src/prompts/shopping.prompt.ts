export function getProductMatchPrompt(productList: string, message: string): string {
  return `The user wants to add a product to their shopping list.
Available products in database:
${productList}

Rules:
- If you find a clear match, return its id, status to "found"
- If you find a possible match but are not sure, return its id, status to "confirm"
- If no matching product exists in the list, set product_id to null, status to "not_found"

Respond ONLY with raw JSON, no markdown, no backticks, no extra text.
{"product_id": 1 or null, "status": "found" or "confirm" or "not_found"}

Message: ${message}`;
}

export function getConfirmProductMatchPrompt(message: string): string {
  return `The user is responding to a confirmation question.

Rules:
- Return decision = "confirm" only when the user clearly confirms adding the previously suggested product.
- Return decision = "decline" when the user clearly rejects/cancels.
- Return decision = "new_product" when user provides a different product, e.g. "tak, dodaj indyka".
- You MUST always choose one: "confirm", "decline" or "new_product".
- If decision is "new_product", set product_text to the user's intended product phrase (Polish). Otherwise product_text = null.

Respond ONLY with raw JSON, no markdown, no backticks, no extra text.
{"decision": "confirm" or "decline" or "new_product", "product_text": "string or null"}

Message: ${message}`;
}

export function getNewProductPrompt(message: string): string {
  return `The user wants to add a new product to the shopping list database.

Rules:
- If the user wants to cancel (e.g. "cancel", "nevermind"), set status to "cancelled"
- If it is a valid store product, return the corrected name and set status to "valid"
- If it is NOT a valid store product, set status to "invalid"
- Fix typos. Product name must be in Polish.

Respond ONLY with raw JSON, no markdown, no backticks, no extra text.
{"status": "valid" or "invalid" or "cancelled", "name": "corrected product name or null"}

Message: ${message}`;
}

export function getDeleteProductPrompt(productsList: string, message: string): string {
  return `The user wants to remove a product from the shopping list.
Available products:
${productsList}

Match the user's message to one of the products. If no match, return null.

Respond ONLY with raw JSON, no markdown, no backticks, no extra text.
{"product_id": 1 or null}

Message: ${message}`;
}
