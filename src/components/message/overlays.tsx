// ─────────────────────────────────────────────────────────────────────────────
// メッセージ周りで共通に使うオーバーレイ部品（ThreadPanel などからも再利用可）
//   - Tooltip           : Slack 風の黒いツールチップ（約 300ms 遅延・ポータル描画）
//   - EmojiPickerPortal : アンカー矩形の近くに EmojiPicker をポータル表示（画面内に収める）
//   - PopoverMenu       : Slack 風ドロップダウンメニュー（区切り線・危険項目・ホバー青）
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect, useLayoutEffect, type ReactNode } from 'react';
import ReactDOM from 'react-dom';
import EmojiPicker from '../ui/EmojiPicker';

// ─── Tooltip ────────────────────────────────────────────────────────────────
export interface TooltipProps {
  label: ReactNode;
  children: ReactNode;
  /** 表示までの遅延 ms（既定 300） */
  delay?: number;
  /** true の間は表示しない（メニューを開いている時など） */
  disabled?: boolean;
  className?: string;
}

export function Tooltip({ label, children, delay = 300, disabled, className = '' }: TooltipProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const show = () => {
    if (disabled) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (wrapRef.current) setAnchor(wrapRef.current.getBoundingClientRect());
    }, delay);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setAnchor(null);
    setPos(null);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => { if (disabled) hide(); }, [disabled]);

  // 実寸を測ってから位置決め（上が足りなければ下に出す・左右は画面内にクランプ）
  useLayoutEffect(() => {
    if (!anchor || !tipRef.current) return;
    const w = tipRef.current.offsetWidth;
    const h = tipRef.current.offsetHeight;
    let left = anchor.left + anchor.width / 2 - w / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    let top = anchor.top - h - 6;
    if (top < 8) top = anchor.bottom + 6;
    setPos({ left, top });
  }, [anchor]);

  return (
    <span
      ref={wrapRef}
      className={`inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onMouseDown={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {anchor && ReactDOM.createPortal(
        <div
          ref={tipRef}
          role="tooltip"
          className="fixed pointer-events-none text-center"
          style={{
            left: pos?.left ?? -9999,
            top: pos?.top ?? -9999,
            zIndex: 1000,
            maxWidth: 260,
            background: '#1D1C1D',
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 700,
            lineHeight: '16px',
            padding: '6px 8px',
            borderRadius: 6,
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
          }}
        >
          {label}
        </div>,
        document.body
      )}
    </span>
  );
}

// ─── 位置決めヘルパー ─────────────────────────────────────────────────────────
/** アンカーの下（入らなければ上）に w×h の箱を置き、画面内にクランプした左上座標を返す */
export function placeNear(anchor: DOMRect, w: number, h: number, align: 'left' | 'right' = 'left') {
  let left = align === 'right' ? anchor.right - w : anchor.left;
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
  let top = anchor.bottom + 4;
  if (top + h > window.innerHeight - 8) {
    const above = anchor.top - h - 4;
    top = above >= 8 ? above : Math.max(8, window.innerHeight - h - 8);
  }
  return { left, top };
}

// ─── EmojiPickerPortal ──────────────────────────────────────────────────────
export function EmojiPickerPortal({
  anchorRect,
  onSelect,
  onClose,
}: {
  anchorRect: DOMRect;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  const { left, top } = placeNear(anchorRect, 316, 420, 'right');
  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0" style={{ zIndex: 900 }} onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div className="fixed" style={{ top, left, zIndex: 901 }}>
        <EmojiPicker onSelect={onSelect} onClose={onClose} />
      </div>
    </>,
    document.body
  );
}

// ─── PopoverMenu ────────────────────────────────────────────────────────────
export type MenuItem =
  | { type?: 'item'; label: string; onClick: () => void; danger?: boolean; icon?: ReactNode; hint?: string }
  | { type: 'separator' };

export function PopoverMenu({
  anchorRect,
  items,
  onClose,
  width = 260,
  align = 'right',
}: {
  anchorRect: DOMRect;
  items: MenuItem[];
  onClose: () => void;
  width?: number;
  align?: 'left' | 'right';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const estH = items.reduce((h, it) => h + (it.type === 'separator' ? 17 : 28), 16);
  const [pos, setPos] = useState(() => placeNear(anchorRect, width, estH, align));

  useLayoutEffect(() => {
    if (ref.current) setPos(placeNear(anchorRect, width, ref.current.offsetHeight, align));
  }, [anchorRect, width, align]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0" style={{ zIndex: 900 }} onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        ref={ref}
        role="menu"
        className="fixed flex flex-col"
        style={{
          ...pos,
          width,
          zIndex: 901,
          padding: '8px 0',
          background: '#FFFFFF',
          border: '1px solid var(--sk-border)',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.02)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((it, i) =>
          it.type === 'separator' ? (
            <div key={`sep-${i}`} style={{ height: 1, margin: '8px 0', background: 'var(--sk-border)' }} />
          ) : (
            <button
              key={it.label}
              role="menuitem"
              type="button"
              onClick={() => { onClose(); it.onClick(); }}
              className="flex items-center gap-2 w-full text-left"
              style={{
                height: 28,
                padding: '0 24px 0 16px',
                fontSize: 14,
                color: it.danger ? 'var(--sk-red)' : 'var(--sk-text)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = it.danger ? 'var(--sk-red)' : 'var(--sk-link)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = it.danger ? 'var(--sk-red)' : 'var(--sk-text)';
              }}
            >
              {it.icon && <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">{it.icon}</span>}
              <span className="flex-1 truncate">{it.label}</span>
              {it.hint && <span className="text-[12px] opacity-70">{it.hint}</span>}
            </button>
          )
        )}
      </div>
    </>,
    document.body
  );
}

// ─── Modal shell ────────────────────────────────────────────────────────────
/** Slack 風モーダルの外枠（オーバーレイ・角丸 8px・Esc で閉じる・タイトル + ×） */
export function ModalShell({
  title,
  onClose,
  children,
  footer,
  width = 520,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 950, background: 'rgba(0,0,0,0.5)', padding: 16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex flex-col"
        style={{
          width,
          maxWidth: '100%',
          maxHeight: 'calc(100vh - 64px)',
          background: '#FFFFFF',
          borderRadius: 8,
          boxShadow: '0 18px 48px rgba(0,0,0,0.35)',
        }}
      >
        <div className="flex items-center justify-between flex-shrink-0" style={{ padding: '20px 20px 12px 28px' }}>
          <h2 className="text-[22px] font-black" style={{ color: 'var(--sk-text)', lineHeight: '28px' }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="w-9 h-9 flex items-center justify-center"
            style={{ borderRadius: 8, color: 'var(--sk-text-2)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sk-subtle)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ padding: '0 28px 8px' }}>{children}</div>
        {footer && (
          <div className="flex items-center gap-3 flex-shrink-0" style={{ padding: '16px 28px 24px' }}>{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}

/** Slack 風ボタン（白枠 / 緑 / 赤） */
export function SkButton({
  variant = 'default',
  children,
  disabled,
  onClick,
  type = 'button',
}: {
  variant?: 'default' | 'primary' | 'danger';
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  const base: Record<string, { bg: string; hover: string; color: string; border: string }> = {
    default: { bg: '#FFFFFF', hover: 'var(--sk-hover)', color: 'var(--sk-text)', border: 'var(--sk-border-strong)' },
    primary: { bg: 'var(--sk-green)', hover: 'var(--sk-green-hover)', color: '#FFFFFF', border: 'transparent' },
    danger: { bg: 'var(--sk-red)', hover: 'var(--sk-red)', color: '#FFFFFF', border: 'transparent' },
  };
  const c = base[variant];
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="text-[15px] font-bold whitespace-nowrap"
      style={{
        height: 36,
        padding: '0 16px',
        borderRadius: 8,
        background: disabled && variant !== 'default' ? 'var(--sk-subtle)' : c.bg,
        color: disabled && variant !== 'default' ? 'var(--sk-text-3)' : c.color,
        border: `1px solid ${disabled && variant !== 'default' ? 'transparent' : c.border}`,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'background 100ms',
      }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = c.hover; if (variant === 'danger') e.currentTarget.style.filter = 'brightness(0.92)'; } }}
      onMouseLeave={(e) => { if (!disabled) { e.currentTarget.style.background = c.bg; e.currentTarget.style.filter = 'none'; } }}
    >
      {children}
    </button>
  );
}
