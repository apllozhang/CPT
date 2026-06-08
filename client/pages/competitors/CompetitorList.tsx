import { useState } from "react";
import { trpc } from "../../App";

export default function CompetitorList() {
  const utils = trpc.useUtils();
  const { data: competitors = [], isLoading } = trpc.competitor.list.useQuery({});
  const { data: groups = [] } = trpc.group.list.useQuery();

  const createMut = trpc.competitor.create.useMutation({
    onSuccess: () => { utils.competitor.list.invalidate(); setShowForm(false); },
  });
  const deleteMut = trpc.competitor.delete.useMutation({
    onSuccess: () => utils.competitor.list.invalidate(),
  });
  const triggerMut = trpc.crawlLog.trigger.useMutation({
    onSuccess: () => utils.competitor.list.invalidate(),
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", groupId: 0, scheduleCron: "0 0 * * *" });
  const [crawlResult, setCrawlResult] = useState<string | null>(null);

  const handleCreate = () => {
    createMut.mutate({
      name: form.name,
      url: form.url,
      groupId: form.groupId || undefined,
      scheduleCron: form.scheduleCron,
    });
  };

  const handleTrigger = async (id: number) => {
    const res = await triggerMut.mutateAsync({ competitorId: id });
    setCrawlResult(`采集完成：共 ${res.total} 产品，${res.new} 新增，${res.changed} 变更，耗时 ${res.durationMs}ms`);
    setTimeout(() => setCrawlResult(null), 5000);
  };

  if (isLoading) return <div className="text-zinc-500">加载中...</div>;

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <span className="text-zinc-500 text-xs">{competitors.length} 个竞品源</span>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 transition-colors"
        >
          + 添加竞品
        </button>
      </div>

      {/* Toast */}
      {crawlResult && (
        <div className="p-3 bg-cyan-900/30 border border-cyan-800 rounded text-cyan-300 text-xs">
          {crawlResult}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="竞品名称"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:border-cyan-600"
            />
            <input
              placeholder="产品页 URL"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:border-cyan-600"
            />
            <select
              value={form.groupId}
              onChange={(e) => setForm({ ...form, groupId: Number(e.target.value) })}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm"
            >
              <option value={0}>无分组</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <select
              value={form.scheduleCron}
              onChange={(e) => setForm({ ...form, scheduleCron: e.target.value })}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm"
            >
              <option value="0 * * * *">每小时</option>
              <option value="0 */6 * * *">每 6 小时</option>
              <option value="0 */12 * * *">每 12 小时</option>
              <option value="0 0 * * *">每天</option>
              <option value="0 0 * * 1">每周</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!form.name || !form.url}
              className="px-4 py-1.5 text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white rounded disabled:opacity-40 transition-colors"
            >
              保存
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="grid gap-3">
        {competitors.map((c) => (
          <div
            key={c.id}
            className="p-4 bg-zinc-900/60 border border-zinc-800 rounded flex items-center justify-between hover:border-zinc-700 transition-colors"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    c.status === "active"
                      ? "bg-green-500"
                      : c.status === "paused"
                      ? "bg-zinc-500"
                      : "bg-red-500"
                  }`}
                />
                <span className="font-semibold">{c.name}</span>
              </div>
              <div className="text-xs text-zinc-500 mt-1 truncate">{c.url}</div>
              <div className="text-[10px] text-zinc-600 mt-1">
                {c.scheduleCron} {c.scheduleEnabled ? "· 定时启用" : "· 定时禁用"}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleTrigger(c.id)}
                className="px-2.5 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors"
              >
                ↻ 采集
              </button>
              <button
                onClick={() => deleteMut.mutate({ id: c.id })}
                className="px-2.5 py-1 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        ))}
        {competitors.length === 0 && (
          <div className="text-center text-zinc-600 py-12 text-xs">
            暂无竞品源，点击「+ 添加竞品」开始
          </div>
        )}
      </div>
    </div>
  );
}
