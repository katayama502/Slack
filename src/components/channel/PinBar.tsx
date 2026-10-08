// ─────────────────────────────────────────────────────────────────────────────
// ブックマークバー（Slack 準拠）: タブ行の下に表示される 32px の細い行。
// データは channels/{id}/pins コレクション（既存の Pin 型）を使用。
// ブックマークが無い場合は何も描画しない（'open-add-bookmark' イベントで追加フォームを開く）。
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import { subscribeToPins, addPin, deletePin, updatePin } from '../../services';
import { toast } from '../ui/Toast';
import { LinkIcon, PlusIcon, PencilIcon, TrashIcon, CopyIcon } from '../ui/icons';
import type { Pin } from '../../types';

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

function safeOpen(url: string) {
  const n = normalizeUrl(url);
  if (n) window.open(n, '_blank', 'noopener,noreferrer');
  else toast.error('このリンクは開けません');
}

// ─── Bookmark form (popover) ─────────────────────────────────────────────────
function BookmarkForm({
  anchor,
  initial,
  title,
  onSave,
  onCancel,
}: {
  anchor: DOMRect | null;
  initial?: { name: string; url: string };
  title: string;
  onSave: (name: string, url: string) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState(initial?.url ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const urlRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    urlRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeUrl(url);
    if (!normalized) { setError('http(s) の URL を入力してください'); return; }
    let label = name.trim();
    if (!label) {
      try { label = new URL(normalized).hostname; } catch { label = normalized; }
    }
    onSave(label.slice(0, 80), normalized);
  };

  const top = anchor ? anchor.bottom + 4 : 120;
  const left = anchor ? Math.max(8, Math.min(anchor.left, window.innerWidth - 368)) : 80;

  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onCancel} />
      <form
        onSubmit={submit}
        className="fixed z-50 bg-white p-4 flex flex-col gap-3"
        style={{
          top,
          left,
          width: 360,
          maxWidth: 'calc(100vw - 16px)',
          border: '1px solid var(--sk-border)',
          borderRadius: 'var(--sk-radius-card)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          animation: 'popIn 120ms ease',
        }}
      >
        <p className="text-[15px] font-black" style={{ color: 'var(--sk-text)' }}>{title}</p>
        <label className="flex flex-col gap-1">
          <span className="text-[13px] font-bold" style={{ color: 'var(--sk-text)' }}>リンク</span>
          <input
            ref={urlRef}
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); }}
            placeholder="https://example.com"
            className="h-[36px] px-2.5 text-[15px] rounded-md focus:outline-none"
            style={{ border: `1px solid ${error ? 'var(--sk-red)' : 'var(--sk-border-strong)'}`, color: 'var(--sk-text)' }}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[13px] font-bold" style={{ color: 'var(--sk-text)' }}>名前 <span className="font-normal" style={{ color: 'var(--sk-text-2)' }}>（任意）</span></span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ブックマークの名前"
            maxLength={80}
            className="h-[36px] px-2.5 text-[15px] rounded-md focus:outline-none"
            style={{ border: '1px solid var(--sk-border-strong)', color: 'var(--sk-text)' }}
          />
        </label>
        {error && <p className="text-[13px]" style={{ color: 'var(--sk-red)' }}>{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-[32px] px-3 text-[13px] font-bold rounded-md bg-white hover:bg-[var(--sk-hover)]"
            style={{ border: '1px solid var(--sk-border-strong)', color: 'var(--sk-text)' }}
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={!url.trim()}
            className="h-[32px] px-3 text-[13px] font-bold rounded-md text-white disabled:opacity-50"
            style={{ background: 'var(--sk-green)' }}
          >
            {initial ? '保存する' : '追加'}
          </button>
        </div>
      </form>
    </>,
    document.body
  );
}

