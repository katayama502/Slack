import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { subscribeToUsers } from '../../services';
import type { User } from '../../types';

export default function ChannelHeader() {
  const channels = useAppStore((s) => s.channels);
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const { user } = useAppStore((s) => s.auth);
  const channel = channels.find((c) => c.id === activeChannelId);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const unsub = subscribeToUsers((u) => setUsers(u));
    return () => unsub();
  }, []);

  if (!channel) return null;

  const isDM = channel.name.startsWith('__dm__');
  const dmOtherUser = isDM
    ? users.find((u) => u.uid !== user?.uid && channel.members?.includes(u.uid))
    : null;

  const memberCount = channel.members?.length ?? 0;
  const displayName = isDM ? (dmOtherUser?.displayName ?? 'ダイレクトメッセージ') : channel.name;

  return (
    <header
      className="flex items-center justify-between bg-white flex-shrink-0"
      style={{ minHeight: '49px', borderBottom: '1px solid #E8E8E8', padding: '0 16px' }}
    >
      {/* Left */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {isDM ? (
            dmOtherUser?.photoURL ? (
              <img src={dmOtherUser.photoURL} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
            ) : (
              <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: '#1164A3' }}>
                {displayName[0].toUpperCase()}
              </div>
            )
          ) : (
            <span className="text-gray-700 font-bold text-[18px] leading-none flex-shrink-0">#</span>
          )}
          <h2 className="text-[15px] font-bold text-gray-900 truncate">{displayName}</h2>
          {isDM && dmOtherUser?.online && (
            <span className="w-2 h-2 rounded-full bg-[#007A5A] flex-shrink-0" />
          )}
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
        {/* Member avatars + count */}
        <button className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 transition-colors text-gray-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          <span className="text-[13px] font-medium">{memberCount}</span>
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Huddle (UI only) */}
        <button
          title="ハドル"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[13px] font-medium text-gray-600 hover:bg-gray-100 transition-colors border border-gray-300"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span className="hidden sm:block">ハドル</span>
        </button>

        {/* Search */}
        <button
          title="検索"
          className="w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </button>

        {/* Info */}
        <button
          title="チャンネル詳細"
          className="w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
