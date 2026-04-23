import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAppStore } from '../../store/useAppStore';
import { useMessages } from '../../hooks/useMessages';
import { getLastVisit } from '../../hooks/useUnreadChannels';
import MessageItem from './MessageItem';
import { formatDateDivider, isSameDay, isCompactMessage } from '../../utils/formatDate';
import type { Message, User } from '../../types';

// Row types for the virtual list
type DateDividerRow = { type: 'divider'; date: string; key: string };
type UnreadDividerRow = { type: 'unread'; key: string };
type MessageRow = { type: 'message'; message: Message; isCompact: boolean; key: string };
type Row = DateDividerRow | UnreadDividerRow | MessageRow;

function buildRows(messages: Message[], lastVisitMs: number): Row[] {
  const rows: Row[] = [];
  let unreadInserted = false;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prev = messages[i - 1];

    // Date divider
    if (!prev || !isSameDay(prev.createdAt, msg.createdAt)) {
      rows.push({
        type: 'divider',
        date: formatDateDivider(msg.createdAt),
        key: `divider-${msg.id}`,
      });
    }

    // 未読ライン: lastVisit より新しい最初のメッセージの前に挿入
    if (
      !unreadInserted &&
      lastVisitMs > 0 &&
      msg.createdAt &&
      msg.createdAt.toMillis() > lastVisitMs
    ) {
      rows.push({ type: 'unread', key: 'unread-divider' });
      unreadInserted = true;
    }

    const compact = prev
      ? isCompactMessage(prev.createdAt, msg.createdAt, prev.uid, msg.uid)
      : false;

    rows.push({
      type: 'message',
      message: msg,
      isCompact: compact,
      key: msg.id,
    });
  }
  return rows;
}

