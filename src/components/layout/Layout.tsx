import { useRef, useState, useCallback, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import NavRail from '../sidebar/NavRail';
import Sidebar from '../sidebar/Sidebar';
import ChannelHeader from '../channel/ChannelHeader';
import PinBar from '../channel/PinBar';
import MessageList from '../message/MessageList';
import MessageInput from '../message/MessageInput';
import ThreadPanel from '../thread/ThreadPanel';
import NotificationsPanel from '../notifications/NotificationsPanel';
import { ToastContainer } from '../ui/Toast';

// ─── Keyboard shortcut help modal ────────────────────────────────────────────
const SHORTCUTS = [
  { keys: ['Ctrl', 'B'], label: '太字' },
  { keys: ['Ctrl', 'I'], label: '斜体' },
  { keys: ['Ctrl', 'U'], label: '下線' },
  { keys: ['Ctrl', 'K'], label: 'リンク挿入' },
  { keys: ['Enter'], label: 'メッセージ送信' },
  { keys: ['Shift', 'Enter'], label: '改行' },
  { keys: ['↑'], label: '自分の最後のメッセージを編集' },
  { keys: ['Esc'], label: '編集・検索をキャンセル' },
  { keys: ['Ctrl', '/'], label: 'ショートカット一覧' },
];

function ShortcutModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-lg overflow-hidden"
        style={{ background: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #EEEEEE' }}>
          <h3 className="text-[15px] font-bold text-[#1D1C1D]">キーボードショートカット</h3>
          <button onClick={onClose} className="text-[#616061] hover:text-[#1D1C1D] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-3 flex flex-col gap-2">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-[13px] text-[#1D1C1D]">{s.label}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <kbd
                    key={j}
                    className="px-1.5 py-0.5 text-[11px] font-mono text-[#1D1C1D]"
                    style={{ background: '#F8F8F8', border: '1px solid #DDDDDD', borderRadius: '4px', boxShadow: '0 1px 0 #BBBBBB' }}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3" style={{ borderTop: '1px solid #EEEEEE' }}>
          <p className="text-[12px] text-[#616061]">Macでは Ctrl の代わりに ⌘ Command を使用</p>
        </div>
      </div>
    </div>
  );
}

const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 480;
const SIDEBAR_DEFAULT = 220;
const RIGHT_MIN = 240;
const RIGHT_MAX = 600;
const RIGHT_DEFAULT = 400;
const NAVRAIL_WIDTH = 56;
const MOBILE_SIDEBAR_WIDTH = 280;
const MOBILE_BP = 768;

export default function Layout() {
  const threadPanelMessageId = useAppStore((s) => s.threadPanelMessageId);
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const notificationsPanelOpen = useAppStore((s) => s.notificationsPanelOpen);
  const mobileSidebarOpen = useAppStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const [shortcutOpen, setShortcutOpen] = useState(false);

  const rightPanel = threadPanelMessageId || notificationsPanelOpen;

  // Ctrl+/ でショートカット一覧を開く
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShortcutOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [rightPanelWidth, setRightPanelWidth] = useState(RIGHT_DEFAULT);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BP);

  const draggingSidebar = useRef(false);
  const draggingRight = useRef(false);

  // Track viewport width
  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < MOBILE_BP;
      setIsMobile(mobile);
      if (!mobile) setMobileSidebarOpen(false);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [setMobileSidebarOpen]);

  // Close sidebar when channel is selected on mobile
  useEffect(() => {
    if (isMobile && activeChannelId) {
      setMobileSidebarOpen(false);
    }
  }, [activeChannelId, isMobile, setMobileSidebarOpen]);

  const handleSidebarMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingSidebar.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleRightMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRight.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (draggingSidebar.current) {
        const newWidth = e.clientX - NAVRAIL_WIDTH;
        setSidebarWidth(Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, newWidth)));
      }
      if (draggingRight.current) {
        const newWidth = window.innerWidth - e.clientX;
        setRightPanelWidth(Math.max(RIGHT_MIN, Math.min(RIGHT_MAX, newWidth)));
      }
    };
    const onMouseUp = () => {
      draggingSidebar.current = false;
      draggingRight.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Desktop NavRail (left, 56px) ── */}
      {!isMobile && <NavRail />}

      {/* ── Mobile: sidebar backdrop ── */}
      {isMobile && mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col overflow-hidden flex-shrink-0"
        style={{
          width: isMobile ? MOBILE_SIDEBAR_WIDTH : sidebarWidth,
          background: '#3F0E40',
          // Mobile: fixed drawer with slide transition
          ...(isMobile ? {
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: 50,
            transform: mobileSidebarOpen ? 'translateX(0)' : `translateX(-${MOBILE_SIDEBAR_WIDTH}px)`,
            transition: 'transform 0.25s ease',
          } : {}),
        }}
      >
        <Sidebar />
      </aside>

      {/* ── Sidebar resize handle (desktop only) ── */}
      {!isMobile && (
        <div
          onMouseDown={handleSidebarMouseDown}
          className="flex-shrink-0 hover:bg-[#1164A3] transition-colors"
          style={{ width: '4px', cursor: 'col-resize', background: 'rgba(0,0,0,0.08)', zIndex: 10 }}
          title="ドラッグしてサイドバーの幅を変更"
        />
      )}

      {/* ── Main content ── */}
      <main
        className="flex flex-col overflow-hidden bg-white flex-1 min-w-0"
        style={{ paddingBottom: isMobile ? '56px' : 0 }}
      >
        {activeChannelId ? (
          <>
            <ChannelHeader onMenuClick={() => setMobileSidebarOpen(true)} />
            <PinBar />
            <MessageList />
            <MessageInput />
          </>
        ) : (
          <div
            className="flex flex-col items-center justify-center h-full gap-3"
            style={{ background: '#F8F8F8' }}
          >
            {/* Mobile: show open sidebar hint */}
            {isMobile && (
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="mb-2 flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[14px] font-semibold"
                style={{ background: '#3F0E40' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                チャンネルを開く
              </button>
            )}
            <div
              className="w-16 h-16 flex items-center justify-center text-white font-bold text-xl"
              style={{ borderRadius: '12px', background: '#3F0E40', letterSpacing: '-0.5px' }}
            >
              Cr
            </div>
            <p className="text-[18px] font-bold text-[#1D1C1D]">チャンネルを選択してください</p>
            <p className="text-[14px] text-[#616061] text-center px-6">
              {isMobile ? '上のボタンからチャンネルを選んでください' : '左のサイドバーからチャンネルを選んで会話を始めましょう'}
            </p>
          </div>
        )}
      </main>

      {/* ── Right panel resize handle (desktop only) ── */}
      {!isMobile && rightPanel && (
        <div
          onMouseDown={handleRightMouseDown}
          className="flex-shrink-0 hover:bg-[#1164A3] transition-colors"
          style={{ width: '4px', cursor: 'col-resize', background: 'rgba(0,0,0,0.08)', zIndex: 10 }}
          title="ドラッグしてパネルの幅を変更"
        />
      )}

      {/* ── Right panel: Thread or Notifications ── */}
      {rightPanel && (
        <>
          {/* Mobile: full-screen overlay */}
          {isMobile && (
            <div
              className="fixed inset-0 z-50 flex flex-col"
              style={{ background: '#FFFFFF' }}
            >
              {threadPanelMessageId ? <ThreadPanel /> : <NotificationsPanel />}
            </div>
          )}
          {/* Desktop: inline panel */}
          {!isMobile && (
            <aside
              className="flex flex-col overflow-hidden flex-shrink-0"
              style={{ width: rightPanelWidth }}
            >
              {threadPanelMessageId ? <ThreadPanel /> : <NotificationsPanel />}
            </aside>
          )}
        </>
      )}

      {/* ── Mobile bottom navigation ── */}
      {isMobile && (
        <MobileBottomNav
          onMenuClick={() => setMobileSidebarOpen(true)}
          onHomeClick={() => { setActiveChannel(null); setMobileSidebarOpen(false); }}
        />
      )}

      {/* Shortcut help modal */}
      {shortcutOpen && <ShortcutModal onClose={() => setShortcutOpen(false)} />}

      {/* Global toast notifications */}
      <ToastContainer />
    </div>
  );
}

// ── Mobile bottom navigation bar ─────────────────────────────────────────────
function MobileBottomNav({
  onMenuClick,
  onHomeClick,
}: {
  onMenuClick: () => void;
  onHomeClick: () => void;
}) {
  const { user } = useAppStore((s) => s.auth);
  const notificationsPanelOpen = useAppStore((s) => s.notificationsPanelOpen);
  const setNotificationsPanelOpen = useAppStore((s) => s.setNotificationsPanelOpen);
  const unreadCount = useAppStore((s) => s.unreadCount);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around"
      style={{
        background: '#3B0D3C',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        height: '56px',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* チャンネル */}
      <button
        onClick={onMenuClick}
        className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-white/60 hover:text-white transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
        </svg>
        <span className="text-[10px] leading-none">チャンネル</span>
      </button>

      {/* ホーム */}
      <button
        onClick={onHomeClick}
        className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-white/60 hover:text-white transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
        <span className="text-[10px] leading-none">ホーム</span>
      </button>

      {/* アクティビティ */}
      <button
        onClick={() => setNotificationsPanelOpen(!notificationsPanelOpen)}
        className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
        style={{ color: notificationsPanelOpen ? '#FFFFFF' : 'rgba(255,255,255,0.6)' }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        <span className="text-[10px] leading-none">アクティビティ</span>
        {unreadCount > 0 && (
          <span
            className="absolute top-1.5 right-[18%] min-w-[16px] h-4 flex items-center justify-center text-white text-[10px] font-bold leading-none px-0.5"
            style={{ background: '#E01E5A', borderRadius: '8px' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* プロフィール */}
      <button
        onClick={() => onMenuClick()}
        className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-white/60 hover:text-white transition-colors"
      >
        <div className="relative">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName ?? ''}
              className="w-7 h-7 object-cover"
              style={{ borderRadius: '6px' }}
            />
          ) : (
            <div
              className="w-7 h-7 flex items-center justify-center text-white text-xs font-bold"
              style={{ borderRadius: '6px', background: '#1164A3' }}
            >
              {(user?.displayName ?? '?')[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <span
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 bg-[#007A5A]"
            style={{ borderColor: '#3B0D3C' }}
          />
        </div>
        <span className="text-[10px] leading-none">プロフィール</span>
      </button>
    </nav>
  );
}
