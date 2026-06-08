import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";

const t = initTRPC.create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Import sub-routers
import { competitorRouter } from "./competitor/router.js";
import { groupRouter } from "./group/router.js";
import { templateRouter } from "./template/router.js";
import { productRouter } from "./product/router.js";
import { snapshotRouter } from "./snapshot/router.js";
import { crawlLogRouter } from "./crawllog/router.js";

export const appRouter = router({
  ping: publicProcedure.input(z.object({ message: z.string() })).query(({ input }) => ({
    pong: input.message,
    timestamp: new Date().toISOString(),
  })),

  competitor: competitorRouter,
  group: groupRouter,
  template: templateRouter,
  product: productRouter,
  snapshot: snapshotRouter,
  crawlLog: crawlLogRouter,
});

export type AppRouter = typeof appRouter;
