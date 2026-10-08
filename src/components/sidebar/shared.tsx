// ─────────────────────────────────────────────────────────────────────────────
// サイドバー / レール共通部品
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Timestamp } from 'firebase/firestore';
import { useAppStore } from '../../store/useAppStore';
import { getOrCreateDMChannel, getDMChannelName } from '../../services';
import { markChannelRead } from '../../hooks/useUnreadChannels';
import Avatar from '../ui/Avatar';
import { SearchIcon, CloseIcon, ChevronDownIcon } from '../ui/icons';
import type { Channel, User } from '../../types';

export const isDMChannel = (c: Pick<Channel, 'name'>) => c.name.startsWith('__dm__');

/** DM チャンネルの相手 uid（セルフ DM なら自分） */
export function dmPeerUid(channel: Channel, myUid: string): string {
  const other = (channel.members ?? []).find((m) => m !== myUid);
  if (other) return other;
  // members が欠けている場合は名前から推定
  const parts = channel.name.replace('__dm__', '').split('__');
  return parts.find((p) => p !== myUid) ?? myUid;
}

/** チャンネル表示ラベル（#name / DM 相手名） */
export function channelLabel(channel: Channel | undefined, users: User[], myUid?: string): string {
  if (!channel) return '';
  if (!isDMChannel(channel)) return `#${channel.name}`;
  if (!myUid) return 'DM';
  const peer = users.find((u) => u.uid === dmPeerUid(channel, myUid));
  return peer?.displayName ?? 'DM';
}

/** DM を開く（既存チャンネルがあれば即座に、なければ作成） */
export function useOpenDM() {
  const { user } = useAppStore((s) => s.auth);
  const addChannel = useAppStore((s) => s.addChannel);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const [loadingUid, setLoadingUid] = useState<string | null>(null);

  const openDM = useCallback(async (otherUid: string) => {
    if (!user) return;
    const dmName = getDMChannelName(user.uid, otherUid);
    const existing = useAppStore.getState().channels.find((c) => c.name === dmName);
    if (existing) {
      markChannelRead(existing.id);
      setActiveChannel(existing.id);
      return;
    }
    setLoadingUid(otherUid);
    try {
      const channelId = await getOrCreateDMChannel(user.uid, otherUid);
      if (!useAppStore.getState().channels.find((c) => c.id === channelId)) {
        addChannel({
          id: channelId,
          name: dmName,
          description: '',
          createdBy: user.uid,
          createdAt: Timestamp.now(),
          members: user.uid === otherUid ? [user.uid] : [user.uid, otherUid],
          isDM: true,
        });
      }
      markChannelRead(channelId);
      setActiveChannel(channelId);
    } catch (err) {
      console.error('DM open error:', err);
    } finally {
      setLoadingUid(null);
    }
  }, [user, addChannel, setActiveChannel]);

  return { openDM, loadingUid };
}

// ── トグルスイッチ（「未読」フィルタ等） ─────────────────────────────────────
export function ToggleSwitch({
  checked,
  onChange,
  label,
  dark = true,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  dark?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 rounded-full transition-colors"
      style={{
        width: 28,
        height: 16,
        background: checked ? (dark ? '#FFFFFF' : 'var(--sk-green)') : dark ? 'rgba(255,255,255,0.3)' : 'rgba(29,28,29,0.3)',
      }}
    >
      <span
        className="absolute top-[2px] rounded-full transition-all"
        style={{
          width: 12,
          height: 12,
          left: checked ? 14 : 2,
          background: checked && dark ? 'var(--sk-active-item)' : '#FFFFFF',
        }}
      />
    </button>
  );
}

// ── サイドバーヘッダー（50px） ───────────────────────────────────────────────
export function SidebarHeader({ title, onTitleClick, children }: { title: string; onTitleClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 flex-shrink-0 pl-4 pr-2" style={{ height: 50 }}>
      <button
        type="button"
        onClick={onTitleClick}
        className="flex items-center gap-1 min-w-0 rounded-md px-1 -ml-1 hover:bg-[var(--sk-sidebar-hover)] transition-colors"
        style={{ height: 30 }}
      >
        <span className="truncate text-[18px] text-white" style={{ fontWeight: 900 }}>{title}</span>
        <ChevronDownIcon className="w-4 h-4 text-white flex-shrink-0" />
      </button>
      <div className="flex-1" />
      {children}
    </div>
  );
}

/** ヘッダー右側の 28px アイコンボタン */
export function HeaderIconButton({ label, onClick, children }: { label: string; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--sk-sidebar-text-strong)] hover:bg-[var(--sk-sidebar-hover)] transition-colors flex-shrink-0"
    >
      {children}
    </button>
  );
}

// ── サイドバー内検索入力（28px） ─────────────────────────────────────────────
export function SidebarSearch({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="px-2 pb-2 flex-shrink-0">
      <label
        className="flex items-center gap-2 px-2 rounded-md"
        style={{ height: 28, border: '1px solid var(--sk-sidebar-border)', background: 'rgba(255,255,255,0.08)' }}
      >
        <SearchIcon className="w-[14px] h-[14px] flex-shrink-0 text-[var(--sk-sidebar-muted)]" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="flex-1 min-w-0 bg-transparent text-[13px] text-white placeholder:text-[var(--sk-sidebar-muted)] focus:outline-none"
        />
        {value && (
          <button type="button" aria-label="検索をクリア" onClick={() => onChange('')} className="text-[var(--sk-sidebar-muted)] hover:text-white">
            <CloseIcon className="w-3 h-3" />
          </button>
        )}
      </label>
    </div>
  );
}

