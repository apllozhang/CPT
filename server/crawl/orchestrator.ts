import { db } from "../db/index.js";
import {
  competitors,
  products,
  snapshots,
  crawlLogs,
  templates,
  type ExtractionRules,
} from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { fetchPage } from "../lib/scraper.js";
import { extractProducts, extractWithPrompt } from "../lib/ai-extractor.js";
import { hashParams, diffSnapshots } from "../lib/snapshot-diff.js";

export interface CrawlResult {
  total: number;
  new: number;
  changed: number;
  unchanged: number;
  failed: number;
  errors: string[];
  durationMs: number;
}

/**
 * Core orchestrator: scrape → extract → store → diff.
 * Per AC-9: partial failure does not discard successful data.
 */
export async function crawlCompetitor(
  competitorId: number,
  triggerType: "manual" | "scheduled"
): Promise<CrawlResult> {
  const start = Date.now();
  const errors: string[] = [];

  // 1. Load competitor
  const [comp] = await db.select().from(competitors).where(eq(competitors.id, competitorId));
  if (!comp) throw new Error(`Competitor ${competitorId} not found`);

  // 2. Load template
  const [tmpl] = await db.select().from(templates).where(eq(templates.competitorId, competitorId));
  const rules: ExtractionRules = tmpl?.extractionRules ?? { extractMode: "ai" };

  // 3. Create crawl log
  const [logInsert] = await db.insert(crawlLogs).values({
    competitorId,
    triggerType,
    status: "completed",
    startedAt: new Date(),
  });
  const logId = Number(logInsert.insertId);

  // 4. Fetch page
  const scraped = await fetchPage(comp.url);
  if (scraped.error) {
    errors.push(scraped.error);
    await db
      .update(crawlLogs)
      .set({ status: "failed", errorMessage: scraped.error, durationMs: Date.now() - start, completedAt: new Date() })
      .where(eq(crawlLogs.id, logId));
    // Mark competitor error on consecutive failures
    await db.update(competitors).set({ status: "error" }).where(eq(competitors.id, competitorId));
    return { total: 0, new: 0, changed: 0, unchanged: 0, failed: 1, errors, durationMs: Date.now() - start };
  }

  // 5. Extract products
  let extracted;
  try {
    if (rules.extractMode === "template" && rules.aiPrompt) {
      extracted = await extractWithPrompt(scraped.html, rules.aiPrompt);
    } else {
      extracted = await extractProducts(scraped.html, scraped.url);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`AI extraction failed: ${msg}`);
    await db
      .update(crawlLogs)
      .set({ status: "failed", errorMessage: msg, durationMs: Date.now() - start, completedAt: new Date() })
      .where(eq(crawlLogs.id, logId));
    return { total: 0, new: 0, changed: 0, unchanged: 0, failed: 1, errors, durationMs: Date.now() - start };
  }

  // 6. Store each product + snapshot, diff with previous
  let newCount = 0;
  let changedCount = 0;
  let unchangedCount = 0;
  let failedCount = 0;

  for (const item of extracted.products) {
    try {
      const params = item.params;

      // Find or create product
      const [existing] = await db
        .select()
        .from(products)
        .where(
          and(eq(products.competitorId, competitorId), eq(products.model, item.model))
        );

      let productId: number;
      if (existing) {
        // Update category/subCategory if changed
        if (item.category || item.subCategory) {
          await db
            .update(products)
            .set({
              category: item.category ?? existing.category,
              subCategory: item.subCategory ?? existing.subCategory,
              sourceUrl: item.sourceUrl ?? existing.sourceUrl,
              updatedAt: new Date(),
            })
            .where(eq(products.id, existing.id));
        }
        productId = existing.id;
      } else {
        const [inserted] = await db.insert(products).values({
          competitorId,
          model: item.model,
          category: item.category,
          subCategory: item.subCategory,
          sourceUrl: item.sourceUrl,
        });
        productId = Number(inserted.insertId);
        newCount++;
      }

      // Get previous snapshot for diff
      const [prevSnapshot] = await db
        .select()
        .from(snapshots)
        .where(eq(snapshots.productId, productId))
        .orderBy(snapshots.createdAt)
        .limit(1);

      const snapshotHash = hashParams(params);

      // Diff check
      if (prevSnapshot) {
        const prevParams = prevSnapshot.params as Record<string, string>;
        const diff = diffSnapshots(prevParams, params);
        if (diff.added.length > 0 || diff.modified.length > 0 || diff.removed.length > 0) {
          changedCount++;
        } else {
          unchangedCount++;
        }
      } else {
        // First snapshot for this product — count as new
      }

      // Store snapshot
      await db.insert(snapshots).values({
        productId,
        crawlLogId: logId,
        params,
        snapshotHash,
      });
    } catch (err) {
      failedCount++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${item.model}: ${msg}`);
    }
  }

  const durationMs = Date.now() - start;
  const status = failedCount === 0 ? "completed" : failedCount < extracted.products.length ? "partial" : "failed";

  // Update crawl log
  await db
    .update(crawlLogs)
    .set({
      status,
      productsFound: extracted.products.length,
      productsNew: newCount,
      productsChanged: changedCount,
      productsUnchanged: unchangedCount,
      errorMessage: errors.length > 0 ? errors.join("\n") : null,
      durationMs,
      completedAt: new Date(),
    })
    .where(eq(crawlLogs.id, logId));

  return {
    total: extracted.products.length,
    new: newCount,
    changed: changedCount,
    unchanged: unchangedCount,
    failed: failedCount,
    errors,
    durationMs,
  };
}
