import { useState, useEffect, useRef, memo } from 'react';
import ReactDOM from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import { deleteMessage, updateMessage, toggleReaction, saveMessage, unsaveMessage } from '../../services';
import { formatMessageTime, formatFullDateTime } from '../../utils/formatDate';
import { renderMarkdown } from '../../utils/markdown';
import { toast } from '../ui/Toast';
import EmojiPicker from '../ui/EmojiPicker';
import type { Message, User } from '../../types';

// ─── Portal emoji picker ───────────────────────────────────────────────────────
// overflow スクロールコンテナにクリップされないよう body にポータルとして描画する
function EmojiPickerPortal({
  anchorRect,
  onSelect,
  onClose,
}: {
  anchorRect: DOMRect;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  // ビューポート右端に合わせて配置（はみ出し防止）
  const pickerW = 320;
  let left = anchorRect.left;
  if (left + pickerW > window.innerWidth - 8) {
    left = window.innerWidth - pickerW - 8;
  }
  const top = anchorRect.bottom + 4;

  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed z-50" style={{ top, left }}>
        <EmojiPicker onSelect={onSelect} onClose={onClose} />
      </div>
    </>,
    document.body
  );
}

interface Props {
  message: Message;
  isCompact: boolean;
  onThreadClick: (messageId: string) => void;
  searchQuery?: string;
}

