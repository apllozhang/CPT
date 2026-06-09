import { z } from "zod";
import { router, publicProcedure } from "../trpc-base.js";
import * as svc from "./service.js";
import { crawlCompetitor } from "../crawl/orchestrator.js";

export const crawlLogRouter = router({
  list: publicProcedure
    .input(
      z.object({
        competitorId: z.number().optional(),
        status: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
    )
    .query(({ input }) =>
      svc.listLogs({
        ...input,
        from: input.from ? new Date(input.from) : undefined,
        to: input.to ? new Date(input.to) : undefined,
      })
    ),

  getDetail: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => svc.getLogDetail(input.id)),

  trigger: publicProcedure
    .input(z.object({ competitorId: z.number() }))
    .mutation(async ({ input }) => {
      return crawlCompetitor(input.competitorId, "manual");
    }),
});
