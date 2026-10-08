// ─────────────────────────────────────────────────────────────────────────────
// チャンネル / DM の冒頭イントロ（Slack 準拠）
// MessageList の先頭行および空状態として表示する。
// 共有ヘルパー: copyInviteLink / ProfileModal（ChannelHeader からも使用）
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAppStore } from '../../store/useAppStore';
import Avatar from '../ui/Avatar';
import { toast } from '../ui/Toast';
import { CloseIcon, HashIcon, LockIcon, PencilIcon, UsersIcon } from '../ui/icons';
import ChannelSettingsModal from './ChannelSettingsModal';
import type { User } from '../../types';

/** チャンネルへの招待リンク（`${origin}?channel=id`）をコピーしてトーストを出す */
export async function copyInviteLink(channelId: string): Promise<void> {
  const url = `${window.location.origin}?channel=${encodeURIComponent(channelId)}`;
  try {
    await navigator.clipboard.writeText(url);
    toast.success('招待リンクをコピーしました。メンバーに共有してください');
  } catch {
    toast.error('リンクのコピーに失敗しました');
  }
}

// ─── Profile modal ───────────────────────────────────────────────────────────
export function ProfileModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { clearInterval(t); window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${user.displayName} のプロフィール`}
        className="w-full max-w-[400px] bg-white overflow-hidden"
        style={{ borderRadius: 'var(--sk-radius-card)', boxShadow: '0 18px 48px rgba(0,0,0,0.3)', animation: 'popIn 150ms ease' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 h-[56px]" style={{ borderBottom: '1px solid var(--sk-border)' }}>
          <h2 className="text-[18px] font-black" style={{ color: 'var(--sk-text)' }}>プロフィール</h2>
          <button
            onClick={onClose}
            title="閉じる"
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--sk-subtle)]"
            style={{ color: 'var(--sk-text-2)' }}
          >
            <CloseIcon className="w-[18px] h-[18px]" />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="flex justify-center">
            <Avatar name={user.displayName} photoURL={user.photoURL} size={180} radius={12} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[22px] font-black leading-tight" style={{ color: 'var(--sk-text)' }}>{user.displayName}</span>
              <span
                className="inline-block w-[10px] h-[10px] rounded-full flex-shrink-0"
                style={user.online ? { background: 'var(--sk-online)' } : { border: '2px solid var(--sk-text-3)' }}
                title={user.online ? 'アクティブ' : '離席中'}
              />
            </div>
            {user.status && (user.status.emoji || user.status.text) && (
              <p className="text-[15px] mt-1" style={{ color: 'var(--sk-text)' }}>
                {user.status.emoji} {user.status.text}
              </p>
            )}
            <p className="text-[13px] mt-1" style={{ color: 'var(--sk-text-2)' }}>
              {user.online ? 'アクティブ' : '離席中'}
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-3" style={{ borderTop: '1px solid var(--sk-border)' }}>
            <div>
              <p className="text-[13px] font-bold" style={{ color: 'var(--sk-text)' }}>現地時間</p>
              <p className="text-[15px]" style={{ color: 'var(--sk-text)' }}>{format(now, 'H:mm', { locale: ja })}</p>
            </div>
            {user.email && (
              <div>
                <p className="text-[13px] font-bold" style={{ color: 'var(--sk-text)' }}>メールアドレス</p>
                <a href={`mailto:${user.email}`} className="text-[15px] hover:underline break-all" style={{ color: 'var(--sk-link)' }}>
                  {user.email}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Shared button style ─────────────────────────────────────────────────────
function OutlineButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-[36px] px-3 text-[15px] font-bold rounded-lg bg-white hover:bg-[var(--sk-hover)]"
      style={{ color: 'var(--sk-text)', border: '1px solid var(--sk-border-strong)' }}
    >
      {children}
    </button>
  );
}

function MentionChip({ name }: { name: string }) {
  return (
    <span className="rounded-[3px] px-[2px]" style={{ background: 'var(--sk-mention-bg)', color: 'var(--sk-link)' }}>
      @{name}
    </span>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function ChannelIntro({ channelId }: { channelId: string }) {
  const channel = useAppStore((s) => s.channels.find((c) => c.id === channelId));
  const users = useAppStore((s) => s.users);
  const me = useAppStore((s) => s.auth.user);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileUser, setProfileUser] = useState<User | null>(null);

  if (!channel) return null;

  const isDM = channel.name.startsWith('__dm__');

  // ── DM ──
  if (isDM) {
    const other = users.find((u) => u.uid !== me?.uid && channel.members?.includes(u.uid));
    const self = users.find((u) => u.uid === me?.uid) ?? me ?? null;
    const target = other ?? self;
    if (!target) return null;
    const isSelf = !other;

    return (
      <div className="px-5 pt-10 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <Avatar name={target.displayName} photoURL={target.photoURL} size={100} radius={12} />
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[22px] font-black leading-tight truncate" style={{ color: 'var(--sk-text)' }}>
              {target.displayName}
            </span>
            {isSelf && <span className="text-[18px]" style={{ color: 'var(--sk-text-2)' }}>（自分）</span>}
            <span
              className="inline-block w-[10px] h-[10px] rounded-full flex-shrink-0"
              style={target.online ? { background: 'var(--sk-online)' } : { border: '2px solid var(--sk-text-3)' }}
              title={target.online ? 'アクティブ' : '離席中'}
            />
          </div>
        </div>
        <p className="text-[15px] leading-[22px] mb-4" style={{ color: 'var(--sk-text)' }}>
          {isSelf ? (
            <>
              <strong>これはあなただけのスペースです。</strong>
              メッセージの下書きを作成したり、To-Do リストを作成したり、リンクやファイルを手元に保存したりしましょう。自分宛てのメッセージを送ることもできます。
            </>
          ) : (
            <>
              この会話は <MentionChip name={target.displayName} /> さんとの 2 人だけに公開されています。もっとよく知り合うため、プロフィールをチェックしてみましょう。
            </>
          )}
        </p>
        <OutlineButton onClick={() => setProfileUser(target as User)}>
          {isSelf ? 'プロフィールを編集する' : 'プロフィールを表示する'}
        </OutlineButton>
        {profileUser && <ProfileModal user={profileUser} onClose={() => setProfileUser(null)} />}
      </div>
    );
  }

  // ── Channel ──
  const creator = users.find((u) => u.uid === channel.createdBy);
  const createdLabel = channel.createdAt?.toDate
    ? format(channel.createdAt.toDate(), 'M月d日', { locale: ja })
    : null;
  const Icon = channel.isPrivate ? LockIcon : HashIcon;

  return (
    <div className="px-5 pt-10 pb-4">
      <h2 className="flex items-center gap-1 text-[22px] font-black leading-tight mb-2" style={{ color: 'var(--sk-text)' }}>
        <span aria-hidden="true">👋</span>
        <Icon className="w-[20px] h-[20px] ml-1" />
        <span className="truncate">{channel.name}</span>
        <span>へようこそ！</span>
      </h2>
      {channel.description && (
        <p className="text-[15px] leading-[22px] mb-1 whitespace-pre-wrap break-words" style={{ color: 'var(--sk-text)' }}>
          {channel.description}
        </p>
      )}
      <p className="text-[15px] leading-[22px] mb-4" style={{ color: 'var(--sk-text-2)' }}>
        {creator ? <MentionChip name={creator.displayName} /> : '不明なユーザー'}
        {' '}がこのチャンネルを{createdLabel ? ` ${createdLabel} に` : ''}作成しました。これは
        <strong style={{ color: 'var(--sk-text)' }}> {channel.isPrivate ? '🔒' : '#'}{channel.name} </strong>
        チャンネルの一番最初です。
      </p>
      <div className="flex flex-wrap gap-2">
        <OutlineButton onClick={() => setSettingsOpen(true)}>
          <PencilIcon className="w-4 h-4" />
          説明を追加
        </OutlineButton>
        <OutlineButton onClick={() => copyInviteLink(channel.id)}>
          <UsersIcon className="w-4 h-4" />
          メンバーを追加
        </OutlineButton>
      </div>
      {settingsOpen && <ChannelSettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
