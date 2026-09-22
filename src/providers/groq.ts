import { config } from "../config";
import { ChatMessage, Provider, ProviderError, ProviderResult } from "./types";

export const groqProvider: Provider = {
  name: "groq",

  isConfigured() {
    return Boolean(config.groq.apiKey);
  },

  async chat(messages: ChatMessage[]): Promise<ProviderResult> {
    const start = Date.now();
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.groq.apiKey}`,
      },
      body: JSON.stringify({ model: config.groq.model, messages }),
    });

    if (!res.ok) {
      throw new ProviderError("groq", `${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as any;
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new ProviderError("groq", "empty response");

    return { provider: "groq", content, latencyMs: Date.now() - start };
  },
};
