import { chromium, type Browser, type Page } from "playwright";

const MAX_CONCURRENCY = 3;
const PAGE_TIMEOUT_MS = 30_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// Resource types to block for performance
const BLOCKED_TYPES = new Set(["image", "font", "media", "stylesheet"]);

let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!_browser || !_browser.isConnected()) {
    _browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return _browser;
}

export async function closeBrowser(): Promise<void> {
  if (_browser?.isConnected()) {
    await _browser.close();
    _browser = null;
  }
}

export interface ScrapeResult {
  url: string;
  html: string;
  statusCode: number;
  error?: string;
}

/**
 * Scrape a single page with JS rendering.
 * Blocks images/fonts/media to reduce bandwidth.
 * Retries once on failure.
 */
export async function fetchPage(url: string): Promise<ScrapeResult> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1920, height: 1080 },
  });

  try {
    const page = await context.newPage();

    // Block unnecessary resources
    await page.route("**/*", (route) => {
      if (BLOCKED_TYPES.has(route.request().resourceType())) {
        route.abort();
      } else {
        route.continue();
      }
    });

    page.setDefaultTimeout(PAGE_TIMEOUT_MS);

    const response = await page.goto(url, {
      waitUntil: "networkidle",
      timeout: PAGE_TIMEOUT_MS,
    });

    const html = await page.content();
    const statusCode = response?.status() ?? 0;

    return { url, html, statusCode };
  } catch (err) {
    // Retry once
    try {
      const page = await context.newPage();
      await page.route("**/*", (route) => {
        if (BLOCKED_TYPES.has(route.request().resourceType())) {
          route.abort();
        } else {
          route.continue();
        }
      });

      const response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: PAGE_TIMEOUT_MS,
      });

      const html = await page.content();
      const statusCode = response?.status() ?? 0;

      return { url, html, statusCode };
    } catch (retryErr) {
      return {
        url,
        html: "",
        statusCode: 0,
        error: retryErr instanceof Error ? retryErr.message : String(retryErr),
      };
    }
  } finally {
    await context.close();
  }
}

/**
 * Scrape multiple pages with concurrency control.
 * At most `concurrency` pages fetched simultaneously.
 */
export async function fetchPages(
  urls: string[],
  concurrency: number = MAX_CONCURRENCY
): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];
  const queue = [...urls];

  async function worker() {
    while (queue.length > 0) {
      const url = queue.shift();
      if (!url) break;
      const result = await fetchPage(url);
      results.push(result);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, urls.length) },
    () => worker()
  );
  await Promise.all(workers);

  return results;
}
