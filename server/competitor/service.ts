import { db } from "../db/index.js";
import { competitors, templates, type ExtractionRules } from "../db/schema.js";
import { eq, like, desc } from "drizzle-orm";

// ── Types ───────────────────────────────────────────────
export interface CreateCompetitorInput {
  name: string;
  url: string;
  groupId?: number;
  scheduleCron?: string;
  scheduleEnabled?: boolean;
}

export interface UpdateCompetitorInput {
  id: number;
  name?: string;
  url?: string;
  groupId?: number;
  scheduleCron?: string;
  scheduleEnabled?: boolean;
}

// ── Service ─────────────────────────────────────────────

export async function listCompetitors(filters?: { groupId?: number; status?: string; search?: string }) {
  let query = db.select().from(competitors);
  // Filters applied post-fetch for simplicity (V1 <20 competitors)
  const all = await query.orderBy(desc(competitors.createdAt));

  return all.filter((c) => {
    if (filters?.groupId && c.groupId !== filters.groupId) return false;
    if (filters?.status && c.status !== filters.status) return false;
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      if (!c.name.toLowerCase().includes(s) && !c.url.toLowerCase().includes(s)) return false;
    }
    return true;
  });
}

export async function getCompetitor(id: number) {
  const [row] = await db.select().from(competitors).where(eq(competitors.id, id));
  return row ?? null;
}

export async function createCompetitor(input: CreateCompetitorInput) {
  const [row] = await db.insert(competitors).values({
    name: input.name,
    url: input.url,
    groupId: input.groupId ?? null,
    scheduleCron: input.scheduleCron ?? null,
    scheduleEnabled: input.scheduleEnabled ?? false,
  });

  // Auto-create empty template
  const defaultRules: ExtractionRules = { extractMode: "ai" };
  await db.insert(templates).values({
    competitorId: row.insertId,
    extractionRules: defaultRules,
    aiGenerated: true,
  });

  return getCompetitor(Number(row.insertId));
}

export async function updateCompetitor(input: UpdateCompetitorInput) {
  const { id, ...fields } = input;
  await db
    .update(competitors)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(competitors.id, id));
  return getCompetitor(id);
}

export async function deleteCompetitor(id: number) {
  await db.delete(competitors).where(eq(competitors.id, id));
  return { deleted: true };
}

export async function toggleStatus(id: number, status: "active" | "paused" | "error") {
  await db
    .update(competitors)
    .set({ status, updatedAt: new Date() })
    .where(eq(competitors.id, id));
  return getCompetitor(id);
}
