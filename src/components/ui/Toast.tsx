import { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';

export type ToastType = 'error' | 'success' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

// ─── Global toast state (module-level singleton) ──────────────────────────────
type Listener = (toasts: ToastItem[]) => void;
let _toasts: ToastItem[] = [];
const _listeners = new Set<Listener>();

function notify() {
  _listeners.forEach((fn) => fn([..._toasts]));
}

export const toast = {
  show(message: string, type: ToastType = 'info', durationMs = 3500) {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    _toasts = [..._toasts, { id, message, type }];
    notify();
    setTimeout(() => {
      _toasts = _toasts.filter((t) => t.id !== id);
      notify();
    }, durationMs);
  },
  error(message: string) { this.show(message, 'error'); },
  success(message: string) { this.show(message, 'success'); },
  info(message: string) { this.show(message, 'info'); },
};

// ─── Toast container component ────────────────────────────────────────────────
// Slack 風: ダークなカード（#1D1C1D）+ 白文字 + 種別ごとのアクセントアイコン
const ICON_COLOR: Record<ToastType, string> = {
  error: '#F27EA0',
  success: '#2BAC76',
  info: '#36C5F0',
};

function ToastIcon({ type }: { type: ToastType }) {
  const color = ICON_COLOR[type];
  if (type === 'success') {
    return (
      <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" fill={color} aria-hidden="true">
        <path d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19Zm4.3 7.2-5 5.5a.9.9 0 0 1-1.3 0l-2.3-2.4a.9.9 0 1 1 1.3-1.2l1.6 1.7 4.4-4.8a.9.9 0 0 1 1.3 1.2Z" />
      </svg>
    );
  }
  if (type === 'error') {
    return (
      <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" fill={color} aria-hidden="true">
        <path d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19Zm0 4.75a.95.95 0 0 1 .95.95v4.6a.95.95 0 1 1-1.9 0V8.2a.95.95 0 0 1 .95-.95Zm0 10.1a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3Z" />
      </svg>
    );
  }
  return (
    <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19Zm0 4.6a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Zm1 9.75a1 1 0 0 1-2 0v-5a1 1 0 0 1 2 0v5Z" />
    </svg>
  );
}

function ToastInner({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      role={item.type === 'error' ? 'alert' : 'status'}
      className="flex items-center gap-2.5 pl-3.5 pr-2 py-2.5 text-[14px]"
      style={{
        background: '#1D1C1D',
        color: '#FFFFFF',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.06)',
        maxWidth: '420px',
        lineHeight: '20px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 180ms ease, transform 180ms ease',
      }}
    >
      <ToastIcon type={item.type} />
      <span className="flex-1">{item.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="閉じる"
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded"
        style={{ color: 'rgba(255,255,255,0.7)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#FFFFFF'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: Listener = (t) => setToasts(t);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  const dismiss = useCallback((id: string) => {
    _toasts = _toasts.filter((t) => t.id !== id);
    notify();
  }, []);

  if (toasts.length === 0) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-[9999] pointer-events-none"
      style={{ minWidth: '280px' }}
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastInner item={t} onDismiss={() => dismiss(t.id)} />
        </div>
      ))}
    </div>,
    document.body
  );
}
