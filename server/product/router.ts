import { z } from "zod";
import { router, publicProcedure } from "../trpc-base.js";
import * as svc from "./service.js";

export const productRouter = router({
  list: publicProcedure
    .input(
      z.object({
        competitorId: z.number().optional(),
        groupId: z.number().optional(),
        category: z.string().optional(),
        search: z.string().optional(),
        sortBy: z.string().optional(),
        sortDir: z.enum(["asc", "desc"]).optional(),
      })
    )
    .query(({ input }) => svc.listProducts(input)),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => svc.getProduct(input.id)),

  getWithHistory: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => svc.getProductWithHistory(input.id)),
});
