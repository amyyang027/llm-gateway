import { config } from "../config";
import { ChatMessage, Provider, ProviderError, ProviderResult } from "./types";

export const ollamaProvider: Provider = {
  name: "ollama",

  isConfigured() {
    // Always "configured" — it's a local default. If nothing is running at
    // OLLAMA_BASE_URL the request below will fail and the router moves on.
    return Boolean(config.ollama.baseUrl);
  },

  async chat(messages: ChatMessage[]): Promise<ProviderResult> {
    const start = Date.now();
    const res = await fetch(`${config.ollama.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.ollama.model, messages, stream: false }),
    });

    if (!res.ok) {
      throw new ProviderError("ollama", `${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as any;
    const content = data?.message?.content;
    if (!content) throw new ProviderError("ollama", "empty response");

    return { provider: "ollama", content, latencyMs: Date.now() - start };
  },
};
