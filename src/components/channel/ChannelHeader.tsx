import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { subscribeToUsers } from '../../services';
import type { User } from '../../types';

export default function ChannelHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const channels = useAppStore((s) => s.channels);
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const { user } = useAppStore((s) => s.auth);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const channel = channels.find((c) => c.id === activeChannelId);

  const [users, setUsers] = useState<User[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = subscribeToUsers((u) => setUsers(u));
    return () => unsub();
  }, []);

  // チャンネルが変わったら検索クリア
  useEffect(() => {
    setSearchQuery('');
    setSearchOpen(false);
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

  return (
    <header
      className="flex items-center justify-between bg-white flex-shrink-0"
      style={{ minHeight: '49px', borderBottom: '1px solid #E8E8E8', padding: '0 16px' }}
    >
      {/* Left */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobile: hamburger */}
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
            dmOtherUser?.photoURL
              ? <img src={dmOtherUser.photoURL} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
              : <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: '#1164A3' }}>{displayName[0].toUpperCase()}</div>
          ) : (
            <span className="text-gray-700 font-bold text-[18px] leading-none flex-shrink-0">#</span>
          )}
          <h2 className="text-[15px] font-bold text-gray-900 truncate">{displayName}</h2>
          {isDM && dmOtherUser?.online && <span className="w-2 h-2 rounded-full bg-[#007A5A] flex-shrink-0" />}
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
        {/* Member count */}
        <button className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 transition-colors text-gray-600">
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
          <button title="検索" onClick={handleSearchToggle} className="w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>
        )}

        {/* Info */}
        <button title="チャンネル詳細" className="w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
