import { db } from "../db/index.js";
import { products, snapshots } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { hashParams } from "./snapshot-diff.js";

/**
 * Check if a product has changed since last crawl.
 * Returns true if: new product OR params hash changed.
 */
export async function hasProductChanged(
  competitorId: number,
  model: string,
  newParams: Record<string, string>
): Promise<{ changed: boolean; productId: number | null }> {
  const [existing] = await db
    .select()
    .from(products)
    .where(and(eq(products.competitorId, competitorId), eq(products.model, model)));

  if (!existing) return { changed: true, productId: null };

  // Get latest snapshot
  const [latestSnap] = await db
    .select()
    .from(snapshots)
    .where(eq(snapshots.productId, existing.id))
    .orderBy(desc(snapshots.createdAt))
    .limit(1);

  if (!latestSnap) return { changed: true, productId: existing.id };

  const oldHash = latestSnap.snapshotHash;
  const newHash = hashParams(newParams);

  return {
    changed: oldHash !== newHash,
    productId: existing.id,
  };
}

/**
 * Filter products to only those that have changed.
 * Reduces unnecessary DB writes and API calls.
 */
export async function filterChangedProducts(
  competitorId: number,
  items: Array<{ model: string; params: Record<string, string> }>
): Promise<Array<{ model: string; params: Record<string, string>; isNew: boolean; productId: number | null }>> {
  const results = [];

  for (const item of items) {
    const { changed, productId } = await hasProductChanged(competitorId, item.model, item.params);
    if (changed) {
      results.push({
        ...item,
        isNew: productId === null,
        productId,
      });
    }
  }

  return results;
}

/**
 * Get crawl stats for a competitor.
 */
export async function getCrawlStats(competitorId: number): Promise<{
  totalProducts: number;
  lastCrawlTime: Date | null;
  lastCrawlChanges: number;
}> {
  const allProducts = await db
    .select()
    .from(products)
    .where(eq(products.competitorId, competitorId));

  const { crawlLogs } = await import("../db/schema.js");
  const [lastLog] = await db
    .select()
    .from(crawlLogs)
    .where(eq(crawlLogs.competitorId, competitorId))
    .orderBy(desc(crawlLogs.startedAt))
    .limit(1);

  return {
    totalProducts: allProducts.length,
    lastCrawlTime: lastLog?.startedAt ?? null,
    lastCrawlChanges: lastLog?.productsChanged ?? 0,
  };
}
