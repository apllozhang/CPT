interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="h-14 bg-surface-1 border-b border-border-default flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-[15px] font-semibold tracking-tight text-text-primary">{title}</h1>
        {subtitle && <span className="text-[12px] text-text-muted">·</span>}
        {subtitle && <span className="text-[12px] text-text-muted">{subtitle}</span>}
      </div>
      <div className="flex items-center gap-2">
        {actions}
      </div>
    </header>
  );
}