// ─── Bookmark context menu ───────────────────────────────────────────────────
function BookmarkMenu({
  anchor,
  canEdit,
  onEdit,
  onCopy,
  onDelete,
  onClose,
}: {
  anchor: DOMRect;
  canEdit: boolean;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const item = 'flex items-center gap-2 w-full h-[28px] px-4 text-[15px] text-left';
  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        role="menu"
        className="fixed z-50 bg-white py-2"
        style={{
          top: anchor.bottom + 4,
          left: Math.max(8, Math.min(anchor.left, window.innerWidth - 228)),
          width: 220,
          border: '1px solid var(--sk-border)',
          borderRadius: 'var(--sk-radius-card)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        }}
      >
        <button role="menuitem" onClick={onCopy} className={`${item} text-[color:var(--sk-text)] hover:bg-[var(--sk-link)] hover:text-white`}>
          <CopyIcon className="w-4 h-4" />リンクをコピー
        </button>
        {canEdit && (
          <>
            <button role="menuitem" onClick={onEdit} className={`${item} text-[color:var(--sk-text)] hover:bg-[var(--sk-link)] hover:text-white`}>
              <PencilIcon className="w-4 h-4" />編集する
            </button>
            <div className="my-2" style={{ borderTop: '1px solid var(--sk-border)' }} />
            <button role="menuitem" onClick={onDelete} className={`${item} text-[color:var(--sk-red)] hover:bg-[var(--sk-red)] hover:text-white`}>
              <TrashIcon className="w-4 h-4" />削除する
            </button>
          </>
        )}
      </div>
    </>,
    document.body
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PinBar() {
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const { user } = useAppStore((s) => s.auth);

  const [pins, setPins] = useState<Pin[]>([]);
  const [form, setForm] = useState<{ mode: 'add' } | { mode: 'edit'; pin: Pin } | null>(null);
  const [formAnchor, setFormAnchor] = useState<DOMRect | null>(null);
  const [menu, setMenu] = useState<{ pin: Pin; anchor: DOMRect } | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!activeChannelId) return;
    setPins([]);
    setForm(null);
    setMenu(null);
    const unsub = subscribeToPins(
      activeChannelId,
      setPins,
      (err) => console.error('Pin load error:', err)
    );
    return () => unsub();
  }, [activeChannelId]);

  // ヘッダーの「+」から追加フォームを開く
  useEffect(() => {
    const handler = () => {
      setMenu(null);
      setForm({ mode: 'add' });
      // バーが無い（ブックマーク 0 件）場合はメイン上部付近に表示
      const rect = addBtnRef.current?.getBoundingClientRect() ?? barRef.current?.getBoundingClientRect() ?? null;
      setFormAnchor(rect);
    };
    window.addEventListener('open-add-bookmark', handler);
    return () => window.removeEventListener('open-add-bookmark', handler);
  }, []);

  if (!activeChannelId) return null;

  const handleSave = async (name: string, url: string) => {
    if (!activeChannelId || !user || !form) return;
    const current = form;
    setForm(null);
    try {
      if (current.mode === 'add') {
        await addPin(activeChannelId, name, url, user.uid, pins.length);
        toast.success('ブックマークを追加しました');
      } else {
        await updatePin(activeChannelId, current.pin.id, { name, url });
        toast.success('ブックマークを更新しました');
      }
    } catch (err) {
      console.error('Bookmark save error:', err);
      toast.error('ブックマークの保存に失敗しました');
    }
  };

  const handleDelete = async (pin: Pin) => {
    setMenu(null);
    if (!window.confirm(`ブックマーク「${pin.name}」を削除しますか？`)) return;
    try {
      await deletePin(activeChannelId, pin.id);
    } catch (err) {
      console.error('Delete pin error:', err);
      toast.error('削除に失敗しました');
    }
  };

  const handleCopy = async (pin: Pin) => {
    setMenu(null);
    try {
      await navigator.clipboard.writeText(pin.url);
      toast.success('リンクをコピーしました');
    } catch {
      toast.error('リンクのコピーに失敗しました');
    }
  };

  const formEl = form && (
    <BookmarkForm
      anchor={formAnchor}
      title={form.mode === 'add' ? 'ブックマークを追加する' : 'ブックマークを編集する'}
      initial={form.mode === 'edit' ? { name: form.pin.name, url: form.pin.url } : undefined}
      onSave={handleSave}
      onCancel={() => setForm(null)}
    />
  );

  if (pins.length === 0) {
    // バーは出さず、フォーム（ポータル）だけ表示
    return <div ref={barRef} className="h-0 flex-shrink-0">{formEl}</div>;
  }

  return (
    <div
      ref={barRef}
      className="flex-shrink-0 flex items-center h-[32px] px-3 md:px-4 gap-0.5 bg-white overflow-x-auto"
      style={{ borderBottom: '1px solid var(--sk-border)', scrollbarWidth: 'none' }}
    >
      {pins.map((pin) => {
        const canEdit = user?.uid === pin.createdBy;
        return (
          <button
            key={pin.id}
            onClick={() => safeOpen(pin.url)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({ pin, anchor: e.currentTarget.getBoundingClientRect() });
            }}
            title={`${pin.name}\n${pin.url}${canEdit ? '\n右クリックで編集・削除' : ''}`}
            className="flex items-center gap-1.5 h-[24px] px-2 rounded-md text-[13px] flex-shrink-0 hover:bg-[var(--sk-subtle)]"
            style={{ color: 'var(--sk-text-2)' }}
          >
            <span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0" style={{ background: 'var(--sk-subtle)', color: 'var(--sk-text-2)' }}>
              <LinkIcon className="w-3 h-3" />
            </span>
            <span className="max-w-[160px] truncate" style={{ color: 'var(--sk-text)' }}>{pin.name}</span>
          </button>
        );
      })}
      <button
        ref={addBtnRef}
        onClick={(e) => { setForm({ mode: 'add' }); setFormAnchor(e.currentTarget.getBoundingClientRect()); }}
        title="ブックマークを追加"
        aria-label="ブックマークを追加"
        className="w-[24px] h-[24px] flex items-center justify-center rounded-md flex-shrink-0 hover:bg-[var(--sk-subtle)]"
        style={{ color: 'var(--sk-text-2)' }}
      >
        <PlusIcon className="w-3.5 h-3.5" />
      </button>

      {menu && (
        <BookmarkMenu
          anchor={menu.anchor}
          canEdit={user?.uid === menu.pin.createdBy}
          onCopy={() => handleCopy(menu.pin)}
          onEdit={() => { const p = menu.pin; setFormAnchor(menu.anchor); setMenu(null); setForm({ mode: 'edit', pin: p }); }}
          onDelete={() => handleDelete(menu.pin)}
          onClose={() => setMenu(null)}
        />
      )}
      {formEl}
    </div>
  );
}
