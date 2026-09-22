export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderResult {
  provider: string;
  content: string;
  latencyMs: number;
}

export interface Provider {
  name: string;
  isConfigured(): boolean;
  chat(messages: ChatMessage[]): Promise<ProviderResult>;
}

export class ProviderError extends Error {
  constructor(public provider: string, message: string) {
    super(`[${provider}] ${message}`);
  }
}
