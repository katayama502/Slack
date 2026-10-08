import { useRef, useState, useCallback, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { NavTab } from '../../store/useAppStore';
import { useUnreadChannels } from '../../hooks/useUnreadChannels';
import NavRail from '../sidebar/NavRail';
import Sidebar from '../sidebar/Sidebar';
import { Popover, isDMChannel, channelLabel } from '../sidebar/shared';
import ChannelHeader from '../channel/ChannelHeader';
import PinBar from '../channel/PinBar';
import PinsTab from '../channel/PinsTab';
import FilesTab from '../channel/FilesTab';
import MessageList from '../message/MessageList';
import MessageInput from '../message/MessageInput';
import TypingIndicator from '../message/TypingIndicator';
import ThreadPanel from '../thread/ThreadPanel';
import DraftsPanel from '../drafts/DraftsPanel';
import ThreadsPanel from '../threads/ThreadsPanel';
import DirectoryView from '../views/DirectoryView';
import HuddlesView from '../views/HuddlesView';
import SlackbotView from '../views/SlackbotView';
import QuickSwitcher from '../ui/QuickSwitcher';
import Avatar from '../ui/Avatar';
import { ToastContainer } from '../ui/Toast';
import {
  SidebarToggleIcon, ArrowLeftIcon, ArrowRightIcon, ClockIcon, SearchIcon, HelpIcon, CloseIcon,
  HashIcon, LockIcon, HomeIcon, DMIcon, BellIcon, BookmarkIcon, FilesIcon,
} from '../ui/icons';

// ─── Keyboard shortcut modal ─────────────────────────────────────────────────
const SHORTCUT_GROUPS: { title: string; items: { keys: string[]; label: string }[] }[] = [
  {
    title: 'ナビゲーション',
    items: [
      { keys: ['⌘', 'K'], label: '会話にジャンプ / 検索' },
      { keys: ['⌘', 'F'], label: 'チャンネル内を検索' },
      { keys: ['Alt', '↑'], label: '前のチャンネル' },
      { keys: ['Alt', '↓'], label: '次のチャンネル' },
      { keys: ['⌘', '/'], label: 'キーボードショートカットを表示' },
      { keys: ['Esc'], label: 'パネル・モーダルを閉じる' },
    ],
  },
  {
    title: 'メッセージ',
    items: [
      { keys: ['Enter'], label: 'メッセージを送信' },
      { keys: ['Shift', 'Enter'], label: '改行' },
      { keys: ['↑'], label: '自分の最後のメッセージを編集' },
      { keys: ['⌘', 'B'], label: '太字' },
      { keys: ['⌘', 'I'], label: '斜体' },
    ],
  },
];

function ShortcutModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-title"
        className="w-full max-w-[520px] max-h-[80vh] flex flex-col rounded-lg overflow-hidden bg-white"
        style={{ boxShadow: '0 18px 48px rgba(0,0,0,0.3)', animation: 'popIn 150ms ease' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3" style={{ borderBottom: '1px solid var(--sk-border)' }}>
          <h2 id="shortcut-title" className="text-[22px] text-[var(--sk-text)]" style={{ fontWeight: 900 }}>キーボードショートカット</h2>
          <button type="button" aria-label="閉じる" onClick={onClose} className="w-9 h-9 -mr-2 flex items-center justify-center rounded-md text-[var(--sk-text-2)] hover:bg-[var(--sk-subtle)]">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4">
          {SHORTCUT_GROUPS.map((g) => (
            <section key={g.title} className="mb-4">
              <h3 className="text-[13px] font-bold text-[var(--sk-text-2)] mb-1">{g.title}</h3>
              <ul>
                {g.items.map((s) => (
                  <li key={s.label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid var(--sk-border)' }}>
                    <span className="text-[15px] text-[var(--sk-text)]">{s.label}</span>
                    <span className="flex items-center gap-1">
                      {s.keys.map((k) => (
                        <kbd key={k} className="min-w-[24px] px-1.5 text-center text-[12px] text-[var(--sk-text)] rounded" style={{ background: 'var(--sk-hover)', border: '1px solid var(--sk-border-strong)', boxShadow: '0 1px 0 var(--sk-border-strong)' }}>
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="text-[13px] text-[var(--sk-text-2)]">Windows では ⌘ の代わりに Ctrl を使用します。</p>
        </div>
      </div>
    </div>
  );
}

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 480;
const SIDEBAR_DEFAULT = 260;
const RIGHT_MIN = 300;
const RIGHT_MAX = 640;
const RIGHT_DEFAULT = 400;
const MOBILE_SIDEBAR_WIDTH = 300;
const MOBILE_BP = 768;

export default function Layout() {
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const threadPanelMessageId = useAppStore((s) => s.threadPanelMessageId);
  const closeThreadPanel = useAppStore((s) => s.closeThreadPanel);
  const mainView = useAppStore((s) => s.mainView);
  const setMainView = useAppStore((s) => s.setMainView);
  const channelTab = useAppStore((s) => s.channelTab);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const mobileSidebarOpen = useAppStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const setJumpToMessageId = useAppStore((s) => s.setJumpToMessageId);
  const shortcutsOpen = useAppStore((s) => s.shortcutsOpen);
  const setShortcutsOpen = useAppStore((s) => s.setShortcutsOpen);
  const setNavTab = useAppStore((s) => s.setNavTab);
  // 旧パネルフラグ（互換用）: どこかで立てられたら新ナビへ振り替える
  const notificationsPanelOpen = useAppStore((s) => s.notificationsPanelOpen);
  const savedItemsPanelOpen = useAppStore((s) => s.savedItemsPanelOpen);
  const draftsPanelOpen = useAppStore((s) => s.draftsPanelOpen);
  const threadsPanelOpen = useAppStore((s) => s.threadsPanelOpen);
  const setNotificationsPanelOpen = useAppStore((s) => s.setNotificationsPanelOpen);
  const setSavedItemsPanelOpen = useAppStore((s) => s.setSavedItemsPanelOpen);
  const unreadChannels = useUnreadChannels();

  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [rightPanelWidth, setRightPanelWidth] = useState(RIGHT_DEFAULT);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BP);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const draggingSidebar = useRef(false);
  const draggingRight = useRef(false);

  // ── 旧フラグ → 新ナビ ──
  useEffect(() => {
    if (notificationsPanelOpen) { setNavTab('activity'); setNotificationsPanelOpen(false); }
    if (savedItemsPanelOpen) { setNavTab('later'); setSavedItemsPanelOpen(false); }
    if (draftsPanelOpen) setMainView('drafts');
    if (threadsPanelOpen) setMainView('threads');
  }, [notificationsPanelOpen, savedItemsPanelOpen, draftsPanelOpen, threadsPanelOpen, setNavTab, setNotificationsPanelOpen, setSavedItemsPanelOpen, setMainView]);

  // ── document.title に未読数 ──
  useEffect(() => {
    const count = unreadChannels.size;
    document.title = count > 0 ? `(${count}) Creatte` : 'Creatte';
  }, [unreadChannels.size]);

  // ── URL: ?channel=X&msg=Y ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const channelParam = params.get('channel');
    const msgParam = params.get('msg');
    if (channelParam) {
      setActiveChannel(channelParam);
      if (msgParam) setJumpToMessageId(msgParam);
      history.replaceState(null, '', window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── キーボードショートカット ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key === '/') {
        e.preventDefault();
        setShortcutsOpen(!useAppStore.getState().shortcutsOpen);
        return;
      }
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickSwitcherOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape' && !isInput) {
        if (quickSwitcherOpen) { setQuickSwitcherOpen(false); return; }
        if (useAppStore.getState().shortcutsOpen) { setShortcutsOpen(false); return; }
        if (useAppStore.getState().threadPanelMessageId) { closeThreadPanel(); return; }
      }
      if (mod && e.key.toLowerCase() === 'f' && !isInput) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('open-channel-search'));
        return;
      }
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && !isInput) {
        e.preventDefault();
        const state = useAppStore.getState();
        const uid = state.auth.user?.uid ?? '';
        const list = state.channels.filter((c) => !isDMChannel(c) && (!c.isPrivate || (c.members ?? []).includes(uid)));
        const cur = list.findIndex((c) => c.id === state.activeChannelId);
        const next = e.key === 'ArrowDown' ? list[Math.min(cur + 1, list.length - 1)] : list[Math.max(cur - 1, 0)];
        if (next) setActiveChannel(next.id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [quickSwitcherOpen, closeThreadPanel, setShortcutsOpen, setActiveChannel]);

  // ── ビューポート ──
  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < MOBILE_BP;
      setIsMobile(mobile);
      if (!mobile) setMobileSidebarOpen(false);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [setMobileSidebarOpen]);

  // モバイル: チャンネル / ビュー選択でドロワーを閉じる
  useEffect(() => {
    if (isMobile) setMobileSidebarOpen(false);
  }, [activeChannelId, mainView, isMobile, setMobileSidebarOpen]);

  // ── リサイズ ──
  const startDrag = useCallback((which: 'sidebar' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    if (which === 'sidebar') draggingSidebar.current = true;
    else draggingRight.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingSidebar.current && sidebarRef.current) {
        const left = sidebarRef.current.getBoundingClientRect().left;
        setSidebarWidth(Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, e.clientX - left)));
      }
      if (draggingRight.current) {
        setRightPanelWidth(Math.max(RIGHT_MIN, Math.min(RIGHT_MAX, window.innerWidth - 4 - e.clientX)));
      }
    };
    const onUp = () => {
      if (!draggingSidebar.current && !draggingRight.current) return;
      draggingSidebar.current = false;
      draggingRight.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // ── メインペイン ──
  const renderMain = () => {
    switch (mainView) {
      case 'threads': return <ThreadsPanel />;
      case 'drafts': return <DraftsPanel />;
      case 'directory': return <DirectoryView />;
      case 'huddles': return <HuddlesView />;
      case 'slackbot': return <SlackbotView />;
      default: break;
    }
    if (!activeChannelId) return <WelcomeView isMobile={isMobile} onOpenSidebar={() => setMobileSidebarOpen(true)} />;
    const header = <ChannelHeader onMenuClick={() => setMobileSidebarOpen(true)} />;
    if (channelTab === 'pins') return <>{header}<PinsTab /></>;
    if (channelTab === 'files') return <>{header}<FilesTab /></>;
    return (
      <>
        {header}
        <PinBar />
        <MessageList />
        <TypingIndicator />
        <MessageInput />
      </>
    );
  };

  const showSidebar = isMobile || sidebarOpen;

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--sk-window)' }}>
      <TopBar isMobile={isMobile} onSearch={() => setQuickSwitcherOpen(true)} searchOpen={quickSwitcherOpen} />

      <div className="flex flex-1 min-h-0">
        {!isMobile && <NavRail />}

        {/* モバイル: ドロワー背景 */}
        {isMobile && mobileSidebarOpen && (
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={() => setMobileSidebarOpen(false)} />
        )}

        {/* ── フローティングカード ── */}
        <div
          className="flex flex-1 min-w-0 overflow-hidden"
          style={isMobile ? { paddingBottom: 56 } : { marginRight: 4, marginBottom: 4, borderRadius: 'var(--sk-radius-card)' }}
        >
          {showSidebar && (
            <aside
              ref={sidebarRef}
              aria-label="サイドバー"
              className="relative flex flex-col flex-shrink-0 overflow-hidden"
              style={
                isMobile
                  ? {
                      position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50, width: MOBILE_SIDEBAR_WIDTH,
                      background: 'var(--sk-window)',
                      transform: mobileSidebarOpen ? 'translateX(0)' : `translateX(-${MOBILE_SIDEBAR_WIDTH + 10}px)`,
                      transition: 'transform 0.25s ease',
                    }
                  : { width: sidebarWidth, background: 'var(--sk-sidebar-overlay)' }
              }
            >
              <div className="flex flex-col h-full min-h-0" style={isMobile ? { background: 'var(--sk-sidebar-overlay)', paddingBottom: 56 } : undefined}>
                <Sidebar />
              </div>
              {!isMobile && (
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="サイドバーの幅を変更"
                  onMouseDown={startDrag('sidebar')}
                  onDoubleClick={() => setSidebarWidth(SIDEBAR_DEFAULT)}
                  className="absolute top-0 right-0 h-full z-10"
                  style={{ width: 6, cursor: 'col-resize' }}
                />
              )}
            </aside>
          )}

          <main className="flex flex-col flex-1 min-w-0 overflow-hidden bg-white" aria-label="メインコンテンツ">
            {renderMain()}
          </main>

          {threadPanelMessageId && !isMobile && (
            <aside
              aria-label="スレッド"
              className="relative flex flex-col flex-shrink-0 overflow-hidden bg-white"
              style={{ width: rightPanelWidth, borderLeft: '1px solid var(--sk-border)', animation: 'slideInRight 180ms ease' }}
            >
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="スレッドパネルの幅を変更"
                onMouseDown={startDrag('right')}
                className="absolute top-0 left-0 h-full z-10"
                style={{ width: 6, cursor: 'col-resize' }}
              />
              <ThreadPanel />
            </aside>
          )}
        </div>
      </div>

      {threadPanelMessageId && isMobile && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <ThreadPanel />
        </div>
      )}

      {isMobile && <MobileBottomNav />}
      {quickSwitcherOpen && <QuickSwitcher onClose={() => setQuickSwitcherOpen(false)} />}
      {shortcutsOpen && <ShortcutModal onClose={() => setShortcutsOpen(false)} />}
      <ToastContainer />
    </div>
  );
}

// ─── 上部バー（40px・ウィンドウ背景に透過） ──────────────────────────────────
function TopBar({ isMobile, onSearch, searchOpen }: { isMobile: boolean; onSearch: () => void; searchOpen: boolean }) {
  const { user } = useAppStore((s) => s.auth);
  const users = useAppStore((s) => s.users);
  const channels = useAppStore((s) => s.channels);
  const navHistory = useAppStore((s) => s.navHistory);
  const navIndex = useAppStore((s) => s.navIndex);
  const navBack = useAppStore((s) => s.navBack);
  const navForward = useAppStore((s) => s.navForward);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const setShortcutsOpen = useAppStore((s) => s.setShortcutsOpen);
  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen);
  const [historyAnchor, setHistoryAnchor] = useState<DOMRect | null>(null);

  const canBack = navIndex > 0;
  const canForward = navIndex >= 0 && navIndex < navHistory.length - 1;

  // 履歴: 重複除去・新しい順・最大 10 件
  const recent: string[] = [];
  for (let i = navHistory.length - 1; i >= 0 && recent.length < 10; i--) {
    const id = navHistory[i];
    if (!recent.includes(id) && channels.some((c) => c.id === id)) recent.push(id);
  }

  const iconBtn = 'w-8 h-8 flex items-center justify-center rounded-md text-white transition-colors hover:bg-[rgba(255,255,255,0.15)] disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-default';

  return (
    <header className="flex items-center flex-shrink-0 gap-1 px-2" style={{ height: isMobile ? 44 : 40 }}>
      <div className="flex items-center gap-0.5 flex-shrink-0" style={{ width: isMobile ? undefined : 'calc(70px + 200px)' }}>
        {isMobile ? (
          <button type="button" aria-label="サイドバーを開く" onClick={() => setMobileSidebarOpen(true)} className={iconBtn}>
            <SidebarToggleIcon className="w-5 h-5" />
          </button>
        ) : (
          <>
            <span className="w-[54px] flex justify-center">
              <button type="button" aria-label={sidebarOpen ? 'サイドバーを非表示' : 'サイドバーを表示'} title={sidebarOpen ? 'サイドバーを非表示' : 'サイドバーを表示'} onClick={toggleSidebar} className={iconBtn}>
                <SidebarToggleIcon className="w-5 h-5" />
              </button>
            </span>
            <div className="flex-1" />
            <button type="button" aria-label="戻る" title="戻る" onClick={navBack} disabled={!canBack} className={iconBtn}>
              <ArrowLeftIcon className="w-[18px] h-[18px]" />
            </button>
            <button type="button" aria-label="進む" title="進む" onClick={navForward} disabled={!canForward} className={iconBtn}>
              <ArrowRightIcon className="w-[18px] h-[18px]" />
            </button>
            <button
              type="button"
              aria-label="履歴"
              title="履歴"
              aria-haspopup="menu"
              aria-expanded={!!historyAnchor}
              onClick={(e) => setHistoryAnchor(historyAnchor ? null : e.currentTarget.getBoundingClientRect())}
              className={iconBtn}
            >
              <ClockIcon className="w-[18px] h-[18px]" />
            </button>
          </>
        )}
      </div>

      <div className="flex-1 flex justify-center min-w-0 px-2">
        <button
          type="button"
          onClick={onSearch}
          aria-label="Creatte 内を検索"
          className="w-full flex items-center gap-2 px-2.5 text-left transition-colors hover:bg-[rgba(255,255,255,0.28)]"
          style={{
            maxWidth: 720,
            height: 28,
            borderRadius: 6,
            background: searchOpen ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)',
          }}
        >
          <SearchIcon className="w-[15px] h-[15px] text-white flex-shrink-0" />
          <span className="text-[13px] text-white truncate flex-1">Creatte 内を検索</span>
          {!isMobile && <kbd className="text-[11px] text-white/70 font-sans flex-shrink-0">⌘K</kbd>}
        </button>
      </div>

      <div className="flex items-center justify-end flex-shrink-0" style={{ width: isMobile ? undefined : 120 }}>
        <button type="button" aria-label="ヘルプ（キーボードショートカット）" title="ヘルプ" onClick={() => setShortcutsOpen(true)} className={iconBtn}>
          <HelpIcon className="w-5 h-5" />
        </button>
      </div>

      {historyAnchor && (
        <Popover anchor={historyAnchor} placement="below" width={320} onClose={() => setHistoryAnchor(null)} label="最近の履歴">
          <p className="px-5 pb-1 text-[13px] font-bold text-[var(--sk-text-2)]">最近</p>
          {recent.length === 0 ? (
            <p className="px-5 py-2 text-[14px] text-[var(--sk-text-2)]">履歴はまだありません</p>
          ) : (
            recent.map((id) => {
              const ch = channels.find((c) => c.id === id);
              if (!ch) return null;
              const dm = isDMChannel(ch);
              const peer = dm ? users.find((u) => (ch.members ?? []).includes(u.uid) && u.uid !== user?.uid) ?? users.find((u) => u.uid === user?.uid) : undefined;
              const Icon = ch.isPrivate ? LockIcon : HashIcon;
              return (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  onClick={() => { setActiveChannel(id); setHistoryAnchor(null); }}
                  className="w-full flex items-center gap-2 px-5 text-left text-[15px] hover:bg-[#1264A3] hover:text-white"
                  style={{ height: 32 }}
                >
                  {dm ? <Avatar name={peer?.displayName ?? '?'} photoURL={peer?.photoURL} size={20} radius={5} /> : <Icon className="w-4 h-4 flex-shrink-0" />}
                  <span className="truncate">{dm ? channelLabel(ch, users, user?.uid) : ch.name}</span>
                </button>
              );
            })
          )}
        </Popover>
      )}
    </header>
  );
}

// ─── チャンネル未選択時 ──────────────────────────────────────────────────────
function WelcomeView({ isMobile, onOpenSidebar }: { isMobile: boolean; onOpenSidebar: () => void }) {
  const { user } = useAppStore((s) => s.auth);
  const setMainView = useAppStore((s) => s.setMainView);
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
      <div className="w-16 h-16 mb-2 rounded-2xl flex items-center justify-center bg-white text-[32px]" style={{ color: '#4A154B', fontWeight: 900, boxShadow: '0 0 0 1px var(--sk-border), 0 4px 12px rgba(0,0,0,0.08)' }}>
        C
      </div>
      <h1 className="text-[28px] text-[var(--sk-text)]" style={{ fontWeight: 900 }}>
        {user?.displayName ? `${user.displayName} さん、ようこそ` : 'Creatte へようこそ'} 👋
      </h1>
      <p className="text-[15px] text-[var(--sk-text-2)] max-w-[440px]">
        {isMobile ? 'メニューからチャンネルや DM を選んで会話を始めましょう。' : '左のサイドバーからチャンネルや DM を選んで会話を始めましょう。'}
      </p>
      <div className="flex flex-wrap justify-center gap-2 mt-2">
        {isMobile && (
          <button type="button" onClick={onOpenSidebar} className="px-4 rounded-lg text-[15px] font-bold text-white" style={{ height: 36, background: 'var(--sk-green)' }}>
            チャンネルを開く
          </button>
        )}
        <button type="button" onClick={() => setMainView('directory')} className="px-4 rounded-lg text-[15px] font-bold text-[var(--sk-text)] hover:bg-[var(--sk-hover)]" style={{ height: 36, border: '1px solid var(--sk-border-strong)' }}>
          チャンネルを閲覧する
        </button>
      </div>
    </div>
  );
}

