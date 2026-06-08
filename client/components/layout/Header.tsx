interface HeaderProps {
  title: string;
  onManualCrawl?: () => void;
}

export default function Header({ title, onManualCrawl }: HeaderProps) {
  return (
    <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/30">
      <h1 className="text-base font-semibold tracking-tight">{title}</h1>
      {onManualCrawl && (
        <button
          onClick={onManualCrawl}
          className="px-3 py-1.5 text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors"
        >
          ↻ 立即采集
        </button>
      )}
    </header>
  );
}
