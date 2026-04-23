import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import ReactDOM from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import { useThreads } from '../../hooks/useThreads';
import {
  sendThreadReply,
  sendMessage,
  toggleReaction,
  toggleThreadReaction,
  updateThreadReply,
  deleteThreadReply,
} from '../../services';
import { formatMessageTime, formatFullDateTime, formatRelativeTime } from '../../utils/formatDate';
import { renderMarkdown } from '../../utils/markdown';
import { toast } from '../ui/Toast';
import EmojiPicker from '../ui/EmojiPicker';
import type { Thread } from '../../types';

function EmojiPickerPortal({
  anchorRect,
  onSelect,
  onClose,
}: {
  anchorRect: DOMRect;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
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

export default function ThreadPanel() {
  const { user } = useAppStore((s) => s.auth);
  const users = useAppStore((s) => s.users);
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const channels = useAppStore((s) => s.channels);
  const threadPanelMessageId = useAppStore((s) => s.threadPanelMessageId);
  const closeThreadPanel = useAppStore((s) => s.closeThreadPanel);
  const messages = useAppStore((s) =>
    activeChannelId ? (s.messages[activeChannelId] ?? []) : []
  );

  const threads = useThreads();
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [alsoSendToChannel, setAlsoSendToChannel] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [reactionAnchor, setReactionAnchor] = useState<{ rect: DOMRect; targetId: string; isParent: boolean } | null>(null);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputEmojiRef = useRef<HTMLButtonElement>(null);

  const parentMessage = messages.find((m) => m.id === threadPanelMessageId);
  const channel = channels.find((c) => c.id === activeChannelId);
  const isDM = channel?.name.startsWith('__dm__');
  const channelLabel = isDM ? 'DM' : channel ? `#${channel.name}` : '';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads.length]);

  const handleSend = async () => {
    if (!activeChannelId || !threadPanelMessageId || !user || !replyText.trim() || sending) return;
    const trimmed = replyText.trim();
    setSending(true);
    setReplyText('');
    try {
      // スレッドの親メッセージ投稿者と既存の参加者に通知
      const notifyUids = [
        parentMessage?.uid ?? '',
        ...(parentMessage?.threadParticipants ?? []),
      ].filter(Boolean) as string[];
      await sendThreadReply(activeChannelId, threadPanelMessageId, trimmed, user, notifyUids);
      if (alsoSendToChannel) {
        await sendMessage(activeChannelId, trimmed, user, []).catch(() => {});
      }
    } catch (err) {
      console.error('Thread reply error:', err);
      setReplyText(trimmed);
      toast.error('返信の送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wrapSelection = (before: string, after: string = before) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = replyText.slice(start, end);
    const newText =
      replyText.slice(0, start) + before + selected + after + replyText.slice(end);
    setReplyText(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); wrapSelection('*'); return;
        case 'i': e.preventDefault(); wrapSelection('_'); return;
      }
    }
  };

  const handleReaction = async (messageId: string, emoji: string, isParent = false) => {
    if (!user || !activeChannelId || !threadPanelMessageId) return;
    try {
      if (isParent) {
        // 親メッセージへのリアクション
        const parentMsg = messages.find((m) => m.id === messageId);
        const currentReactions = parentMsg?.reactions ?? {};
        await toggleReaction(activeChannelId, messageId, emoji, user.uid, currentReactions);
      } else {
        // スレッド返信へのリアクション（正しいパスに保存）
        const thread = threads.find((t) => t.id === messageId);
        const currentReactions = thread?.reactions ?? {};
        await toggleThreadReaction(activeChannelId, threadPanelMessageId, messageId, emoji, user.uid, currentReactions);
      }
    } catch (err) {
      console.error('Reaction error:', err);
    }
    setReactionAnchor(null);
  };

  const handleEditStart = (thread: Thread) => {
    setEditingThreadId(thread.id);
    setEditText(thread.text);
  };

  const handleEditSave = async (thread: Thread) => {
    if (!activeChannelId || !threadPanelMessageId || !editText.trim()) return;
    try {
      await updateThreadReply(activeChannelId, threadPanelMessageId, thread.id, editText.trim());
      setEditingThreadId(null);
      toast.success('編集しました');
    } catch {
      toast.error('編集に失敗しました');
    }
  };

  const handleDelete = async (threadId: string) => {
    if (!activeChannelId || !threadPanelMessageId) return;
    if (!window.confirm('この返信を削除しますか？')) return;
    try {
      await deleteThreadReply(activeChannelId, threadPanelMessageId, threadId);
      toast.success('返信を削除しました');
    } catch {
      toast.error('削除に失敗しました');
    }
  };

  const hasText = replyText.trim().length > 0;
  const [threadInputFocused, setThreadInputFocused] = useState(false);

  return (
    <div className="flex flex-col h-full" style={{ background: '#FFFFFF', borderLeft: '1px solid #E8E8E8' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ minHeight: '49px', borderBottom: '1px solid #E8E8E8' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-bold text-[15px] flex-shrink-0" style={{ color: '#1D1C1D' }}>スレッド</h3>
          {channelLabel && (
            <span
              className="text-[12px] px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: '#F0F0F0', color: '#616061' }}
            >
              {channelLabel}
            </span>
          )}
        </div>
        <button
          onClick={closeThreadPanel}
          title="閉じる (Esc)"
          className="w-8 h-8 flex items-center justify-center rounded press-subtle flex-shrink-0"
          style={{ color: '#616061' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F0F0'; e.currentTarget.style.color = '#1D1C1D'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#616061'; }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scroll area */}
      <div className="flex-1 overflow-y-auto">
        {/* Parent message */}
        {parentMessage && (
          <div
            className="px-4 py-4 group relative"
            style={{ borderBottom: '1px solid #E8E8E8' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(29,28,29,0.04)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; setReactionAnchor(null); }}
          >
            <div className="flex gap-3">
              {parentMessage.photoURL ? (
                <img
                  src={parentMessage.photoURL}
                  alt={parentMessage.displayName}
                  className="w-9 h-9 object-cover flex-shrink-0"
                  style={{ borderRadius: '4px' }}
                />
              ) : (
                <div
                  className="w-9 h-9 flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ borderRadius: '4px', background: '#1164A3' }}
                >
                  {parentMessage.displayName[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="font-bold text-[15px]" style={{ color: '#1D1C1D' }}>
                    {parentMessage.displayName}
                  </span>
                  <span
                    className="text-[12px]"
                    style={{ color: '#616061' }}
                    title={formatFullDateTime(parentMessage.createdAt)}
                  >
                    {formatRelativeTime(parentMessage.createdAt)}
                  </span>
                </div>
                <div className="text-[15px]" style={{ color: '#1D1C1D', lineHeight: '1.46875' }}>
                  {renderMarkdown(parentMessage.text)}
                </div>
                {/* Reactions on parent */}
                {Object.keys(parentMessage.reactions ?? {}).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {Object.entries(parentMessage.reactions ?? {}).map(([emoji, uids]) =>
                      uids.length > 0 ? (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(parentMessage.id, emoji, true)}
                          title={uids.map((uid) => users.find((u) => u.uid === uid)?.displayName ?? uid).join(', ')}
                          className="flex items-center gap-0.5 text-[12px] px-1.5 py-0.5 press-subtle"
                          style={{
                            borderRadius: '24px',
                            border: user && uids.includes(user.uid) ? '1.5px solid #1264A3' : '1px solid #DDDDDD',
                            background: user && uids.includes(user.uid) ? 'rgba(18,100,163,0.1)' : '#F4F4F4',
                            color: user && uids.includes(user.uid) ? '#1264A3' : '#616061',
                            fontWeight: user && uids.includes(user.uid) ? 600 : 400,
                          }}
                        >
                          <span>{emoji}</span>
                          <span className="font-semibold ml-0.5">{uids.length}</span>
                        </button>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            </div>
            {/* Parent message hover action */}
            <div
              className="absolute right-3 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                padding: '2px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <button
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setReactionAnchor((a) =>
                    a?.targetId === parentMessage.id ? null : { rect, targetId: parentMessage.id, isParent: true }
                  );
                }}
                className="w-7 h-7 flex items-center justify-center rounded-md text-[#616061] press-subtle"
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F0F0'; e.currentTarget.style.color = '#1D1C1D'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#616061'; }}
                title="リアクションを追加"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Reply count divider */}
        {threads.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3">
            <hr className="flex-1" style={{ borderColor: '#E8E8E8' }} />
            <span
              className="text-[11px] font-bold px-2.5 py-0.5 flex-shrink-0"
              style={{
                color: '#616061',
                border: '1px solid #E0E0E0',
                borderRadius: '24px',
                whiteSpace: 'nowrap',
              }}
            >
              {threads.length}件の返信
            </span>
            <hr className="flex-1" style={{ borderColor: '#E8E8E8' }} />
          </div>
        )}

        {/* Thread replies */}
        <div className="pb-4">
          {threads.map((thread) => {
            const isOwner = thread.uid === user?.uid;
            const isEditing = editingThreadId === thread.id;
            return (
              <div
                key={thread.id}
                className="relative flex gap-3 px-4 py-2 transition-colors group"
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(29,28,29,0.04)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; setReactionAnchor(null); }}
              >
                {thread.photoURL ? (
                  <img
                    src={thread.photoURL}
                    alt={thread.displayName}
                    className="w-8 h-8 object-cover flex-shrink-0"
                    style={{ borderRadius: '4px' }}
                  />
                ) : (
                  <div
                    className="w-8 h-8 flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ borderRadius: '4px', background: '#1164A3' }}
                  >
                    {thread.displayName[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="font-bold text-[15px]" style={{ color: '#1D1C1D' }}>
                      {thread.displayName}
                    </span>
                    <span
                      className="text-[12px]"
                      style={{ color: '#616061' }}
                      title={formatFullDateTime(thread.createdAt)}
                    >
                      {formatMessageTime(thread.createdAt)}
                    </span>
                    {thread.editedAt && (
                      <span className="text-[11px] text-[#616061]">(編集済み)</span>
                    )}
                  </div>

                  {isEditing ? (
                    <div>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(thread); }
                          if (e.key === 'Escape') setEditingThreadId(null);
                        }}
                        className="w-full text-[15px] text-[#1D1C1D] resize-none focus:outline-none p-2 rounded"
                        style={{ border: '1px solid #1D9BD1', boxShadow: '0 0 0 1px #1D9BD1', minHeight: '60px', lineHeight: '1.46875' }}
                        autoFocus
                      />
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => handleEditSave(thread)}
                          className="px-2 py-1 text-[12px] text-white rounded"
                          style={{ background: '#007A5A' }}
                        >保存</button>
                        <button
                          onClick={() => setEditingThreadId(null)}
                          className="px-2 py-1 text-[12px] rounded border border-[#DDDDDD]"
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F0F0'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >キャンセル</button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[15px]" style={{ color: '#1D1C1D', lineHeight: '1.46875' }}>
                      {renderMarkdown(thread.text)}
                    </div>
                  )}

                  {/* Reactions on thread */}
                  {Object.keys(thread.reactions ?? {}).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(thread.reactions ?? {}).map(([emoji, uids]) =>
                        uids.length > 0 ? (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(thread.id, emoji)}
                            title={uids.map((uid) => users.find((u) => u.uid === uid)?.displayName ?? uid).join(', ')}
                            className="flex items-center gap-0.5 text-[12px] px-1.5 py-0.5 press-subtle"
                            style={{
                              borderRadius: '24px',
                              border: user && uids.includes(user.uid) ? '1.5px solid #1264A3' : '1px solid #DDDDDD',
                              background: user && uids.includes(user.uid) ? 'rgba(18,100,163,0.1)' : '#F4F4F4',
                              color: user && uids.includes(user.uid) ? '#1264A3' : '#616061',
                              fontWeight: user && uids.includes(user.uid) ? 600 : 400,
                            }}
                          >
                            <span>{emoji}</span>
                            <span className="font-semibold ml-0.5">{uids.length}</span>
                          </button>
                        ) : null
                      )}
                    </div>
                  )}
                </div>

                {/* Action toolbar */}
                {!isEditing && (
                  <div
                    className="absolute right-3 top-1 flex items-center gap-px opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E0E0E0',
                      borderRadius: '8px',
                      padding: '2px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.03)',
                    }}
                  >
                    {/* Reaction */}
                    <button
                      onClick={(e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setReactionAnchor((a) =>
                          a?.targetId === thread.id ? null : { rect, targetId: thread.id, isParent: false }
                        );
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-[#616061] press-subtle"
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F0F0'; e.currentTarget.style.color = '#1D1C1D'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#616061'; }}
                      title="リアクション"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75z" />
                      </svg>
                    </button>

                    {/* Edit */}
                    {isOwner && (
                      <button
                        onClick={() => handleEditStart(thread)}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-[#616061] press-subtle"
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F0F0'; e.currentTarget.style.color = '#1D1C1D'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#616061'; }}
                        title="編集"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                      </button>
                    )}

                    {/* Delete */}
                    {isOwner && (
                      <button
                        onClick={() => handleDelete(thread.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-[#616061] press-subtle"
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#FFF0F0'; e.currentTarget.style.color = '#E01E5A'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#616061'; }}
                        title="削除"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid #E8E8E8' }}>
        <div
          className="transition-all"
          style={{
            border: `1px solid ${hasText ? '#1D1C1D' : threadInputFocused ? '#1D9BD1' : '#DDDDDD'}`,
            borderRadius: '8px',
            boxShadow: hasText ? '0 0 0 1px #1D1C1D' : threadInputFocused ? '0 0 0 1px #1D9BD1' : 'none',
            transition: 'border-color 150ms, box-shadow 150ms',
          }}
        >
          {/* Mini formatting toolbar */}
          <div className="flex items-center gap-0.5 px-2 pt-1.5" style={{ borderBottom: '1px solid #F0F0F0' }}>
            {[
              { title: '太字 (Ctrl+B)', label: 'B', bold: true, action: () => wrapSelection('*') },
              { title: '斜体 (Ctrl+I)', label: 'I', italic: true, action: () => wrapSelection('_') },
              { title: '打ち消し線', label: 'S', strike: true, action: () => wrapSelection('~') },
            ].map(({ title, label, bold, italic, strike, action }) => (
              <button
                key={label}
                title={title}
                onMouseDown={(e) => { e.preventDefault(); action(); }}
                className="w-6 h-6 flex items-center justify-center rounded text-[12px] press-subtle"
                style={{ color: '#616061' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#EBEBEB'; e.currentTarget.style.color = '#1D1C1D'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#616061'; }}
              >
                <span style={{
                  fontWeight: bold ? 700 : 400,
                  fontStyle: italic ? 'italic' : 'normal',
                  textDecoration: strike ? 'line-through' : 'none',
                }}>{label}</span>
              </button>
            ))}
            <div className="w-px h-3.5 bg-[#DDDDDD] mx-0.5" />
            <button
              title="コード"
              onMouseDown={(e) => { e.preventDefault(); wrapSelection('`'); }}
              className="w-6 h-6 flex items-center justify-center rounded press-subtle"
              style={{ color: '#616061' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#EBEBEB'; e.currentTarget.style.color = '#1D1C1D'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#616061'; }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25" />
              </svg>
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setThreadInputFocused(true)}
            onBlur={() => setThreadInputFocused(false)}
            placeholder={`${channelLabel ? channelLabel + ' の' : ''}スレッドに返信...`}
            aria-label="スレッドへの返信を入力"
            rows={2}
            disabled={sending}
            className="w-full px-3 pt-2.5 pb-1 text-[15px] resize-none focus:outline-none bg-transparent placeholder-[#616061]"
            style={{ color: '#1D1C1D', minHeight: '44px', lineHeight: '1.46875' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 120) + 'px';
            }}
          />
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-0.5">
              {/* Emoji picker */}
              <button
                ref={inputEmojiRef}
                title="絵文字"
                onClick={() => {
                  const rect = inputEmojiRef.current?.getBoundingClientRect();
                  if (rect) setEmojiPickerOpen((p) => !p);
                }}
                className="w-7 h-7 flex items-center justify-center rounded text-[#616061] hover:text-[#1D1C1D] hover:bg-[#F0F0F0] transition-colors"
              >
                <span style={{ fontSize: '16px', lineHeight: 1 }}>😊</span>
              </button>
              {emojiPickerOpen && inputEmojiRef.current && (
                <EmojiPickerPortal
                  anchorRect={inputEmojiRef.current.getBoundingClientRect()}
                  onSelect={(emoji) => { setReplyText((t) => t + emoji); setEmojiPickerOpen(false); }}
                  onClose={() => setEmojiPickerOpen(false)}
                />
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={!hasText || sending}
              title={hasText ? '送信 (Enter)' : 'テキストを入力してください'}
              className="w-8 h-8 flex items-center justify-center rounded-lg press-strong"
              style={{
                background: hasText && !sending ? 'linear-gradient(135deg, #007A5A, #009E74)' : '#E8E8E8',
                color: hasText && !sending ? '#FFFFFF' : '#AAAAAA',
                cursor: hasText && !sending ? 'pointer' : 'not-allowed',
                boxShadow: hasText && !sending ? '0 2px 6px rgba(0,122,90,0.35)' : 'none',
                transition: 'background 200ms, box-shadow 200ms, transform 100ms, opacity 100ms',
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1 px-1">
          <p className="text-[12px]" style={{ color: '#616061' }}>
            <kbd className="font-mono px-1 rounded" style={{ background: '#F8F8F8', border: '1px solid #DDDDDD' }}>Enter</kbd> で送信・
            <kbd className="font-mono px-1 rounded" style={{ background: '#F8F8F8', border: '1px solid #DDDDDD' }}>Shift+Enter</kbd> で改行
          </p>
          {!isDM && (
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={alsoSendToChannel}
                onChange={(e) => setAlsoSendToChannel(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-[#1264A3] cursor-pointer"
              />
              <span className="text-[12px]" style={{ color: '#616061' }}>
                {channelLabel} にも送信
              </span>
            </label>
          )}
        </div>
      </div>
      {reactionAnchor && (
        <EmojiPickerPortal
          anchorRect={reactionAnchor.rect}
          onSelect={(emoji) => {
            handleReaction(reactionAnchor.targetId, emoji, reactionAnchor.isParent);
          }}
          onClose={() => setReactionAnchor(null)}
        />
      )}
    </div>
  );
}
