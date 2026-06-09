import { z } from "zod";
import { router, publicProcedure } from "../trpc-base.js";
import * as svc from "./service.js";

export const competitorRouter = router({
  list: publicProcedure
    .input(
      z.object({
        groupId: z.number().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(({ input }) => svc.listCompetitors(input)),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => svc.getCompetitor(input.id)),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        url: z.string().url(),
        groupId: z.number().optional(),
        scheduleCron: z.string().optional(),
        scheduleEnabled: z.boolean().optional(),
      })
    )
    .mutation(({ input }) => svc.createCompetitor(input)),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        url: z.string().url().optional(),
        groupId: z.number().optional(),
        scheduleCron: z.string().optional(),
        scheduleEnabled: z.boolean().optional(),
      })
    )
    .mutation(({ input }) => svc.updateCompetitor(input)),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => svc.deleteCompetitor(input.id)),

  toggleStatus: publicProcedure
    .input(z.object({ id: z.number(), status: z.enum(["active", "paused", "error"]) }))
    .mutation(({ input }) => svc.toggleStatus(input.id, input.status)),
});
