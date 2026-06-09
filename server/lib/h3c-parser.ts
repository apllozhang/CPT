import type { Page } from "playwright";
import { smartWait } from "./scraper.js";

export interface H3CProduct {
  model: string;
  category: string;
  subCategory: string;
  sourceUrl: string;
  params: Record<string, string>;
}

/**
 * Parse H3C product list page.
 * Extracts all product links from category pages.
 */
export async function parseH3CProductList(page: Page, url: string): Promise<string[]> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await smartWait(page, "body", 15_000);

  // Extract product detail links
  const links = await page.$$eval('a[href*="/Products/AP/"], a[href*="/Products/AC/"]', (anchors) =>
    anchors
      .map((a) => (a as HTMLAnchorElement).href)
      .filter((href) => href && !href.endsWith("/"))
      .filter((href, i, arr) => arr.indexOf(href) === i) // dedupe
  );

  return links;
}

/**
 * Parse H3C product detail page.
 * Extracts spec table and key parameters.
 */
export async function parseH3CSpecs(page: Page, url: string): Promise<H3CProduct> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await smartWait(page, "table", 20_000);

  // Extract product name/model from page
  const model =
    (await page.$eval("h1, .product-name, .product-title", (el) => el.textContent?.trim()).catch(() => "")) ||
    extractModelFromUrl(url);

  // Extract category from breadcrumb or URL
  const category = await page
    .$eval(".breadcrumb a:nth-child(3), .nav-path a:nth-child(3)", (el) => el.textContent?.trim())
    .catch(() => extractCategoryFromUrl(url));

  const subCategory = await page
    .$eval(".breadcrumb a:nth-child(4), .nav-path a:nth-child(4)", (el) => el.textContent?.trim())
    .catch(() => extractSubCategoryFromUrl(url));

  // Extract spec table
  const specs = await page.$$eval("table tr", (rows) => {
    const result: Record<string, string> = {};
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td, th");
      if (cells.length >= 2) {
        const key = cells[0].innerText.trim();
        const value = cells[1].innerText.trim();
        if (key && value && key.length < 50) {
          result[key] = value;
        }
      }
    });
    return result;
  });

  return {
    model,
    category: category || "AP",
    subCategory: subCategory || "",
    sourceUrl: url,
    params: specs,
  };
}

/**
 * Extract model number from URL.
 * e.g. /WA7638/ → WA7638
 */
function extractModelFromUrl(url: string): string {
  const match = url.match(/\/([A-Z]{2}\d{4}[A-Z0-9-]*)\//i);
  return match?.[1] ?? "Unknown";
}

/**
 * Extract category from URL path.
 */
function extractCategoryFromUrl(url: string): string {
  if (url.includes("/AP/")) return "AP";
  if (url.includes("/AC/")) return "AC";
  return "Unknown";
}

/**
 * Extract sub-category from URL path.
 */
function extractSubCategoryFromUrl(url: string): string {
  if (url.includes("Wi_Fi_7") || url.includes("WiFi7")) return "Wi-Fi 7";
  if (url.includes("Wi_Fi_6") || url.includes("WiFi6")) return "Wi-Fi 6";
  if (url.includes("Wi_Fi_5") || url.includes("WiFi5")) return "Wi-Fi 5";
  return "";
}

/**
 * H3C-specific: intercept API calls for direct JSON data.
 * More stable than HTML parsing when available.
 */
export async function interceptH3CApi(page: Page): Promise<Record<string, any> | null> {
  let apiData: Record<string, any> | null = null;

  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("/api/") && url.includes("product")) {
      try {
        const json = await response.json();
        if (json && typeof json === "object") {
          apiData = json;
        }
      } catch {
        // Not JSON, ignore
      }
    }
  });

  return apiData;
}
