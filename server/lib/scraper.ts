import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import fs from "node:fs";
import path from "node:path";

// ── Config ──────────────────────────────────────────────
const MAX_CONCURRENCY = 3;
const PAGE_TIMEOUT_MS = 30_000;
const STORAGE_DIR = path.resolve("storage");
const STORAGE_PATH = path.join(STORAGE_DIR, "h3c-state.json");

const BLOCKED_TYPES = new Set(["image", "font", "media", "stylesheet"]);

let _browser: Browser | null = null;

// ── Stealth Browser ─────────────────────────────────────

async function getBrowser(): Promise<Browser> {
  if (_browser?.isConnected()) return _browser;

  _browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--disable-dev-shm-usage",
      "--disable-setuid-sandbox",
      "--window-size=1920,1080",
    ],
  });
  return _browser;
}

async function createContext(browser: Browser): Promise<BrowserContext> {
  const opts: any = {
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    extraHTTPHeaders: { "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8" },
    bypassCSP: true,
    ignoreHTTPSErrors: true,
  };

  if (fs.existsSync(STORAGE_PATH)) {
    try { opts.storageState = STORAGE_PATH; } catch {}
  }

  const context = await browser.newContext(opts);

  // Anti-fingerprint
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    Object.defineProperty(navigator, "languages", { get: () => ["zh-CN", "zh", "en-US"] });
    (window as any).chrome = { runtime: {} };
  });

  return context;
}

export async function closeBrowser(): Promise<void> {
  if (_browser?.isConnected()) {
    await _browser.close();
    _browser = null;
  }
}

// ── Human Behavior ──────────────────────────────────────

async function humanDelay(page: Page): Promise<void> {
  await page.mouse.move(Math.random() * 800 + 100, Math.random() * 600 + 100, { steps: 10 });
  await page.waitForTimeout(300 + Math.random() * 500);
  await page.evaluate(() => window.scrollBy(0, 200 + Math.random() * 300));
  await page.waitForTimeout(200 + Math.random() * 400);
}

// ── Smart Wait ──────────────────────────────────────────

export async function smartWait(page: Page, selector: string, timeout = 15_000): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: "visible", timeout });
    await page.waitForLoadState("networkidle", { timeout: 8_000 });
    await humanDelay(page);
    return true;
  } catch {
    await page.waitForLoadState("domcontentloaded");
    return false;
  }
}

// ── Retry ───────────────────────────────────────────────

export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 2000): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === maxRetries) throw error;
      const retryable =
        error.name?.includes("Timeout") || error.message?.includes("net::ERR") || error.message?.includes("ECONNRESET");
      if (!retryable) throw error;
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
      console.log(`[scraper] Retry ${i + 1}/${maxRetries} in ${(delay / 1000).toFixed(1)}s`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Retry exhausted");
}

// ── Resource Block ──────────────────────────────────────

async function blockResources(page: Page): Promise<void> {
  await page.route("**/*", (route) => {
    if (BLOCKED_TYPES.has(route.request().resourceType())) route.abort();
    else route.continue();
  });
}

// ── Main ────────────────────────────────────────────────

export interface ScrapeResult {
  url: string;
  html: string;
  statusCode: number;
  error?: string;
}

export async function fetchPage(url: string): Promise<ScrapeResult> {
  return withRetry(async () => {
    const browser = await getBrowser();
    const context = await createContext(browser);
    try {
      const page = await context.newPage();
      await blockResources(page);
      page.setDefaultTimeout(PAGE_TIMEOUT_MS);

      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT_MS });
      await smartWait(page, "body", 12_000);

      const html = await page.content();
      const statusCode = response?.status() ?? 0;

      // Persist login state
      try {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
        await context.storageState({ path: STORAGE_PATH });
      } catch {}

      return { url, html, statusCode };
    } finally {
      await context.close();
    }
  });
}

export async function fetchPages(urls: string[], concurrency = MAX_CONCURRENCY): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];
  const queue = [...urls];

  async function worker() {
    while (queue.length > 0) {
      const url = queue.shift();
      if (!url) break;
      results.push(await fetchPage(url));
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, () => worker()));
  return results;
}
