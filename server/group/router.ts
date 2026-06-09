import { z } from "zod";
import { router, publicProcedure } from "../trpc-base.js";
import * as svc from "./service.js";

export const groupRouter = router({
  list: publicProcedure.query(() => svc.listGroups()),

  create: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(({ input }) => svc.createGroup(input)),

  update: publicProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1) }))
    .mutation(({ input }) => svc.updateGroup(input.id, input.name)),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => svc.deleteGroup(input.id)),

  addItems: publicProcedure
    .input(z.object({ groupId: z.number(), competitorIds: z.array(z.number()) }))
    .mutation(({ input }) => svc.addItems(input.groupId, input.competitorIds)),

  removeItems: publicProcedure
    .input(z.object({ competitorIds: z.array(z.number()) }))
    .mutation(({ input }) => svc.removeItems(input.competitorIds)),

  getWithCount: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => svc.getGroupWithCount(input.id)),
});