// ─── モバイル下部ナビ ────────────────────────────────────────────────────────
function MobileBottomNav() {
  const navTab = useAppStore((s) => s.navTab);
  const setNavTab = useAppStore((s) => s.setNavTab);
  const mobileSidebarOpen = useAppStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen);
  const unreadCount = useAppStore((s) => s.unreadCount);

  const items: { id: NavTab; label: string; Icon: typeof HomeIcon }[] = [
    { id: 'home', label: 'ホーム', Icon: HomeIcon },
    { id: 'dms', label: 'DM', Icon: DMIcon },
    { id: 'activity', label: 'アクティビティ', Icon: BellIcon },
    { id: 'files', label: 'ファイル', Icon: FilesIcon },
    { id: 'later', label: '後で', Icon: BookmarkIcon },
  ];

  return (
    <nav
      aria-label="モバイルナビゲーション"
      className="fixed bottom-0 left-0 right-0 z-[55] flex items-stretch"
      style={{ background: 'var(--sk-window)', borderTop: '1px solid rgba(255,255,255,0.12)', height: 56, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {items.map(({ id, label, Icon }) => {
        const active = navTab === id && mobileSidebarOpen;
        return (
          <button
            key={id}
            type="button"
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            onClick={() => {
              if (navTab === id && mobileSidebarOpen) setMobileSidebarOpen(false);
              else { setNavTab(id); setMobileSidebarOpen(true); }
            }}
            className="relative flex-1 flex flex-col items-center justify-center gap-0.5 text-white"
            style={{ opacity: active ? 1 : 0.75 }}
          >
            <Icon filled={active} className="w-[22px] h-[22px]" />
            <span className="text-[10px] font-bold leading-none">{label}</span>
            {id === 'activity' && unreadCount > 0 && (
              <span className="absolute top-1 left-1/2 ml-1.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--sk-badge)' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
