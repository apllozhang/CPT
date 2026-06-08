declare module "undici" {
  import type { Dispatcher } from "undici";
  export class ProxyAgent {
    constructor(url: string);
  }
  export function setGlobalDispatcher(dispatcher: Dispatcher): void;
}
