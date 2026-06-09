import "dotenv/config";
import express from "express";
import cors from "cors";
import { appRouter } from "./trpc.js";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { initScheduler } from "./scheduler.js";

const PORT = Number(process.env.PORT) || 3001;

const app = express();

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// tRPC
app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: () => ({}),
  })
);

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  try {
    await initScheduler();
  } catch (err) {
    console.error("[scheduler] Init failed:", err);
  }
});
