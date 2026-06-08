import {
  mysqlTable,
  int,
  varchar,
  text,
  boolean,
  json,
  datetime,
  mysqlEnum,
  index,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

// ── Groups ──────────────────────────────────────────────
export const groups = mysqlTable("groups", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: datetime("created_at").default(sql`(now())`).notNull(),
});

// ── Competitors (crawl targets) ─────────────────────────
export const competitors = mysqlTable(
  "competitors",
  {
    id: int("id").primaryKey().autoincrement(),
    name: varchar("name", { length: 255 }).notNull(),
    url: text("url").notNull(),
    status: mysqlEnum("status", ["active", "paused", "error"]).default("active").notNull(),
    scheduleCron: varchar("schedule_cron", { length: 100 }),
    scheduleEnabled: boolean("schedule_enabled").default(false).notNull(),
    groupId: int("group_id"),
    createdAt: datetime("created_at").default(sql`(now())`).notNull(),
    updatedAt: datetime("updated_at").default(sql`(now())`).notNull(),
  },
  (table) => [
    index("idx_competitors_group").on(table.groupId),
    index("idx_competitors_status").on(table.status),
  ]
);

// ── Templates (extraction rules per competitor) ──────────
export const templates = mysqlTable("templates", {
  id: int("id").primaryKey().autoincrement(),
  competitorId: int("competitor_id").notNull().unique(),
  extractionRules: json("extraction_rules").$type<ExtractionRules>(),
  aiGenerated: boolean("ai_generated").default(true).notNull(),
  updatedAt: datetime("updated_at").default(sql`(now())`).notNull(),
});

// ── Products (extracted items) ──────────────────────────
export const products = mysqlTable(
  "products",
  {
    id: int("id").primaryKey().autoincrement(),
    competitorId: int("competitor_id").notNull(),
    model: varchar("model", { length: 255 }).notNull(),
    category: varchar("category", { length: 255 }),
    subCategory: varchar("sub_category", { length: 255 }),
    sourceUrl: text("source_url"),
    groupId: int("group_id"),
    createdAt: datetime("created_at").default(sql`(now())`).notNull(),
    updatedAt: datetime("updated_at").default(sql`(now())`).notNull(),
  },
  (table) => [
    index("idx_products_competitor").on(table.competitorId),
    index("idx_products_category").on(table.category),
    index("idx_products_group").on(table.groupId),
    index("idx_products_model").on(table.model),
  ]
);

// ── Snapshots (per-crawl parameter capture) ─────────────
export const snapshots = mysqlTable(
  "snapshots",
  {
    id: int("id").primaryKey().autoincrement(),
    productId: int("product_id").notNull(),
    crawlLogId: int("crawl_log_id").notNull(),
    params: json("params").$type<Record<string, string>>().notNull(),
    snapshotHash: varchar("snapshot_hash", { length: 64 }),
    createdAt: datetime("created_at").default(sql`(now())`).notNull(),
  },
  (table) => [
    index("idx_snapshots_product").on(table.productId),
    index("idx_snapshots_crawl_log").on(table.crawlLogId),
    index("idx_snapshots_hash").on(table.snapshotHash),
  ]
);

// ── Crawl Logs (execution records) ──────────────────────
export const crawlLogs = mysqlTable(
  "crawl_logs",
  {
    id: int("id").primaryKey().autoincrement(),
    competitorId: int("competitor_id").notNull(),
    status: mysqlEnum("status", ["completed", "partial", "failed"]).default("completed").notNull(),
    triggerType: mysqlEnum("trigger_type", ["manual", "scheduled"]).notNull(),
    productsFound: int("products_found").default(0).notNull(),
    productsNew: int("products_new").default(0).notNull(),
    productsChanged: int("products_changed").default(0).notNull(),
    productsUnchanged: int("products_unchanged").default(0).notNull(),
    errorMessage: text("error_message"),
    durationMs: int("duration_ms"),
    startedAt: datetime("started_at").default(sql`(now())`).notNull(),
    completedAt: datetime("completed_at"),
  },
  (table) => [
    index("idx_crawl_logs_competitor").on(table.competitorId),
    index("idx_crawl_logs_status").on(table.status),
    index("idx_crawl_logs_started").on(table.startedAt),
  ]
);

// ── Type exports ────────────────────────────────────────
export type ExtractionRules = {
  selectors?: Record<string, string>;
  aiPrompt?: string;
  extractMode: "template" | "ai" | "hybrid";
};
