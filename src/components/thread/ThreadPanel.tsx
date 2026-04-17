import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useThreads } from '../../hooks/useThreads';
import { sendThreadReply } from '../../services';
import { formatMessageTime } from '../../utils/formatDate';

export default function ThreadPanel() {
  const { user } = useAppStore((s) => s.auth);
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const threadPanelMessageId = useAppStore((s) => s.threadPanelMessageId);
  const closeThreadPanel = useAppStore((s) => s.closeThreadPanel);
  const messages = useAppStore((s) =>
    activeChannelId ? (s.messages[activeChannelId] ?? []) : []
  );

  const threads = useThreads();
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Find parent message
  const parentMessage = messages.find((m) => m.id === threadPanelMessageId);

  // Auto scroll to bottom on new thread replies
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads.length]);

  const handleSend = async () => {
    if (!activeChannelId || !threadPanelMessageId || !user || !replyText.trim() || sending) return;
    const trimmed = replyText.trim();
    setSending(true);
    setReplyText('');
    try {
      await sendThreadReply(activeChannelId, threadPanelMessageId, trimmed, user);
    } catch (err) {
      console.error('Thread reply error:', err);
      setReplyText(trimmed);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-channel-border flex-shrink-0">
        <h3 className="font-bold text-gray-900 text-base">スレッド</h3>
        <button
          onClick={closeThreadPanel}
          title="閉じる"
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors text-xl"
        >
          &times;
        </button>
      </div>

      {/* Scroll area */}
      <div className="flex-1 overflow-y-auto">
        {/* Parent message */}
        {parentMessage && (
          <div className="px-4 py-4 border-b border-channel-border">
            <div className="flex gap-2">
              {parentMessage.photoURL ? (
                <img
                  src={parentMessage.photoURL}
                  alt={parentMessage.displayName}
                  className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {parentMessage.displayName[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <div>
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="font-bold text-gray-900 text-sm">
                    {parentMessage.displayName}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatMessageTime(parentMessage.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                  {parentMessage.text}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Replies count */}
        <div className="px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500">
              {threads.length}件の返信
            </span>
            <hr className="flex-1 border-gray-200" />
          </div>
        </div>

        {/* Thread replies */}
        <div className="pb-4">
          {threads.map((thread) => (
            <div key={thread.id} className="flex gap-2 px-4 py-2 hover:bg-message-hover transition-colors group">
              {thread.photoURL ? (
                <img
                  src={thread.photoURL}
                  alt={thread.displayName}
                  className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {thread.displayName[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="font-bold text-gray-900 text-sm">
                    {thread.displayName}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatMessageTime(thread.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                  {thread.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div className="px-4 py-3 border-t border-channel-border flex-shrink-0">
        <div className="border border-gray-300 rounded-lg focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-colors">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="返信を入力..."
            rows={2}
            disabled={sending}
            className="w-full px-3 py-2 text-sm text-gray-900 resize-none focus:outline-none bg-transparent leading-relaxed"
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 120) + 'px';
            }}
          />
          <div className="flex items-center justify-end px-2 pb-2">
            <button
              onClick={handleSend}
              disabled={!replyText.trim() || sending}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                replyText.trim() && !sending
                  ? 'bg-accent text-white hover:bg-blue-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
