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
    <div className="flex flex-col h-full">
      {/* Workspace header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between min-h-[56px]">
        <div>
          <h1 className="text-sidebar-textActive font-bold text-base leading-tight truncate">
            Slack Clone
          </h1>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-online inline-block" />
            <span className="text-sidebar-text text-xs">{currentUser?.displayName ?? ''}</span>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          title="サインアウト"
          className="text-sidebar-text hover:text-white text-xs px-2 py-1 rounded hover:bg-sidebar-hover transition-colors"
        >
          ログアウト
        </button>
      </div>

      {/* Channels section */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        <div className="px-4 py-1 flex items-center justify-between group">
          <span className="text-sidebar-text text-xs font-semibold uppercase tracking-wider">
            チャンネル
          </span>
          <button
            onClick={() => setShowAddModal(true)}
            title="チャンネルを追加"
            className="text-sidebar-text hover:text-white opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none"
          >
            +
          </button>
        </div>

        <ul className="mt-1">
          {channels.map((ch) => (
            <li key={ch.id}>
              <button
                onClick={() => setActiveChannel(ch.id)}
                className={`w-full flex items-center gap-1.5 px-4 py-1.5 text-sm transition-colors ${
                  ch.id === activeChannelId
                    ? 'bg-sidebar-active text-sidebar-textActive font-semibold'
                    : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-textActive'
                }`}
              >
                <span className="text-base opacity-80">#</span>
                <span className="truncate">{ch.name}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* Add channel button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full flex items-center gap-2 px-4 py-2 text-sidebar-text hover:text-sidebar-textActive hover:bg-sidebar-hover transition-colors text-sm mt-1"
        >
          <span className="text-lg leading-none">+</span>
          <span>チャンネルを追加</span>
        </button>
      </div>

      {/* User profile footer */}
      <div className="px-3 py-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName}
                className="w-8 h-8 rounded-md object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center text-white text-sm font-bold">
                {(currentUser?.displayName ?? '?')[0].toUpperCase()}
              </div>
            )}
            {/* Online indicator */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-sidebar-bg ${
                currentUser?.online ? 'bg-online' : 'bg-gray-400'
              }`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sidebar-textActive text-sm font-semibold truncate leading-tight">
              {currentUser?.displayName ?? 'ユーザー'}
            </p>
            <p className="text-sidebar-text text-xs truncate">
              {currentUser?.online ? 'オンライン' : 'オフライン'}
            </p>
          </div>
        </div>
      </div>

      {/* Add Channel Modal */}
      {showAddModal && (
        <AddChannelModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}
