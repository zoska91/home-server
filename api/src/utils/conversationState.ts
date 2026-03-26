interface ConversationState {
  state: string;
  expires_at: number;
  [key: string]: unknown;
}

const conversationStates = new Map<string, ConversationState>();

export function setConversationStatus(discordId: string, state: Record<string, unknown>) {
  conversationStates.set(discordId, { ...state, state: state["state"] as string, expires_at: Date.now() + 300_000 });
}

export function getConversationStatus(discordId: string): ConversationState | null {
  const state = conversationStates.get(discordId);
  if (!state) return null;
  if (Date.now() > state.expires_at) {
    conversationStates.delete(discordId);
    return null;
  }
  return state;
}

export function clearConversationStatus(discordId: string) {
  conversationStates.delete(discordId);
}
