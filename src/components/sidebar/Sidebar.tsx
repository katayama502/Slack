import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { joinChannelIfNeeded } from '../../services';
import { useUnreadChannels, markChannelRead, getLastVisit } from '../../hooks/useUnreadChannels';
import AddChannelModal from './AddChannelModal';
import DMList from './DMList';
import ActivityList from './ActivityList';
import LaterList from './LaterList';
import FilesList from './FilesList';
import Avatar from '../ui/Avatar';
import {
  SidebarHeader, HeaderIconButton, SidebarSearch, Popover, MenuItem, NewDMModal,
  useOpenDM, isDMChannel, dmPeerUid,
} from './shared';
import {
  SettingsIcon, ComposeIcon, ThreadsIcon, HeadphonesIcon, SendIcon, DirectoryIcon,
  StarIcon, HashIcon, LockIcon, CaretDownIcon, PencilIcon, PlusIcon, ArrowDownIcon,
  CloseIcon, UserIcon,
} from '../ui/icons';
import type { Channel } from '../../types';
import type { MainView } from '../../store/useAppStore';

const DRAG_MIME = 'text/x-creatte-channel';

// ─── 行の共通スタイル ────────────────────────────────────────────────────────
function rowStyle(active: boolean, strong: boolean, muted = false): React.CSSProperties {
  return {
    height: 28,
    margin: '0 8px',
    width: 'calc(100% - 16px)',
    borderRadius: 6,
    background: active ? 'var(--sk-active-item)' : undefined,
    color: active ? 'var(--sk-active-item-text)' : strong ? 'var(--sk-sidebar-text-strong)' : 'var(--sk-sidebar-text)',
    fontWeight: strong && !active ? 900 : active ? 700 : 400,
    opacity: muted && !active ? 0.5 : 1,
  };
}
const ROW_CLS = 'flex items-center gap-2 pl-[10px] pr-2 text-[15px] text-left transition-colors';
const HOVER_CLS = 'hover:bg-[var(--sk-sidebar-hover)]';

function CountBadge({ n }: { n: number }) {
  return (
    <span
      className="flex-shrink-0 min-w-[18px] h-[18px] px-[5px] rounded-full flex items-center justify-center text-[12px] font-bold text-white"
      style={{ background: 'var(--sk-badge)' }}
      aria-label={`未読 ${n} 件`}
    >
      {n > 99 ? '99+' : n}
    </span>
  );
}

// ─── 上部ナビ項目（スレッド等） ──────────────────────────────────────────────
function NavItem({ icon, label, active, right, onClick }: { icon: React.ReactNode; label: string; active: boolean; right?: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className={`${ROW_CLS} ${active ? '' : HOVER_CLS}`} style={rowStyle(active, false)}>
      <span className="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {right}
    </button>
  );
}

