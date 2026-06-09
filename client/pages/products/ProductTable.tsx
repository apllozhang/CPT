import { useState } from "react";
import { trpc } from "../../App";

export default function ProductTable() {
  const [competitorId, setCompetitorId] = useState<number | undefined>();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: competitors = [] } = trpc.competitor.list.useQuery({});
  const { data: products = [], isLoading } = trpc.product.list.useQuery({
    competitorId,
    search: search || undefined,
    sortBy: sortKey,
    sortDir,
  });

  const paramKeys = Array.from(
    new Set(products.flatMap((p) => Object.keys(p.params)))
  ).sort();

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-muted text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={competitorId ?? ""}
          onChange={(e) => setCompetitorId(e.target.value ? Number(e.target.value) : undefined)}
          className="px-3 py-2 bg-surface-2 border border-border-default rounded-md text-[13px] text-text-primary focus:outline-none focus:border-brand-500"
        >
          <option value="">全部竞品</option>
          {competitors.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="relative flex-1 max-w-xs">
          <input
            placeholder="搜索型号..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface-2 border border-border-default rounded-md text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[11px]">⌕</span>
        </div>
        <div className="text-[12px] text-text-muted">{products.length} 条产品</div>
      </div>

      {/* Table */}
      <div className="bg-surface-1 border border-border-default rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border-default">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider bg-surface-2">
                  型号
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider bg-surface-2">
                  竞品
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider bg-surface-2">
                  分类
                </th>
                {paramKeys.map((key) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider bg-surface-2 cursor-pointer hover:text-text-primary select-none"
                  >
                    <span className="flex items-center gap-1">
                      {key}
                      {sortKey === key && (
                        <span className="text-brand-400">{sortDir === "asc" ? "↑" : "↓"}</span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {products.map((p, i) => (
                <tr key={p.id} className={`hover:bg-surface-2 transition-colors ${i % 2 === 0 ? "" : "bg-surface-1/50"}`}>
                  <td className="px-4 py-3 font-medium text-text-primary">{p.model}</td>
                  <td className="px-4 py-3 text-text-secondary">{p.competitorName}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-surface-3 rounded text-[11px] text-text-muted">
                      {p.category}{p.subCategory ? ` / ${p.subCategory}` : ""}
                    </span>
                  </td>
                  {paramKeys.map((key) => (
                    <td key={key} className="px-4 py-3 text-text-secondary font-mono text-[12px]">
                      {p.params[key] ?? <span className="text-text-muted">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={3 + paramKeys.length} className="px-4 py-16 text-center">
                    <div className="text-text-muted text-sm">暂无产品数据</div>
                    <div className="text-text-muted text-[12px] mt-1">请先采集竞品源</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
