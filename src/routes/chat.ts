import { Router } from "express";
import { routeChat } from "../router";
import { ChatMessage } from "../providers/types";

export const chatRouter = Router();

chatRouter.post("/v1/chat", async (req, res) => {
  const messages = req.body?.messages as ChatMessage[] | undefined;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "body must include a non-empty `messages` array" });
  }

  try {
    const result = await routeChat(messages);
    res.json({
      content: result.content,
      provider: result.provider,
      cacheHit: result.cacheHit,
      latencyMs: result.latencyMs,
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
