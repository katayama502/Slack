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
const COLORS: Record<ToastType, { bg: string; border: string; icon: React.ReactNode }> = {
  error: {
    bg: '#FFF0F0',
    border: '#FFCDD2',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#E01E5A' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  success: {
    bg: '#F0FFF4',
    border: '#BBF7D0',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#007A5A' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  info: {
    bg: '#F0F8FF',
    border: '#BFDBFE',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#1264A3' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
  },
};

function ToastInner({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const c = COLORS[item.type];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-lg text-[13px] transition-all"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: '#1D1C1D',
        maxWidth: '360px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transitionDuration: '200ms',
      }}
    >
      {c.icon}
      <span className="flex-1">{item.message}</span>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 ml-1 opacity-50 hover:opacity-100 transition-opacity"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
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
      className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-[9999] pointer-events-none"
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
