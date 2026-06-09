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
  links: [httpBatchLink({ url: "/trpc", transformer: superjson })],
});

const PAGE_CONFIG: Record<string, { title: string; subtitle: string; component: React.FC }> = {
  competitors: { title: "竞品源管理", subtitle: "管理监控目标", component: CompetitorList },
  products: { title: "产品对比", subtitle: "参数横向对比", component: ProductTable },
  diff: { title: "变更追踪", subtitle: "参数变更历史", component: DiffViewer },
  crawllog: { title: "采集日志", subtitle: "任务执行记录", component: CrawlLogList },
  groups: { title: "分组管理", subtitle: "竞品分组", component: GroupManager },
};

export default function App() {
  const [page, setPage] = useState("competitors");
  const config = PAGE_CONFIG[page] ?? PAGE_CONFIG.competitors;
  const PageComponent = config.component;

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <div className="flex h-screen bg-surface-0 text-text-primary">
          <Sidebar active={page} onNavigate={setPage} />
          <div className="flex-1 flex flex-col min-w-0">
            <Header title={config.title} subtitle={config.subtitle} />
            <main className="flex-1 overflow-auto">
              <div className="max-w-[1400px] mx-auto p-6">
                <PageComponent />
              </div>
            </main>
          </div>
        </div>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
