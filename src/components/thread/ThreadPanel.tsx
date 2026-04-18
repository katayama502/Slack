import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useThreads } from '../../hooks/useThreads';
import { sendThreadReply } from '../../services';
import { formatMessageTime, formatFullDateTime } from '../../utils/formatDate';
import { renderMarkdown } from '../../utils/markdown';
import { toast } from '../ui/Toast';

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

  const parentMessage = messages.find((m) => m.id === threadPanelMessageId);

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
      toast.error('返信の送信に失敗しました');
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

  const hasText = replyText.trim().length > 0;

  return (
    <div className="flex flex-col h-full" style={{ background: '#FFFFFF', borderLeft: '1px solid #E8E8E8' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ minHeight: '49px', borderBottom: '1px solid #E8E8E8' }}
      >
        <h3 className="font-bold text-[15px]" style={{ color: '#1D1C1D' }}>スレッド</h3>
        <button
          onClick={closeThreadPanel}
          title="閉じる"
          className="w-8 h-8 flex items-center justify-center rounded transition-colors"
          style={{ color: '#616061' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#F8F8F8'; e.currentTarget.style.color = '#1D1C1D'; }}
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
          <div className="px-4 py-4" style={{ borderBottom: '1px solid #E8E8E8' }}>
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
                    {formatMessageTime(parentMessage.createdAt)}
                  </span>
                </div>
                <div className="text-[14px] leading-relaxed" style={{ color: '#1D1C1D' }}>
                  {renderMarkdown(parentMessage.text)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reply count */}
        <div className="px-4 py-2.5">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-semibold" style={{ color: '#616061' }}>
              {threads.length}件の返信
            </span>
            <hr className="flex-1" style={{ borderColor: '#E8E8E8' }} />
          </div>
        </div>

        {/* Thread replies */}
        <div className="pb-4">
          {threads.map((thread) => (
            <div
              key={thread.id}
              className="flex gap-3 px-4 py-2 transition-colors group"
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#F8F8F8'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
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
                  <span className="font-bold text-[14px]" style={{ color: '#1D1C1D' }}>
                    {thread.displayName}
                  </span>
                  <span
                    className="text-[12px]"
                    style={{ color: '#616061' }}
                    title={formatFullDateTime(thread.createdAt)}
                  >
                    {formatMessageTime(thread.createdAt)}
                  </span>
                </div>
                <div className="text-[14px] leading-relaxed" style={{ color: '#1D1C1D' }}>
                  {renderMarkdown(thread.text)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid #E8E8E8' }}>
        <div
          className="transition-all"
          style={{
            border: '1px solid #DDDDDD',
            borderRadius: '8px',
            boxShadow: hasText ? '0 0 0 1px #1D1C1D' : undefined,
          }}
        >
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="返信を入力..."
            aria-label="スレッドへの返信を入力"
            rows={2}
            disabled={sending}
            className="w-full px-3 pt-3 pb-1 text-[14px] resize-none focus:outline-none bg-transparent leading-relaxed placeholder-[#616061]"
            style={{ color: '#1D1C1D', minHeight: '44px' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 120) + 'px';
            }}
          />
          <div className="flex items-center justify-end px-2 pb-2">
            <button
              onClick={handleSend}
              disabled={!hasText || sending}
              title="送信 (Enter)"
              className="w-8 h-8 flex items-center justify-center rounded transition-colors"
              style={{
                background: hasText && !sending ? '#007A5A' : '#DDDDDD',
                color: hasText && !sending ? '#FFFFFF' : '#999999',
                cursor: hasText && !sending ? 'pointer' : 'not-allowed',
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
        <p className="text-[12px] mt-1 px-1" style={{ color: '#616061' }}>
          <kbd className="font-mono px-1 rounded" style={{ background: '#F8F8F8', border: '1px solid #DDDDDD' }}>Enter</kbd> で送信・
          <kbd className="font-mono px-1 rounded" style={{ background: '#F8F8F8', border: '1px solid #DDDDDD' }}>Shift+Enter</kbd> で改行
        </p>
      </div>
    </div>
  );
}
