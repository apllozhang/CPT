import { useState } from "react";
import { trpc } from "../../App";

export default function GroupManager() {
  const utils = trpc.useUtils();
  const { data: groups = [], isLoading } = trpc.group.list.useQuery();
  const { data: competitors = [] } = trpc.competitor.list.useQuery({});

  const createMut = trpc.group.create.useMutation({
    onSuccess: () => { utils.group.list.invalidate(); setNewName(""); },
  });
  const deleteMut = trpc.group.delete.useMutation({
    onSuccess: () => utils.group.list.invalidate(),
  });

  const [newName, setNewName] = useState("");
  const ungrouped = competitors.filter((c) => !c.groupId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-muted text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Create */}
      <div className="bg-surface-1 border border-border-default rounded-lg p-4">
        <div className="text-[11px] text-text-muted uppercase tracking-wider mb-3">创建新分组</div>
        <div className="flex gap-3">
          <input
            placeholder="分组名称"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 px-3 py-2 bg-surface-2 border border-border-default rounded-md text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30"
          />
          <button
            onClick={() => newName && createMut.mutate({ name: newName })}
            disabled={!newName}
            className="px-4 py-2 text-[13px] font-medium bg-brand-600 hover:bg-brand-500 text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            + 创建
          </button>
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-3">
        {groups.map((g) => {
          const members = competitors.filter((c) => c.groupId === g.id);
          return (
            <div key={g.id} className="bg-surface-1 border border-border-default rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-brand-400 text-[11px]">⊞</span>
                  <span className="text-[14px] font-medium text-text-primary">{g.name}</span>
                  <span className="text-[11px] text-text-muted">({members.length})</span>
                </div>
                <button
                  onClick={() => deleteMut.mutate({ id: g.id })}
                  className="text-[11px] text-danger hover:bg-danger/10 px-2 py-1 rounded transition-colors"
                >
                  删除
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {members.length === 0 && (
                  <span className="text-[12px] text-text-muted italic">暂无成员</span>
                )}
                {members.map((c) => (
                  <span
                    key={c.id}
                    className="px-2.5 py-1 bg-surface-3 border border-border-default rounded-md text-[12px] text-text-secondary"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}

        {/* Ungrouped */}
        {ungrouped.length > 0 && (
          <div className="bg-surface-1/50 border border-border-subtle rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-text-muted text-[11px]">○</span>
              <span className="text-[13px] text-text-muted">未分组</span>
              <span className="text-[11px] text-text-muted">({ungrouped.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ungrouped.map((c) => (
                <span
                  key={c.id}
                  className="px-2.5 py-1 bg-surface-2 border border-border-subtle rounded-md text-[12px] text-text-muted"
                >
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {groups.length === 0 && ungrouped.length === 0 && (
          <div className="bg-surface-1 border border-border-default rounded-lg p-12 text-center">
            <div className="text-text-muted text-sm">暂无分组和竞品源</div>
          </div>
        )}
      </div>
    </div>
  );
}