function EmptyChannelState({ channelId }: { channelId: string }) {
  const channels = useAppStore((s) => s.channels);
  const users = useAppStore((s) => s.users);
  const { user } = useAppStore((s) => s.auth);
  const channel = channels.find((c) => c.id === channelId);

  if (!channel) return null;

  const isDM = channel.name.startsWith('__dm__');
  const otherUser: User | undefined = isDM
    ? users.find((u) => u.uid !== user?.uid && channel.members?.includes(u.uid))
    : undefined;
  const isSelfDM = isDM && !otherUser && user;
  const selfUser: User | undefined = isSelfDM ? users.find((u) => u.uid === user?.uid) : undefined;

  if (isSelfDM) {
    return (
      <div className="flex flex-col justify-end px-5 pb-4 pt-8">
        <div className="flex items-center gap-4 mb-4">
          {selfUser?.photoURL ? (
            <img src={selfUser.photoURL} alt={selfUser.displayName} className="w-16 h-16 rounded-lg object-cover" style={{ border: '3px solid #F0F0F0' }} />
          ) : (
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center text-white text-2xl font-bold"
              style={{ background: '#1164A3' }}
            >
              {(selfUser?.displayName ?? '?')[0].toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="text-[22px] font-bold text-[#1D1C1D] leading-tight">
              {selfUser?.displayName ?? 'あなた'} <span className="text-[16px] text-[#616061] font-normal">(自分)</span>
            </h3>
            <p className="text-[14px] text-[#007A5A] mt-0.5">アクティブ</p>
          </div>
        </div>
        <p className="text-[15px] text-[#616061] leading-relaxed">
          これは自分自身へのスペースです。<br />
          メモ、リンク、ファイルなどを保存するのに使いましょう。
        </p>
      </div>
    );
  }

  if (isDM && otherUser) {
    return (
      <div className="flex flex-col justify-end px-5 pb-4 pt-8">
        <div className="flex items-center gap-4 mb-4">
          {otherUser.photoURL ? (
            <img src={otherUser.photoURL} alt={otherUser.displayName} className="w-16 h-16 rounded-lg object-cover" />
          ) : (
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center text-white text-2xl font-bold"
              style={{ background: '#1164A3' }}
            >
              {otherUser.displayName[0].toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="text-[22px] font-bold text-[#1D1C1D] leading-tight">{otherUser.displayName}</h3>
            <p className="text-[14px] text-[#616061] mt-0.5">
              {otherUser.email && <span>{otherUser.email} · </span>}
              <span className={otherUser.online ? 'text-[#007A5A]' : 'text-[#616061]'}>
                {otherUser.online ? 'アクティブ' : 'オフライン'}
              </span>
            </p>
          </div>
        </div>
        <p className="text-[15px] text-[#616061] leading-relaxed">
          これは <strong className="text-[#1D1C1D]">{otherUser.displayName}</strong> との会話の始まりです。
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-end px-5 pb-4 pt-8">
      <div
        className="w-14 h-14 flex items-center justify-center rounded-lg mb-3 text-white font-bold text-2xl"
        style={{ background: '#3F0E40' }}
      >
        #
      </div>
      <h3 className="text-[22px] font-bold text-[#1D1C1D] mb-1">#{channel.name} へようこそ</h3>
      {channel.description && (
        <p className="text-[15px] text-[#616061] mb-2">{channel.description}</p>
      )}
      <p className="text-[14px] text-[#616061]">
        これは <strong className="text-[#1D1C1D]">#{channel.name}</strong> チャンネルの最初のメッセージです。ぜひ会話を始めましょう！
      </p>
    </div>
  );
}

export default function MessageList() {
  const allMessages = useMessages();
  const searchQuery = useAppStore((s) => s.searchQuery);
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const openThreadPanel = useAppStore((s) => s.openThreadPanel);
  const messages = searchQuery.trim()
    ? allMessages.filter((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : allMessages;
  const parentRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const [showJumpBtn, setShowJumpBtn] = useState(false);

  // チャンネル変更前の lastVisit をキャプチャ（変更後に mark されるため useRef で保持）
  const lastVisitRef = useRef<number>(0);
  useEffect(() => {
    lastVisitRef.current = activeChannelId ? getLastVisit(activeChannelId) : 0;
  }, [activeChannelId]);

  const rows = useMemo(() => buildRows(messages, lastVisitRef.current), [messages]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(
      (index: number) => {
        const row = rows[index];
        if (!row) return 40;
        if (row.type === 'divider') return 36;
        if (row.type === 'unread') return 32;
        return row.isCompact ? 28 : 64;
      },
      [rows]
    ),
    overscan: 10,
  });

  const scrollToBottom = () => {
    if (parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
    }
  };

  // Track if user is scrolled to bottom
  const handleScroll = () => {
    const el = parentRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = distFromBottom < 80;
    setShowJumpBtn(distFromBottom > 200);
  };

  // Auto-scroll to bottom when new messages arrive and user is at bottom
  useEffect(() => {
    if (isAtBottomRef.current && parentRef.current) {
      // Defer to allow virtualizer to measure
      requestAnimationFrame(() => {
        if (parentRef.current) {
          parentRef.current.scrollTop = parentRef.current.scrollHeight;
        }
      });
    }
  }, [messages.length]);

  // Initial scroll to bottom
  useEffect(() => {
    if (parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
      isAtBottomRef.current = true;
    }
  }, []);

  // Reset scroll when channel changes
  useEffect(() => {
    if (parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
      isAtBottomRef.current = true;
    }
  }, [activeChannelId]);

  if (messages.length === 0) {
    // 検索中でゼロ件
    if (searchQuery.trim()) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-5">
          <svg className="w-12 h-12 text-[#DDDDDD]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <p className="text-[15px] font-bold text-[#1D1C1D]">「{searchQuery}」に一致するメッセージはありません</p>
          <p className="text-[13px] text-[#616061]">別のキーワードで検索してみてください</p>
        </div>
      );
    }
    return (
      <div className="flex-1 flex flex-col justify-end">
        {activeChannelId && <EmptyChannelState channelId={activeChannelId} />}
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-0">
    <div
      ref={parentRef}
      role="log"
      aria-label="メッセージ一覧"
      aria-live="polite"
      onScroll={handleScroll}
      className="h-full overflow-y-auto"
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const row = rows[virtualItem.index];
          if (!row) return null;

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {row.type === 'divider' ? (
                <div className="flex items-center gap-3 px-5 py-3">
                  <hr className="flex-1" style={{ borderColor: '#DDDDDD' }} />
                  <span
                    className="text-[12px] font-bold px-3 py-0.5"
                    style={{
                      color: '#616061',
                      border: '1px solid #DDDDDD',
                      borderRadius: '24px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.date}
                  </span>
                  <hr className="flex-1" style={{ borderColor: '#DDDDDD' }} />
                </div>
              ) : row.type === 'unread' ? (
                <div className="flex items-center gap-3 px-5 py-2">
                  <hr className="flex-1" style={{ borderColor: '#E01E5A' }} />
                  <span
                    className="text-[11px] font-bold px-2.5 py-0.5 text-white"
                    style={{
                      background: '#E01E5A',
                      borderRadius: '24px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    新着メッセージ
                  </span>
                  <hr className="flex-1" style={{ borderColor: '#E01E5A' }} />
                </div>
              ) : (
                <MessageItem
                  message={row.message}
                  isCompact={row.isCompact}
                  onThreadClick={openThreadPanel}
                  searchQuery={searchQuery}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>

    {/* Jump to bottom button */}
    {showJumpBtn && (
      <button
        onClick={scrollToBottom}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-white z-10 press-strong"
        style={{
          background: 'linear-gradient(135deg, #1164A3, #1A7AC4)',
          boxShadow: '0 4px 16px rgba(17,100,163,0.4), 0 1px 4px rgba(0,0,0,0.15)',
          animation: 'fadeIn 200ms ease',
        }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        最新メッセージへ
      </button>
    )}
    </div>
  );
}
