import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { updateChannelDescription, leaveChannel } from '../../services';
import { toast } from '../ui/Toast';

export default function ChannelSettingsModal({ onClose }: { onClose: () => void }) {
  const { user } = useAppStore((s) => s.auth);
  const users = useAppStore((s) => s.users);
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const channels = useAppStore((s) => s.channels);
  const updateChannel = useAppStore((s) => s.updateChannel);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);

  const channel = channels.find((c) => c.id === activeChannelId);
  const [tab, setTab] = useState<'info' | 'members'>('info');
  const [description, setDescription] = useState(channel?.description ?? '');
  const [editingDesc, setEditingDesc] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!channel || !activeChannelId) return null;

  const members = users.filter((u) => channel.members?.includes(u.uid));
  const isOwner = channel.createdBy === user?.uid;

  const handleSaveDescription = async () => {
    setSaving(true);
    try {
      await updateChannelDescription(activeChannelId, description.trim());
      updateChannel(activeChannelId, { description: description.trim() });
      toast.success('説明を更新しました');
      setEditingDesc(false);
    } catch {
      toast.error('更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleLeave = async () => {
    if (!user) return;
    if (!window.confirm(`#${channel.name} から退出しますか？`)) return;
    try {
      await leaveChannel(activeChannelId, user.uid);
      setActiveChannel(null);
      onClose();
      toast.success(`#${channel.name} から退出しました`);
    } catch {
      toast.error('退出に失敗しました');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden flex flex-col"
        style={{
          background: '#FFFFFF',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.06)',
          maxHeight: '80vh',
          animation: 'popIn 150ms ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #EEEEEE' }}>
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-bold text-[#1D1C1D]">#{channel.name}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded press-subtle"
            style={{ color: '#616061' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F0F0'; e.currentTarget.style.color = '#1D1C1D'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#616061'; }}
            title="閉じる"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: '1px solid #EEEEEE' }}>
          {[
            { key: 'info', label: '概要' },
            { key: 'members', label: `メンバー (${members.length})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as 'info' | 'members')}
              className="px-5 py-3 text-[14px] font-medium relative press-subtle"
              style={{
                color: tab === t.key ? '#1D1C1D' : '#616061',
                borderBottom: tab === t.key ? '2px solid #1264A3' : '2px solid transparent',
                background: 'transparent',
                transition: 'color 150ms, border-color 150ms, background 100ms',
              }}
              onMouseEnter={(e) => { if (tab !== t.key) e.currentTarget.style.background = '#F8F8F8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'info' && (
            <div className="flex flex-col gap-5">
              {/* Channel name */}
              <div>
                <p className="text-[12px] font-semibold text-[#616061] uppercase tracking-wide mb-1.5">チャンネル名</p>
                <p className="text-[15px] text-[#1D1C1D] font-medium">#{channel.name}</p>
              </div>

              {/* Description */}
              <div>
                <p className="text-[12px] font-semibold text-[#616061] uppercase tracking-wide mb-1.5">説明</p>
                {editingDesc ? (
                  <div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full text-[14px] text-[#1D1C1D] resize-none focus:outline-none p-2 rounded"
                      style={{ border: '1px solid #1D9BD1', boxShadow: '0 0 0 1px #1D9BD1', minHeight: '80px' }}
                      placeholder="チャンネルの説明を入力..."
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleSaveDescription}
                        disabled={saving}
                        className="px-3 py-1.5 text-[13px] text-white rounded-lg font-medium press-subtle"
                        style={{
                          background: saving ? '#AAAAAA' : 'linear-gradient(135deg, #007A5A, #009E74)',
                          boxShadow: saving ? 'none' : '0 2px 6px rgba(0,122,90,0.3)',
                        }}
                      >
                        {saving ? '保存中...' : '保存'}
                      </button>
                      <button
                        onClick={() => { setEditingDesc(false); setDescription(channel.description ?? ''); }}
                        className="px-3 py-1.5 text-[13px] rounded-lg border border-[#DDDDDD] press-subtle"
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F0F0'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[14px] text-[#616061]">
                      {channel.description || '説明はありません'}
                    </p>
                    <button
                      onClick={() => setEditingDesc(true)}
                      className="text-[13px] text-[#1264A3] hover:underline flex-shrink-0"
                    >
                      編集
                    </button>
                  </div>
                )}
              </div>

              {/* Created by */}
              <div>
                <p className="text-[12px] font-semibold text-[#616061] uppercase tracking-wide mb-1.5">作成者</p>
                <div className="flex items-center gap-2">
                  {(() => {
                    const creator = users.find((u) => u.uid === channel.createdBy);
                    return creator ? (
                      <>
                        {creator.photoURL ? (
                          <img src={creator.photoURL} alt={creator.displayName} className="w-6 h-6 rounded object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold" style={{ background: '#1164A3' }}>
                            {creator.displayName[0].toUpperCase()}
                          </div>
                        )}
                        <span className="text-[14px] text-[#1D1C1D]">{creator.displayName}</span>
                      </>
                    ) : <span className="text-[14px] text-[#616061]">不明</span>;
                  })()}
                </div>
              </div>

              {/* Leave channel */}
              {!isOwner && (
                <div style={{ borderTop: '1px solid #EEEEEE', paddingTop: '16px' }}>
                  <button
                    onClick={handleLeave}
                    className="flex items-center gap-2 text-[14px] text-[#E01E5A] px-3 py-2 rounded-lg press-subtle"
                    style={{ background: 'transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#FFF0F3'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    #{channel.name} から退出
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'members' && (
            <div className="flex flex-col gap-0.5">
              {members.map((member) => (
                <div
                  key={member.uid}
                  className="flex items-center gap-3 px-2 py-2 rounded"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(29,28,29,0.04)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  <div className="relative flex-shrink-0">
                    {member.photoURL ? (
                      <img src={member.photoURL} alt={member.displayName} className="w-9 h-9 rounded object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded flex items-center justify-center text-white font-bold" style={{ background: '#1164A3' }}>
                        {member.displayName[0].toUpperCase()}
                      </div>
                    )}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${member.online ? 'bg-[#007A5A]' : 'bg-[#AAAAAA]'}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-semibold text-[#1D1C1D] truncate">{member.displayName}</span>
                      {member.uid === channel.createdBy && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{ background: '#F0F0F0', color: '#616061' }}
                        >
                          作成者
                        </span>
                      )}
                      {member.uid === user?.uid && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{ background: '#E8F5FA', color: '#1264A3' }}
                        >
                          あなた
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px]" style={{ color: member.online ? '#007A5A' : '#616061' }}>
                        {member.online ? 'アクティブ' : 'オフライン'}
                      </span>
                      {member.status && (
                        <span className="text-[12px] text-[#616061]">
                          · {member.status.emoji} {member.status.text}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
