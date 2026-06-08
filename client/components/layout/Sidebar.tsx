import { useState } from "react";

const NAV_ITEMS = [
  { id: "competitors", label: "竞品源管理", icon: "◉" },
  { id: "products", label: "产品对比", icon: "☰" },
  { id: "diff", label: "变更历史", icon: "⇄" },
  { id: "crawllog", label: "采集历史", icon: "↻" },
  { id: "groups", label: "分组管理", icon: "⊞" },
];

interface SidebarProps {
  active: string;
  onNavigate: (id: string) => void;
}

export default function Sidebar({ active, onNavigate }: SidebarProps) {
  return (
    <aside className="w-56 border-r border-zinc-800 bg-zinc-900/50 flex flex-col">
      <div className="px-4 py-5 border-b border-zinc-800">
        <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-400">
          竞品分析
        </h2>
      </div>
      <nav className="flex-1 py-2">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
              active === item.id
                ? "bg-zinc-800/80 text-zinc-100 border-l-2 border-cyan-400"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border-l-2 border-transparent"
            }`}
          >
            <span className="text-xs opacity-60">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-zinc-800 text-[10px] text-zinc-600">
        Competitor Analysis v0.1
      </div>
    </aside>
  );
}
