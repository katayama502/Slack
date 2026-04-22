import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useThreads } from '../../hooks/useThreads';
import { sendThreadReply, toggleReaction } from '../../services';
import { formatMessageTime, formatFullDateTime } from '../../utils/formatDate';
import { renderMarkdown } from '../../utils/markdown';
import { toast } from '../ui/Toast';

const EMOJI_LIST = ['👍', '❤️', '😂', '🎉', '🔥', '👀', '✅', '🙏', '💪', '😊'];
const THREAD_EMOJI = ['😀','😂','🥰','😎','🤔','😅','😭','🎉','👍','👏','🔥','❤️','✅','🚀','💡','🙏','😊','👀','💪','🤝'];

export default function ThreadPanel() {
  const { user } = useAppStore((s) => s.auth);
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
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [showReactionFor, setShowReactionFor] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  const handleReaction = async (messageId: string, emoji: string, isParent = false) => {
    if (!user || !activeChannelId) return;
    try {
      const targetMsg = isParent
        ? messages.find((m) => m.id === messageId)
        : threads.find((t) => t.id === messageId);
      const currentReactions = (targetMsg as any)?.reactions ?? {};
      await toggleReaction(activeChannelId, isParent ? messageId : threadPanelMessageId!, emoji, user.uid, currentReactions);
    } catch (err) {
      console.error('Reaction error:', err);
    }
    setShowReactionFor(null);
  };

  const hasText = replyText.trim().length > 0;

  return (
    <div className="flex flex-col h-full" style={{ background: '#FFFFFF', borderLeft: '1px solid #E8E8E8' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ minHeight: '49px', borderBottom: '1px solid #E8E8E8' }}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-[15px]" style={{ color: '#1D1C1D' }}>スレッド</h3>
          {channelLabel && (
            <span className="text-[12px] text-[#616061]">{channelLabel}</span>
          )}
        </div>
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
          <div
            className="px-4 py-4 group relative"
            style={{ borderBottom: '1px solid #E8E8E8' }}
            onMouseLeave={() => setShowReactionFor(null)}
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
                    {formatMessageTime(parentMessage.createdAt)}
                  </span>
                </div>
                <div className="text-[14px] leading-relaxed" style={{ color: '#1D1C1D' }}>
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
                          className="flex items-center gap-0.5 text-[12px] px-1.5 py-0.5 transition-colors"
                          style={{
                            borderRadius: '24px',
                            border: user && uids.includes(user.uid) ? '1px solid #1264A3' : '1px solid #DDDDDD',
                            background: user && uids.includes(user.uid) ? '#E8F5FA' : '#F8F8F8',
                            color: user && uids.includes(user.uid) ? '#1264A3' : '#616061',
                          }}
                        >
                          <span>{emoji}</span>
                          <span className="font-medium ml-0.5">{uids.length}</span>
                        </button>
                      ) : null
                    )}
                  </div>
                )}
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
              className="relative flex gap-3 px-4 py-2 transition-colors group"
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#F8F8F8'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; setShowReactionFor(null); }}
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

              {/* Thread reply reaction button */}
              <div
                className="absolute right-3 top-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <div className="relative">
                  <button
                    onClick={() => setShowReactionFor(showReactionFor === thread.id ? null : thread.id)}
                    className="w-7 h-7 flex items-center justify-center rounded text-[#616061] hover:text-[#1D1C1D] transition-colors"
                    style={{ background: '#FFFFFF', border: '1px solid #DDDDDD', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}
                    title="リアクション"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75z" />
                    </svg>
                  </button>
                  {showReactionFor === thread.id && (
                    <div
                      className="absolute right-0 top-8 flex gap-0.5 p-1.5 z-20"
                      style={{ background: '#FFFFFF', border: '1px solid #DDDDDD', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                    >
                      {EMOJI_LIST.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(thread.id, emoji)}
                          className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F8F8F8] text-[18px]"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
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
            placeholder={`${channelLabel ? channelLabel + ' の' : ''}スレッドに返信...`}
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
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-0.5 relative">
              {/* Emoji picker */}
              <button
                title="絵文字"
                onClick={() => setEmojiPickerOpen((p) => !p)}
                className="w-7 h-7 flex items-center justify-center rounded text-[#616061] hover:text-[#1D1C1D] hover:bg-[#F0F0F0] transition-colors"
              >
                <span style={{ fontSize: '16px', lineHeight: 1 }}>😊</span>
              </button>
              {emojiPickerOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setEmojiPickerOpen(false)} />
                  <div
                    className="absolute bottom-9 left-0 z-40 p-2"
                    style={{ background: '#FFFFFF', border: '1px solid #DDDDDD', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', width: '220px' }}
                  >
                    <p className="text-[11px] font-bold text-[#616061] uppercase tracking-wide px-1 mb-1.5">絵文字</p>
                    <div className="grid grid-cols-10 gap-0.5">
                      {THREAD_EMOJI.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => { setReplyText((t) => t + emoji); setEmojiPickerOpen(false); }}
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#F8F8F8] text-[16px]"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
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
