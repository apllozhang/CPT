import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";
import * as svc from "./service.js";

const extractionRulesSchema = z.object({
  selectors: z.record(z.string()).optional(),
  aiPrompt: z.string().optional(),
  extractMode: z.enum(["template", "ai", "hybrid"]),
});

export const templateRouter = router({
  getByCompetitor: publicProcedure
    .input(z.object({ competitorId: z.number() }))
    .query(({ input }) => svc.getByCompetitor(input.competitorId)),

  update: publicProcedure
    .input(z.object({ competitorId: z.number(), rules: extractionRulesSchema }))
    .mutation(({ input }) => svc.update(input.competitorId, input.rules)),

  markAiGenerated: publicProcedure
    .input(z.object({ competitorId: z.number(), rules: extractionRulesSchema }))
    .mutation(({ input }) => svc.markAiGenerated(input.competitorId, input.rules)),
});
