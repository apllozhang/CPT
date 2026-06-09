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
    <div className="space-y-5">
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
          className="px-3 py-2 bg-surface-2 border border-border-default rounded-md text-[13px] text-text-primary focus:outline-none focus:border-brand-500"
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
          className="px-3 py-2 bg-surface-2 border border-border-default rounded-md text-[13px] text-text-primary focus:outline-none focus:border-brand-500"
        >
          <option value="">选择产品</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.model}</option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      {snapshots.length > 0 && (
        <div className="bg-surface-1 border border-border-default rounded-lg p-4">
          <div className="text-[11px] text-text-muted uppercase tracking-wider mb-3">选择两次快照对比</div>
          <div className="flex gap-2 items-center flex-wrap">
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
                  className={`px-3 py-1.5 text-[11px] rounded-md border transition-all ${
                    isSelectedA
                      ? "bg-info/15 border-info/40 text-info font-medium"
                      : isSelectedB
                      ? "bg-warning/15 border-warning/40 text-warning font-medium"
                      : "bg-surface-2 border-border-default text-text-secondary hover:border-border-strong"
                  }`}
                >
                  #{snapshots.length - i} {new Date(s.createdAt).toLocaleString("zh-CN")}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Diff result */}
      {diffResult && (
        <div className="bg-surface-1 border border-border-default rounded-lg overflow-hidden">
          <div className="px-5 py-3 bg-surface-2 border-b border-border-default">
            <div className="text-[13px] font-medium text-text-primary">
              对比结果
            </div>
            <div className="text-[11px] text-text-muted mt-1">
              #{diffResult.a.id} ({new Date(diffResult.a.createdAt).toLocaleString("zh-CN")})
              → #{diffResult.b.id} ({new Date(diffResult.b.createdAt).toLocaleString("zh-CN")})
            </div>
          </div>
          <div className="divide-y divide-border-subtle">
            {/* Added */}
            {diffResult.diff.added.map((key) => (
              <div key={key} className="flex items-center px-5 py-2.5 bg-success/5">
                <span className="w-8 text-success text-[12px] font-mono font-bold">+</span>
                <span className="w-40 text-[13px] text-text-primary font-medium">{key}</span>
                <span className="text-success text-[13px]">
                  {(diffResult.b.params as Record<string, string>)[key]}
                </span>
              </div>
            ))}
            {/* Modified */}
            {diffResult.diff.modified.map((m) => (
              <div key={m.key} className="flex items-center px-5 py-2.5 bg-warning/5">
                <span className="w-8 text-warning text-[12px] font-mono font-bold">~</span>
                <span className="w-40 text-[13px] text-text-primary font-medium">{m.key}</span>
                <span className="text-text-muted text-[13px] line-through mr-3">{m.old}</span>
                <span className="text-warning text-[13px]">→ {m.new}</span>
              </div>
            ))}
            {/* Removed */}
            {diffResult.diff.removed.map((key) => (
              <div key={key} className="flex items-center px-5 py-2.5 bg-danger/5">
                <span className="w-8 text-danger text-[12px] font-mono font-bold">−</span>
                <span className="w-40 text-[13px] text-text-primary font-medium">{key}</span>
                <span className="text-danger text-[13px] line-through">
                  {(diffResult.a.params as Record<string, string>)[key]}
                </span>
              </div>
            ))}
            {/* Unchanged */}
            {diffResult.diff.unchanged.length > 0 && (
              <div className="px-5 py-2.5 text-[11px] text-text-muted bg-surface-2">
                {diffResult.diff.unchanged.length} 项未变更（已折叠）
              </div>
            )}
          </div>
        </div>
      )}

      {productId && snapshots.length === 0 && (
        <div className="bg-surface-1 border border-border-default rounded-lg p-12 text-center">
          <div className="text-text-muted text-sm">该产品暂无快照数据</div>
        </div>
      )}
    </div>
  );
}
