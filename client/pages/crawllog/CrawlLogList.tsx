import { trpc } from "../../App";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  completed: { label: "成功", color: "text-green-400 bg-green-900/20" },
  partial: { label: "部分成功", color: "text-yellow-400 bg-yellow-900/20" },
  failed: { label: "失败", color: "text-red-400 bg-red-900/20" },
};

export default function CrawlLogList() {
  const { data: logs = [], isLoading } = trpc.crawlLog.list.useQuery({});
  const { data: competitors = [] } = trpc.competitor.list.useQuery({});

  const compMap = Object.fromEntries(competitors.map((c) => [c.id, c.name]));

  if (isLoading) return <div className="text-zinc-500">加载中...</div>;

  return (
    <div className="space-y-2">
      <div className="text-zinc-500 text-xs mb-3">{logs.length} 条记录</div>
      <div className="border border-zinc-800 rounded overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-900/80 border-b border-zinc-800">
              <th className="px-3 py-2 text-left text-zinc-400 font-medium">时间</th>
              <th className="px-3 py-2 text-left text-zinc-400 font-medium">竞品</th>
              <th className="px-3 py-2 text-left text-zinc-400 font-medium">触发</th>
              <th className="px-3 py-2 text-left text-zinc-400 font-medium">状态</th>
              <th className="px-3 py-2 text-right text-zinc-400 font-medium">产品数</th>
              <th className="px-3 py-2 text-right text-zinc-400 font-medium">新增</th>
              <th className="px-3 py-2 text-right text-zinc-400 font-medium">变更</th>
              <th className="px-3 py-2 text-right text-zinc-400 font-medium">耗时</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => {
              const st = STATUS_LABEL[l.status] ?? STATUS_LABEL.completed;
              return (
                <tr key={l.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-3 py-2 text-zinc-300">
                    {new Date(l.startedAt).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">{compMap[l.competitorId] ?? `#${l.competitorId}`}</td>
                  <td className="px-3 py-2 text-zinc-500">{l.triggerType === "manual" ? "手动" : "定时"}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${st.color}`}>{st.label}</span>
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-300">{l.productsFound}</td>
                  <td className="px-3 py-2 text-right text-green-400">{l.productsNew}</td>
                  <td className="px-3 py-2 text-right text-yellow-400">{l.productsChanged}</td>
                  <td className="px-3 py-2 text-right text-zinc-500">{l.durationMs ? `${(l.durationMs / 1000).toFixed(1)}s` : "—"}</td>
                </tr>
              );
            })}
            {logs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-12 text-center text-zinc-600">
                  暂无采集记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Compliance notice */}
      <div className="text-[10px] text-zinc-600 border-t border-zinc-800 pt-2 mt-4">
        ⚠ 本工具仅用于采集公开可访问的网站数据，请确保使用行为符合相关法律法规及网站使用条款。
      </div>
    </div>
  );
}
