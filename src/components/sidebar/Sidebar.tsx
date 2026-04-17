import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { subscribeToUsers, signOut, getOrCreateDMChannel, getDMChannelName, joinChannelIfNeeded } from '../../services';
import AddChannelModal from './AddChannelModal';
import type { User } from '../../types';

export default function Sidebar() {
  const channels = useAppStore((s) => s.channels);
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const { user } = useAppStore((s) => s.auth);
  const [showAddModal, setShowAddModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [dmLoading, setDmLoading] = useState<string | null>(null);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmOpen, setDmOpen] = useState(true);
  const [inviteCopied, setInviteCopied] = useState(false);

  useEffect(() => {
    const unsub = subscribeToUsers((u) => setUsers(u));
    return () => unsub();
  }, []);

  const currentUser = users.find((u) => u.uid === user?.uid) ?? user;
  const otherUsers = users.filter((u) => u.uid !== user?.uid);

  // 通常チャンネルのみ（DM除外）
  const regularChannels = channels.filter((c) => !c.name.startsWith('__dm__'));


  const handleOpenDM = async (otherUser: User) => {
    if (!user) return;
    setDmLoading(otherUser.uid);
    try {
      const channelId = await getOrCreateDMChannel(user.uid, otherUser.uid);
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

  return (
    <div className="flex flex-col h-full" style={{ background: '#3F0E40' }}>

      {/* ── Workspace header ── */}
      <div
        className="px-3 flex items-center justify-between flex-shrink-0 cursor-pointer hover:bg-white/10 transition-colors"
        style={{ minHeight: '49px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-white font-bold text-[15px] truncate">Slack Clone</span>
          <svg className="w-4 h-4 text-white/60 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
        <button
          title="新規メッセージ"
          className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
        >
          <svg className="w-[15px] h-[15px] text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>

      {/* ── Scrollable nav ── */}
      <div className="flex-1 overflow-y-auto scrollbar-sidebar py-2">

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
            <ul className="mt-0.5">
              {regularChannels.map((ch) => {
                const isActive = ch.id === activeChannelId;
                return (
                  <li key={ch.id}>
                    <button
                      onClick={async () => {
                        if (user) await joinChannelIfNeeded(ch.id, user.uid).catch(() => {});
                        setActiveChannel(ch.id);
                      }}
                      className="flex items-center gap-2 py-[5px] pl-4 pr-3 rounded transition-colors text-[14px]"
                      style={{
                        width: 'calc(100% - 8px)',
                        margin: '0 4px',
                        background: isActive ? '#1164A3' : 'transparent',
                        color: isActive ? '#FFFFFF' : '#CFC3CF',
                        fontWeight: isActive ? 600 : 400,
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#FFFFFF'; }}
                      onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#CFC3CF'; } }}
                    >
                      <span className="text-[15px] opacity-70 flex-shrink-0">#</span>
                      <span className="truncate">{ch.name}</span>
                    </button>
                  </li>
                );
              })}

              {/* チャンネルを追加 */}
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
          )}
        </div>

        {/* ── ダイレクトメッセージセクション ── */}
        <div className="mt-3">
          <button
            onClick={() => setDmOpen((v) => !v)}
            className="w-full flex items-center gap-1 px-3 py-[3px] text-[#CFC3CF] hover:text-white transition-colors"
          >
            <svg
              className={`w-[10px] h-[10px] transition-transform flex-shrink-0 ${dmOpen ? 'rotate-0' : '-rotate-90'}`}
              fill="currentColor" viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span className="text-[13px] font-semibold">ダイレクトメッセージ</span>
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

              {/* 他のユーザー */}
              {otherUsers.map((u) => {
                const isActive = isDMActive(u);
                const isLoading = dmLoading === u.uid;
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
                        color: isActive ? '#FFFFFF' : '#CFC3CF',
                        fontWeight: isActive ? 600 : 400,
                      }}
                      onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#FFFFFF'; } }}
                      onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#CFC3CF'; } }}
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
          <p className="text-[#CFC3CF] text-[11px]">{currentUser?.online ? 'アクティブ' : 'オフライン'}</p>
        </div>
        <button
          onClick={handleSignOut}
          title="サインアウト"
          className="text-[#CFC3CF] hover:text-white p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      {showAddModal && <AddChannelModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
