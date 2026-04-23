import { useAppStore } from '../../store/useAppStore';
import { useUnreadChannels } from '../../hooks/useUnreadChannels';

export default function NavRail() {
  const { user } = useAppStore((s) => s.auth);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const notificationsPanelOpen = useAppStore((s) => s.notificationsPanelOpen);
  const setNotificationsPanelOpen = useAppStore((s) => s.setNotificationsPanelOpen);
  const unreadCount = useAppStore((s) => s.unreadCount);
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const channels = useAppStore((s) => s.channels);
  const unreadChannels = useUnreadChannels();

  const hasUnreadChannels = unreadChannels.size > 0;
  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const isChannelActive = !!(activeChannelId && activeChannel && !activeChannel.name.startsWith('__dm__'));
  const isDMActive = !!(activeChannelId && activeChannel?.name.startsWith('__dm__'));

  const savedItemsPanelOpen = useAppStore((s) => s.savedItemsPanelOpen);
  const setSavedItemsPanelOpen = useAppStore((s) => s.setSavedItemsPanelOpen);
  const savedMessages = useAppStore((s) => s.savedMessages);

  const handleHome = () => {
    setActiveChannel(null);
    setNotificationsPanelOpen(false);
    setSavedItemsPanelOpen(false);
  };

  const handleActivity = () => {
    setNotificationsPanelOpen(!notificationsPanelOpen);
    if (!notificationsPanelOpen) setSavedItemsPanelOpen(false);
  };

  const handleSaved = () => {
    setSavedItemsPanelOpen(!savedItemsPanelOpen);
    if (!savedItemsPanelOpen) setNotificationsPanelOpen(false);
  };

  const NavBtn = ({
    title,
    onClick,
    active,
    children,
    badge,
  }: {
    title: string;
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    badge?: React.ReactNode;
  }) => (
    <div className="relative w-full flex items-center">
      {/* Active indicator: left pill */}
      <div
        className="absolute left-0 rounded-r-full transition-all duration-200"
        style={{
          width: '3px',
          height: active ? '24px' : '0px',
          background: '#FFFFFF',
          opacity: active ? 1 : 0,
        }}
      />
      <button
        title={title}
        onClick={onClick}
        className="relative mx-auto w-10 h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg"
        style={{
          color: active ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
          background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
          transition: 'background 150ms ease, color 150ms ease, transform 100ms ease, opacity 100ms ease',
          boxShadow: active ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
            e.currentTarget.style.color = '#FFFFFF';
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
          }
        }}
      >
        {children}
        {badge}
      </button>
    </div>
  );

  return (
    <div
      className="flex flex-col items-center py-2 gap-0.5 flex-shrink-0"
      style={{ width: '56px', background: '#3B0D3C', borderRight: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Workspace icon */}
      <div className="mb-3 mt-1">
        <button
          className="w-9 h-9 flex items-center justify-center text-white font-bold text-[15px] press-subtle"
          style={{
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #4A154B, #6B2D6B)',
            border: '1px solid rgba(255,255,255,0.25)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}
          title="Creatte ワークスペース"
        >
          C
        </button>
      </div>

      {/* Home */}
      <NavBtn title="ホーム" onClick={handleHome} active={!activeChannelId && !notificationsPanelOpen && !savedItemsPanelOpen}>
        <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
        <span className="text-[9px] leading-none font-medium">ホーム</span>
      </NavBtn>

      {/* Channels */}
      <NavBtn title="チャンネル" onClick={handleHome} active={isChannelActive}>
        <div className="relative">
          <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={isChannelActive ? 2 : 1.7} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />
          </svg>
          {hasUnreadChannels && !isChannelActive && (
            <span
              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
              style={{ background: '#E01E5A', border: '1.5px solid #3B0D3C' }}
            />
          )}
        </div>
        <span className="text-[9px] leading-none font-medium">チャンネル</span>
      </NavBtn>

      {/* DM */}
      <NavBtn title="ダイレクトメッセージ" onClick={() => {}} active={isDMActive}>
        <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={isDMActive ? 2 : 1.7} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        </svg>
        <span className="text-[9px] leading-none font-medium">DM</span>
      </NavBtn>

      {/* Activity (notifications) */}
      <NavBtn
        title={`アクティビティ${unreadCount > 0 ? ` (${unreadCount}件)` : ''}`}
        onClick={handleActivity}
        active={notificationsPanelOpen}
        badge={
          unreadCount > 0 ? (
            <span
              className="absolute top-0.5 right-0.5 min-w-[16px] h-4 flex items-center justify-center text-white text-[10px] font-bold leading-none px-0.5"
              style={{ background: '#E01E5A', borderRadius: '8px', border: '1.5px solid #3B0D3C' }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null
        }
      >
        <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={notificationsPanelOpen ? 2 : 1.7} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        <span className="text-[9px] leading-none font-medium">通知</span>
      </NavBtn>

      {/* Saved Items */}
      <NavBtn
        title="保存済みアイテム"
        onClick={handleSaved}
        active={savedItemsPanelOpen}
        badge={
          savedMessages.length > 0 ? (
            <span
              className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full"
              style={{ background: '#E8A400', border: '1.5px solid #3B0D3C' }}
            />
          ) : null
        }
      >
        <svg className="w-[22px] h-[22px]" fill={savedItemsPanelOpen ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={savedItemsPanelOpen ? 2 : 1.7} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
        </svg>
        <span className="text-[9px] leading-none font-medium">保存</span>
      </NavBtn>

      <div className="flex-1" />

      {/* User avatar at bottom */}
      <div className="mb-1 relative">
        <button
          className="press-subtle"
          style={{ borderRadius: '8px', overflow: 'hidden' }}
          title={user?.displayName ?? 'プロフィール'}
        >
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName ?? ''}
              className="w-8 h-8 object-cover block"
              style={{ borderRadius: '6px' }}
            />
          ) : (
            <div
              className="w-8 h-8 flex items-center justify-center text-white text-sm font-bold"
              style={{ borderRadius: '6px', background: '#1164A3' }}
            >
              {(user?.displayName ?? '?')[0].toUpperCase()}
            </div>
          )}
        </button>
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 bg-[#007A5A] pointer-events-none"
          style={{ borderColor: '#3B0D3C' }}
        />
      </div>
    </div>
  );
}