// ── ポップオーバー（ポータル・背景クリックで閉じる） ─────────────────────────
export function Popover({
  anchor,
  placement = 'right',
  width = 260,
  onClose,
  children,
  label,
}: {
  anchor: DOMRect;
  placement?: 'right' | 'below' | 'right-up';
  width?: number;
  onClose: () => void;
  children: React.ReactNode;
  label?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const style: React.CSSProperties = { width, position: 'fixed' };
  if (placement === 'below') {
    style.top = anchor.bottom + 4;
    style.left = Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8));
  } else if (placement === 'right-up') {
    style.left = anchor.right + 8;
    style.bottom = Math.max(8, window.innerHeight - anchor.bottom);
  } else {
    style.left = anchor.right + 8;
    style.top = Math.max(8, Math.min(anchor.top, window.innerHeight - 320));
  }

  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />
      <div
        role="menu"
        aria-label={label}
        className="z-[61] py-2 rounded-lg overflow-hidden"
        style={{
          ...style,
          background: '#FFFFFF',
          color: 'var(--sk-text)',
          border: '1px solid var(--sk-border)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12), 0 18px 48px rgba(0,0,0,0.12)',
          animation: 'popIn 120ms ease',
        }}
      >
        {children}
      </div>
    </>,
    document.body
  );
}

export function MenuItem({ children, onClick, danger, right }: { children: React.ReactNode; onClick: () => void; danger?: boolean; right?: React.ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-6 text-left text-[15px] hover:bg-[#1264A3] hover:text-white transition-colors"
      style={{ height: 28, color: danger ? 'var(--sk-red)' : undefined }}
    >
      <span className="flex-1 truncate">{children}</span>
      {right}
    </button>
  );
}

export const MenuDivider = () => <div className="my-2" style={{ borderTop: '1px solid var(--sk-border)' }} />;

// ── 新規メッセージ（DM）モーダル ─────────────────────────────────────────────
export function NewDMModal({ onClose }: { onClose: () => void }) {
  const { user } = useAppStore((s) => s.auth);
  const users = useAppStore((s) => s.users);
  const { openDM } = useOpenDM();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const filtered = users.filter((u) => !q || u.displayName.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-24 px-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="新規メッセージ"
        className="w-full max-w-[520px] rounded-lg overflow-hidden"
        style={{ background: '#FFFFFF', boxShadow: '0 18px 48px rgba(0,0,0,0.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-[22px] text-[var(--sk-text)]" style={{ fontWeight: 900 }}>新規メッセージ</h2>
          <button type="button" aria-label="閉じる" onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-[var(--sk-text-2)] hover:bg-[var(--sk-subtle)]">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 pb-3" style={{ borderBottom: '1px solid var(--sk-border)' }}>
          <label className="flex items-center gap-2 px-3 rounded-md" style={{ height: 40, border: '1px solid var(--sk-border-strong)' }}>
            <span className="text-[15px] text-[var(--sk-text-2)]">宛先:</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="名前またはメールアドレス"
              aria-label="宛先を検索"
              className="flex-1 text-[15px] text-[var(--sk-text)] focus:outline-none"
              autoFocus
            />
          </label>
        </div>
        <ul className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 && <li className="text-[14px] text-[var(--sk-text-2)] px-5 py-3">ユーザーが見つかりません</li>}
          {filtered.map((u) => (
            <li key={u.uid}>
              <button
                type="button"
                onClick={() => { openDM(u.uid); onClose(); }}
                className="w-full flex items-center gap-3 px-5 py-1.5 text-left hover:bg-[#1264A3] hover:text-white group"
              >
                <Avatar name={u.displayName} photoURL={u.photoURL} size={24} online={u.online} />
                <span className="text-[15px] font-bold truncate">{u.displayName}{u.uid === user?.uid ? '（自分）' : ''}</span>
                <span className="text-[13px] text-[var(--sk-text-2)] group-hover:text-white/80 truncate">{u.online ? 'アクティブ' : '離席中'}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body
  );
}

// ── サイドバーのタブ共通ヘッダ下フィルタ: チップ ──────────────────────────────
export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="px-2.5 rounded-full text-[13px] font-bold transition-colors flex-shrink-0"
      style={{
        height: 26,
        background: active ? '#FFFFFF' : 'transparent',
        color: active ? 'var(--sk-text)' : 'var(--sk-sidebar-text)',
        border: active ? '1px solid #FFFFFF' : '1px solid var(--sk-sidebar-border)',
      }}
    >
      {children}
    </button>
  );
}

/** 空状態（サイドバー内） */
export function SidebarEmpty({ title, body }: { title: string; body?: string }) {
  return (
    <div className="px-6 py-10 text-center">
      <p className="text-[15px] font-bold text-white mb-1">{title}</p>
      {body && <p className="text-[13px] leading-[18px] text-[var(--sk-sidebar-muted)]">{body}</p>}
    </div>
  );
}

/** 先頭テキストを1行プレビュー用に整形（Markdown 記号を除去） */
export function plainPreview(text: string, max = 120): string {
  const t = (text ?? '')
    .replace(/```[\s\S]*?```/g, '[コード]')
    .replace(/[*_~`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? t.slice(0, max) + '…' : t;
}
