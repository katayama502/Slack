import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import { formatFullDateTime } from '../../utils/formatDate';
import type { User } from '../../types';

// ─── Members panel (portal) ───────────────────────────────────────────────────
function MembersPanel({
  members,
  users,
  anchorRect,
  onClose,
}: {
  members: string[];
  users: User[];
  anchorRect: DOMRect;
  onClose: () => void;
}) {
  const top = anchorRect.bottom + 6;
  const right = window.innerWidth - anchorRect.right;
  const memberUsers = users.filter((u) => members.includes(u.uid));

  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 flex flex-col"
        style={{
          top,
          right,
          width: '260px',
          maxHeight: '400px',
          background: '#FFFFFF',
          border: '1px solid #DDDDDD',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}
      >
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #EEEEEE' }}>
          <span className="text-[13px] font-bold text-[#1D1C1D]">メンバー ({memberUsers.length})</span>
          <button onClick={onClose} className="text-[#616061] hover:text-[#1D1C1D] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 py-1">
          {memberUsers.length === 0 && (
            <p className="text-[13px] text-[#616061] px-4 py-3">メンバーがいません</p>
          )}
          {memberUsers.map((u) => (
            <div key={u.uid} className="flex items-center gap-2.5 px-4 py-2 hover:bg-[#F8F8F8] transition-colors">
              <div className="relative flex-shrink-0">
                {u.photoURL ? (
                  <img src={u.photoURL} alt={u.displayName} className="w-8 h-8 rounded object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold" style={{ background: '#1164A3' }}>
                    {u.displayName[0].toUpperCase()}
                  </div>
                )}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${u.online ? 'bg-[#007A5A]' : 'bg-[#AAAAAA]'}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#1D1C1D] truncate">{u.displayName}</p>
                <p className="text-[11px] text-[#616061]">{u.online ? 'アクティブ' : 'オフライン'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ChannelHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const channels = useAppStore((s) => s.channels);
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const { user } = useAppStore((s) => s.auth);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const channel = channels.find((c) => c.id === activeChannelId);

  const users = useAppStore((s) => s.users);
  const [searchOpen, setSearchOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [membersAnchor, setMembersAnchor] = useState<DOMRect | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setSearchQuery('');
    setSearchOpen(false);
    setMembersOpen(false);
  }, [activeChannelId, setSearchQuery]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  if (!channel) return null;

  const isDM = channel.name.startsWith('__dm__');
  const dmOtherUser = isDM
    ? users.find((u) => u.uid !== user?.uid && channel.members?.includes(u.uid))
    : null;
  const memberCount = channel.members?.length ?? 0;
  const displayName = isDM ? (dmOtherUser?.displayName ?? 'ダイレクトメッセージ') : channel.name;

  const handleSearchToggle = () => {
    if (searchOpen) {
      setSearchOpen(false);
      setSearchQuery('');
    } else {
      setSearchOpen(true);
    }
  };

  const handleMembersToggle = () => {
    if (membersOpen) {
      setMembersOpen(false);
      setMembersAnchor(null);
    } else {
      const rect = infoButtonRef.current?.getBoundingClientRect();
      if (rect) setMembersAnchor(rect);
      setMembersOpen(true);
    }
  };

  return (
    <>
      <header
        className="flex items-center justify-between bg-white flex-shrink-0"
        style={{ minHeight: '49px', borderBottom: '1px solid #E8E8E8', padding: '0 16px' }}
      >
        {/* Left */}
        <div className="flex items-center gap-2 min-w-0">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="flex md:hidden w-8 h-8 items-center justify-center rounded flex-shrink-0 transition-colors"
              style={{ color: '#616061' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F8F8F8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <div className="flex items-center gap-1.5 min-w-0">
            {isDM ? (
              <div className="relative flex-shrink-0">
                {dmOtherUser?.photoURL
                  ? <img src={dmOtherUser.photoURL} alt="" className="w-7 h-7 rounded object-cover" />
                  : <div className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold" style={{ background: '#1164A3' }}>{displayName[0].toUpperCase()}</div>
                }
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${dmOtherUser?.online ? 'bg-[#007A5A]' : 'bg-[#AAAAAA]'}`}
                />
              </div>
            ) : (
              <span className="text-gray-700 font-bold text-[18px] leading-none flex-shrink-0">#</span>
            )}
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-gray-900 truncate leading-tight">{displayName}</h2>
              {isDM && dmOtherUser && !dmOtherUser.online && dmOtherUser.lastSeen && (
                <p className="text-[11px] text-gray-400 leading-tight" title={formatFullDateTime(dmOtherUser.lastSeen)}>
                  最終確認: {formatFullDateTime(dmOtherUser.lastSeen)}
                </p>
              )}
              {isDM && dmOtherUser?.online && (
                <p className="text-[11px] text-[#007A5A] leading-tight">アクティブ</p>
              )}
            </div>
          </div>
          {!isDM && channel.description && (
            <div className="flex items-center gap-2 min-w-0 hidden sm:flex">
              <div className="w-px h-4 bg-gray-300 flex-shrink-0" />
              <p className="text-[13px] text-gray-500 truncate max-w-xs">{channel.description}</p>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {/* Member count — opens panel */}
          <button
            onClick={handleMembersToggle}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 transition-colors text-gray-600"
            style={{ background: membersOpen ? '#F0F0F0' : undefined }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <span className="text-[13px] font-medium">{memberCount}</span>
          </button>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* Search */}
          {searchOpen ? (
            <div className="flex items-center gap-1" style={{ border: '1px solid #1D9BD1', borderRadius: '6px', padding: '2px 8px', boxShadow: '0 0 0 1px #1D9BD1' }}>
              <svg className="w-3.5 h-3.5 text-[#616061] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); } }}
                placeholder="メッセージを検索"
                className="text-[13px] text-[#1D1C1D] focus:outline-none bg-transparent w-40"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-[#616061] hover:text-[#1D1C1D] flex-shrink-0">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
              <button onClick={handleSearchToggle} className="text-[#616061] hover:text-[#1D1C1D] flex-shrink-0 text-[16px] leading-none ml-0.5">&times;</button>
            </div>
          ) : (
            <button title="検索 (Ctrl+F)" onClick={handleSearchToggle} className="w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </button>
          )}

          {/* Info — opens members panel */}
          <button
            ref={infoButtonRef}
            title="チャンネル詳細"
            onClick={handleMembersToggle}
            className="w-8 h-8 flex items-center justify-center rounded transition-colors"
            style={{
              color: membersOpen ? '#1D1C1D' : '#616061',
              background: membersOpen ? '#E8E8E8' : 'transparent',
            }}
            onMouseEnter={(e) => { if (!membersOpen) { e.currentTarget.style.background = '#F8F8F8'; e.currentTarget.style.color = '#1D1C1D'; } }}
            onMouseLeave={(e) => { if (!membersOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#616061'; } }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Members panel portal */}
      {membersOpen && membersAnchor && (
        <MembersPanel
          members={channel.members ?? []}
          users={users}
          anchorRect={membersAnchor}
          onClose={() => { setMembersOpen(false); setMembersAnchor(null); }}
        />
      )}
    </>
  );
}
