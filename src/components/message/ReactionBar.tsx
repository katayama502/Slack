// ─────────────────────────────────────────────────────────────────────────────
// Slack 風リアクションバー（MessageItem / ThreadPanel 共通）
//   <ReactionBar reactions={msg.reactions} currentUid={me.uid} users={users}
//                onToggle={(emoji) => toggle(emoji)} />
// - 24px ピル・角丸 12px・絵文字 16px + 数 12px
// - 自分がリアクション済み: --sk-mention-bg + inset 1px --sk-blue、数は --sk-link bold
// - ホバーで「<名前> が :emoji: でリアクションしました」ツールチップ
// - 末尾に絵文字追加ピル（EmojiPicker をポータル表示）
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef } from 'react';
import type { User } from '../../types';
import { EmojiAddIcon } from '../ui/icons';
import { emojiName } from '../ui/EmojiPicker';
import { Tooltip, EmojiPickerPortal } from './overlays';

export interface ReactionBarProps {
  reactions: Record<string, string[]> | undefined;
  currentUid?: string;
  users: User[];
  onToggle: (emoji: string) => void;
  /** false で末尾の追加ピルを隠す（既定 true） */
  showAddButton?: boolean;
  className?: string;
}

/** 「A、B、あなた が :+1: でリアクションしました」 */
export function reactionTooltipText(emoji: string, uids: string[], users: User[], currentUid?: string): string {
  const names = uids.map((uid) =>
    uid === currentUid ? 'あなた' : users.find((u) => u.uid === uid)?.displayName ?? '不明なユーザー'
  );
  // 「あなた」は末尾に寄せる（Slack と同じ）
  const sorted = [...names.filter((n) => n !== 'あなた'), ...names.filter((n) => n === 'あなた')];
  const MAX = 10;
  const shown = sorted.slice(0, MAX).join('、');
  const rest = sorted.length > MAX ? ` 他 ${sorted.length - MAX} 人` : '';
  return `${shown}${rest} が ${emojiName(emoji)} でリアクションしました`;
}

const pillBase: React.CSSProperties = {
  height: 24,
  borderRadius: 12,
  padding: '0 6px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  transition: 'background 80ms, box-shadow 80ms',
};

export default function ReactionBar({
  reactions,
  currentUid,
  users,
  onToggle,
  showAddButton = true,
  className = '',
}: ReactionBarProps) {
  const [pickerAnchor, setPickerAnchor] = useState<DOMRect | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);

  const entries = Object.entries(reactions ?? {}).filter(([, uids]) => Array.isArray(uids) && uids.length > 0);
  if (entries.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1 mt-1 ${className}`}>
      {entries.map(([emoji, uids]) => {
        const mine = !!currentUid && uids.includes(currentUid);
        const restBg = mine ? 'var(--sk-mention-bg)' : 'var(--sk-subtle)';
        const restShadow = mine ? 'inset 0 0 0 1px var(--sk-blue)' : 'none';
        return (
          <Tooltip
            key={emoji}
            label={
              <span className="flex flex-col items-center gap-1" style={{ fontWeight: 400 }}>
                <span style={{ fontSize: 32, lineHeight: '36px' }}>{emoji}</span>
                <span>{reactionTooltipText(emoji, uids, users, currentUid)}</span>
              </span>
            }
          >
            <button
              type="button"
              onClick={() => onToggle(emoji)}
              aria-pressed={mine}
              aria-label={reactionTooltipText(emoji, uids, users, currentUid)}
              style={{ ...pillBase, background: restBg, boxShadow: restShadow }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = mine ? 'var(--sk-mention-bg)' : '#FFFFFF';
                e.currentTarget.style.boxShadow = mine ? 'inset 0 0 0 1px var(--sk-blue)' : 'inset 0 0 0 1px var(--sk-border-strong)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = restBg;
                e.currentTarget.style.boxShadow = restShadow;
              }}
            >
              <span style={{ fontSize: 16, lineHeight: '16px' }}>{emoji}</span>
              <span
                style={{
                  fontSize: 12,
                  lineHeight: '16px',
                  fontWeight: mine ? 700 : 400,
                  color: mine ? 'var(--sk-link)' : 'var(--sk-text)',
                  minWidth: 6,
                }}
              >
                {uids.length}
              </span>
            </button>
          </Tooltip>
        );
      })}

      {showAddButton && (
        <Tooltip label="リアクションを追加する" disabled={!!pickerAnchor}>
          <button
            ref={addRef}
            type="button"
            aria-label="リアクションを追加する"
            onClick={() => {
              const r = addRef.current?.getBoundingClientRect();
              if (r) setPickerAnchor((a) => (a ? null : r));
            }}
            style={{
              ...pillBase,
              padding: '0 8px',
              background: pickerAnchor ? '#FFFFFF' : 'var(--sk-subtle)',
              boxShadow: pickerAnchor ? 'inset 0 0 0 1px var(--sk-border-strong)' : 'none',
              color: 'var(--sk-text-2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.boxShadow = 'inset 0 0 0 1px var(--sk-border-strong)';
            }}
            onMouseLeave={(e) => {
              if (pickerAnchor) return;
              e.currentTarget.style.background = 'var(--sk-subtle)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <EmojiAddIcon className="w-4 h-4" />
          </button>
        </Tooltip>
      )}

      {pickerAnchor && (
        <EmojiPickerPortal
          anchorRect={pickerAnchor}
          onSelect={(emoji) => { onToggle(emoji); setPickerAnchor(null); }}
          onClose={() => setPickerAnchor(null)}
        />
      )}
    </div>
  );
}
