import { config } from "../config";
import { groqProvider } from "./groq";
import { geminiProvider } from "./gemini";
import { ollamaProvider } from "./ollama";
import { Provider } from "./types";

const registry: Record<string, Provider> = {
  groq: groqProvider,
  gemini: geminiProvider,
  ollama: ollamaProvider,
};

/** Providers in the configured fallback order, skipping ones without credentials. */
export function orderedProviders(): Provider[] {
  return config.providerOrder
    .map((name) => registry[name])
    .filter((p): p is Provider => Boolean(p));
}

export { registry };
