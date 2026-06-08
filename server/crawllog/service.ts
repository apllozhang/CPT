import { db } from "../db/index.js";
import { crawlLogs } from "../db/schema.js";
import { eq, desc, and, gte, lte } from "drizzle-orm";

export interface ListLogsInput {
  competitorId?: number;
  status?: string;
  from?: Date;
  to?: Date;
}

export async function listLogs(input: ListLogsInput) {
  const all = await db
    .select()
    .from(crawlLogs)
    .orderBy(desc(crawlLogs.startedAt));

  return all.filter((l) => {
    if (input.competitorId && l.competitorId !== input.competitorId) return false;
    if (input.status && l.status !== input.status) return false;
    if (input.from && new Date(l.startedAt) < input.from) return false;
    if (input.to && new Date(l.startedAt) > input.to) return false;
    return true;
  });
}

export async function getLogDetail(id: number) {
  const [log] = await db.select().from(crawlLogs).where(eq(crawlLogs.id, id));
  if (!log) return null;

  // Load snapshots for this crawl log
  const { snapshots, products } = await import("../db/schema.js");
  const snaps = await db
    .select({
      snapshotId: snapshots.id,
      productId: snapshots.productId,
      params: snapshots.params,
      model: products.model,
      category: products.category,
    })
    .from(snapshots)
    .leftJoin(products, eq(snapshots.productId, products.id))
    .where(eq(snapshots.crawlLogId, id));

  return { ...log, items: snaps };
}
