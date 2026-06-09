import { z } from "zod";
import { router, publicProcedure } from "../trpc-base.js";
import { db } from "../db/index.js";
import { snapshots } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { diffSnapshots } from "../lib/snapshot-diff.js";

export const snapshotRouter = router({
  listByProduct: publicProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(snapshots)
        .where(eq(snapshots.productId, input.productId))
        .orderBy(desc(snapshots.createdAt));
    }),

  diff: publicProcedure
    .input(z.object({ snapshotIdA: z.number(), snapshotIdB: z.number() }))
    .query(async ({ input }) => {
      const [a] = await db.select().from(snapshots).where(eq(snapshots.id, input.snapshotIdA));
      const [b] = await db.select().from(snapshots).where(eq(snapshots.id, input.snapshotIdB));
      if (!a || !b) throw new Error("Snapshot not found");
      return {
        a: { id: a.id, createdAt: a.createdAt, params: a.params },
        b: { id: b.id, createdAt: b.createdAt, params: b.params },
        diff: diffSnapshots(
          a.params as Record<string, string>,
          b.params as Record<string, string>
        ),
      };
    }),
});
