// ─────────────────────────────────────────────────────────────────────────────
// チャンネル詳細モーダル（Slack の「チャンネル詳細」準拠）
// タブ: 概要 / メンバー / 設定
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAppStore } from '../../store/useAppStore';
import { updateChannelDescription, leaveChannel } from '../../services';
import { toast } from '../ui/Toast';
import Avatar from '../ui/Avatar';
import { CloseIcon, HashIcon, LinkIcon, LockIcon, BellIcon } from '../ui/icons';

export type ChannelDetailsTab = 'about' | 'members' | 'settings';

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--sk-border)',
  borderRadius: 'var(--sk-radius-card)',
  background: '#FFFFFF',
};

export default function ChannelSettingsModal({
  onClose,
  initialTab = 'about',
}: {
  onClose: () => void;
  initialTab?: ChannelDetailsTab;
}) {
  const { user } = useAppStore((s) => s.auth);
  const users = useAppStore((s) => s.users);
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const channels = useAppStore((s) => s.channels);
  const updateChannel = useAppStore((s) => s.updateChannel);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const notifPref = useAppStore((s) => (activeChannelId ? s.channelNotifPrefs[activeChannelId] ?? 'all' : 'all'));
  const setChannelNotifPref = useAppStore((s) => s.setChannelNotifPref);

  const channel = channels.find((c) => c.id === activeChannelId);
  const [tab, setTab] = useState<ChannelDetailsTab>(initialTab);
  const [description, setDescription] = useState(channel?.description ?? '');
  const [editingDesc, setEditingDesc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [memberFilter, setMemberFilter] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!channel || !activeChannelId) return null;

  const members = users.filter((u) => channel.members?.includes(u.uid));
  const filteredMembers = memberFilter.trim()
    ? members.filter((m) => m.displayName.toLowerCase().includes(memberFilter.trim().toLowerCase()))
    : members;
  const isOwner = channel.createdBy === user?.uid;
  const creator = users.find((u) => u.uid === channel.createdBy);
  const createdLabel = channel.createdAt?.toDate
    ? format(channel.createdAt.toDate(), 'yyyy年M月d日', { locale: ja })
    : '';
  const Icon = channel.isPrivate ? LockIcon : HashIcon;

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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}?channel=${encodeURIComponent(channel.id)}`);
      toast.success('リンクをコピーしました');
    } catch {
      toast.error('リンクのコピーに失敗しました');
    }
  };

  const tabs: { key: ChannelDetailsTab; label: string }[] = [
    { key: 'about', label: '概要' },
    { key: 'members', label: `メンバー ${members.length}` },
    { key: 'settings', label: '設定' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${channel.name} の詳細`}
        className="w-full max-w-[580px] overflow-hidden flex flex-col"
        style={{
          background: '#F8F8F8',
          borderRadius: 'var(--sk-radius-card)',
          boxShadow: '0 18px 48px rgba(0,0,0,0.3)',
          maxHeight: '85vh',
          animation: 'popIn 150ms ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white px-7 pt-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="flex items-center gap-1.5 text-[22px] font-black leading-tight min-w-0" style={{ color: 'var(--sk-text)' }}>
              <Icon className="w-[20px] h-[20px] flex-shrink-0" />
              <span className="truncate">{channel.name}</span>
            </h2>
            <button
              onClick={onClose}
              title="閉じる"
              className="w-9 h-9 -mr-2 -mt-1 flex items-center justify-center rounded-md hover:bg-[var(--sk-subtle)]"
              style={{ color: 'var(--sk-text-2)' }}
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 mt-4" role="tablist">
            {tabs.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  className="relative h-[38px] px-3 text-[13px] font-bold"
                  style={{ color: active ? 'var(--sk-text)' : 'var(--sk-text-2)' }}
                >
                  {t.label}
                  <span
                    className="absolute left-0 right-0 bottom-0 h-[2px] rounded-t"
                    style={{ background: active ? 'var(--sk-accent)' : 'transparent' }}
                  />
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--sk-border)' }} />

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-7 py-5">
          {tab === 'about' && (
            <div className="flex flex-col gap-3">
              <div style={cardStyle}>
                {/* Name */}
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--sk-border)' }}>
                  <p className="text-[15px] font-bold" style={{ color: 'var(--sk-text)' }}>チャンネル名</p>
                  <p className="flex items-center gap-1 text-[15px] mt-0.5" style={{ color: 'var(--sk-text)' }}>
                    <Icon className="w-[14px] h-[14px]" />{channel.name}
                  </p>
                </div>
                {/* Description */}
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--sk-border)' }}>
                  <div className="flex items-center justify-between">
                    <p className="text-[15px] font-bold" style={{ color: 'var(--sk-text)' }}>説明</p>
                    {!editingDesc && (
                      <button
                        onClick={() => setEditingDesc(true)}
                        className="text-[13px] font-bold hover:underline"
                        style={{ color: 'var(--sk-link)' }}
                      >
                        編集
                      </button>
                    )}
                  </div>
                  {editingDesc ? (
                    <div className="mt-2">
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={250}
                        className="w-full text-[15px] resize-none focus:outline-none p-2 rounded-md"
                        style={{ border: '1px solid var(--sk-blue)', boxShadow: '0 0 0 1px var(--sk-blue)', minHeight: '88px', color: 'var(--sk-text)' }}
                        placeholder="このチャンネルについて説明を追加する"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => { setEditingDesc(false); setDescription(channel.description ?? ''); }}
                          className="h-[32px] px-3 text-[13px] font-bold rounded-md bg-white hover:bg-[var(--sk-hover)]"
                          style={{ border: '1px solid var(--sk-border-strong)', color: 'var(--sk-text)' }}
                        >
                          キャンセル
                        </button>
                        <button
                          onClick={handleSaveDescription}
                          disabled={saving}
                          className="h-[32px] px-3 text-[13px] font-bold rounded-md text-white"
                          style={{ background: saving ? 'var(--sk-text-3)' : 'var(--sk-green)' }}
                        >
                          {saving ? '保存中…' : '保存する'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[15px] mt-0.5 whitespace-pre-wrap break-words" style={{ color: channel.description ? 'var(--sk-text)' : 'var(--sk-text-2)' }}>
                      {channel.description || '説明を追加する'}
                    </p>
                  )}
                </div>
                {/* Created by */}
                <div className="px-4 py-3">
                  <p className="text-[15px] font-bold" style={{ color: 'var(--sk-text)' }}>作成者</p>
                  <p className="text-[15px] mt-0.5" style={{ color: 'var(--sk-text)' }}>
                    {creator?.displayName ?? '不明'}{createdLabel && ` が ${createdLabel} に作成`}
                  </p>
                </div>
              </div>

              <div style={cardStyle}>
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-2 px-4 py-3 text-[15px] font-bold text-left hover:bg-[var(--sk-hover)]"
                  style={{ color: 'var(--sk-link)', borderRadius: 'var(--sk-radius-card)' }}
                >
                  <LinkIcon className="w-4 h-4" />
                  チャンネルへのリンクをコピー
                </button>
              </div>

              {!isOwner && (
                <div style={cardStyle}>
                  <button
                    onClick={handleLeave}
                    className="w-full px-4 py-3 text-[15px] font-bold text-left hover:bg-[var(--sk-hover)]"
                    style={{ color: 'var(--sk-red)', borderRadius: 'var(--sk-radius-card)' }}
                  >
                    チャンネルから退出する
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'members' && (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                placeholder="メンバーを検索"
                className="w-full h-[36px] px-3 text-[15px] rounded-lg focus:outline-none bg-white"
                style={{ border: '1px solid var(--sk-border-strong)', color: 'var(--sk-text)' }}
              />
              <div style={cardStyle} className="py-1">
                {filteredMembers.length === 0 && (
                  <p className="text-[15px] px-4 py-3" style={{ color: 'var(--sk-text-2)' }}>該当するメンバーはいません</p>
                )}
                {filteredMembers.map((member) => (
                  <div key={member.uid} className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--sk-hover)]">
                    <Avatar name={member.displayName} photoURL={member.photoURL} size={36} online={member.online} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[15px] font-bold truncate" style={{ color: 'var(--sk-text)' }}>
                          {member.displayName}
                          {member.uid === user?.uid && <span className="font-normal" style={{ color: 'var(--sk-text-2)' }}>（自分）</span>}
                        </span>
                        {member.uid === channel.createdBy && (
                          <span className="text-[11px] px-1.5 rounded font-bold" style={{ background: 'var(--sk-subtle)', color: 'var(--sk-text-2)' }}>
                            作成者
                          </span>
                        )}
                      </div>
                      {member.status && (member.status.emoji || member.status.text) && (
                        <p className="text-[13px] truncate" style={{ color: 'var(--sk-text-2)' }}>
                          {member.status.emoji} {member.status.text}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'settings' && (
            <div className="flex flex-col gap-3">
              <div style={cardStyle} className="px-4 py-3">
                <p className="flex items-center gap-2 text-[15px] font-bold mb-2" style={{ color: 'var(--sk-text)' }}>
                  <BellIcon className="w-4 h-4" />通知
                </p>
                {([
                  ['all', 'すべての新規メッセージ'],
                  ['mentions', '@メンションのみ'],
                  ['off', 'オフ（ミュート）'],
                ] as const).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 py-1 text-[15px] cursor-pointer" style={{ color: 'var(--sk-text)' }}>
                    <input
                      type="radio"
                      name="notif-pref-modal"
                      checked={notifPref === value}
                      onChange={() => setChannelNotifPref(activeChannelId, value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div style={cardStyle}>
                {isOwner ? (
                  <p className="px-4 py-3 text-[13px]" style={{ color: 'var(--sk-text-2)' }}>
                    チャンネルの作成者は退出できません。
                  </p>
                ) : (
                  <button
                    onClick={handleLeave}
                    className="w-full px-4 py-3 text-[15px] font-bold text-left hover:bg-[var(--sk-hover)]"
                    style={{ color: 'var(--sk-red)', borderRadius: 'var(--sk-radius-card)' }}
                  >
                    チャンネルから退出する
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
