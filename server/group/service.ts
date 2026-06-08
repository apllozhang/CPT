import { db } from "../db/index.js";
import { groups, competitors, products } from "../db/schema.js";
import { eq } from "drizzle-orm";

export interface CreateGroupInput {
  name: string;
}

export async function listGroups() {
  return db.select().from(groups).orderBy(groups.name);
}

export async function createGroup(input: CreateGroupInput) {
  const [row] = await db.insert(groups).values({ name: input.name });
  const id = Number(row.insertId);
  const [created] = await db.select().from(groups).where(eq(groups.id, id));
  return created;
}

export async function updateGroup(id: number, name: string) {
  await db.update(groups).set({ name }).where(eq(groups.id, id));
  const [updated] = await db.select().from(groups).where(eq(groups.id, id));
  return updated;
}

export async function deleteGroup(id: number) {
  // Unset group references on competitors/products before deleting
  await db.update(competitors).set({ groupId: null }).where(eq(competitors.groupId, id));
  await db.update(products).set({ groupId: null }).where(eq(products.groupId, id));
  await db.delete(groups).where(eq(groups.id, id));
  return { deleted: true };
}

export async function addItems(groupId: number, competitorIds: number[]) {
  for (const cid of competitorIds) {
    await db.update(competitors).set({ groupId }).where(eq(competitors.id, cid));
  }
  return getGroupWithCount(groupId);
}

export async function removeItems(competitorIds: number[]) {
  for (const cid of competitorIds) {
    await db.update(competitors).set({ groupId: null }).where(eq(competitors.id, cid));
  }
  return { removed: competitorIds.length };
}

export async function getGroupWithCount(id: number) {
  const [group] = await db.select().from(groups).where(eq(groups.id, id));
  if (!group) return null;
  const items = await db.select().from(competitors).where(eq(competitors.groupId, id));
  return { ...group, competitorCount: items.length };
}
