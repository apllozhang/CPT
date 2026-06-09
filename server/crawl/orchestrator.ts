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
import { fetchPage, fetchPages } from "../lib/scraper.js";
import { extractProducts, extractWithPrompt } from "../lib/ai-extractor.js";
import { hashParams, diffSnapshots } from "../lib/snapshot-diff.js";
import { parseH3CProductList, parseH3CSpecs } from "../lib/h3c-parser.js";
import { chromium } from "playwright";

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

  // 4. Fetch page with stealth + retry
  const scraped = await fetchPage(comp.url);
  if (scraped.error) {
    errors.push(scraped.error);
    await db
      .update(crawlLogs)
      .set({ status: "failed", errorMessage: scraped.error, durationMs: Date.now() - start, completedAt: new Date() })
      .where(eq(crawlLogs.id, logId));
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
        .where(and(eq(products.competitorId, competitorId), eq(products.model, item.model)));

      let productId: number;
      if (existing) {
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

      if (prevSnapshot) {
        const prevParams = prevSnapshot.params as Record<string, string>;
        const diff = diffSnapshots(prevParams, params);
        if (diff.added.length > 0 || diff.modified.length > 0 || diff.removed.length > 0) {
          changedCount++;
        } else {
          unchangedCount++;
        }
      }

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

/**
 * Deep crawl: list page → product detail pages → H3C spec table parser.
 * More accurate than single-page AI extraction for H3C.
 */
export async function deepCrawlH3C(
  competitorId: number,
  listUrl: string,
  triggerType: "manual" | "scheduled"
): Promise<CrawlResult> {
  const start = Date.now();
  const errors: string[] = [];
  let newCount = 0;
  let changedCount = 0;
  let unchangedCount = 0;
  let failedCount = 0;

  // Create crawl log
  const [logInsert] = await db.insert(crawlLogs).values({
    competitorId,
    triggerType,
    status: "completed",
    startedAt: new Date(),
  });
  const logId = Number(logInsert.insertId);

  try {
    // 1. Get product links from list page
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/135.0.0.0 Safari/537.36",
      locale: "zh-CN",
    });
    const page = await context.newPage();

    const productLinks = await parseH3CProductList(page, listUrl);
    console.log(`[deep-crawl] Found ${productLinks.length} product links`);

    // 2. Crawl each product detail page (concurrency: 3)
    const chunks = chunkArray(productLinks, 3);
    for (const chunk of chunks) {
      const results = await Promise.allSettled(
        chunk.map(async (url) => {
          const detailPage = await context.newPage();
          try {
            const spec = await parseH3CSpecs(detailPage, url);
            return spec;
          } finally {
            await detailPage.close();
          }
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          const item = result.value;
          try {
            const [existing] = await db
              .select()
              .from(products)
              .where(and(eq(products.competitorId, competitorId), eq(products.model, item.model)));

            let productId: number;
            if (existing) {
              await db
                .update(products)
                .set({ category: item.category, subCategory: item.subCategory, sourceUrl: item.sourceUrl, updatedAt: new Date() })
                .where(eq(products.id, existing.id));
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

            const snapshotHash = hashParams(item.params);
            const [prevSnapshot] = await db
              .select()
              .from(snapshots)
              .where(eq(snapshots.productId, productId))
              .orderBy(snapshots.createdAt)
              .limit(1);

            if (prevSnapshot) {
              const diff = diffSnapshots(prevSnapshot.params as Record<string, string>, item.params);
              if (diff.added.length > 0 || diff.modified.length > 0 || diff.removed.length > 0) changedCount++;
              else unchangedCount++;
            }

            await db.insert(snapshots).values({ productId, crawlLogId: logId, params: item.params, snapshotHash });
          } catch (err) {
            failedCount++;
            errors.push(`${item.model}: ${err instanceof Error ? err.message : String(err)}`);
          }
        } else if (result.status === "rejected") {
          failedCount++;
          errors.push(`Detail page failed: ${result.reason}`);
        }
      }
    }

    await context.close();
    await browser.close();
  } catch (err) {
    errors.push(`Deep crawl failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const durationMs = Date.now() - start;
  const total = newCount + changedCount + unchangedCount + failedCount;
  const status = failedCount === 0 ? "completed" : failedCount < total ? "partial" : "failed";

  await db
    .update(crawlLogs)
    .set({
      status,
      productsFound: total,
      productsNew: newCount,
      productsChanged: changedCount,
      productsUnchanged: unchangedCount,
      errorMessage: errors.length > 0 ? errors.join("\n") : null,
      durationMs,
      completedAt: new Date(),
    })
    .where(eq(crawlLogs.id, logId));

  return { total, new: newCount, changed: changedCount, unchanged: unchangedCount, failed: failedCount, errors, durationMs };
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
