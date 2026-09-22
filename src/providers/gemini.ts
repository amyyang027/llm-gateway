import { config } from "../config";
import { ChatMessage, Provider, ProviderError, ProviderResult } from "./types";

export const geminiProvider: Provider = {
  name: "gemini",

  isConfigured() {
    return Boolean(config.gemini.apiKey);
  },

  async chat(messages: ChatMessage[]): Promise<ProviderResult> {
    const start = Date.now();

    const systemText = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");

    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
      }),
    });

    if (!res.ok) {
      throw new ProviderError("gemini", `${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as any;
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new ProviderError("gemini", "empty response");

    return { provider: "gemini", content, latencyMs: Date.now() - start };
  },
};
