// ─────────────────────────────────────────────────────────────────────────────
// チャンネルヘッダー（Slack 新デザイン準拠）
// 1 行目 49px: ☆ / 🔒|# 名前 ⌄ … メンバー / ハドル⌄ / 🔔 / 🔍 / ⋮
// 2 行目 36px: メッセージ / ピン / ファイルとリンク / +
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import type { ChannelNotifPref, ChannelTab } from '../../store/useAppStore';
import { leaveChannel } from '../../services';
import { toast } from '../ui/Toast';
import Avatar from '../ui/Avatar';
import {
  StarIcon, LockIcon, HashIcon, ChevronDownIcon, HeadphonesIcon, BellIcon, SearchIcon,
  MoreVerticalIcon, MessageTabIcon, PinIcon, FilesIcon, PlusIcon, CloseIcon, CheckIcon, LinkIcon, UsersIcon,
} from '../ui/icons';
import ChannelSettingsModal from './ChannelSettingsModal';
import type { ChannelDetailsTab } from './ChannelSettingsModal';
import { copyInviteLink, ProfileModal } from './ChannelIntro';
import type { User } from '../../types';

// ─── Generic anchored popover (portal) ───────────────────────────────────────
function Popover({
  anchor,
  onClose,
  width = 260,
  align = 'right',
  children,
}: {
  anchor: DOMRect;
  onClose: () => void;
  width?: number;
  align?: 'left' | 'right';
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pos: React.CSSProperties =
    align === 'right'
      ? { right: Math.max(8, window.innerWidth - anchor.right) }
      : { left: Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8)) };

  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        role="menu"
        className="fixed z-50 bg-white flex flex-col py-2"
        style={{
          top: anchor.bottom + 4,
          ...pos,
          width,
          maxWidth: 'calc(100vw - 16px)',
          maxHeight: '70vh',
          border: '1px solid var(--sk-border)',
          borderRadius: 'var(--sk-radius-card)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.02)',
          animation: 'popIn 120ms ease',
        }}
      >
        {children}
      </div>
    </>,
    document.body
  );
}

function MenuItem({
  children,
  onClick,
  danger,
  icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`flex items-center gap-2 w-full h-[28px] px-6 text-[15px] text-left hover:text-white ${
        danger ? 'text-[color:var(--sk-red)] hover:bg-[var(--sk-red)]' : 'text-[color:var(--sk-text)] hover:bg-[var(--sk-link)]'
      }`}
    >
      {icon && <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
    </button>
  );
}

const MenuDivider = () => <div className="my-2" style={{ borderTop: '1px solid var(--sk-border)' }} />;

// ─── Header icon button ──────────────────────────────────────────────────────
function IconBtn({
  title,
  onClick,
  active,
  children,
  btnRef,
}: {
  title: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  active?: boolean;
  children: React.ReactNode;
  btnRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={btnRef}
      title={title}
      aria-label={title}
      onClick={onClick}
      className="w-[32px] h-[32px] flex items-center justify-center rounded-md hover:bg-[var(--sk-subtle)] flex-shrink-0"
      style={{ color: active ? 'var(--sk-text)' : 'var(--sk-text-2)', background: active ? 'var(--sk-subtle)' : undefined }}
    >
      {children}
    </button>
  );
}

