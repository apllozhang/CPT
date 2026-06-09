import { useState } from "react";

const NAV_ITEMS = [
  { id: "competitors", label: "竞品源管理", icon: "◎", desc: "Competitors" },
  { id: "products", label: "产品对比", icon: "▦", desc: "Products" },
  { id: "diff", label: "变更追踪", icon: "⇄", desc: "Changes" },
  { id: "crawllog", label: "采集日志", icon: "↻", desc: "Crawl Log" },
  { id: "groups", label: "分组管理", icon: "⊞", desc: "Groups" },
];

interface SidebarProps {
  active: string;
  onNavigate: (id: string) => void;
}

export default function Sidebar({ active, onNavigate }: SidebarProps) {
  return (
    <aside className="w-60 bg-surface-1 border-r border-border-default flex flex-col">
      {/* Logo area */}
      <div className="h-14 px-5 flex items-center gap-3 border-b border-border-default">
        <div className="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center text-[11px] font-bold text-white">
          CA
        </div>
        <div>
          <div className="text-[13px] font-semibold tracking-tight text-text-primary">竞品分析</div>
          <div className="text-[10px] text-text-muted -mt-0.5">Competitor Analysis</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-[13px] flex items-center gap-3 transition-all ${
                isActive
                  ? "bg-brand-600/15 text-brand-400 font-medium"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-3"
              }`}
            >
              <span className={`text-[11px] w-5 text-center ${isActive ? "text-brand-400" : "text-text-muted"}`}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-3 border-t border-border-default">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-surface-4 flex items-center justify-center text-[10px] text-text-muted">
            U
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] text-text-secondary truncate">本地用户</div>
            <div className="text-[10px] text-text-muted">V1 · 单人版</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
