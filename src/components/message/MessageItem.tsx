import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { deleteMessage, updateMessage, addReaction } from '../../services';
import { formatMessageTime } from '../../utils/formatDate';
import type { Message } from '../../types';

interface Props {
  message: Message;
  isCompact: boolean;
  onThreadClick: (messageId: string) => void;
}

const COMMON_REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥', '👀'];

// Parse @[displayName](uid) tokens into highlighted spans
function renderMessageText(text: string): React.ReactNode[] {
  const parts = text.split(/(@\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^@\[([^\]]+)\]\(([^)]+)\)$/);
    if (match) {
      return (
        <span
          key={i}
          className="bg-yellow-100 text-yellow-800 rounded px-0.5 font-medium cursor-pointer hover:bg-yellow-200"
        >
          @{match[1]}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function MessageItem({ message, isCompact, onThreadClick }: Props) {
  const { user } = useAppStore((s) => s.auth);
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const removeMessage = useAppStore((s) => s.removeMessage);
  const updateMsg = useAppStore((s) => s.updateMessage);

  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [reactions, setReactions] = useState<Record<string, string[]>>({});

  const isOwner = user?.uid === message.uid;

  const handleDelete = async () => {
    if (!activeChannelId) return;
    if (!window.confirm('このメッセージを削除しますか？')) return;
    try {
      await deleteMessage(activeChannelId, message.id);
      removeMessage(activeChannelId, message.id);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleEditSave = async () => {
    if (!activeChannelId || editText.trim() === message.text) {
      setEditing(false);
      return;
    }
    try {
      await updateMessage(activeChannelId, message.id, editText.trim());
      updateMsg(activeChannelId, message.id, { text: editText.trim() });
      setEditing(false);
    } catch (err) {
      console.error('Update error:', err);
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!user || !activeChannelId) return;
    setReactions((prev) => {
      const users = prev[emoji] ?? [];
      const hasReacted = users.includes(user.uid);
      return {
        ...prev,
        [emoji]: hasReacted
          ? users.filter((u) => u !== user.uid)
          : [...users, user.uid],
      };
    });
    try {
      await addReaction(activeChannelId, message.id, emoji, user.uid);
    } catch (err) {
      console.error('Reaction error:', err);
    }
    setShowReactionPicker(false);
  };

  return (
    <div
      className={`relative group flex gap-2 px-5 py-1 hover:bg-message-hover transition-colors ${
        isCompact ? 'pt-0.5 pb-0.5' : 'pt-2'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactionPicker(false);
      }}
    >
      {/* Avatar / time gutter */}
      <div className="w-9 flex-shrink-0">
        {isCompact ? (
          // compact: show time on hover
          <span className="text-xs text-gray-400 leading-5 invisible group-hover:visible block text-right pr-0.5">
            {formatMessageTime(message.createdAt)}
          </span>
        ) : message.photoURL ? (
          <img
            src={message.photoURL}
            alt={message.displayName}
            className="w-9 h-9 rounded-lg object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-white text-sm font-bold">
            {message.displayName[0]?.toUpperCase() ?? '?'}
          </div>
        )}
      </div>

      {/* Message body */}
      <div className="flex-1 min-w-0">
        {!isCompact && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="font-bold text-gray-900 text-sm">
              {message.displayName}
            </span>
            <span className="text-xs text-gray-400">
              {formatMessageTime(message.createdAt)}
            </span>
          </div>
        )}

        {editing ? (
          <div className="mt-1">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleEditSave();
                }
                if (e.key === 'Escape') {
                  setEditing(false);
                  setEditText(message.text);
                }
              }}
              className="w-full border border-accent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              rows={2}
              autoFocus
            />
            <div className="flex gap-2 mt-1">
              <button
                onClick={handleEditSave}
                className="text-xs bg-accent text-white px-3 py-1 rounded hover:bg-blue-600"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditText(message.text);
                }}
                className="text-xs text-gray-500 px-3 py-1 rounded hover:bg-gray-100"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-900 leading-relaxed break-words whitespace-pre-wrap">
            {renderMessageText(message.text)}
          </p>
        )}

        {/* Thread reply count */}
        {(message.threadCount ?? 0) > 0 && (
          <button
            onClick={() => onThreadClick(message.id)}
            className="mt-1 flex items-center gap-1 text-accent text-xs hover:underline"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {message.threadCount}件の返信
          </button>
        )}

        {/* Reactions */}
        {Object.entries(reactions).some(([, users]) => users.length > 0) && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(reactions).map(
              ([emoji, users]) =>
                users.length > 0 && (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={`flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      user && users.includes(user.uid)
                        ? 'bg-blue-50 border-accent text-accent'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span>{users.length}</span>
                  </button>
                )
            )}
          </div>
        )}
      </div>

      {/* Hover action toolbar */}
      {showActions && !editing && (
        <div className="absolute right-4 -top-4 bg-white border border-gray-200 rounded-lg shadow-popover flex items-center gap-0.5 px-1 py-0.5 z-10">
          {/* Reaction picker trigger */}
          <div className="relative">
            <button
              onClick={() => setShowReactionPicker((p) => !p)}
              title="リアクション"
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors text-base"
            >
              😊
            </button>
            {showReactionPicker && (
              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-popover flex gap-1 p-1.5 z-20">
                {COMMON_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-base"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Thread */}
          <button
            onClick={() => onThreadClick(message.id)}
            title="スレッドで返信"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>

          {/* Edit (owner only) */}
          {isOwner && (
            <button
              onClick={() => setEditing(true)}
              title="編集"
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}

          {/* Delete (owner only) */}
          {isOwner && (
            <button
              onClick={handleDelete}
              title="削除"
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
