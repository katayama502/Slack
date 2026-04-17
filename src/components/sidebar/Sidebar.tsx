import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { subscribeToUsers, signOut } from '../../services';
import AddChannelModal from './AddChannelModal';
import type { User } from '../../types';

export default function Sidebar() {
  const channels = useAppStore((s) => s.channels);
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const { user } = useAppStore((s) => s.auth);
  const [showAddModal, setShowAddModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const unsub = subscribeToUsers((u) => setUsers(u));
    return () => unsub();
  }, []);

  const currentUser = users.find((u) => u.uid === user?.uid) ?? user;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <div className="flex flex-col h-full select-none" style={{ background: '#3F0E40' }}>

      {/* ── Workspace header ── */}
      <div
        className="px-4 flex items-center justify-between flex-shrink-0 cursor-pointer hover:bg-white/10 transition-colors"
        style={{ minHeight: '49px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-white font-bold text-[15px] leading-tight truncate">
            Slack Clone
          </span>
          <svg className="w-4 h-4 text-white/70 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
        {/* Compose / New message */}
        <button
          title="新規メッセージ"
          className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>

      {/* ── Scrollable nav area ── */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar-sidebar">

        {/* Channels section */}
        <div className="mt-2">
          <div className="flex items-center justify-between px-4 py-[3px] group">
            <button className="flex items-center gap-1 text-[#CFC3CF] hover:text-white transition-colors">
              <svg className="w-[10px] h-[10px]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span className="text-[13px] font-semibold">チャンネル</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              title="チャンネルを追加"
              className="w-5 h-5 flex items-center justify-center rounded text-[#CFC3CF] hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <ul className="mt-0.5">
            {channels.map((ch) => (
              <li key={ch.id}>
                <button
                  onClick={() => setActiveChannel(ch.id)}
                  className={`w-full flex items-center gap-1.5 mx-1 px-3 py-[5px] rounded text-[14px] transition-colors ${
                    ch.id === activeChannelId
                      ? 'bg-[#1164A3] text-white font-semibold'
                      : 'text-[#CFC3CF] hover:bg-white/10 hover:text-white'
                  }`}
                  style={{ width: 'calc(100% - 8px)' }}
                >
                  <span className="text-[15px] opacity-80 flex-shrink-0">#</span>
                  <span className="truncate">{ch.name}</span>
                </button>
              </li>
            ))}
          </ul>

          {/* Add channel */}
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full flex items-center gap-2 px-4 py-[5px] text-[#CFC3CF] hover:text-white hover:bg-white/10 transition-colors text-[14px] mt-0.5 group"
          >
            <span className="w-4 h-4 flex items-center justify-center rounded bg-[#CFC3CF]/30 group-hover:bg-white/20 text-xs flex-shrink-0">+</span>
            <span>チャンネルを追加</span>
          </button>
        </div>
      </div>

      {/* ── User profile footer ── */}
      <div
        className="px-3 py-[10px] flex-shrink-0 flex items-center gap-2 hover:bg-white/10 cursor-pointer transition-colors"
        style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {currentUser?.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt={currentUser?.displayName ?? ''}
              className="w-8 h-8 rounded object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded bg-[#1164A3] flex items-center justify-center text-white text-sm font-bold">
              {(currentUser?.displayName ?? '?')[0].toUpperCase()}
            </div>
          )}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-[10px] h-[10px] rounded-full border-2 flex-shrink-0 ${
              currentUser?.online ? 'bg-[#007A5A]' : 'bg-[#616061]'
            }`}
            style={{ borderColor: '#3F0E40' }}
          />
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-[13px] font-semibold truncate leading-tight">
            {currentUser?.displayName ?? 'ユーザー'}
          </p>
          <p className="text-[#CFC3CF] text-[11px] truncate">
            {currentUser?.online ? 'アクティブ' : 'オフライン'}
          </p>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          title="サインアウト"
          className="text-[#CFC3CF] hover:text-white p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      {showAddModal && <AddChannelModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
