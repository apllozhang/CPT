import cron from "node-cron";
import { db } from "./db/index.js";
import { competitors } from "./db/schema.js";
import { eq } from "drizzle-orm";
import { crawlCompetitor } from "./crawl/orchestrator.js";

const tasks = new Map<number, cron.ScheduledTask>();

/**
 * Load all enabled competitors from DB and register cron tasks.
 * Called on server startup. Re-registers after any schedule change.
 */
export async function initScheduler(): Promise<void> {
  console.log("[scheduler] Initializing...");

  const enabled = await db
    .select()
    .from(competitors)
    .where(eq(competitors.scheduleEnabled, true));

  for (const comp of enabled) {
    registerTask(comp.id, comp.scheduleCron ?? "0 0 * * *");
  }

  console.log(`[scheduler] Registered ${enabled.length} scheduled tasks`);
}

export function registerTask(competitorId: number, cronExpr: string): void {
  // Remove existing task if any
  tasks.get(competitorId)?.stop();
  tasks.delete(competitorId);

  if (!cron.validate(cronExpr)) {
    console.warn(`[scheduler] Invalid cron "${cronExpr}" for competitor ${competitorId}, skipping`);
    return;
  }

  const task = cron.schedule(cronExpr, async () => {
    console.log(`[scheduler] Running scheduled crawl for competitor ${competitorId}`);
    try {
      const result = await crawlCompetitor(competitorId, "scheduled");
      console.log(`[scheduler] Competitor ${competitorId}: ${result.total} products, ${result.changed} changed`);
    } catch (err) {
      console.error(`[scheduler] Competitor ${competitorId} failed:`, err);
    }
  });

  tasks.set(competitorId, task);
  console.log(`[scheduler] Registered cron "${cronExpr}" for competitor ${competitorId}`);
}

export function removeTask(competitorId: number): void {
  tasks.get(competitorId)?.stop();
  tasks.delete(competitorId);
}

export function stopAll(): void {
  for (const [id, task] of tasks) {
    task.stop();
  }
  tasks.clear();
}
