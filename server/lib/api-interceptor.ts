import type { Page, Response } from "playwright";

export interface InterceptedApiData {
  url: string;
  data: any;
  timestamp: number;
}

/**
 * Intercept API responses on a page.
 * Listens for JSON responses matching URL patterns.
 */
export class ApiInterceptor {
  private intercepted: InterceptedApiData[] = [];
  private patterns: string[];
  private resolveFn: ((data: InterceptedApiData[]) => void) | null = null;
  private timeout: NodeJS.Timeout | null = null;

  constructor(patterns: string[] = ["/api/", "product", "spec", "detail"]) {
    this.patterns = patterns;
  }

  /**
   * Start listening on a page.
   */
  async attach(page: Page): Promise<void> {
    page.on("response", async (response: Response) => {
      const url = response.url();
      const contentType = response.headers()["content-type"] || "";

      // Only intercept JSON API responses
      if (!contentType.includes("json")) return;
      if (!this.patterns.some((p) => url.includes(p))) return;

      try {
        const data = await response.json();
        if (data && typeof data === "object") {
          this.intercepted.push({
            url,
            data,
            timestamp: Date.now(),
          });

          // If we have a pending wait, resolve it
          if (this.resolveFn && this.intercepted.length > 0) {
            this.resolveFn(this.intercepted);
            this.resolveFn = null;
            if (this.timeout) {
              clearTimeout(this.timeout);
              this.timeout = null;
            }
          }
        }
      } catch {
        // Not valid JSON, ignore
      }
    });
  }

  /**
   * Wait for API data with timeout.
   */
  async waitForData(timeoutMs: number = 10_000): Promise<InterceptedApiData[]> {
    if (this.intercepted.length > 0) return this.intercepted;

    return new Promise((resolve) => {
      this.resolveFn = resolve;
      this.timeout = setTimeout(() => {
        this.resolveFn = null;
        resolve(this.intercepted);
      }, timeoutMs);
    });
  }

  /**
   * Get all intercepted data.
   */
  getAll(): InterceptedApiData[] {
    return [...this.intercepted];
  }

  /**
   * Get the first intercepted data matching a pattern.
   */
  getFirst(pattern?: string): InterceptedApiData | null {
    if (!pattern) return this.intercepted[0] ?? null;
    return this.intercepted.find((d) => d.url.includes(pattern)) ?? null;
  }

  /**
   * Clear intercepted data.
   */
  clear(): void {
    this.intercepted = [];
  }
}

/**
 * Extract product specs from H3C API response.
 * Tries multiple common response formats.
 */
export function extractFromApiData(data: any): Record<string, string> | null {
  // Format 1: { data: { specs: {...} } }
  if (data?.data?.specs && typeof data.data.specs === "object") {
    return flattenNested(data.data.specs);
  }

  // Format 2: { result: { parameters: [...] } }
  if (data?.result?.parameters && Array.isArray(data.result.parameters)) {
    const params: Record<string, string> = {};
    for (const p of data.result.parameters) {
      if (p.name && p.value) params[p.name] = String(p.value);
    }
    return params;
  }

  // Format 3: { specs: [...] } — array of {key, value}
  if (Array.isArray(data?.specs)) {
    const params: Record<string, string> = {};
    for (const item of data.specs) {
      if (item.key && item.value) params[item.key] = String(item.value);
    }
    return params;
  }

  // Format 4: flat key-value
  if (typeof data === "object" && !Array.isArray(data)) {
    const flat = flattenNested(data);
    if (Object.keys(flat).length > 3) return flat;
  }

  return null;
}

/**
 * Flatten nested objects to dot-notation key-value pairs.
 */
function flattenNested(obj: any, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenNested(value, fullKey));
    } else if (value !== null && value !== undefined) {
      result[fullKey] = String(value);
    }
  }

  return result;
}
