import { db } from "../db/index.js";
import { templates, type ExtractionRules } from "../db/schema.js";
import { eq } from "drizzle-orm";

export async function getByCompetitor(competitorId: number) {
  const [row] = await db
    .select()
    .from(templates)
    .where(eq(templates.competitorId, competitorId));
  return row ?? null;
}

export async function update(competitorId: number, rules: ExtractionRules) {
  await db
    .update(templates)
    .set({ extractionRules: rules, aiGenerated: false, updatedAt: new Date() })
    .where(eq(templates.competitorId, competitorId));
  return getByCompetitor(competitorId);
}

export async function markAiGenerated(competitorId: number, rules: ExtractionRules) {
  await db
    .update(templates)
    .set({ extractionRules: rules, aiGenerated: true, updatedAt: new Date() })
    .where(eq(templates.competitorId, competitorId));
  return getByCompetitor(competitorId);
}