// ─── セクション見出し ────────────────────────────────────────────────────────
function SectionHeader({ label, icon, open, onToggle, onAdd, addLabel }: { label: string; icon?: React.ReactNode; open: boolean; onToggle: () => void; onAdd?: () => void; addLabel?: string }) {
  return (
    <div className="group flex items-center mx-2 rounded-md hover:bg-[var(--sk-sidebar-hover)]" style={{ height: 28 }}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex-1 min-w-0 flex items-center gap-2 pl-[10px] h-full text-[15px] text-[var(--sk-sidebar-text)] text-left">
        <span className="relative w-[18px] h-[18px] flex items-center justify-center flex-shrink-0">
          {icon && <span className="group-hover:opacity-0 transition-opacity flex">{icon}</span>}
          <CaretDownIcon
            className={`absolute w-4 h-4 transition-all ${icon ? 'opacity-0 group-hover:opacity-100' : ''}`}
            style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          />
        </span>
        <span className="truncate">{label}</span>
      </button>
      {onAdd && (
        <button
          type="button"
          aria-label={addLabel}
          title={addLabel}
          onClick={onAdd}
          className="w-6 h-6 mr-1 flex items-center justify-center rounded text-[var(--sk-sidebar-text)] opacity-0 group-hover:opacity-100 hover:bg-[var(--sk-sidebar-hover)] transition-opacity"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ─── Home タブ ──────────────────────────────────────────────────────────────
function HomeSidebar() {
  const { user } = useAppStore((s) => s.auth);
  const channels = useAppStore((s) => s.channels);
  const users = useAppStore((s) => s.users);
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const mainView = useAppStore((s) => s.mainView);
  const setMainView = useAppStore((s) => s.setMainView);
  const drafts = useAppStore((s) => s.drafts);
  const allMessages = useAppStore((s) => s.messages);
  const notifications = useAppStore((s) => s.notifications);
  const starredChannelIds = useAppStore((s) => s.starredChannelIds);
  const toggleStarChannel = useAppStore((s) => s.toggleStarChannel);
  const channelNotifPrefs = useAppStore((s) => s.channelNotifPrefs);
  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen);
  const unreadChannels = useUnreadChannels();
  const { openDM, loadingUid } = useOpenDM();

  const [search, setSearch] = useState('');
  const [starOpen, setStarOpen] = useState(true);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmOpen, setDmOpen] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [gearAnchor, setGearAnchor] = useState<DOMRect | null>(null);
  const [dropHover, setDropHover] = useState(false);
  const [hasUnreadBelow, setHasUnreadBelow] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const uid = user?.uid ?? '';
  const q = search.trim().toLowerCase();
  const draftCount = Object.keys(drafts).length;

  // 自分が見られるチャンネルのみ（非メンバーのプライベートは隠す）
  const visibleChannels = channels.filter(
    (c) => !isDMChannel(c) && (!c.isPrivate || (c.members ?? []).includes(uid))
  );
  const matches = (name: string) => !q || name.toLowerCase().includes(q);
  const starredChannels = visibleChannels.filter((c) => starredChannelIds.includes(c.id) && matches(c.name));
  const regularChannels = visibleChannels.filter((c) => !starredChannelIds.includes(c.id) && matches(c.name));

  const dmChannelFor = (otherUid: string) =>
    channels.find((c) => isDMChannel(c) && dmPeerUid(c, uid) === otherUid && (c.members ?? []).includes(uid));
  const me = users.find((u) => u.uid === uid) ?? user;
  const others = users.filter((u) => u.uid !== uid && matches(u.displayName));

  const mentionCount = (channelId: string) =>
    notifications.filter((n) => !n.read && n.channelId === channelId).length;
  const loadedUnreadCount = (channelId: string) => {
    const lastVisit = getLastVisit(channelId);
    return (allMessages[channelId] ?? []).filter((m) => m.uid !== uid && m.createdAt?.toMillis() > lastVisit).length;
  };

  const selectChannel = async (channelId: string) => {
    if (user) await joinChannelIfNeeded(channelId, user.uid).catch(() => {});
    markChannelRead(channelId);
    setActiveChannel(channelId);
  };

  const go = (view: MainView) => {
    setMainView(view);
    setMobileSidebarOpen(false);
  };

  // ── 「その他の未読メッセージ」ピル ──
  const recomputeUnreadBelow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const bottom = el.getBoundingClientRect().bottom;
    const rows = el.querySelectorAll<HTMLElement>('[data-unread="1"]');
    setHasUnreadBelow(Array.from(rows).some((r) => r.getBoundingClientRect().top > bottom - 8));
  }, []);
  useEffect(() => {
    recomputeUnreadBelow();
    window.addEventListener('resize', recomputeUnreadBelow);
    return () => window.removeEventListener('resize', recomputeUnreadBelow);
  });
  const scrollToNextUnread = () => {
    const el = scrollRef.current;
    if (!el) return;
    const bottom = el.getBoundingClientRect().bottom;
    const next = Array.from(el.querySelectorAll<HTMLElement>('[data-unread="1"]')).find((r) => r.getBoundingClientRect().top > bottom - 8);
    next?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  // ── Drag & drop（スター付きへ） ──
  const onDragStart = (e: React.DragEvent, channelId: string) => {
    e.dataTransfer.setData(DRAG_MIME, channelId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onStarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropHover(false);
    const id = e.dataTransfer.getData(DRAG_MIME);
    if (id && !starredChannelIds.includes(id)) toggleStarChannel(id);
  };
  const onChannelsDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData(DRAG_MIME);
    if (id && starredChannelIds.includes(id)) toggleStarChannel(id);
  };
  const acceptDrag = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(DRAG_MIME)) e.preventDefault();
  };

  const renderChannelRow = (ch: Channel) => {
    const active = ch.id === activeChannelId && mainView === 'channel';
    const muted = channelNotifPrefs[ch.id] === 'off';
    const unread = unreadChannels.has(ch.id) && !active && !muted;
    const mentions = active ? 0 : mentionCount(ch.id);
    const hasDraft = !!drafts[ch.id] && !active;
    const Icon = ch.isPrivate ? LockIcon : HashIcon;
    return (
      <li key={ch.id}>
        <button
          type="button"
          draggable
          onDragStart={(e) => onDragStart(e, ch.id)}
          onClick={() => selectChannel(ch.id)}
          data-unread={unread || mentions > 0 ? '1' : undefined}
          aria-current={active ? 'page' : undefined}
          aria-label={`${ch.isPrivate ? 'プライベートチャンネル' : 'チャンネル'} ${ch.name}${unread ? '（未読あり）' : ''}`}
          className={`${ROW_CLS} ${active ? '' : HOVER_CLS}`}
          style={rowStyle(active, unread || mentions > 0, muted)}
        >
          <Icon className="w-4 h-4 flex-shrink-0" style={{ opacity: active || unread ? 1 : 0.85 }} />
          <span className="flex-1 truncate">{ch.name}</span>
          {hasDraft && mentions === 0 && <PencilIcon className="w-4 h-4 flex-shrink-0" aria-label="下書きあり" />}
          {mentions > 0 && <CountBadge n={mentions} />}
        </button>
      </li>
    );
  };

  return (
    <>
      <SidebarHeader title="Creatte" onTitleClick={(e) => setGearAnchor(e.currentTarget.getBoundingClientRect())}>
        <HeaderIconButton label="設定" onClick={(e) => setGearAnchor(e.currentTarget.getBoundingClientRect())}>
          <SettingsIcon className="w-[18px] h-[18px]" />
        </HeaderIconButton>
        <HeaderIconButton label="新規メッセージ" onClick={() => setShowNewDM(true)}>
          <ComposeIcon className="w-[18px] h-[18px]" />
        </HeaderIconButton>
        <button
          type="button"
          aria-label="サイドバーを閉じる"
          onClick={() => setMobileSidebarOpen(false)}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-md text-white hover:bg-[var(--sk-sidebar-hover)]"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      </SidebarHeader>

      <SidebarSearch value={search} onChange={setSearch} placeholder="会話を見つける..." />

      <div className="relative flex-1 min-h-0">
        <div ref={scrollRef} onScroll={recomputeUnreadBelow} className="h-full overflow-y-auto sidebar-scroll pb-6">
          {/* ── 固定ナビ ── */}
          <div className="pt-1 pb-2 flex flex-col">
            <NavItem icon={<ThreadsIcon className="w-[18px] h-[18px]" />} label="スレッド" active={mainView === 'threads'} onClick={() => go('threads')} />
            <NavItem icon={<HeadphonesIcon className="w-[18px] h-[18px]" />} label="ハドルミーティング" active={mainView === 'huddles'} onClick={() => go('huddles')} />
            <NavItem
              icon={<SendIcon className="w-[18px] h-[18px]" />}
              label="下書き＆送信済み"
              active={mainView === 'drafts'}
              onClick={() => go('drafts')}
              right={draftCount > 0 ? (
                <span className="flex items-center gap-0.5 text-[13px] flex-shrink-0" aria-label={`下書き ${draftCount} 件`}>
                  <PencilIcon className="w-[14px] h-[14px]" />{draftCount}
                </span>
              ) : undefined}
            />
            <NavItem icon={<DirectoryIcon className="w-[18px] h-[18px]" />} label="ディレクトリ" active={mainView === 'directory'} onClick={() => go('directory')} />
          </div>

          <div className="mx-4 my-2" style={{ borderTop: '1px solid var(--sk-sidebar-border)' }} />

          {/* ── スター付き ── */}
          <section
            aria-label="スター付き"
            onDragOver={(e) => { acceptDrag(e); if (e.dataTransfer.types.includes(DRAG_MIME)) setDropHover(true); }}
            onDragLeave={() => setDropHover(false)}
            onDrop={onStarDrop}
            className="pt-1 pb-2 rounded-md transition-colors"
            style={{ background: dropHover ? 'rgba(255,255,255,0.08)' : undefined, outline: dropHover ? '1px dashed var(--sk-sidebar-border)' : undefined }}
          >
            <SectionHeader label="スター付き" icon={<StarIcon className="w-4 h-4" />} open={starOpen} onToggle={() => setStarOpen((v) => !v)} />
            {starOpen && (
              starredChannels.length > 0 ? (
                <ul className="flex flex-col">{starredChannels.map(renderChannelRow)}</ul>
              ) : !q ? (
                <p className="pl-[38px] pr-4 py-1 text-[13px] leading-[18px] text-[var(--sk-sidebar-muted)]">重要なアイテムをここにドラッグ＆ドロップします</p>
              ) : null
            )}
          </section>

          {/* ── チャンネル ── */}
          <section aria-label="チャンネル" className="pt-2 pb-2" onDragOver={acceptDrag} onDrop={onChannelsDrop}>
            <SectionHeader
              label="チャンネル"
              icon={<HashIcon className="w-4 h-4" />}
              open={channelsOpen}
              onToggle={() => setChannelsOpen((v) => !v)}
              onAdd={() => setShowAddModal(true)}
              addLabel="チャンネルを追加"
            />
            {channelsOpen && (
              <ul className="flex flex-col">
                {regularChannels.map(renderChannelRow)}
                {q && regularChannels.length === 0 && (
                  <li className="pl-[38px] pr-4 py-1 text-[13px] text-[var(--sk-sidebar-muted)]">一致するチャンネルはありません</li>
                )}
                <li>
                  <button type="button" onClick={() => setShowAddModal(true)} className={`${ROW_CLS} ${HOVER_CLS}`} style={rowStyle(false, false)}>
                    <span className="w-4 h-4 flex items-center justify-center rounded flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                      <PlusIcon className="w-3 h-3" />
                    </span>
                    <span className="truncate">チャンネルを追加</span>
                  </button>
                </li>
              </ul>
            )}
          </section>

          {/* ── ダイレクトメッセージ ── */}
          <section aria-label="ダイレクトメッセージ" className="pt-2 pb-2">
            <SectionHeader
              label="ダイレクトメッセージ"
              open={dmOpen}
              onToggle={() => setDmOpen((v) => !v)}
              onAdd={() => setShowNewDM(true)}
              addLabel="新規メッセージ"
            />
            {dmOpen && (
              <ul className="flex flex-col">
                {me && matches(me.displayName ?? '') && (() => {
                  const selfCh = dmChannelFor(uid);
                  const active = !!selfCh && selfCh.id === activeChannelId && mainView === 'channel';
                  return (
                    <li>
                      <button type="button" onClick={() => openDM(uid)} className={`${ROW_CLS} ${active ? '' : HOVER_CLS}`} style={rowStyle(active, false)}>
                        <Avatar name={me.displayName ?? 'あなた'} photoURL={me.photoURL} size={20} radius={5} online={true} ringColor="transparent" />
                        <span className="flex-1 truncate">
                          {me.displayName ?? 'あなた'} <span style={{ opacity: 0.7 }}>（自分）</span>
                        </span>
                      </button>
                    </li>
                  );
                })()}
                {others.map((u) => {
                  const ch = dmChannelFor(u.uid);
                  const active = !!ch && ch.id === activeChannelId && mainView === 'channel';
                  const muted = !!ch && channelNotifPrefs[ch.id] === 'off';
                  const unread = !!ch && unreadChannels.has(ch.id) && !active && !muted;
                  const count = ch && !active ? Math.max(mentionCount(ch.id), unread ? loadedUnreadCount(ch.id) : 0) : 0;
                  const hasDraft = !!ch && !!drafts[ch.id] && !active;
                  return (
                    <li key={u.uid}>
                      <button
                        type="button"
                        onClick={() => openDM(u.uid)}
                        disabled={loadingUid === u.uid}
                        data-unread={unread ? '1' : undefined}
                        aria-current={active ? 'page' : undefined}
                        className={`${ROW_CLS} ${active ? '' : HOVER_CLS}`}
                        style={rowStyle(active, unread, muted)}
                      >
                        <Avatar name={u.displayName} photoURL={u.photoURL} size={20} radius={5} online={u.online} ringColor="transparent" />
                        <span className="flex-1 truncate">{loadingUid === u.uid ? '接続中...' : u.displayName}</span>
                        {u.status?.emoji && <span className="text-[13px] flex-shrink-0" title={u.status.text}>{u.status.emoji}</span>}
                        {hasDraft && count === 0 && <PencilIcon className="w-4 h-4 flex-shrink-0" aria-label="下書きあり" />}
                        {count > 0 && <CountBadge n={count} />}
                      </button>
                    </li>
                  );
                })}
                <li>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(window.location.origin);
                        setInviteCopied(true);
                        setTimeout(() => setInviteCopied(false), 2000);
                      } catch {
                        // clipboard 不可の環境では何もしない
                      }
                    }}
                    className={`${ROW_CLS} ${HOVER_CLS}`}
                    style={rowStyle(false, false)}
                  >
                    <span className="w-5 h-5 flex items-center justify-center rounded flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                      <UserIcon className="w-3 h-3" />
                    </span>
                    <span className="truncate">{inviteCopied ? 'URL をコピーしました' : 'メンバーを招待'}</span>
                  </button>
                </li>
              </ul>
            )}
          </section>
        </div>

        {hasUnreadBelow && (
          <button
            type="button"
            onClick={scrollToNextUnread}
            className="absolute left-1/2 -translate-x-1/2 bottom-3 flex items-center gap-1.5 px-3 rounded-full text-white text-[13px] font-bold whitespace-nowrap"
            style={{ height: 28, background: 'var(--sk-badge)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
          >
            <ArrowDownIcon className="w-[14px] h-[14px]" />
            その他の未読メッセージ
          </button>
        )}
      </div>

      {gearAnchor && (
        <Popover anchor={gearAnchor} placement="below" width={240} onClose={() => setGearAnchor(null)} label="ワークスペース設定">
          <MenuItem onClick={() => { setGearAnchor(null); setShowAddModal(true); }}>チャンネルを作成する</MenuItem>
          <MenuItem onClick={() => { setGearAnchor(null); window.dispatchEvent(new CustomEvent('open-theme-picker')); }}>テーマを変更する</MenuItem>
        </Popover>
      )}
      {showAddModal && <AddChannelModal onClose={() => setShowAddModal(false)} />}
      {showNewDM && <NewDMModal onClose={() => setShowNewDM(false)} />}
    </>
  );
}

// ─── Sidebar 本体: navTab で中身を切り替え ───────────────────────────────────
export default function Sidebar() {
  const navTab = useAppStore((s) => s.navTab);
  return (
    <nav aria-label="ワークスペースナビゲーション" className="flex flex-col h-full min-h-0" style={{ color: 'var(--sk-sidebar-text)' }}>
      {navTab === 'home' && <HomeSidebar />}
      {navTab === 'dms' && <DMList />}
      {navTab === 'activity' && <ActivityList />}
      {navTab === 'later' && <LaterList />}
      {navTab === 'files' && <FilesList />}
    </nav>
  );
}
