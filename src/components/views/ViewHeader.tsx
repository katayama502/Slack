// メインペイン用のビューヘッダー（チャンネルヘッダー 1 行目と同じ 49px）
import { useAppStore } from '../../store/useAppStore';

export default function ViewHeader({ title, icon, children }: { title: string; icon?: React.ReactNode; children?: React.ReactNode }) {
  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen);
  return (
    <header className="flex items-center gap-2 px-5 flex-shrink-0" style={{ height: 49, borderBottom: '1px solid var(--sk-border)' }}>
      <button
        type="button"
        aria-label="サイドバーを開く"
        onClick={() => setMobileSidebarOpen(true)}
        className="md:hidden -ml-2 w-8 h-8 flex items-center justify-center rounded-md text-[var(--sk-text-2)] hover:bg-[var(--sk-subtle)]"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" /></svg>
      </button>
      {icon && <span className="flex text-[var(--sk-text)]">{icon}</span>}
      <h1 className="text-[18px] text-[var(--sk-text)] truncate" style={{ fontWeight: 900 }}>{title}</h1>
      <div className="flex-1" />
      {children}
    </header>
  );
}

/** 2px 下線タブ（チャンネルタブと同じ見た目） */
export function ViewTabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex items-end gap-5 px-5 flex-shrink-0" style={{ height: 36, borderBottom: '1px solid var(--sk-border)' }}>
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className="h-full flex items-center gap-1 text-[13px] font-bold transition-colors"
            style={{
              color: active ? 'var(--sk-text)' : 'var(--sk-text-2)',
              boxShadow: active ? 'inset 0 -2px 0 var(--sk-accent)' : undefined,
            }}
          >
            {t.label}
            {t.count != null && t.count > 0 && <span className="font-normal text-[var(--sk-text-2)]">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ icon, title, body, children }: { icon?: React.ReactNode; title: string; body?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 py-16 gap-2 h-full">
      {icon && <div className="w-16 h-16 mb-2 flex items-center justify-center rounded-2xl text-[var(--sk-text-2)]" style={{ background: 'var(--sk-subtle)' }}>{icon}</div>}
      <p className="text-[18px] text-[var(--sk-text)]" style={{ fontWeight: 900 }}>{title}</p>
      {body && <p className="text-[15px] leading-[22px] text-[var(--sk-text-2)] max-w-[420px]">{body}</p>}
      {children}
    </div>
  );
}
