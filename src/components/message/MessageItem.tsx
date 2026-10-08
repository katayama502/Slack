import { useState, useEffect, useLayoutEffect, useRef, useCallback, memo } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useAppStore } from '../../store/useAppStore';
import {
  deleteMessage,
  updateMessage,
  toggleReaction,
  saveMessage,
  unsaveMessage,
  getOrCreateDMChannel,
  getDMChannelName,
  setMessagePinned,
} from '../../services';
import { formatMessageTime, formatFullDateTime } from '../../utils/formatDate';
import { renderMarkdown } from '../../utils/markdown';
import { toast } from '../ui/Toast';
import Avatar from '../ui/Avatar';
import { PinIcon, MoreVerticalIcon } from '../ui/icons';
import { markChannelRead, markChannelUnreadFrom } from '../../hooks/useUnreadChannels';
import type { Message, User } from '../../types';
import MessageActions, { type MenuItem } from './MessageActions';
import ReactionBar from './ReactionBar';
import ThreadSummary from './ThreadSummary';
import UserProfileCard from './UserProfileCard';
import ForwardModal from './ForwardModal';
import DeleteConfirmModal from './DeleteConfirmModal';

interface Props {
  message: Message;
  isCompact: boolean;
  onThreadClick: (messageId: string) => void;
  searchQuery?: string;
}

const HIGHLIGHT_BG = 'rgba(242,199,68,0.1)';
const HIGHLIGHT_BG_HOVER = 'rgba(242,199,68,0.16)';
const MENTION_BAR = '#E8A838';

/** 検索クエリに一致するテキスト部分をハイライトする */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // キャプチャ付き split → 奇数インデックスが一致部分（g フラグ付き test の lastIndex 問題を避ける）
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} style={{ background: 'var(--sk-mention-me-bg)', color: 'var(--sk-text)', borderRadius: '2px', padding: '0 1px' }}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

/** 最も近いスクロール親の上端（ツールバーが見切れないか判定する用） */
function scrollParentTop(el: HTMLElement): number {
  let p = el.parentElement;
  while (p && p !== document.body) {
    const oy = getComputedStyle(p).overflowY;
    if (oy === 'auto' || oy === 'scroll') return p.getBoundingClientRect().top;
    p = p.parentElement;
  }
  return 0;
}

