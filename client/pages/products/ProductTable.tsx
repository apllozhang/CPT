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

  // Collect all unique param keys across products
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

  if (isLoading) return <div className="text-zinc-500">加载中...</div>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 items-center">
        <select
          value={competitorId ?? ""}
          onChange={(e) => setCompetitorId(e.target.value ? Number(e.target.value) : undefined)}
          className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs"
        >
          <option value="">全部竞品</option>
          {competitors.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          placeholder="搜索型号..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs w-48 focus:outline-none focus:border-cyan-600"
        />
        <span className="text-zinc-500 text-[10px]">{products.length} 条产品</span>
      </div>

      {/* Table */}
      <div className="overflow-auto border border-zinc-800 rounded">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-900/80 border-b border-zinc-800">
              <th className="px-3 py-2 text-left text-zinc-400 font-medium">型号</th>
              <th className="px-3 py-2 text-left text-zinc-400 font-medium">竞品</th>
              <th className="px-3 py-2 text-left text-zinc-400 font-medium">分类</th>
              {paramKeys.map((key) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="px-3 py-2 text-left text-zinc-400 font-medium cursor-pointer hover:text-zinc-200 select-none"
                >
                  {key}
                  {sortKey === key && (
                    <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr
                key={p.id}
                className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
              >
                <td className="px-3 py-2 font-semibold text-zinc-100">{p.model}</td>
                <td className="px-3 py-2 text-zinc-400">{p.competitorName}</td>
                <td className="px-3 py-2 text-zinc-500">{p.category}{p.subCategory ? ` / ${p.subCategory}` : ""}</td>
                {paramKeys.map((key) => (
                  <td key={key} className="px-3 py-2 text-zinc-300">
                    {p.params[key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td
                  colSpan={3 + paramKeys.length}
                  className="px-3 py-12 text-center text-zinc-600"
                >
                  暂无产品数据，请先采集竞品
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
