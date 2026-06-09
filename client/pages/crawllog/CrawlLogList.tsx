import { trpc } from "../../App";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  completed: { label: "成功", bg: "bg-success/10", text: "text-success", dot: "bg-success" },
  partial: { label: "部分成功", bg: "bg-warning/10", text: "text-warning", dot: "bg-warning" },
  failed: { label: "失败", bg: "bg-danger/10", text: "text-danger", dot: "bg-danger" },
};

export default function CrawlLogList() {
  const { data: logs = [], isLoading } = trpc.crawlLog.list.useQuery({});
  const { data: competitors = [] } = trpc.competitor.list.useQuery({});
  const compMap = Object.fromEntries(competitors.map((c) => [c.id, c.name]));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-muted text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "总记录", value: logs.length, color: "text-text-primary" },
          { label: "成功", value: logs.filter((l) => l.status === "completed").length, color: "text-success" },
          { label: "部分成功", value: logs.filter((l) => l.status === "partial").length, color: "text-warning" },
          { label: "失败", value: logs.filter((l) => l.status === "failed").length, color: "text-danger" },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface-1 border border-border-default rounded-lg p-4">
            <div className="text-[11px] text-text-muted uppercase tracking-wider">{stat.label}</div>
            <div className={`text-2xl font-semibold mt-1 ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-1 border border-border-default rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border-default">
                {["时间", "竞品", "触发方式", "状态", "产品数", "新增", "变更", "耗时"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider bg-surface-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {logs.map((l, i) => {
                const st = STATUS_CONFIG[l.status] ?? STATUS_CONFIG.completed;
                return (
                  <tr key={l.id} className={`hover:bg-surface-2 transition-colors ${i % 2 === 0 ? "" : "bg-surface-1/50"}`}>
                    <td className="px-4 py-3 text-text-secondary font-mono text-[12px]">
                      {new Date(l.startedAt).toLocaleString("zh-CN")}
                    </td>
                    <td className="px-4 py-3 text-text-primary">
                      {compMap[l.competitorId] ?? `#${l.competitorId}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] ${
                        l.triggerType === "manual" ? "bg-surface-3 text-text-muted" : "bg-brand-600/10 text-brand-400"
                      }`}>
                        {l.triggerType === "manual" ? "手动" : "定时"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] ${st.bg} ${st.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary font-mono">{l.productsFound}</td>
                    <td className="px-4 py-3 text-success font-mono">{l.productsNew}</td>
                    <td className="px-4 py-3 text-warning font-mono">{l.productsChanged}</td>
                    <td className="px-4 py-3 text-text-muted font-mono text-[12px]">
                      {l.durationMs ? `${(l.durationMs / 1000).toFixed(1)}s` : "—"}
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="text-text-muted text-sm">暂无采集记录</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance */}
      <div className="text-[11px] text-text-muted text-center py-2">
        ⚠ 本工具仅用于采集公开可访问的网站数据，请确保使用行为符合相关法律法规
      </div>
    </div>
  );
}