// ─── Members popover ─────────────────────────────────────────────────────────
function MembersPopover({
  anchor,
  members,
  channelId,
  onClose,
  onOpenAll,
}: {
  anchor: DOMRect;
  members: User[];
  channelId: string;
  onClose: () => void;
  onOpenAll: () => void;
}) {
  const [q, setQ] = useState('');
  const list = q.trim()
    ? members.filter((m) => m.displayName.toLowerCase().includes(q.trim().toLowerCase()))
    : members;
  return (
    <Popover anchor={anchor} onClose={onClose} width={300}>
      <div className="px-4 pb-2 flex items-center justify-between">
        <span className="text-[15px] font-black" style={{ color: 'var(--sk-text)' }}>メンバー {members.length} 人</span>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--sk-subtle)]" style={{ color: 'var(--sk-text-2)' }} title="閉じる">
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="px-4 pb-2">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="メンバーを検索"
          className="w-full h-[32px] px-2.5 text-[14px] rounded-md focus:outline-none"
          style={{ border: '1px solid var(--sk-border-strong)', color: 'var(--sk-text)' }}
        />
      </div>
      <button
        onClick={() => { copyInviteLink(channelId); onClose(); }}
        className="flex items-center gap-3 px-4 py-1.5 text-[15px] text-left hover:bg-[var(--sk-hover)]"
        style={{ color: 'var(--sk-text)' }}
      >
        <span className="w-[36px] h-[36px] rounded-lg flex items-center justify-center" style={{ background: 'var(--sk-mention-bg)', color: 'var(--sk-link)' }}>
          <UsersIcon className="w-5 h-5" />
        </span>
        <span className="font-bold">メンバーを追加</span>
      </button>
      <div className="overflow-y-auto flex-1 min-h-0">
        {list.length === 0 && (
          <p className="text-[14px] px-4 py-3" style={{ color: 'var(--sk-text-2)' }}>該当するメンバーはいません</p>
        )}
        {list.map((u) => (
          <div key={u.uid} className="flex items-center gap-3 px-4 py-1.5 hover:bg-[var(--sk-hover)]">
            <Avatar name={u.displayName} photoURL={u.photoURL} size={36} online={u.online} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold truncate" style={{ color: 'var(--sk-text)' }}>{u.displayName}</p>
              {u.status && (u.status.emoji || u.status.text) && (
                <p className="text-[13px] truncate" style={{ color: 'var(--sk-text-2)' }}>{u.status.emoji} {u.status.text}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <MenuDivider />
      <button onClick={onOpenAll} className="px-4 text-left text-[13px] font-bold hover:underline" style={{ color: 'var(--sk-link)' }}>
        チャンネル詳細ですべて表示
      </button>
    </Popover>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
type PopKind = 'members' | 'notif' | 'more' | 'huddle';

export default function ChannelHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const channels = useAppStore((s) => s.channels);
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const { user } = useAppStore((s) => s.auth);
  const users = useAppStore((s) => s.users);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const channelTab = useAppStore((s) => s.channelTab);
  const setChannelTab = useAppStore((s) => s.setChannelTab);
  const starredChannelIds = useAppStore((s) => s.starredChannelIds);
  const toggleStarChannel = useAppStore((s) => s.toggleStarChannel);
  const channelNotifPrefs = useAppStore((s) => s.channelNotifPrefs);
  const setChannelNotifPref = useAppStore((s) => s.setChannelNotifPref);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const channelMessages = useAppStore((s) => (activeChannelId ? s.messages[activeChannelId] : undefined));
  const channel = channels.find((c) => c.id === activeChannelId);

  const [searchOpen, setSearchOpen] = useState(false);
  const [pop, setPop] = useState<{ kind: PopKind; anchor: DOMRect } | null>(null);
  const [details, setDetails] = useState<ChannelDetailsTab | null>(null);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearchQuery('');
    setSearchOpen(false);
    setPop(null);
  }, [activeChannelId, setSearchQuery]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  // Ctrl+F opens search
  useEffect(() => {
    const handler = () => {
      setSearchOpen(true);
      setChannelTab('messages');
      requestAnimationFrame(() => searchRef.current?.focus());
    };
    window.addEventListener('open-channel-search', handler);
    return () => window.removeEventListener('open-channel-search', handler);
  }, [setChannelTab]);

  const pinnedCount = useMemo(
    () => (channelMessages ?? []).filter((m) => m.pinned).length,
    [channelMessages]
  );

  if (!channel) return null;

  const isDM = channel.name.startsWith('__dm__');
  const dmOtherUser = isDM
    ? users.find((u) => u.uid !== user?.uid && channel.members?.includes(u.uid))
    : undefined;
  const dmSelf = isDM && !dmOtherUser ? users.find((u) => u.uid === user?.uid) ?? user ?? undefined : undefined;
  const dmUser = dmOtherUser ?? dmSelf;
  const displayName = isDM ? (dmUser?.displayName ?? 'ダイレクトメッセージ') : channel.name;
  const memberUsers = users.filter((u) => channel.members?.includes(u.uid));
  const memberCount = channel.members?.length ?? 0;
  const starred = starredChannelIds.includes(channel.id);
  const notifPref: ChannelNotifPref = channelNotifPrefs[channel.id] ?? 'all';
  const muted = notifPref === 'off';

  const openPop = (kind: PopKind) => (e: React.MouseEvent<HTMLElement>) => {
    if (pop?.kind === kind) { setPop(null); return; }
    setPop({ kind, anchor: e.currentTarget.getBoundingClientRect() });
  };
  const closePop = () => setPop(null);

  const closeSearch = () => { setSearchOpen(false); setSearchQuery(''); };

  const openDetails = () => {
    if (isDM) { if (dmUser) setProfileUser(dmUser as User); }
    else setDetails('about');
  };

  const handleCopyLink = async () => {
    closePop();
    try {
      await navigator.clipboard.writeText(`${window.location.origin}?channel=${encodeURIComponent(channel.id)}`);
      toast.success('リンクをコピーしました');
    } catch {
      toast.error('リンクのコピーに失敗しました');
    }
  };

  const handleToggleMute = () => {
    closePop();
    setChannelNotifPref(channel.id, muted ? 'all' : 'off');
    toast.success(muted ? 'ミュートを解除しました' : `${isDM ? displayName : '#' + channel.name} をミュートしました`);
  };

  const handleLeave = async () => {
    closePop();
    if (!user) return;
    if (!window.confirm(`#${channel.name} から退出しますか？`)) return;
    try {
      await leaveChannel(channel.id, user.uid);
      setActiveChannel(null);
      toast.success(`#${channel.name} から退出しました`);
    } catch {
      toast.error('退出に失敗しました');
    }
  };

  const handleStar = () => {
    toggleStarChannel(channel.id);
    toast.success(starred ? 'スターを外しました' : 'スター付きに追加しました');
  };

  const tabs: { key: ChannelTab | 'add'; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'messages', label: 'メッセージ', icon: <MessageTabIcon filled={channelTab === 'messages'} className="w-4 h-4" /> },
    ...(!isDM
      ? [{ key: 'pins' as const, label: 'ピン', icon: <PinIcon filled={channelTab === 'pins'} className="w-4 h-4" />, count: pinnedCount }]
      : []),
    { key: 'files', label: 'ファイルとリンク', icon: <FilesIcon filled={channelTab === 'files'} className="w-4 h-4" /> },
  ];

  const facepile = memberUsers.slice(0, 3);

  return (
    <>
      <header className="bg-white flex-shrink-0" style={{ borderBottom: '1px solid var(--sk-border)' }}>
        {/* ── Row 1 ── */}
        <div className="flex items-center justify-between h-[49px] pl-4 pr-3 md:pl-5 gap-2">
          <div className="flex items-center gap-1 min-w-0">
            {onMenuClick && (
              <button
                onClick={onMenuClick}
                aria-label="サイドバーを開く"
                className="flex md:hidden w-8 h-8 items-center justify-center rounded-md hover:bg-[var(--sk-subtle)] flex-shrink-0"
                style={{ color: 'var(--sk-text-2)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <button
              onClick={handleStar}
              title={starred ? 'スターを外す' : 'スターを付ける'}
              aria-label={starred ? 'スターを外す' : 'スターを付ける'}
              aria-pressed={starred}
              className="w-[28px] h-[28px] flex items-center justify-center rounded-md hover:bg-[var(--sk-subtle)] flex-shrink-0"
              style={{ color: starred ? '#ECB22E' : 'var(--sk-text-2)' }}
            >
              <StarIcon filled={starred} className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={openDetails}
              title={isDM ? 'プロフィールを表示' : 'チャンネル詳細を表示'}
              className="flex items-center gap-1 min-w-0 h-[30px] px-1.5 rounded-md hover:bg-[var(--sk-subtle)]"
              style={{ color: 'var(--sk-text)' }}
            >
              {isDM ? (
                dmUser && <Avatar name={dmUser.displayName} photoURL={dmUser.photoURL} size={24} radius={6} online={dmUser.online} />
              ) : channel.isPrivate ? (
                <LockIcon className="w-[17px] h-[17px] flex-shrink-0" />
              ) : (
                <HashIcon className="w-[17px] h-[17px] flex-shrink-0" />
              )}
              <span className={`text-[18px] font-black truncate leading-none ${isDM ? 'ml-1.5' : ''}`}>{displayName}</span>
              {isDM && dmSelf && <span className="text-[15px] flex-shrink-0" style={{ color: 'var(--sk-text-2)' }}>（自分）</span>}
              {muted && <BellOffMark />}
              <ChevronDownIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--sk-text-2)' }} />
            </button>
            {isDM && dmUser?.status && (dmUser.status.emoji || dmUser.status.text) && (
              <span className="hidden sm:inline text-[13px] truncate max-w-[200px]" style={{ color: 'var(--sk-text-2)' }}>
                {dmUser.status.emoji} {dmUser.status.text}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Member facepile (channels only) */}
            {!isDM && (
              <button
                onClick={openPop('members')}
                title={`メンバー ${memberCount} 人を表示`}
                aria-label={`メンバー ${memberCount} 人を表示`}
                className="flex items-center gap-1.5 h-[28px] pl-1 pr-2 rounded-md hover:bg-[var(--sk-hover)]"
                style={{ border: '1px solid var(--sk-border)', background: pop?.kind === 'members' ? 'var(--sk-subtle)' : '#FFFFFF' }}
              >
                <span className="flex items-center">
                  {facepile.length === 0 ? (
                    <UsersIcon className="w-4 h-4 mx-0.5" style={{ color: 'var(--sk-text-2)' }} />
                  ) : (
                    facepile.map((u, i) => (
                      <span key={u.uid} className="rounded-[5px]" style={{ marginLeft: i === 0 ? 0 : -6, boxShadow: '0 0 0 2px #FFFFFF', zIndex: 3 - i }}>
                        <Avatar name={u.displayName} photoURL={u.photoURL} size={20} radius={5} />
                      </span>
                    ))
                  )}
                </span>
                <span className="text-[13px] font-bold" style={{ color: 'var(--sk-text-2)' }}>{memberCount}</span>
              </button>
            )}

            {/* Huddle split button */}
            <div className="hidden sm:flex items-center h-[28px] rounded-md overflow-hidden ml-1" style={{ border: '1px solid var(--sk-border)' }}>
              <button
                onClick={() => toast.info('ハドルミーティングはこのバージョンでは未対応です')}
                title="ハドルミーティングを開始する"
                aria-label="ハドルミーティングを開始する"
                className="h-full px-2 flex items-center hover:bg-[var(--sk-hover)]"
                style={{ color: 'var(--sk-text-2)' }}
              >
                <HeadphonesIcon className="w-[18px] h-[18px]" />
              </button>
              <span className="w-px h-full" style={{ background: 'var(--sk-border)' }} />
              <button
                onClick={openPop('huddle')}
                title="ハドルのオプション"
                aria-label="ハドルのオプション"
                className="h-full px-1 flex items-center hover:bg-[var(--sk-hover)]"
                style={{ color: 'var(--sk-text-2)' }}
              >
                <ChevronDownIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <IconBtn title="通知設定" onClick={openPop('notif')} active={pop?.kind === 'notif'}>
              <span className="relative">
                <BellIcon className="w-[18px] h-[18px]" />
                {muted && <span className="absolute left-[-2px] right-[-2px] top-1/2 h-[2px] rotate-[-45deg] rounded" style={{ background: 'currentColor' }} />}
              </span>
            </IconBtn>

            {searchOpen ? (
              <div
                className="flex items-center gap-1 h-[30px] px-2 rounded-md bg-white"
                style={{ border: '1px solid var(--sk-blue)', boxShadow: '0 0 0 1px var(--sk-blue)' }}
              >
                <SearchIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--sk-text-2)' }} />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') closeSearch(); }}
                  placeholder={isDM ? `${displayName} 内を検索` : `#${channel.name} 内を検索`}
                  aria-label="チャンネル内を検索"
                  className="text-[13px] focus:outline-none bg-transparent w-32 sm:w-48"
                  style={{ color: 'var(--sk-text)' }}
                />
                <button onClick={closeSearch} title="検索を閉じる" aria-label="検索を閉じる" className="flex-shrink-0 rounded hover:bg-[var(--sk-subtle)] p-0.5" style={{ color: 'var(--sk-text-2)' }}>
                  <CloseIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <IconBtn title="会話内を検索 (Ctrl+F)" onClick={() => { setSearchOpen(true); setChannelTab('messages'); }}>
                <SearchIcon className="w-[18px] h-[18px]" />
              </IconBtn>
            )}

            <IconBtn title="その他のオプション" onClick={openPop('more')} active={pop?.kind === 'more'}>
              <MoreVerticalIcon className="w-[18px] h-[18px]" />
            </IconBtn>
          </div>
        </div>

        {/* ── Row 2: tabs ── */}
        <nav className="flex items-end h-[36px] px-3 md:px-4 gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }} role="tablist">
          {tabs.map((t) => {
            const active = channelTab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setChannelTab(t.key as ChannelTab)}
                className="relative h-full flex items-center flex-shrink-0 group"
              >
                <span
                  className="flex items-center gap-1.5 h-[28px] px-2 mb-[4px] rounded-md text-[13px] font-bold group-hover:bg-[var(--sk-subtle)]"
                  style={{ color: active ? 'var(--sk-text)' : 'var(--sk-text-2)' }}
                >
                  {t.icon}
                  {t.label}
                  {t.count !== undefined && t.count > 0 && (
                    <span className="text-[12px] font-bold" style={{ color: 'var(--sk-text-2)' }}>{t.count}</span>
                  )}
                </span>
                <span
                  className="absolute left-0 right-0 bottom-0 h-[2px] rounded-t"
                  style={{ background: active ? 'var(--sk-accent)' : 'transparent' }}
                />
              </button>
            );
          })}
          <button
            onClick={() => {
              const fire = () => window.dispatchEvent(new CustomEvent('open-add-bookmark'));
              if (channelTab === 'messages') fire();
              else { setChannelTab('messages'); setTimeout(fire, 80); } // PinBar のマウント後に通知
            }}
            title="ブックマークを追加"
            aria-label="ブックマークを追加"
            className="w-[28px] h-[28px] mb-[4px] flex items-center justify-center rounded-md hover:bg-[var(--sk-subtle)] flex-shrink-0"
            style={{ color: 'var(--sk-text-2)' }}
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </nav>
      </header>

      {/* ── Popovers ── */}
      {pop?.kind === 'members' && (
        <MembersPopover
          anchor={pop.anchor}
          members={memberUsers}
          channelId={channel.id}
          onClose={closePop}
          onOpenAll={() => { closePop(); setDetails('members'); }}
        />
      )}

      {pop?.kind === 'huddle' && (
        <Popover anchor={pop.anchor} onClose={closePop} width={260}>
          <MenuItem icon={<HeadphonesIcon className="w-4 h-4" />} onClick={() => { closePop(); toast.info('ハドルミーティングはこのバージョンでは未対応です'); }}>
            ハドルミーティングを開始する
          </MenuItem>
          <MenuItem icon={<LinkIcon className="w-4 h-4" />} onClick={() => { closePop(); toast.info('ハドルのリンクはこのバージョンでは未対応です'); }}>
            ハドルのリンクをコピーする
          </MenuItem>
        </Popover>
      )}

      {pop?.kind === 'notif' && (
        <Popover anchor={pop.anchor} onClose={closePop} width={280}>
          <p className="px-4 pb-1 text-[13px] font-bold" style={{ color: 'var(--sk-text-2)' }}>通知を受け取るタイミング</p>
          {([
            ['all', 'すべての新規メッセージ'],
            ['mentions', '@メンションのみ'],
            ['off', 'オフ（ミュート）'],
          ] as const).map(([value, label]) => {
            const checked = notifPref === value;
            return (
              <button
                key={value}
                role="menuitemradio"
                aria-checked={checked}
                onClick={() => { setChannelNotifPref(channel.id, value); closePop(); }}
                className="flex items-center gap-2.5 h-[32px] px-4 text-[15px] text-left hover:bg-[var(--sk-hover)]"
                style={{ color: 'var(--sk-text)' }}
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ border: checked ? '5px solid var(--sk-link)' : '1px solid var(--sk-border-strong)' }}
                />
                {label}
              </button>
            );
          })}
        </Popover>
      )}

      {pop?.kind === 'more' && (
        <Popover anchor={pop.anchor} onClose={closePop} width={260}>
          <MenuItem onClick={() => { closePop(); openDetails(); }}>
            {isDM ? 'プロフィールを表示' : 'チャンネル詳細を開く'}
          </MenuItem>
          <MenuItem icon={<LinkIcon className="w-4 h-4" />} onClick={handleCopyLink}>リンクをコピー</MenuItem>
          <MenuDivider />
          <MenuItem icon={muted ? <CheckIcon className="w-4 h-4" /> : undefined} onClick={handleToggleMute}>
            {muted ? '通知のミュートを解除' : '通知をミュート'}
          </MenuItem>
          <MenuItem onClick={() => { closePop(); handleStar(); }}>
            {starred ? 'スターを外す' : 'スターを付ける'}
          </MenuItem>
          {!isDM && channel.createdBy !== user?.uid && (
            <>
              <MenuDivider />
              <MenuItem danger onClick={handleLeave}>チャンネルから退出</MenuItem>
            </>
          )}
        </Popover>
      )}

      {details && <ChannelSettingsModal initialTab={details} onClose={() => setDetails(null)} />}
      {profileUser && <ProfileModal user={profileUser} onClose={() => setProfileUser(null)} />}
    </>
  );
}

function BellOffMark() {
  return (
    <span className="relative inline-flex flex-shrink-0 ml-0.5" title="ミュート中" style={{ color: 'var(--sk-text-3)' }}>
      <BellIcon className="w-3.5 h-3.5" />
      <span className="absolute left-[-1px] right-[-1px] top-1/2 h-[1.5px] rotate-[-45deg]" style={{ background: 'currentColor' }} />
    </span>
  );
}
