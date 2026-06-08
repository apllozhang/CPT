import { useState } from "react";
import { trpc } from "../../App";

export default function DiffViewer() {
  const [productId, setProductId] = useState<number | undefined>();
  const [selectedA, setSelectedA] = useState<number | undefined>();
  const [selectedB, setSelectedB] = useState<number | undefined>();

  const { data: competitors = [] } = trpc.competitor.list.useQuery({});
  const [competitorFilter, setCompetitorFilter] = useState<number | undefined>();
  const { data: products = [] } = trpc.product.list.useQuery({ competitorId: competitorFilter });

  const { data: snapshots = [] } = trpc.snapshot.listByProduct.useQuery(
    { productId: productId! },
    { enabled: !!productId }
  );

  const { data: diffResult } = trpc.snapshot.diff.useQuery(
    { snapshotIdA: selectedA!, snapshotIdB: selectedB! },
    { enabled: !!selectedA && !!selectedB }
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 items-center">
        <select
          value={competitorFilter ?? ""}
          onChange={(e) => {
            setCompetitorFilter(e.target.value ? Number(e.target.value) : undefined);
            setProductId(undefined);
            setSelectedA(undefined);
            setSelectedB(undefined);
          }}
          className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs"
        >
          <option value="">选择竞品</option>
          {competitors.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={productId ?? ""}
          onChange={(e) => {
            setProductId(e.target.value ? Number(e.target.value) : undefined);
            setSelectedA(undefined);
            setSelectedB(undefined);
          }}
          className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs"
        >
          <option value="">选择产品</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.model}</option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      {snapshots.length > 0 && (
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-zinc-500 text-[10px]">选择两次快照：</span>
          {snapshots.map((s, i) => {
            const isSelectedA = selectedA === s.id;
            const isSelectedB = selectedB === s.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  if (isSelectedA) { setSelectedA(undefined); return; }
                  if (isSelectedB) { setSelectedB(undefined); return; }
                  if (!selectedA) setSelectedA(s.id);
                  else if (!selectedB) setSelectedB(s.id);
                }}
                className={`px-2.5 py-1 text-[10px] rounded border transition-colors ${
                  isSelectedA
                    ? "bg-blue-900/40 border-blue-600 text-blue-300"
                    : isSelectedB
                    ? "bg-orange-900/40 border-orange-600 text-orange-300"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                #{snapshots.length - i} {new Date(s.createdAt).toLocaleString("zh-CN")}
              </button>
            );
          })}
        </div>
      )}

      {/* Diff result */}
      {diffResult && (
        <div className="border border-zinc-800 rounded overflow-hidden">
          <div className="bg-zinc-900/80 px-4 py-2 border-b border-zinc-800 text-xs text-zinc-400">
            对比：#{diffResult.a.id} ({new Date(diffResult.a.createdAt).toLocaleString("zh-CN")})
            → #{diffResult.b.id} ({new Date(diffResult.b.createdAt).toLocaleString("zh-CN")})
          </div>
          <div className="divide-y divide-zinc-800/50">
            {/* Added */}
            {diffResult.diff.added.map((key) => (
              <div key={key} className="flex items-center px-4 py-2 bg-green-900/10">
                <span className="w-6 text-green-500 text-xs font-bold">+</span>
                <span className="w-32 text-zinc-300 text-xs">{key}</span>
                <span className="text-green-400 text-xs">
                  {(diffResult.b.params as Record<string, string>)[key]}
                </span>
              </div>
            ))}
            {/* Modified */}
            {diffResult.diff.modified.map((m) => (
              <div key={m.key} className="flex items-center px-4 py-2 bg-yellow-900/10">
                <span className="w-6 text-yellow-500 text-xs font-bold">~</span>
                <span className="w-32 text-zinc-300 text-xs">{m.key}</span>
                <span className="text-zinc-500 text-xs line-through mr-2">{m.old}</span>
                <span className="text-yellow-400 text-xs">→ {m.new}</span>
              </div>
            ))}
            {/* Removed */}
            {diffResult.diff.removed.map((key) => (
              <div key={key} className="flex items-center px-4 py-2 bg-red-900/10">
                <span className="w-6 text-red-500 text-xs font-bold">−</span>
                <span className="w-32 text-zinc-300 text-xs">{key}</span>
                <span className="text-red-400 text-xs line-through">
                  {(diffResult.a.params as Record<string, string>)[key]}
                </span>
              </div>
            ))}
            {/* Unchanged (collapsed) */}
            {diffResult.diff.unchanged.length > 0 && (
              <div className="px-4 py-2 text-[10px] text-zinc-600">
                {diffResult.diff.unchanged.length} 项未变更（已折叠）
              </div>
            )}
          </div>
        </div>
      )}

      {productId && snapshots.length === 0 && (
        <div className="text-center text-zinc-600 text-xs py-8">该产品暂无快照数据</div>
      )}
    </div>
  );
}