function MessageItemInner({ message, isCompact, onThreadClick, searchQuery = '' }: Props) {
  const { user } = useAppStore((s) => s.auth);
  const users = useAppStore((s) => s.users);
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const savedMessages = useAppStore((s) => s.savedMessages);
  const addSavedMessage = useAppStore((s) => s.addSavedMessage);
  const removeSavedMessage = useAppStore((s) => s.removeSavedMessage);
  const removeMessage = useAppStore((s) => s.removeMessage);
  const updateMsg = useAppStore((s) => s.updateMessage);
  const editingMessageId = useAppStore((s) => s.editingMessageId);
  const setEditingMessageId = useAppStore((s) => s.setEditingMessageId);
  const addChannel = useAppStore((s) => s.addChannel);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const channels = useAppStore((s) => s.channels);

  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toolbarInside, setToolbarInside] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [editFocused, setEditFocused] = useState(false);
  const [profile, setProfile] = useState<{ user: User; anchor: DOMRect } | null>(null);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const channelId = activeChannelId;
  const isSaved = savedMessages.some((s) => s.messageId === message.id);
  const reactions = message.reactions ?? {};
  const isOwner = user?.uid === message.uid;
  const msgUser = users.find((u) => u.uid === message.uid);
  const photoURL = message.photoURL ?? msgUser?.photoURL ?? null;

  // 自分宛メンション（個別メンション or @channel/@here/@everyone）
  const isMentioned =
    !!(user?.uid && message.mentions?.includes(user.uid)) ||
    /(^|[^\w])@(channel|here|everyone)(?![\w])/.test(message.text);
  const isPinned = !!message.pinned;
  const active = (hovered || menuOpen) && !editing;

  // ↑キーで編集トリガー: editingMessageId が自分のIDに設定されたら編集モードに入る
  useEffect(() => {
    if (editingMessageId === message.id) {
      setEditing(true);
      setEditText(message.text);
      setEditingMessageId(null); // リセット
    }
  }, [editingMessageId, message.id, message.text, setEditingMessageId]);

  // 編集ボックスの高さを内容に合わせる
  useLayoutEffect(() => {
    const ta = editRef.current;
    if (!editing || !ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, Math.round(window.innerHeight * 0.5))}px`;
  }, [editText, editing]);

  const handleMouseEnter = () => {
    setHovered(true);
    const row = rowRef.current;
    if (row) setToolbarInside(row.getBoundingClientRect().top - scrollParentTop(row) < 18);
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!channelId) return;
    try {
      await deleteMessage(channelId, message.id);
      setDeleteOpen(false);
      removeMessage(channelId, message.id);
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('メッセージの削除に失敗しました');
    }
  };

  const cancelEdit = () => { setEditing(false); setEditText(message.text); };

  const handleEditSave = async () => {
    if (!channelId) return;
    const next = editText.trim();
    if (next === message.text) { setEditing(false); return; }
    if (!next) return;
    try {
      await updateMessage(channelId, message.id, next);
      updateMsg(channelId, message.id, { text: next });
      setEditing(false);
    } catch (err) {
      console.error('Update error:', err);
      toast.error('メッセージの編集に失敗しました');
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!user || !channelId) return;
    try {
      await toggleReaction(channelId, message.id, emoji, user.uid, reactions);
    } catch (err) {
      console.error('Reaction error:', err);
      toast.error('リアクションの更新に失敗しました');
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      toast.success('テキストをコピーしました');
    } catch {
      toast.error('コピーに失敗しました');
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}?channel=${channelId}&msg=${message.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('リンクをコピーしました');
    } catch {
      toast.error('コピーに失敗しました');
    }
  };

  const handleMarkUnread = () => {
    if (!channelId) return;
    markChannelUnreadFrom(channelId, message.createdAt.toMillis());
    toast.success('未読にしました');
  };

  const handlePinToggle = async () => {
    if (!channelId || !user) return;
    const next = !isPinned;
    try {
      await setMessagePinned(channelId, message.id, next, user.uid);
      updateMsg(channelId, message.id, next ? { pinned: true, pinnedBy: user.uid } : { pinned: false, pinnedBy: undefined, pinnedAt: undefined });
      toast.success(next ? 'チャンネルにピン留めしました' : 'ピン留めを外しました');
    } catch (err) {
      console.error('Pin error:', err);
      toast.error('ピン留めの更新に失敗しました');
    }
  };

  const handleSaveToggle = async () => {
    if (!user || !channelId) return;
    try {
      if (isSaved) {
        await unsaveMessage(user.uid, message.id);
        removeSavedMessage(message.id);
        toast.success('「後で」から削除しました');
      } else {
        await saveMessage(user.uid, message, channelId);
        addSavedMessage({
          id: message.id,
          messageId: message.id,
          channelId,
          text: message.text.slice(0, 500),
          fromUid: message.uid,
          fromDisplayName: message.displayName,
          fromPhotoURL: message.photoURL,
          savedAt: Timestamp.now(),
          originalCreatedAt: message.createdAt,
        });
        toast.success('「後で」に保存しました');
      }
    } catch {
      toast.error('操作に失敗しました');
    }
  };

  const handleDMFromProfile = async (target: User) => {
    if (!user || target.uid === user.uid) return;
    try {
      const dmName = getDMChannelName(user.uid, target.uid);
      const existing = channels.find((c) => c.name === dmName);
      if (existing) {
        markChannelRead(existing.id);
        setActiveChannel(existing.id);
      } else {
        const newId = await getOrCreateDMChannel(user.uid, target.uid);
        const alreadyInStore = useAppStore.getState().channels.find((c) => c.id === newId);
        if (!alreadyInStore) {
          addChannel({
            id: newId,
            name: dmName,
            description: '',
            createdBy: user.uid,
            createdAt: Timestamp.now(),
            members: [user.uid, target.uid],
          });
        }
        markChannelRead(newId);
        setActiveChannel(newId);
      }
      setProfile(null);
    } catch (err) {
      console.error('DM open error:', err);
      toast.error('DMの開設に失敗しました');
    }
  };

  const openProfile = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    const anchor = e.currentTarget.getBoundingClientRect();
    const u: User = msgUser ?? {
      uid: message.uid,
      displayName: message.displayName,
      photoURL: message.photoURL,
      email: '',
      online: false,
      lastSeen: null,
    };
    setProfile({ user: u, anchor });
  };

  const startEdit = () => { setEditText(message.text); setEditing(true); };

  const onOpenChange = useCallback((open: boolean) => setMenuOpen(open), []);

  // ⋮ メニュー（Slack の並び順）
  const menuItems: MenuItem[] = [
    { label: '未読にする', onClick: handleMarkUnread },
    { label: isSaved ? '「後で」から削除する' : '後で', onClick: handleSaveToggle },
    { type: 'separator' },
    { label: 'リンクをコピー', onClick: handleCopyLink },
    { label: isPinned ? 'チャンネルからピン留めを外す' : 'チャンネルにピン留めする', onClick: handlePinToggle },
    { label: 'テキストをコピー', onClick: handleCopyText },
    ...(isOwner
      ? ([
          { type: 'separator' },
          { label: 'メッセージを編集する', onClick: startEdit },
          { label: 'メッセージを削除する', onClick: () => setDeleteOpen(true), danger: true },
        ] as MenuItem[])
      : []),
  ];

  // ── Row styling ───────────────────────────────────────────────────────────
  const highlighted = isMentioned || isPinned || editing;
  const background = highlighted
    ? active ? HIGHLIGHT_BG_HOVER : HIGHLIGHT_BG
    : active ? 'var(--sk-hover)' : 'transparent';

  const pinnedByName = message.pinnedBy
    ? message.pinnedBy === user?.uid
      ? 'あなた'
      : users.find((u) => u.uid === message.pinnedBy)?.displayName ?? '誰か'
    : null;

  return (
    <div
      ref={rowRef}
      role="article"
      aria-label={`${message.displayName}のメッセージ`}
      className="relative"
      style={{
        padding: isCompact ? '2px 20px' : '8px 20px',
        background,
        boxShadow: isMentioned ? `inset 2px 0 0 ${MENTION_BAR}` : 'none',
        transition: 'background 60ms',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ピン留めヘッダー */}
      {isPinned && (
        <div className="flex items-center gap-2" style={{ marginBottom: 2 }}>
          <div className="flex justify-end flex-shrink-0" style={{ width: 36 }}>
            <PinIcon filled className="w-3 h-3" style={{ color: 'var(--sk-red)' }} />
          </div>
          <span className="text-[12px] leading-[16px]" style={{ color: 'var(--sk-text-2)' }}>
            {pinnedByName ? `${pinnedByName} がピン留めしました` : 'ピン留めされています'}
          </span>
        </div>
      )}

      <div className="flex" style={{ gap: 8 }}>
        {/* Avatar / time gutter */}
        <div className="flex-shrink-0" style={{ width: 36 }}>
          {isCompact ? (
            <span
              title={formatFullDateTime(message.createdAt)}
              className="block text-right whitespace-nowrap select-none hover:underline cursor-default"
              style={{
                fontSize: 12,
                lineHeight: '22px',
                color: 'var(--sk-text-2)',
                visibility: active ? 'visible' : 'hidden',
              }}
            >
              {formatMessageTime(message.createdAt)}
            </span>
          ) : (
            <span style={{ display: 'inline-flex', paddingTop: 2 }}>
              <Avatar name={message.displayName} photoURL={photoURL} size={36} radius={8} onClick={openProfile} title={message.displayName} />
            </span>
          )}
        </div>

        {/* Message body */}
        <div className="flex-1 min-w-0">
          {!isCompact && (
            <div className="flex items-baseline" style={{ gap: 8, lineHeight: '22px' }}>
              <button
                type="button"
                onClick={openProfile}
                className="hover:underline text-left truncate"
                style={{ fontSize: 15, fontWeight: 900, color: 'var(--sk-text)', lineHeight: '22px' }}
              >
                {message.displayName}
              </button>
              <span
                title={formatFullDateTime(message.createdAt)}
                className="hover:underline cursor-default whitespace-nowrap flex-shrink-0"
                style={{ fontSize: 12, color: 'var(--sk-text-2)' }}
              >
                {formatMessageTime(message.createdAt)}
              </span>
            </div>
          )}

          {editing ? (
            <div className="mt-1 mb-1" style={{ marginRight: 4 }}>
              <div
                style={{
                  borderRadius: 8,
                  border: `1px solid ${editFocused ? 'rgba(29,28,29,0.5)' : 'var(--sk-border-strong)'}`,
                  boxShadow: editFocused ? '0 1px 6px rgba(0,0,0,0.1)' : 'none',
                  background: '#FFFFFF',
                  transition: 'border-color 100ms, box-shadow 100ms',
                }}
              >
                <textarea
                  ref={editRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onFocus={(e) => {
                    setEditFocused(true);
                    const len = e.currentTarget.value.length;
                    e.currentTarget.setSelectionRange(len, len);
                  }}
                  onBlur={() => setEditFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleEditSave(); }
                    if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                  }}
                  aria-label="メッセージを編集"
                  className="w-full block resize-none bg-transparent focus:outline-none"
                  style={{ fontSize: 15, lineHeight: '22px', color: 'var(--sk-text)', padding: '10px 12px 4px', minHeight: 44 }}
                  rows={1}
                  autoFocus
                />
                <div className="flex items-center justify-end gap-2" style={{ padding: '4px 8px 8px' }}>
                  <span className="mr-auto text-[12px] pl-1 hidden sm:inline" style={{ color: 'var(--sk-text-2)' }}>
                    Esc でキャンセル・Enter で保存
                  </span>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="text-[13px] font-bold"
                    style={{ height: 28, padding: '0 12px', borderRadius: 8, background: '#FFFFFF', border: '1px solid var(--sk-border-strong)', color: 'var(--sk-text)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sk-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handleEditSave}
                    disabled={!editText.trim()}
                    className="text-[13px] font-bold"
                    style={{
                      height: 28,
                      padding: '0 12px',
                      borderRadius: 8,
                      background: editText.trim() ? 'var(--sk-green)' : 'var(--sk-subtle)',
                      color: editText.trim() ? '#FFFFFF' : 'var(--sk-text-3)',
                      border: '1px solid transparent',
                    }}
                    onMouseEnter={(e) => { if (editText.trim()) e.currentTarget.style.background = 'var(--sk-green-hover)'; }}
                    onMouseLeave={(e) => { if (editText.trim()) e.currentTarget.style.background = 'var(--sk-green)'; }}
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 15, lineHeight: '22px', color: 'var(--sk-text)', wordBreak: 'break-word' }}>
              {searchQuery.trim()
                ? <HighlightText text={message.text} query={searchQuery} />
                : renderMarkdown(message.text, { currentUid: user?.uid })}
              {message.editedAt && (
                <span className="ml-1" style={{ fontSize: 12, color: 'var(--sk-text-3)' }} title={formatFullDateTime(message.editedAt)}>
                  (編集済み)
                </span>
              )}
            </div>
          )}

          {/* Reactions */}
          {!editing && (
            <ReactionBar reactions={reactions} currentUid={user?.uid} users={users} onToggle={handleReaction} />
          )}

          {/* Thread summary */}
          {(message.threadCount ?? 0) > 0 && !editing && (
            <ThreadSummary
              count={message.threadCount ?? 0}
              participants={message.threadParticipants}
              lastReplyAt={message.lastReplyAt}
              users={users}
              onClick={() => onThreadClick(message.id)}
            />
          )}
        </div>
      </div>

      {/* Mobile: always-visible ⋮ action trigger */}
      {!editing && (
        <button
          type="button"
          aria-label="メッセージのアクション"
          onClick={() => setHovered((p) => !p)}
          className="md:hidden absolute right-3 top-1 w-7 h-7 flex items-center justify-center"
          style={{ borderRadius: 6, color: 'var(--sk-text-3)' }}
        >
          <MoreVerticalIcon className="w-4 h-4" />
        </button>
      )}

      {/* Hover toolbar */}
      {active && (
        <MessageActions
          className="absolute"
          style={{ top: toolbarInside ? 4 : -16, right: 16, zIndex: 30 }}
          onReact={handleReaction}
          onReplyThread={() => onThreadClick(message.id)}
          onForward={() => setForwardOpen(true)}
          saved={isSaved}
          onToggleSave={handleSaveToggle}
          menuItems={menuItems}
          onOpenChange={onOpenChange}
        />
      )}

      {profile && (
        <UserProfileCard
          user={profile.user}
          anchor={profile.anchor}
          isSelf={profile.user.uid === user?.uid}
          onClose={() => setProfile(null)}
          onMessage={profile.user.uid !== user?.uid ? () => handleDMFromProfile(profile.user) : undefined}
        />
      )}

      {forwardOpen && channelId && (
        <ForwardModal message={message} sourceChannelId={channelId} onClose={() => setForwardOpen(false)} />
      )}

      {deleteOpen && (
        <DeleteConfirmModal
          message={message}
          currentUid={user?.uid}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

export default memo(MessageItemInner);
