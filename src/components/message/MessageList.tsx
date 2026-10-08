import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAppStore } from '../../store/useAppStore';
import { useMessages } from '../../hooks/useMessages';
import { getVisitBeforeOpen } from '../../hooks/useUnreadChannels';
import MessageItem from './MessageItem';
import ChannelIntro from '../channel/ChannelIntro';
import { ChevronDownIcon, ArrowDownIcon, SearchIcon } from '../ui/icons';
import { formatDateDivider, isSameDay, isCompactMessage } from '../../utils/formatDate';
import type { Message } from '../../types';

// Row types for the virtual list
type IntroRow = { type: 'intro'; key: string; day: null };
type DateDividerRow = { type: 'divider'; date: string; key: string; day: number };
type UnreadDividerRow = { type: 'unread'; key: string; day: number };
type MessageRow = { type: 'message'; message: Message; isCompact: boolean; key: string; day: number };
type Row = IntroRow | DateDividerRow | UnreadDividerRow | MessageRow;

function dayStart(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function msgMillis(m: Message): number {
  return m.createdAt?.toMillis?.() ?? Date.now();
}

function buildRows(messages: Message[], lastVisitMs: number, withIntro: boolean, myUid?: string): Row[] {
  const rows: Row[] = [];
  if (withIntro) rows.push({ type: 'intro', key: 'intro', day: null });
  let unreadInserted = false;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prev = messages[i - 1];
    const day = dayStart(msgMillis(msg));

    // Date divider
    if (!prev || !isSameDay(prev.createdAt, msg.createdAt)) {
      rows.push({
        type: 'divider',
        date: formatDateDivider(msg.createdAt),
        key: `divider-${msg.id}`,
        day,
      });
    }

    // 未読ライン: lastVisit より新しい最初のメッセージの前に挿入
    if (
      !unreadInserted &&
      lastVisitMs > 0 &&
      msg.uid !== myUid &&   // 自分の投稿の前には「新着」を出さない（Slack 準拠）
      msg.createdAt &&
      msg.createdAt.toMillis() > lastVisitMs
    ) {
      rows.push({ type: 'unread', key: 'unread-divider', day });
      unreadInserted = true;
    }

    const compact = prev
      ? isCompactMessage(prev.createdAt, msg.createdAt, prev.uid, msg.uid)
      : false;

    rows.push({ type: 'message', message: msg, isCompact: compact, key: msg.id, day });
  }
  return rows;
}

// ─── Date pill (contract §7) ─────────────────────────────────────────────────
function DatePill({ label, onClick, raised }: { label: string; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; raised?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={`${label}（日付へ移動）`}
      className="inline-flex items-center gap-1 h-[28px] px-4 rounded-[24px] bg-white text-[13px] font-bold whitespace-nowrap hover:bg-[var(--sk-hover)]"
      style={{
        color: 'var(--sk-text)',
        border: '1px solid var(--sk-border)',
        boxShadow: raised ? '0 1px 3px rgba(0,0,0,0.08)' : undefined,
      }}
    >
      {label}
      <ChevronDownIcon className="w-3 h-3" style={{ color: 'var(--sk-text-2)' }} />
    </button>
  );
}

type JumpTarget = 'today' | 'yesterday' | 'week' | 'month' | 'first';

function JumpMenu({ anchor, onPick, onClose }: { anchor: DOMRect; onPick: (t: JumpTarget) => void; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const items: [JumpTarget, string][] = [
    ['today', '今日'],
    ['yesterday', '昨日'],
    ['week', '先週'],
    ['month', '先月'],
    ['first', '最初のメッセージ'],
  ];
  const width = 220;
  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        role="menu"
        className="fixed z-50 bg-white py-2"
        style={{
          top: anchor.bottom + 4,
          left: Math.max(8, Math.min(anchor.left + anchor.width / 2 - width / 2, window.innerWidth - width - 8)),
          width,
          border: '1px solid var(--sk-border)',
          borderRadius: 'var(--sk-radius-card)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          animation: 'popIn 120ms ease',
        }}
      >
        <p className="px-4 pb-1 text-[13px] font-bold" style={{ color: 'var(--sk-text-2)' }}>移動先…</p>
        {items.map(([key, label], i) => (
          <div key={key}>
            {i === 4 && <div className="my-2" style={{ borderTop: '1px solid var(--sk-border)' }} />}
            <button
              role="menuitem"
              onClick={() => onPick(key)}
              className="w-full h-[28px] px-4 text-left text-[15px] text-[color:var(--sk-text)] hover:bg-[var(--sk-link)] hover:text-white"
            >
              {label}
            </button>
          </div>
        ))}
      </div>
    </>,
    document.body
  );
}

