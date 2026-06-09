import { ProxyAgent, setGlobalDispatcher } from "undici";

interface ProxyConfig {
  url: string;
  fails: number;
  lastUsed: number;
  active: boolean;
}

const proxies: ProxyConfig[] = [];
let currentIndex = 0;
const MAX_FAILS = 3;

/**
 * Initialize proxy list from env or config.
 * Format: PROXY_LIST=url1,url2,url3
 */
export function initProxies(): void {
  const proxyList = process.env.PROXY_LIST;
  if (!proxyList) {
    console.log("[proxy] No PROXY_LIST configured, using direct connection");
    return;
  }

  const urls = proxyList.split(",").map((u) => u.trim()).filter(Boolean);
  for (const url of urls) {
    proxies.push({ url, fails: 0, lastUsed: 0, active: true });
  }

  console.log(`[proxy] Loaded ${proxies.length} proxies`);
  rotateProxy();
}

/**
 * Get next active proxy using round-robin.
 * Skips failed proxies.
 */
export function getNextProxy(): ProxyConfig | null {
  const activeProxies = proxies.filter((p) => p.active);
  if (activeProxies.length === 0) return null;

  currentIndex = (currentIndex + 1) % activeProxies.length;
  const proxy = activeProxies[currentIndex];
  proxy.lastUsed = Date.now();

  return proxy;
}

/**
 * Rotate to next proxy and set as global dispatcher.
 */
export function rotateProxy(): ProxyConfig | null {
  const proxy = getNextProxy();
  if (!proxy) {
    console.log("[proxy] No active proxies, using direct connection");
    return null;
  }

  const agent = new ProxyAgent(proxy.url);
  setGlobalDispatcher(agent);
  console.log(`[proxy] Rotated to: ${maskUrl(proxy.url)}`);

  return proxy;
}

/**
 * Mark a proxy as failed.
 */
export function markProxyFailed(url: string): void {
  const proxy = proxies.find((p) => p.url === url);
  if (!proxy) return;

  proxy.fails++;
  if (proxy.fails >= MAX_FAILS) {
    proxy.active = false;
    console.log(`[proxy] Disabled proxy after ${MAX_FAILS} failures: ${maskUrl(url)}`);
  }
}

/**
 * Mark a proxy as successful (reset fail count).
 */
export function markProxySuccess(url: string): void {
  const proxy = proxies.find((p) => p.url === url);
  if (proxy) proxy.fails = 0;
}

/**
 * Get proxy stats.
 */
export function getProxyStats(): { total: number; active: number; failed: number } {
  return {
    total: proxies.length,
    active: proxies.filter((p) => p.active).length,
    failed: proxies.filter((p) => !p.active).length,
  };
}

/**
 * Should we rotate? Call every N products.
 */
export function shouldRotate(processedCount: number): boolean {
  return processedCount > 0 && processedCount % 10 === 0; // Every 10 products
}

/**
 * Mask proxy URL for logging.
 */
function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}:${u.port}`;
  } catch {
    return url.slice(0, 20) + "...";
  }
}
