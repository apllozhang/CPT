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
  const [toast, setToast] = useState<string | null>(null);

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
    setToast(`采集完成：${res.total} 产品，${res.new} 新增，${res.changed} 变更，${(res.durationMs / 1000).toFixed(1)}s`);
    setTimeout(() => setToast(null), 5000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-muted text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "竞品源", value: competitors.length, color: "text-brand-400" },
          { label: "运行中", value: competitors.filter((c) => c.status === "active").length, color: "text-success" },
          { label: "已暂停", value: competitors.filter((c) => c.status === "paused").length, color: "text-text-muted" },
          { label: "异常", value: competitors.filter((c) => c.status === "error").length, color: "text-danger" },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface-1 border border-border-default rounded-lg p-4">
            <div className="text-[11px] text-text-muted uppercase tracking-wider">{stat.label}</div>
            <div className={`text-2xl font-semibold mt-1 ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="text-[13px] text-text-muted">
          共 {competitors.length} 个竞品源
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-[13px] font-medium bg-brand-600 hover:bg-brand-500 text-white rounded-md transition-colors shadow-sm"
        >
          + 添加竞品源
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="px-4 py-3 bg-success/10 border border-success/30 rounded-lg text-success text-[13px] flex items-center gap-2">
          <span className="text-[10px]">✓</span>
          {toast}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-surface-1 border border-border-default rounded-lg p-5 space-y-4">
          <div className="text-[13px] font-medium text-text-primary mb-3">添加新竞品源</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] text-text-muted uppercase tracking-wider">竞品名称</label>
              <input
                placeholder="如：H3C WLAN"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 bg-surface-2 border border-border-default rounded-md text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-text-muted uppercase tracking-wider">产品页 URL</label>
              <input
                placeholder="https://..."
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="w-full px-3 py-2 bg-surface-2 border border-border-default rounded-md text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-text-muted uppercase tracking-wider">分组</label>
              <select
                value={form.groupId}
                onChange={(e) => setForm({ ...form, groupId: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-2 border border-border-default rounded-md text-[13px] text-text-primary focus:outline-none focus:border-brand-500"
              >
                <option value={0}>无分组</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-text-muted uppercase tracking-wider">采集频率</label>
              <select
                value={form.scheduleCron}
                onChange={(e) => setForm({ ...form, scheduleCron: e.target.value })}
                className="w-full px-3 py-2 bg-surface-2 border border-border-default rounded-md text-[13px] text-text-primary focus:outline-none focus:border-brand-500"
              >
                <option value="0 * * * *">每小时</option>
                <option value="0 */6 * * *">每 6 小时</option>
                <option value="0 */12 * * *">每 12 小时</option>
                <option value="0 0 * * *">每天</option>
                <option value="0 0 * * 1">每周</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCreate}
              disabled={!form.name || !form.url}
              className="px-5 py-2 text-[13px] font-medium bg-brand-600 hover:bg-brand-500 text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              保存
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-5 py-2 text-[13px] text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-md transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-2">
        {competitors.map((c) => (
          <div
            key={c.id}
            className="bg-surface-1 border border-border-default rounded-lg p-4 hover:border-border-strong transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  c.status === "active" ? "bg-success" :
                  c.status === "paused" ? "bg-text-muted" : "bg-danger"
                }`} />
                <div className="min-w-0">
                  <div className="text-[14px] font-medium text-text-primary">{c.name}</div>
                  <div className="text-[12px] text-text-muted truncate mt-0.5">{c.url}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleTrigger(c.id)}
                  className="px-3 py-1.5 text-[11px] font-medium bg-surface-3 hover:bg-surface-4 border border-border-default rounded-md transition-colors"
                >
                  ↻ 立即采集
                </button>
                <button
                  onClick={() => deleteMut.mutate({ id: c.id })}
                  className="px-3 py-1.5 text-[11px] text-danger hover:bg-danger/10 border border-danger/30 rounded-md transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border-subtle">
              <div className="text-[11px] text-text-muted">
                频率：<span className="text-text-secondary">{c.scheduleCron}</span>
              </div>
              <div className="text-[11px] text-text-muted">
                状态：<span className={c.scheduleEnabled ? "text-success" : "text-text-muted"}>
                  {c.scheduleEnabled ? "定时启用" : "定时禁用"}
                </span>
              </div>
            </div>
          </div>
        ))}
        {competitors.length === 0 && (
          <div className="bg-surface-1 border border-border-default rounded-lg p-12 text-center">
            <div className="text-text-muted text-sm">暂无竞品源</div>
            <div className="text-text-muted text-[12px] mt-1">点击「+ 添加竞品源」开始监控</div>
          </div>
        )}
      </div>
    </div>
  );
}