export default function MessageList() {
  const allMessages = useMessages();
  const searchQuery = useAppStore((s) => s.searchQuery);
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const openThreadPanel = useAppStore((s) => s.openThreadPanel);
  const channelLoading = useAppStore((s) => s.channelLoading);
  const jumpToMessageId = useAppStore((s) => s.jumpToMessageId);
  const setJumpToMessageId = useAppStore((s) => s.setJumpToMessageId);
  const myUid = useAppStore((s) => s.auth.user?.uid);
  const searching = searchQuery.trim().length > 0;
  const messages = useMemo(
    () =>
      searching
        ? allMessages.filter((m) => m.text.toLowerCase().includes(searchQuery.trim().toLowerCase()))
        : allMessages,
    [allMessages, searchQuery, searching]
  );
  const parentRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const [showJumpBtn, setShowJumpBtn] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [jumpMenu, setJumpMenu] = useState<DOMRect | null>(null);

  // チャンネルを開く直前の lastVisit（チャンネル切替時に一度だけ確定させる）
  const lastVisitMs = useMemo(
    () => (activeChannelId ? getVisitBeforeOpen(activeChannelId) : 0),
    [activeChannelId]
  );

  const rows = useMemo(
    () => buildRows(messages, searching ? 0 : lastVisitMs, !searching, myUid),
    [messages, searching, lastVisitMs, myUid]
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(
      (index: number) => {
        const row = rows[index];
        if (!row) return 40;
        if (row.type === 'intro') return 240;
        if (row.type === 'divider') return 44;
        if (row.type === 'unread') return 24;
        return row.isCompact ? 26 : 60;
      },
      [rows]
    ),
    overscan: 10,
  });

  const scrollToBottom = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    // 計測で高さが変わる場合に備え 1 フレーム後にも追従
    requestAnimationFrame(() => {
      if (parentRef.current) parentRef.current.scrollTop = parentRef.current.scrollHeight;
    });
    isAtBottomRef.current = true;
    setNewCount(0);
    setShowJumpBtn(false);
  }, []);

  // Track if user is scrolled to bottom
  const handleScroll = () => {
    const el = parentRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = distFromBottom < 80;
    setShowJumpBtn(distFromBottom > 200);
    if (isAtBottomRef.current) setNewCount(0);
  };

  // 新着カウント（上にスクロール中に届いたメッセージ数）
  const prevLenRef = useRef(allMessages.length);
  useEffect(() => {
    const delta = allMessages.length - prevLenRef.current;
    prevLenRef.current = allMessages.length;
    if (delta <= 0) return;
    const last = allMessages[allMessages.length - 1];
    if (last && last.uid === myUid) {
      // 自分の投稿は常に最下部へ
      requestAnimationFrame(() => scrollToBottom());
      return;
    }
    if (!isAtBottomRef.current) setNewCount((c) => c + delta);
  }, [allMessages, myUid, scrollToBottom]);

  // Auto-scroll to bottom when new messages arrive and user is at bottom
  useEffect(() => {
    if (isAtBottomRef.current && parentRef.current && !useAppStore.getState().jumpToMessageId) {
      requestAnimationFrame(() => {
        if (parentRef.current) parentRef.current.scrollTop = parentRef.current.scrollHeight;
      });
    }
  }, [messages.length]);

  // Initial scroll to bottom / reset when channel changes
  useEffect(() => {
    setNewCount(0);
    setJumpMenu(null);
    prevLenRef.current = useAppStore.getState().messages[activeChannelId ?? '']?.length ?? 0;
    if (parentRef.current && !useAppStore.getState().jumpToMessageId) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
      isAtBottomRef.current = true;
    }
  }, [activeChannelId]);

  // Jump to a specific message (shared link URL / ピン / ファイル タブ)
  useEffect(() => {
    if (!jumpToMessageId || messages.length === 0) return;
    const rowIdx = rows.findIndex((r) => r.type === 'message' && r.message.id === jumpToMessageId);
    if (rowIdx === -1) return;
    isAtBottomRef.current = false;
    virtualizer.scrollToIndex(rowIdx, { align: 'center' });
    // 計測後に再度位置合わせ
    const raf = requestAnimationFrame(() => virtualizer.scrollToIndex(rowIdx, { align: 'center' }));
    setHighlightedMessageId(jumpToMessageId);
    setJumpToMessageId(null);
    const t = setTimeout(() => setHighlightedMessageId(null), 2000);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpToMessageId, messages.length]);

  // ── 日付ジャンプ ──
  const handleJump = (target: JumpTarget) => {
    setJumpMenu(null);
    if (target === 'first') {
      virtualizer.scrollToIndex(0, { align: 'start' });
      return;
    }
    const today = dayStart(Date.now());
    const d = new Date(today);
    if (target === 'yesterday') d.setDate(d.getDate() - 1);
    else if (target === 'week') d.setDate(d.getDate() - 7);
    else if (target === 'month') d.setMonth(d.getMonth() - 1);
    const threshold = d.getTime();
    const idx = rows.findIndex((r) => r.type === 'message' && msgMillis(r.message) >= threshold);
    if (idx === -1) {
      scrollToBottom();
      return;
    }
    // 直前に日付区切りがあればそこから表示
    const startIdx = idx > 0 && rows[idx - 1].type === 'divider' ? idx - 1 : idx;
    isAtBottomRef.current = false;
    virtualizer.scrollToIndex(startIdx, { align: 'start' });
  };

  // ── Sticky 日付ピル（仮想リストのため、先頭に見えている行の日付をオーバーレイ表示） ──
  const virtualItems = virtualizer.getVirtualItems();
  const scrollOffset = virtualizer.scrollOffset ?? 0;
  let stickyLabel: string | null = null;
  {
    const first = virtualItems.find((vi) => vi.end > scrollOffset + 4);
    const row = first ? rows[first.index] : undefined;
    if (row && row.day !== null && scrollOffset > 0) {
      // 同じ日の区切りが先頭付近に見えている場合はインラインのピルを優先
      const dividerVisibleAtTop = virtualItems.some((vi) => {
        const r = rows[vi.index];
        return r?.type === 'divider' && vi.start >= scrollOffset - 8 && vi.start <= scrollOffset + 36;
      });
      if (!dividerVisibleAtTop) {
        const sample = rows.find((r): r is MessageRow => r.type === 'message' && r.day === row.day);
        stickyLabel = sample ? formatDateDivider(sample.message.createdAt) : null;
      }
    }
  }

  // Show skeleton while first load
  if (channelLoading && allMessages.length === 0) {
    return (
      <div className="flex-1 flex flex-col justify-end px-5 pb-3 gap-5" aria-busy="true" aria-label="メッセージを読み込み中">
        {[72, 48, 90, 36, 60].map((w, i) => {
          const pulse = { background: 'var(--sk-subtle)', animation: 'skeletonPulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.1}s` };
          return (
            <div key={i} className="flex gap-2 items-start">
              <div className="w-9 h-9 rounded-lg flex-shrink-0" style={pulse} />
              <div className="flex-1 flex flex-col gap-2 pt-1">
                <div className="h-3 rounded" style={{ ...pulse, width: '120px' }} />
                <div className="h-3 rounded" style={{ ...pulse, width: `${w}%` }} />
                {w > 60 && <div className="h-3 rounded" style={{ ...pulse, width: `${w - 25}%` }} />}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (messages.length === 0) {
    // 検索中でゼロ件
    if (searching) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-5 text-center">
          <SearchIcon className="w-10 h-10 mb-1" style={{ color: 'var(--sk-text-3)' }} />
          <p className="text-[15px] font-bold" style={{ color: 'var(--sk-text)' }}>「{searchQuery}」に一致するメッセージはありません</p>
          <p className="text-[13px]" style={{ color: 'var(--sk-text-2)' }}>別のキーワードで検索してみてください</p>
        </div>
      );
    }
    return (
      <div className="flex-1 flex flex-col justify-end overflow-y-auto">
        {activeChannelId && <ChannelIntro channelId={activeChannelId} />}
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
        <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
          {virtualItems.map((virtualItem) => {
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
                {row.type === 'intro' ? (
                  activeChannelId && <ChannelIntro channelId={activeChannelId} />
                ) : row.type === 'divider' ? (
                  <div className="relative flex items-center justify-center h-[44px]" role="separator" aria-label={row.date}>
                    <div className="absolute left-0 right-0 top-1/2 h-px" style={{ background: 'var(--sk-border)' }} />
                    <div className="relative">
                      <DatePill label={row.date} onClick={(e) => setJumpMenu(e.currentTarget.getBoundingClientRect())} />
                    </div>
                  </div>
                ) : row.type === 'unread' ? (
                  <div className="relative flex items-center justify-end h-[24px] pr-5" role="separator" aria-label="新着">
                    <div className="absolute left-0 right-0 top-1/2 h-px" style={{ background: 'var(--sk-red)' }} />
                    <span className="relative bg-white pl-1.5 text-[12px] font-bold leading-none" style={{ color: 'var(--sk-red)' }}>
                      新着
                    </span>
                  </div>
                ) : (
                  <div
                    style={
                      highlightedMessageId === row.message.id
                        ? { animation: 'msgFlash 2s ease-out' }
                        : undefined
                    }
                  >
                    <MessageItem
                      message={row.message}
                      isCompact={row.isCompact}
                      onThreadClick={openThreadPanel}
                      searchQuery={searchQuery}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky date pill overlay */}
      {stickyLabel && (
        <div className="absolute top-[8px] left-0 right-0 flex justify-center pointer-events-none z-[5]">
          <div className="pointer-events-auto">
            <DatePill raised label={stickyLabel} onClick={(e) => setJumpMenu(e.currentTarget.getBoundingClientRect())} />
          </div>
        </div>
      )}

      {jumpMenu && <JumpMenu anchor={jumpMenu} onPick={handleJump} onClose={() => setJumpMenu(null)} />}

      {/* Jump to latest */}
      {(showJumpBtn || newCount > 0) && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 h-[32px] px-3.5 rounded-full bg-white text-[13px] font-bold z-10 hover:bg-[var(--sk-hover)]"
          style={{
            color: newCount > 0 ? 'var(--sk-link)' : 'var(--sk-text)',
            border: '1px solid var(--sk-border)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            animation: 'fadeIn 200ms ease',
          }}
        >
          <ArrowDownIcon className="w-3.5 h-3.5" />
          {newCount > 0 ? `新着メッセージ ${newCount} 件` : '最新のメッセージ'}
        </button>
      )}
    </div>
  );
}
