import { Injectable } from "@nestjs/common";

@Injectable()
export class ConversationService {
  private readonly states = new Map<string, Record<string, unknown> & { expires_at: number }>();

  set(discordId: string, state: Record<string, unknown>) {
    this.states.set(discordId, { ...state, expires_at: Date.now() + 300_000 });
  }

  get(discordId: string): Record<string, unknown> | null {
    const state = this.states.get(discordId);
    if (!state) return null;
    if (Date.now() > state["expires_at"]!) {
      this.states.delete(discordId);
      return null;
    }
    return state;
  }

  clear(discordId: string) {
    this.states.delete(discordId);
  }
}
