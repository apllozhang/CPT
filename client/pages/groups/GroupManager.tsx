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

  if (isLoading) return <div className="text-zinc-500">加载中...</div>;

  return (
    <div className="space-y-4">
      {/* Create */}
      <div className="flex gap-2">
        <input
          placeholder="新分组名称"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs w-48 focus:outline-none focus:border-cyan-600"
        />
        <button
          onClick={() => newName && createMut.mutate({ name: newName })}
          disabled={!newName}
          className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded disabled:opacity-40 transition-colors"
        >
          + 创建分组
        </button>
      </div>

      {/* Groups */}
      <div className="grid gap-3">
        {groups.map((g) => {
          const members = competitors.filter((c) => c.groupId === g.id);
          return (
            <div key={g.id} className="p-4 bg-zinc-900/60 border border-zinc-800 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">{g.name}</span>
                <button
                  onClick={() => deleteMut.mutate({ id: g.id })}
                  className="text-[10px] text-red-400 hover:text-red-300"
                >
                  删除分组
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {members.length === 0 && (
                  <span className="text-[10px] text-zinc-600">暂无成员</span>
                )}
                {members.map((c) => (
                  <span
                    key={c.id}
                    className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-300"
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
          <div className="p-4 bg-zinc-900/30 border border-zinc-800/50 rounded">
            <span className="text-zinc-500 text-xs font-medium">未分组</span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {ungrouped.map((c) => (
                <span
                  key={c.id}
                  className="px-2 py-0.5 bg-zinc-800/50 border border-zinc-800 rounded text-[10px] text-zinc-500"
                >
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {groups.length === 0 && ungrouped.length === 0 && (
          <div className="text-center text-zinc-600 text-xs py-8">
            暂无分组和竞品源
          </div>
        )}
      </div>
    </div>
  );
}
