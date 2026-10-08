// ─────────────────────────────────────────────────────────────────────────────
// Slack 風スレッド概要行（「N 件の返信  最終返信: 今日 15:01」）
//   <ThreadSummary count={3} participants={uids} lastReplyAt={ts} users={users} onClick={...} />
// ホバーで白背景 + 枠 + 角丸 8px、右端に「スレッドを表示 ›」
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { format, isToday, isYesterday, isThisYear } from 'date-fns';
import type { User } from '../../types';
import Avatar from '../ui/Avatar';
import { CaretRightIcon } from '../ui/icons';

/** 「今日 15:01」「昨日 09:43」「10月2日」（年が違えば「2025年10月2日」） */
export function formatLastReply(ts: Timestamp | null | undefined): string {
  if (!ts) return '';
  const d = ts.toDate();
  if (isToday(d)) return `今日 ${format(d, 'HH:mm')}`;
  if (isYesterday(d)) return `昨日 ${format(d, 'HH:mm')}`;
  return isThisYear(d) ? format(d, 'M月d日') : format(d, 'yyyy年M月d日');
}

export interface ThreadSummaryProps {
  count: number;
  participants?: string[];
  lastReplyAt?: Timestamp | null;
  users: User[];
  onClick: () => void;
}

export default function ThreadSummary({ count, participants = [], lastReplyAt, users, onClick }: ThreadSummaryProps) {
  const [hover, setHover] = useState(false);
  const people = participants
    .slice(0, 3)
    .map((uid) => users.find((u) => u.uid === uid))
    .filter((u): u is User => !!u);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex items-center w-full text-left mt-1"
      style={{
        maxWidth: 600,
        minHeight: 34,
        padding: '4px 4px',
        marginLeft: -5,
        borderRadius: 8,
        background: hover ? '#FFFFFF' : 'transparent',
        boxShadow: hover ? 'inset 0 0 0 1px var(--sk-border)' : 'none',
        transition: 'background 80ms, box-shadow 80ms',
      }}
    >
      {people.length > 0 && (
        <span className="flex items-center gap-1 mr-2 flex-shrink-0">
          {people.map((u) => (
            <Avatar key={u.uid} name={u.displayName} photoURL={u.photoURL} size={24} radius={6} />
          ))}
        </span>
      )}
      <span className="text-[13px] font-bold flex-shrink-0" style={{ color: 'var(--sk-link)' }}>
        {count} 件の返信
      </span>
      {lastReplyAt && (
        <span className="text-[13px] ml-2 truncate" style={{ color: 'var(--sk-text-2)' }}>
          最終返信: {formatLastReply(lastReplyAt)}
        </span>
      )}
      {hover && (
        <span className="ml-auto flex items-center text-[13px] flex-shrink-0 pl-2" style={{ color: 'var(--sk-text-2)' }}>
          スレッドを表示
          <CaretRightIcon className="w-4 h-4" />
        </span>
      )}
    </button>
  );
}