/** 検索クエリに一致するテキスト部分をハイライトする */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} style={{ background: '#FFE58F', color: '#1D1C1D', borderRadius: '2px', padding: '0 1px' }}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─── User profile popup ───────────────────────────────────────────────────────
function UserProfilePopup({
  user,
  anchor,
  onClose,
}: {
  user: User;
  anchor: DOMRect;
  onClose: () => void;
}) {
  const left = Math.min(anchor.left, window.innerWidth - 280);
  const top = anchor.bottom + 8;

  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 rounded-lg overflow-hidden"
        style={{
          top,
          left,
          width: 260,
          background: '#FFFFFF',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          border: '1px solid #E8E8E8',
        }}
      >
        {/* Header bg */}
        <div className="h-12" style={{ background: 'linear-gradient(135deg,#3F0E40,#1164A3)' }} />
        <div className="px-4 pb-4">
          <div className="-mt-7 mb-2 flex items-end justify-between">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-14 h-14 rounded object-cover"
                style={{ border: '3px solid #FFFFFF' }}
              />
            ) : (
              <div
                className="w-14 h-14 rounded flex items-center justify-center text-white text-xl font-bold"
                style={{ background: '#1164A3', border: '3px solid #FFFFFF' }}
              >
                {user.displayName[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: user.online ? '#E3FCEF' : '#F8F8F8',
                color: user.online ? '#007A5A' : '#616061',
                border: `1px solid ${user.online ? '#B8F0DA' : '#DDDDDD'}`,
              }}
            >
              {user.online ? 'アクティブ' : 'オフライン'}
            </span>
          </div>
          <p className="text-[16px] font-bold text-[#1D1C1D] leading-tight">{user.displayName}</p>
          {user.status && (
            <p className="text-[13px] text-[#1D1C1D] mt-0.5">{user.status.emoji} {user.status.text}</p>
          )}
          {user.email && (
            <p className="text-[12px] text-[#616061] mt-0.5 truncate">{user.email}</p>
          )}
        </div>
      </div>
    </>,
    document.body
  );
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

  const [showActions, setShowActions] = useState(false);
  const [reactionAnchor, setReactionAnchor] = useState<DOMRect | null>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [profileAnchor, setProfileAnchor] = useState<DOMRect | null>(null);
  const reactionBtnRef = useRef<HTMLButtonElement>(null);
  const addReactionBtnRef = useRef<HTMLButtonElement>(null);

  const isSaved = savedMessages.some((s) => s.messageId === message.id);

  // ↑キーで編集トリガー: editingMessageId が自分のIDに設定されたら編集モードに入る
  useEffect(() => {
    if (editingMessageId === message.id) {
      setEditing(true);
      setEditText(message.text);
      setEditingMessageId(null); // リセット
    }
  }, [editingMessageId, message.id, message.text, setEditingMessageId]);

  // Firestoreから取得したreactionsを使用
  const reactions = message.reactions ?? {};
  const isOwner = user?.uid === message.uid;

  const handleDelete = async () => {
    if (!activeChannelId) return;
    if (!window.confirm('このメッセージを削除しますか？')) return;
    try {
      await deleteMessage(activeChannelId, message.id);
      removeMessage(activeChannelId, message.id);
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('メッセージの削除に失敗しました');
    }
  };

  const handleEditSave = async () => {
    if (!activeChannelId) return;
    if (editText.trim() === message.text) { setEditing(false); return; }
    if (!editText.trim()) return;
    try {
      await updateMessage(activeChannelId, message.id, editText.trim());
      updateMsg(activeChannelId, message.id, { text: editText.trim() });
      setEditing(false);
    } catch (err) {
      console.error('Update error:', err);
      toast.error('メッセージの編集に失敗しました');
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!user || !activeChannelId) return;
    try {
      await toggleReaction(activeChannelId, message.id, emoji, user.uid, reactions);
    } catch (err) {
      console.error('Reaction error:', err);
      toast.error('リアクションの更新に失敗しました');
    }
    setReactionAnchor(null);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      toast.success('コピーしました');
    } catch {
      toast.error('コピーに失敗しました');
    }
  };

  const handleSaveToggle = async () => {
    if (!user || !activeChannelId) return;
    try {
      if (isSaved) {
        await unsaveMessage(user.uid, message.id);
        removeSavedMessage(message.id);
        toast.success('保存を解除しました');
      } else {
        await saveMessage(user.uid, message, activeChannelId);
        addSavedMessage({
          id: message.id,
          messageId: message.id,
          channelId: activeChannelId,
          text: message.text.slice(0, 500),
          fromUid: message.uid,
          fromDisplayName: message.displayName,
          fromPhotoURL: message.photoURL,
          savedAt: { toMillis: () => Date.now() } as any,
          originalCreatedAt: message.createdAt,
        });
        toast.success('メッセージを保存しました');
      }
    } catch {
      toast.error('操作に失敗しました');
    }
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const msgUser = users.find((u) => u.uid === message.uid);
    if (msgUser) {
      setProfileUser(msgUser);
      setProfileAnchor(rect);
    }
  };

  const handleNameClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const msgUser = users.find((u) => u.uid === message.uid);
    if (msgUser) {
      setProfileUser(msgUser);
      setProfileAnchor(rect);
    }
  };

  return (
    <div
      role="article"
      aria-label={`${message.displayName}のメッセージ`}
      className={`relative group flex gap-3 hover:bg-[#F8F8F8] transition-colors ${
        isCompact ? 'px-5 py-0.5' : 'px-5 pt-2 pb-1'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); }}
    >
      {/* Mobile: always-visible ⋮ action trigger */}
      {!editing && (
        <button
          onClick={() => setShowActions((p) => !p)}
          className="md:hidden absolute right-3 top-1 w-7 h-7 flex items-center justify-center rounded text-[#AAAAAA] hover:bg-[#F0F0F0] hover:text-[#616061] transition-colors z-10"
          style={{ fontSize: '18px', lineHeight: 1 }}
        >
          ⋮
        </button>
      )}
      {/* Avatar / time gutter */}
      <div className="w-9 flex-shrink-0 pt-0.5">
        {isCompact ? (
          <span
            title={formatFullDateTime(message.createdAt)}
            className="text-[11px] text-[#616061] invisible group-hover:visible block text-right leading-5 mt-0.5 cursor-default"
            style={{ paddingRight: '2px' }}
          >
            {formatMessageTime(message.createdAt)}
          </span>
        ) : message.photoURL ? (
          <img
            src={message.photoURL}
            alt={message.displayName}
            className="w-9 h-9 object-cover cursor-pointer hover:opacity-80 transition-opacity"
            style={{ borderRadius: '4px' }}
            onClick={handleAvatarClick}
          />
        ) : (
          <div
            className="w-9 h-9 flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity"
            style={{ borderRadius: '4px', background: '#1164A3' }}
            onClick={handleAvatarClick}
          >
            {message.displayName[0]?.toUpperCase() ?? '?'}
          </div>
        )}
      </div>

      {/* Message body */}
      <div className="flex-1 min-w-0">
        {!isCompact && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span
              className="font-bold text-[15px] text-[#1D1C1D] hover:underline cursor-pointer leading-snug"
              onClick={handleNameClick}
            >{message.displayName}</span>
            <span
              title={formatFullDateTime(message.createdAt)}
              className="text-[12px] text-[#616061] cursor-default"
            >
              {formatMessageTime(message.createdAt)}
            </span>
          </div>
        )}

        {editing ? (
          <div className="mt-1 mr-4">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(); }
                if (e.key === 'Escape') { setEditing(false); setEditText(message.text); }
              }}
              className="w-full text-[14px] text-[#1D1C1D] resize-none focus:outline-none leading-relaxed"
              style={{ border: '1px solid #1D9BD1', borderRadius: '6px', padding: '8px 12px', boxShadow: '0 0 0 1px #1D9BD1' }}
              rows={2}
              autoFocus
            />
            <div className="flex items-center gap-2 mt-1.5 text-[12px]">
              <span className="text-[#616061]"><kbd className="font-mono">Esc</kbd> でキャンセル・<kbd className="font-mono">Enter</kbd> で保存</span>
              <button onClick={handleEditSave} className="px-3 py-1 rounded text-white text-[13px] font-medium" style={{ background: '#007A5A' }}>保存</button>
              <button onClick={() => { setEditing(false); setEditText(message.text); }} className="px-3 py-1 rounded text-[#1D1C1D] text-[13px] font-medium border border-[#DDDDDD] hover:bg-gray-50">キャンセル</button>
            </div>
          </div>
        ) : (
          <div className="text-[14px] text-[#1D1C1D] leading-relaxed">
            {searchQuery.trim()
              ? <HighlightText text={message.text} query={searchQuery} />
              : renderMarkdown(message.text)
            }
            {message.editedAt && (
              <span className="text-[11px] text-[#616061] ml-1">(編集済み)</span>
            )}
          </div>
        )}

        {/* Thread reply count */}
        {(message.threadCount ?? 0) > 0 && !editing && (
          <button onClick={() => onThreadClick(message.id)} className="mt-1 flex items-center gap-1.5 text-[13px] font-medium hover:underline" style={{ color: '#1264A3' }}>
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
            {message.threadCount}件の返信
          </button>
        )}

        {/* Reactions（Firestoreから） */}
        {Object.keys(reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(reactions).map(([emoji, uids]) =>
              uids.length > 0 ? (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  title={uids.map((uid) => users.find((u) => u.uid === uid)?.displayName ?? uid).join(', ')}
                  className="flex items-center gap-0.5 text-[13px] px-2 py-0.5 press-subtle"
                  style={{
                    borderRadius: '24px',
                    border: user && uids.includes(user.uid) ? '1.5px solid #1264A3' : '1px solid #DDDDDD',
                    background: user && uids.includes(user.uid) ? 'rgba(18,100,163,0.1)' : '#F4F4F4',
                    color: user && uids.includes(user.uid) ? '#1264A3' : '#616061',
                    fontWeight: user && uids.includes(user.uid) ? 600 : 400,
                    transition: 'background 100ms, border-color 100ms, transform 80ms',
                  }}
                  onMouseEnter={(e) => {
                    const isMe = user && uids.includes(user.uid);
                    e.currentTarget.style.background = isMe ? 'rgba(18,100,163,0.18)' : '#EBEBEB';
                    e.currentTarget.style.borderColor = isMe ? '#0E4F8A' : '#BBBBBB';
                  }}
                  onMouseLeave={(e) => {
                    const isMe = user && uids.includes(user.uid);
                    e.currentTarget.style.background = isMe ? 'rgba(18,100,163,0.1)' : '#F4F4F4';
                    e.currentTarget.style.borderColor = isMe ? '#1264A3' : '#DDDDDD';
                  }}
                >
                  <span style={{ fontSize: '14px' }}>{emoji}</span>
                  <span className="font-semibold ml-0.5 text-[12px]">{uids.length}</span>
                </button>
              ) : null
            )}
            {/* + Add reaction button */}
            <button
              ref={addReactionBtnRef}
              onClick={() => {
                const rect = addReactionBtnRef.current?.getBoundingClientRect();
                if (rect) setReactionAnchor((a) => a ? null : rect);
              }}
              title="リアクションを追加"
              className="flex items-center justify-center gap-0.5 text-[12px] px-2 py-0.5 press-subtle"
              style={{
                borderRadius: '24px',
                border: '1px dashed #CCCCCC',
                background: 'transparent',
                color: '#888888',
                transition: 'background 100ms, border-color 100ms, color 100ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#888888';
                e.currentTarget.style.borderStyle = 'solid';
                e.currentTarget.style.background = '#F0F0F0';
                e.currentTarget.style.color = '#1D1C1D';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#CCCCCC';
                e.currentTarget.style.borderStyle = 'dashed';
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#888888';
              }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>😊</span>
            </button>
          </div>
        )}
      </div>

      {/* Action toolbar — hover on desktop, tap ⋮ on mobile */}
      {showActions && !editing && (
        <div
          className="absolute right-5 -top-[18px] flex items-center gap-px px-1 py-0.5 z-20"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E0E0E0',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
          }}
        >
          {/* Reaction picker */}
          <button
            ref={reactionBtnRef}
            onClick={() => {
              const rect = reactionBtnRef.current?.getBoundingClientRect();
              if (rect) setReactionAnchor((a) => a ? null : rect);
            }}
            title="リアクションを追加"
            className="w-8 h-8 flex items-center justify-center rounded-md press-subtle"
            style={{
              color: reactionAnchor ? '#1264A3' : '#616061',
              background: reactionAnchor ? '#E8F5FA' : 'transparent',
              transition: 'background 100ms, color 100ms',
            }}
            onMouseEnter={(e) => { if (!reactionAnchor) { e.currentTarget.style.background = '#F0F0F0'; e.currentTarget.style.color = '#1D1C1D'; } }}
            onMouseLeave={(e) => { if (!reactionAnchor) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#616061'; } }}
          >
            <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
            </svg>
          </button>

          {/* Thread */}
          <button
            onClick={() => onThreadClick(message.id)}
            title="スレッドで返信"
            className="w-8 h-8 flex items-center justify-center rounded-md text-[#616061] press-subtle"
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F0F0'; e.currentTarget.style.color = '#1D1C1D'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#616061'; }}
          >
            <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
          </button>

          {/* Save/Bookmark */}
          <button
            onClick={handleSaveToggle}
            title={isSaved ? '保存を解除' : 'メッセージを保存'}
            className="w-8 h-8 flex items-center justify-center rounded-md press-subtle"
            style={{ color: isSaved ? '#E8A400' : '#616061', background: isSaved ? '#FFF8E1' : 'transparent' }}
            onMouseEnter={(e) => {
              if (!isSaved) { e.currentTarget.style.background = '#F0F0F0'; e.currentTarget.style.color = '#1D1C1D'; }
              else { e.currentTarget.style.background = '#FFF0C0'; }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isSaved ? '#FFF8E1' : 'transparent';
              e.currentTarget.style.color = isSaved ? '#E8A400' : '#616061';
            }}
          >
            <svg className="w-[17px] h-[17px]" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
          </button>

          {isOwner && (
            <>
              <div className="w-px h-4 bg-[#E8E8E8] mx-0.5 flex-shrink-0" />
              <button
                onClick={() => setEditing(true)}
                title="メッセージを編集"
                className="w-8 h-8 flex items-center justify-center rounded-md text-[#616061] press-subtle"
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F0F0'; e.currentTarget.style.color = '#1D1C1D'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#616061'; }}
              >
                <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
            </>
          )}

          {/* Copy */}
          <button
            onClick={handleCopy}
            title="テキストをコピー"
            className="w-8 h-8 flex items-center justify-center rounded-md text-[#616061] press-subtle"
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F0F0'; e.currentTarget.style.color = '#1D1C1D'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#616061'; }}
          >
            <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
            </svg>
          </button>

          {isOwner && (
            <button
              onClick={handleDelete}
              title="メッセージを削除"
              className="w-8 h-8 flex items-center justify-center rounded-md press-subtle"
              style={{ color: '#616061' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#FFF0F0'; e.currentTarget.style.color = '#E01E5A'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#616061'; }}
            >
              <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          )}
        </div>
      )}
      {profileUser && profileAnchor && (
        <UserProfilePopup
          user={profileUser}
          anchor={profileAnchor}
          onClose={() => { setProfileUser(null); setProfileAnchor(null); }}
        />
      )}
      {/* Emoji picker portal — スクロールコンテナ外に描画してクリップを回避 */}
      {reactionAnchor && (
        <EmojiPickerPortal
          anchorRect={reactionAnchor}
          onSelect={(emoji) => { handleReaction(emoji); setReactionAnchor(null); }}
          onClose={() => setReactionAnchor(null)}
        />
      )}
    </div>
  );
}

export default memo(MessageItemInner);
