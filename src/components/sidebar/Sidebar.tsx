import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useAppStore } from '../../store/useAppStore';
import { signOut, getOrCreateDMChannel, getDMChannelName, joinChannelIfNeeded } from '../../services';
import AddChannelModal from './AddChannelModal';
import { useUnreadChannels, markChannelRead } from '../../hooks/useUnreadChannels';
import { StatusPicker } from '../ui/StatusPicker';
import type { User } from '../../types';

// ─── New DM modal ─────────────────────────────────────────────────────────────
function NewDMModal({
  users,
  currentUid,
  onSelect,
  onClose,
}: {
  users: User[];
  currentUid: string;
  onSelect: (user: User) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = users
    .filter((u) => u.uid !== currentUid)
    .filter((u) => u.displayName.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg overflow-hidden"
        style={{ background: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3" style={{ borderBottom: '1px solid #EEEEEE' }}>
          <p className="text-[15px] font-bold text-[#1D1C1D] mb-2">新規メッセージ</p>
          <div className="flex items-center gap-2 px-3 py-2 rounded" style={{ border: '1px solid #1D9BD1', boxShadow: '0 0 0 1px #1D9BD1' }}>
            <svg className="w-4 h-4 text-[#616061] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="名前で検索"
              className="flex-1 text-[14px] focus:outline-none"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <p className="text-[13px] text-[#616061] px-4 py-3">ユーザーが見つかりません</p>
          )}
          {filtered.map((u) => (
            <button
              key={u.uid}
              onClick={() => { onSelect(u); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8F8F8] transition-colors text-left"
            >
              <div className="relative flex-shrink-0">
                {u.photoURL ? (
                  <img src={u.photoURL} alt={u.displayName} className="w-9 h-9 rounded object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded flex items-center justify-center text-white font-bold" style={{ background: '#1164A3' }}>
                    {u.displayName[0].toUpperCase()}
                  </div>
                )}
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${u.online ? 'bg-[#007A5A]' : 'bg-[#AAAAAA]'}`} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#1D1C1D]">{u.displayName}</p>
                <p className="text-[12px] text-[#616061]">{u.online ? 'アクティブ' : 'オフライン'}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Sidebar() {
  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen);
  const channels = useAppStore((s) => s.channels);
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const addChannel = useAppStore((s) => s.addChannel);
  const { user } = useAppStore((s) => s.auth);
  const users = useAppStore((s) => s.users);
  const unreadChannels = useUnreadChannels();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [dmLoading, setDmLoading] = useState<string | null>(null);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmOpen, setDmOpen] = useState(true);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [channelSearch, setChannelSearch] = useState('');
  const [statusPickerAnchor, setStatusPickerAnchor] = useState<DOMRect | null>(null);

  const currentUser = users.find((u) => u.uid === user?.uid) ?? user;
  const otherUsers = users.filter((u) => u.uid !== user?.uid);
  const regularChannels = channels.filter((c) => !c.name.startsWith('__dm__'));
  const dmChannels = channels.filter((c) => c.name.startsWith('__dm__'));

  const filteredChannels = channelSearch.trim()
    ? regularChannels.filter((c) => c.name.toLowerCase().includes(channelSearch.toLowerCase()))
    : regularChannels;

  // DM: ユーザーと対応するDMチャンネルを紐付け
  const dmUsers = otherUsers.map((u) => {
    const dmName = user ? getDMChannelName(user.uid, u.uid) : '';
    const dmCh = dmChannels.find((c) => c.name === dmName);
    return { user: u, channelId: dmCh?.id ?? null };
  });

  const handleOpenDM = async (otherUser: User) => {
    if (!user) return;
    setDmLoading(otherUser.uid);
    try {
      const channelId = await getOrCreateDMChannel(user.uid, otherUser.uid);
      const existing = useAppStore.getState().channels.find((c) => c.id === channelId);
      if (!existing) {
        addChannel({
          id: channelId,
          name: getDMChannelName(user.uid, otherUser.uid),
          description: '',
          createdBy: user.uid,
          createdAt: Timestamp.now(),
          members: [user.uid, otherUser.uid],
        });
      }
      markChannelRead(channelId);
      setActiveChannel(channelId);
    } catch (err) {
      console.error('DM open error:', err);
    } finally {
      setDmLoading(null);
    }
  };

  const handleSignOut = async () => {
    try { await signOut(); } catch (err) { console.error('Sign out error:', err); }
  };

  const isDMActive = (otherUser: User) => {
    if (!user || !activeChannelId) return false;
    const ch = channels.find((c) => c.id === activeChannelId);
    return ch?.name === getDMChannelName(user.uid, otherUser.uid);
  };

  const handleSelectChannel = async (channelId: string) => {
    if (user) await joinChannelIfNeeded(channelId, user.uid).catch(() => {});
    markChannelRead(channelId);
    setActiveChannel(channelId);
  };

  return (
    <nav aria-label="ワークスペースナビゲーション" className="flex flex-col h-full" style={{ background: '#3F0E40' }}>

      {/* ── Workspace header ── */}
      <div
        className="px-3 flex items-center justify-between flex-shrink-0"
        style={{ minHeight: '49px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-center gap-1.5 min-w-0 cursor-pointer hover:opacity-80 transition-opacity">
          <span className="text-white font-bold text-[15px] truncate">Creatte</span>
          <svg className="w-4 h-4 text-white/60 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex items-center gap-1">
          <button
            title="新規メッセージ"
            onClick={() => setShowNewDM(true)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
          >
            <svg className="w-[15px] h-[15px] text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
            title="閉じる"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Scrollable nav ── */}
      <div className="flex-1 overflow-y-auto sidebar-scroll py-2">

        {/* ── チャンネルセクション ── */}
        <div className="mt-1">
          <button
            onClick={() => setChannelsOpen((v) => !v)}
            className="w-full flex items-center gap-1 px-3 py-[3px] text-[#CFC3CF] hover:text-white transition-colors group"
          >
            <svg
              className={`w-[10px] h-[10px] transition-transform flex-shrink-0 ${channelsOpen ? 'rotate-0' : '-rotate-90'}`}
              fill="currentColor" viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span className="text-[13px] font-semibold">チャンネル</span>
            <button
              onClick={(e) => { e.stopPropagation(); setShowAddModal(true); }}
              className="ml-auto w-4 h-4 flex items-center justify-center rounded text-[#CFC3CF] hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </button>

          {channelsOpen && (
            <>
              {/* チャンネル検索 */}
              {regularChannels.length > 4 && (
                <div className="mx-3 mt-1 mb-1">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <svg className="w-3 h-3 text-white/40 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input
                      type="text"
                      value={channelSearch}
                      onChange={(e) => setChannelSearch(e.target.value)}
                      placeholder="チャンネルを検索"
                      className="flex-1 text-[12px] bg-transparent focus:outline-none text-white placeholder-white/40"
                    />
                    {channelSearch && (
                      <button onClick={() => setChannelSearch('')} className="text-white/40 hover:text-white">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )}
              <ul className="mt-0.5">
                {filteredChannels.map((ch) => {
                  const isActive = ch.id === activeChannelId;
                  const hasUnread = unreadChannels.has(ch.id);
                  return (
                    <li key={ch.id}>
                      <button
                        onClick={() => handleSelectChannel(ch.id)}
                        className="flex items-center gap-2 py-[5px] pl-4 pr-3 rounded transition-colors text-[14px]"
                        style={{
                          width: 'calc(100% - 8px)',
                          margin: '0 4px',
                          background: isActive ? '#1164A3' : 'transparent',
                          color: isActive ? '#FFFFFF' : hasUnread ? '#FFFFFF' : '#CFC3CF',
                          fontWeight: isActive || hasUnread ? 700 : 400,
                        }}
                        onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#FFFFFF'; } }}
                        onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isActive ? '#FFFFFF' : hasUnread ? '#FFFFFF' : '#CFC3CF'; } }}
                      >
                        <span className="text-[15px] opacity-70 flex-shrink-0">#</span>
                        <span className="truncate flex-1 text-left">{ch.name}</span>
                        {hasUnread && !isActive && (
                          <span
                            className="flex-shrink-0 min-w-[8px] h-2 w-2 rounded-full"
                            style={{ background: '#FFFFFF' }}
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
                {filteredChannels.length === 0 && channelSearch && (
                  <li className="px-5 py-2 text-[12px] text-[#CFC3CF]/60">
                    「{channelSearch}」に一致するチャンネルはありません
                  </li>
                )}
                <li>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 py-[5px] pl-4 pr-3 text-[#CFC3CF] hover:text-white hover:bg-white/10 transition-colors text-[14px] group"
                    style={{ width: 'calc(100% - 8px)', margin: '0 4px', borderRadius: '4px' }}
                  >
                    <span className="w-4 h-4 flex items-center justify-center rounded text-xs bg-[#CFC3CF]/25 group-hover:bg-white/20 flex-shrink-0">+</span>
                    <span>チャンネルを追加</span>
                  </button>
                </li>
              </ul>
            </>
          )}
        </div>

        {/* ── ダイレクトメッセージセクション ── */}
        <div className="mt-3">
          <button
            onClick={() => setDmOpen((v) => !v)}
            className="w-full flex items-center gap-1 px-3 py-[3px] text-[#CFC3CF] hover:text-white transition-colors group"
          >
            <svg
              className={`w-[10px] h-[10px] transition-transform flex-shrink-0 ${dmOpen ? 'rotate-0' : '-rotate-90'}`}
              fill="currentColor" viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span className="text-[13px] font-semibold">ダイレクトメッセージ</span>
            <button
              onClick={(e) => { e.stopPropagation(); setShowNewDM(true); }}
              className="ml-auto w-4 h-4 flex items-center justify-center rounded text-[#CFC3CF] hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </button>

          {dmOpen && (
            <ul className="mt-0.5">
              {/* 自分 */}
              <li>
                <button
                  className="flex items-center gap-2 py-[5px] pl-3 pr-3 text-[#CFC3CF] hover:text-white hover:bg-white/10 transition-colors text-[14px]"
                  style={{ width: 'calc(100% - 8px)', margin: '0 4px', borderRadius: '4px' }}
                  disabled
                >
                  <div className="relative flex-shrink-0">
                    {currentUser?.photoURL ? (
                      <img src={currentUser.photoURL} alt="" className="w-5 h-5 rounded object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold" style={{ background: '#1164A3' }}>
                        {(currentUser?.displayName ?? '?')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#007A5A]" style={{ border: '1.5px solid #3F0E40' }} />
                  </div>
                  <span className="truncate">{currentUser?.displayName ?? 'あなた'} <span className="text-[#CFC3CF]/60 text-[12px]">(自分)</span></span>
                </button>
              </li>

              {dmUsers.map(({ user: u, channelId: dmChannelId }) => {
                const isActive = isDMActive(u);
                const isLoading = dmLoading === u.uid;
                const hasUnread = dmChannelId ? unreadChannels.has(dmChannelId) : false;
                return (
                  <li key={u.uid}>
                    <button
                      onClick={() => handleOpenDM(u)}
                      disabled={isLoading}
                      className="flex items-center gap-2 py-[5px] pl-3 pr-3 transition-colors text-[14px]"
                      style={{
                        width: 'calc(100% - 8px)',
                        margin: '0 4px',
                        borderRadius: '4px',
                        background: isActive ? '#1164A3' : 'transparent',
                        color: isActive ? '#FFFFFF' : hasUnread ? '#FFFFFF' : '#CFC3CF',
                        fontWeight: isActive || hasUnread ? 700 : 400,
                      }}
                      onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#FFFFFF'; } }}
                      onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isActive ? '#FFFFFF' : hasUnread ? '#FFFFFF' : '#CFC3CF'; } }}
                    >
                      <div className="relative flex-shrink-0">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt={u.displayName} className="w-5 h-5 rounded object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ background: '#1164A3' }}>
                            {u.displayName[0].toUpperCase()}
                          </div>
                        )}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${u.online ? 'bg-[#007A5A]' : 'bg-[#616061]'}`}
                          style={{ border: '1.5px solid #3F0E40' }}
                        />
                      </div>
                      <span className="truncate flex-1 text-left">
                        {isLoading ? '接続中...' : u.displayName}
                      </span>
                      {hasUnread && !isActive && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full" style={{ background: '#FFFFFF' }} />
                      )}
                    </button>
                  </li>
                );
              })}

              {/* メンバーを招待 */}
              <li>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(window.location.origin);
                      setInviteCopied(true);
                      setTimeout(() => setInviteCopied(false), 2000);
                    } catch {
                      // ignore
                    }
                  }}
                  className="flex items-center gap-2 py-[5px] pl-3 pr-3 text-[#CFC3CF] hover:text-white hover:bg-white/10 transition-colors text-[14px] group"
                  style={{ width: 'calc(100% - 8px)', margin: '0 4px', borderRadius: '4px' }}
                >
                  <span className="w-5 h-5 flex items-center justify-center rounded-full text-xs bg-[#CFC3CF]/25 group-hover:bg-white/20 flex-shrink-0">+</span>
                  <span>{inviteCopied ? 'URLをコピーしました！' : 'メンバーを招待'}</span>
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>

      {/* ── User footer ── */}
      <div
        className="px-3 py-2 flex items-center gap-2 flex-shrink-0 hover:bg-white/10 cursor-pointer transition-colors"
        style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setStatusPickerAnchor(rect);
        }}
      >
        <div className="relative flex-shrink-0">
          {currentUser?.photoURL ? (
            <img src={currentUser.photoURL} alt="" className="w-8 h-8 rounded object-cover" />
          ) : (
            <div className="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold" style={{ background: '#1164A3' }}>
              {(currentUser?.displayName ?? '?')[0].toUpperCase()}
            </div>
          )}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-[10px] h-[10px] rounded-full ${currentUser?.online ? 'bg-[#007A5A]' : 'bg-[#616061]'}`}
            style={{ border: '2px solid #3F0E40' }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-[13px] font-semibold truncate leading-tight">{currentUser?.displayName ?? 'ユーザー'}</p>
          <p className="text-[#CFC3CF] text-[11px] truncate">
            {currentUser?.status
              ? `${currentUser.status.emoji} ${currentUser.status.text}`
              : currentUser?.online ? 'アクティブ' : 'オフライン'}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); handleSignOut(); }}
          title="サインアウト"
          className="text-[#CFC3CF] hover:text-white p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      {showAddModal && <AddChannelModal onClose={() => setShowAddModal(false)} />}
      {showNewDM && user && (
        <NewDMModal
          users={users}
          currentUid={user.uid}
          onSelect={handleOpenDM}
          onClose={() => setShowNewDM(false)}
        />
      )}
      {statusPickerAnchor && (
        <StatusPicker
          anchor={statusPickerAnchor}
          currentStatus={currentUser?.status}
          onClose={() => setStatusPickerAnchor(null)}
        />
      )}
    </nav>
  );
}
