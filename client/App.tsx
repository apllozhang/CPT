import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import type { AppRouter } from "../server/trpc.js";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import CompetitorList from "./pages/competitors/CompetitorList";
import ProductTable from "./pages/products/ProductTable";
import DiffViewer from "./pages/snapshots/DiffViewer";
import CrawlLogList from "./pages/crawllog/CrawlLogList";
import GroupManager from "./pages/groups/GroupManager";

export const trpc = createTRPCReact<AppRouter>();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({ url: "/trpc", transformer: superjson }),
  ],
});

const PAGE_TITLES: Record<string, string> = {
  competitors: "竞品源管理",
  products: "产品对比",
  diff: "变更历史",
  crawllog: "采集历史",
  groups: "分组管理",
};

const PAGE_COMPONENTS: Record<string, React.FC> = {
  competitors: CompetitorList,
  products: ProductTable,
  diff: DiffViewer,
  crawllog: CrawlLogList,
  groups: GroupManager,
};

export default function App() {
  const [page, setPage] = useState("competitors");
  const PageComponent = PAGE_COMPONENTS[page] ?? CompetitorList;

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <div className="flex h-screen bg-zinc-950 text-zinc-100 font-mono text-sm">
          <Sidebar active={page} onNavigate={setPage} />
          <div className="flex-1 flex flex-col min-w-0">
            <Header title={PAGE_TITLES[page] ?? page} />
            <main className="flex-1 overflow-auto p-6">
              <PageComponent />
            </main>
          </div>
        </div>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
