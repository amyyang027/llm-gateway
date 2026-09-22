import { Router } from "express";
import { getMetrics } from "../db";

export const metricsRouter = Router();

metricsRouter.get("/metrics", (_req, res) => {
  res.json(getMetrics());
});
