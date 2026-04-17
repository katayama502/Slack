import { useAppStore } from '../../store/useAppStore';

export default function NavRail() {
  const { user } = useAppStore((s) => s.auth);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const notificationsPanelOpen = useAppStore((s) => s.notificationsPanelOpen);
  const setNotificationsPanelOpen = useAppStore((s) => s.setNotificationsPanelOpen);
  const unreadCount = useAppStore((s) => s.unreadCount);

  const handleHome = () => {
    setActiveChannel(null);
    setNotificationsPanelOpen(false);
  };

  const handleActivity = () => {
    setNotificationsPanelOpen(!notificationsPanelOpen);
  };

  return (
    <div
      className="flex flex-col items-center py-2 gap-1 flex-shrink-0"
      style={{ width: '56px', background: '#3B0D3C', borderRight: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Workspace icon */}
      <div className="mb-2 mt-1">
        <div
          className="w-9 h-9 flex items-center justify-center text-white font-bold text-[15px] cursor-pointer hover:opacity-80 transition-opacity"
          style={{ borderRadius: '10px', background: '#4A154B', border: '1px solid rgba(255,255,255,0.3)' }}
          title="Creatte"
        >
          C
        </div>
      </div>

      {/* Home */}
      <button
        title="ホーム"
        onClick={handleHome}
        className="w-10 h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
        <span className="text-[9px] leading-none">ホーム</span>
      </button>

      {/* DM */}
      <button
        title="DM"
        className="w-10 h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        </svg>
        <span className="text-[9px] leading-none">DM</span>
      </button>

      {/* Activity (notifications) */}
      <button
        title="アクティビティ"
        onClick={handleActivity}
        className="relative w-10 h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors"
        style={{
          color: notificationsPanelOpen ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
          background: notificationsPanelOpen ? 'rgba(255,255,255,0.15)' : 'transparent',
        }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        <span className="text-[9px] leading-none">アクティビティ</span>
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center text-white text-[10px] font-bold leading-none px-0.5"
            style={{ background: '#E01E5A', borderRadius: '8px' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <div className="flex-1" />

      {/* User avatar at bottom */}
      <div className="mb-1 relative">
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName ?? ''}
            className="w-8 h-8 object-cover cursor-pointer hover:opacity-80 transition-opacity"
            style={{ borderRadius: '6px' }}
          />
        ) : (
          <div
            className="w-8 h-8 flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity"
            style={{ borderRadius: '6px', background: '#1164A3' }}
          >
            {(user?.displayName ?? '?')[0].toUpperCase()}
          </div>
        )}
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 bg-[#007A5A]"
          style={{ borderColor: '#3B0D3C' }}
        />
      </div>
    </div>
  );
}
