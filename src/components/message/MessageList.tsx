import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAppStore } from '../../store/useAppStore';
import { useMessages } from '../../hooks/useMessages';
import MessageItem from './MessageItem';
import { formatDateDivider, isSameDay, isCompactMessage } from '../../utils/formatDate';
import type { Message } from '../../types';

// Row types for the virtual list
type DateDividerRow = { type: 'divider'; date: string; key: string };
type MessageRow = { type: 'message'; message: Message; isCompact: boolean; key: string };
type Row = DateDividerRow | MessageRow;

function buildRows(messages: Message[]): Row[] {
  const rows: Row[] = [];
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

export default function MessageList() {
  const allMessages = useMessages();
  const searchQuery = useAppStore((s) => s.searchQuery);
  const openThreadPanel = useAppStore((s) => s.openThreadPanel);
  const messages = searchQuery.trim()
    ? allMessages.filter((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : allMessages;
  const parentRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const [showJumpBtn, setShowJumpBtn] = useState(false);

  const rows = useMemo(() => buildRows(messages), [messages]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(
      (index: number) => {
        const row = rows[index];
        if (!row) return 40;
        if (row.type === 'divider') return 36;
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
  const activeChannelId = useAppStore((s) => s.activeChannelId);
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
      <div className="flex-1 flex flex-col justify-end px-5 pb-4">
        <div
          className="w-12 h-12 flex items-center justify-center rounded mb-3 text-white font-bold text-2xl"
          style={{ background: '#3F0E40' }}
        >
          #
        </div>
        <h3 className="text-[22px] font-bold text-[#1D1C1D] mb-1">
          このチャンネルへようこそ
        </h3>
        <p className="text-[15px] text-[#616061]">
          このチャンネルの最初のメッセージです。ぜひ会話を始めてみましょう！
        </p>
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
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium text-white shadow-lg transition-all z-10"
        style={{ background: '#1164A3' }}
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
