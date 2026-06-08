/**
 * Set global proxy dispatcher for all HTTP requests.
 * Must be called before any AI SDK usage.
 */
import { ProxyAgent, setGlobalDispatcher } from "undici";

export function initProxy(): void {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxyUrl) {
    const agent = new ProxyAgent(proxyUrl);
    setGlobalDispatcher(agent);
    console.log(`[proxy] Using proxy: ${proxyUrl}`);
  }
}
