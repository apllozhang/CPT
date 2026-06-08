import { db } from "../db/index.js";
import { products, competitors, groups } from "../db/schema.js";
import { eq, and, like, desc, asc } from "drizzle-orm";

export interface ListProductsInput {
  competitorId?: number;
  groupId?: number;
  category?: string;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export async function listProducts(input: ListProductsInput) {
  const all = await db
    .select({
      id: products.id,
      competitorId: products.competitorId,
      model: products.model,
      category: products.category,
      subCategory: products.subCategory,
      sourceUrl: products.sourceUrl,
      groupId: products.groupId,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      competitorName: competitors.name,
    })
    .from(products)
    .leftJoin(competitors, eq(products.competitorId, competitors.id))
    .orderBy(desc(products.updatedAt));

  let filtered = all;

  if (input.competitorId) {
    filtered = filtered.filter((p) => p.competitorId === input.competitorId);
  }
  if (input.groupId) {
    // Filter by competitor's group
    const groupComps = await db.select().from(competitors).where(eq(competitors.groupId, input.groupId));
    const compIds = new Set(groupComps.map((c) => c.id));
    filtered = filtered.filter((p) => compIds.has(p.competitorId));
  }
  if (input.category) {
    filtered = filtered.filter((p) => p.category === input.category);
  }
  if (input.search) {
    const s = input.search.toLowerCase();
    filtered = filtered.filter((p) => p.model.toLowerCase().includes(s));
  }

  // For sorting, attach latest snapshot params
  const withParams = await Promise.all(
    filtered.map(async (p) => {
      const { snapshots } = await import("../db/schema.js");
      const [latest] = await db
        .select()
        .from(snapshots)
        .where(eq(snapshots.productId, p.id))
        .orderBy(desc(snapshots.createdAt))
        .limit(1);
      return { ...p, params: (latest?.params as Record<string, string>) ?? {} };
    })
  );

  // Custom sort by params key
  if (input.sortBy && input.sortDir) {
    const dir = input.sortDir === "asc" ? 1 : -1;
    withParams.sort((a, b) => {
      const va = a.params[input.sortBy!] ?? "";
      const vb = b.params[input.sortBy!] ?? "";
      return va.localeCompare(vb) * dir;
    });
  }

  return withParams;
}

export async function getProduct(id: number) {
  const [row] = await db.select().from(products).where(eq(products.id, id));
  return row ?? null;
}

export async function getProductWithHistory(id: number) {
  const product = await getProduct(id);
  if (!product) return null;

  const { snapshots } = await import("../db/schema.js");
  const snaps = await db
    .select()
    .from(snapshots)
    .where(eq(snapshots.productId, id))
    .orderBy(desc(snapshots.createdAt));

  return { ...product, snapshots: snaps };
}
