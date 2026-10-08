// ─────────────────────────────────────────────────────────────────────────────
// Slack 風メッセージホバーツールバー（MessageItem / ThreadPanel 共通）
//   ✅ 👀 🙌 | 絵文字追加 | スレッドで返信 | 転送 | 後で | ⋮
// - 白・1px --sk-border・角丸 8px・影 0 1px 3px rgba(0,0,0,.08)・32px ボタン・18px アイコン
// - 各ボタンに Slack 風の黒ツールチップ
// - 絵文字ピッカー / ⋮ メニューは自前でポータル表示し、開いている間は onOpenChange(true) を通知
//   （親はその間ツールバーを表示し続けること）
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect, type ReactNode, type CSSProperties } from 'react';
import { EmojiAddIcon, ReplyThreadIcon, ForwardIcon, BookmarkIcon, MoreVerticalIcon } from '../ui/icons';
import { emojiName } from '../ui/EmojiPicker';
import { Tooltip, EmojiPickerPortal, PopoverMenu, type MenuItem } from './overlays';

export type { MenuItem } from './overlays';

export interface MessageActionsProps {
  /** クイックリアクション（既定 ✅ 👀 🙌） */
  quickReactions?: string[];
  onReact: (emoji: string) => void;
  /** 省略するとスレッドボタンを非表示（スレッド内の返信など） */
  onReplyThread?: () => void;
  /** 省略すると転送ボタンを非表示 */
  onForward?: () => void;
  /** 「後で」（保存）状態 */
  saved?: boolean;
  /** 省略すると「後で」ボタンを非表示 */
  onToggleSave?: () => void;
  /** ⋮ メニューの項目 */
  menuItems: MenuItem[];
  /** ピッカー / メニューの開閉通知 */
  onOpenChange?: (open: boolean) => void;
  style?: CSSProperties;
  className?: string;
}

function ToolButton({
  label,
  onClick,
  active,
  children,
  btnRef,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
  btnRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <Tooltip label={label} disabled={active}>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        onClick={onClick}
        className="flex items-center justify-center"
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          color: active ? 'var(--sk-text)' : 'var(--sk-text-2)',
          background: active ? 'var(--sk-subtle)' : 'transparent',
          transition: 'background 80ms, color 80ms',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sk-subtle)'; e.currentTarget.style.color = 'var(--sk-text)'; }}
        onMouseLeave={(e) => {
          if (active) return;
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--sk-text-2)';
        }}
      >
        {children}
      </button>
    </Tooltip>
  );
}

export default function MessageActions({
  quickReactions = ['✅', '👀', '🙌'],
  onReact,
  onReplyThread,
  onForward,
  saved,
  onToggleSave,
  menuItems,
  onOpenChange,
  style,
  className = '',
}: MessageActionsProps) {
  const [pickerAnchor, setPickerAnchor] = useState<DOMRect | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);
  const emojiRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);

  const open = !!pickerAnchor || !!menuAnchor;
  useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);
  // アンマウント時は閉じた扱いにする
  useEffect(() => () => onOpenChange?.(false), [onOpenChange]);

  return (
    <div
      className={`flex items-center ${className}`}
      style={{
        padding: 2,
        gap: 0,
        background: '#FFFFFF',
        border: '1px solid var(--sk-border)',
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        ...style,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {quickReactions.map((emoji) => (
        <ToolButton key={emoji} label={`${emojiName(emoji)} でリアクションする`} onClick={() => onReact(emoji)}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>{emoji}</span>
        </ToolButton>
      ))}

      <span aria-hidden="true" style={{ width: 1, height: 20, margin: '0 2px', background: 'var(--sk-border)' }} />

      <ToolButton
        label="リアクションする"
        btnRef={emojiRef}
        active={!!pickerAnchor}
        onClick={() => {
          const r = emojiRef.current?.getBoundingClientRect();
          if (r) setPickerAnchor((a) => (a ? null : r));
        }}
      >
        <EmojiAddIcon className="w-[18px] h-[18px]" />
      </ToolButton>

      {onReplyThread && (
        <ToolButton label="スレッドで返信する" onClick={onReplyThread}>
          <ReplyThreadIcon className="w-[18px] h-[18px]" />
        </ToolButton>
      )}

      {onForward && (
        <ToolButton label="メッセージを転送する" onClick={onForward}>
          <ForwardIcon className="w-[18px] h-[18px]" />
        </ToolButton>
      )}

      {onToggleSave && (
        <ToolButton label={saved ? '「後で」から削除する' : '後で'} onClick={onToggleSave}>
          <span style={{ color: saved ? 'var(--sk-red)' : undefined, display: 'inline-flex' }}>
            <BookmarkIcon className="w-[18px] h-[18px]" filled={saved} />
          </span>
        </ToolButton>
      )}

      <ToolButton
        label="その他"
        btnRef={moreRef}
        active={!!menuAnchor}
        onClick={() => {
          const r = moreRef.current?.getBoundingClientRect();
          if (r) setMenuAnchor((a) => (a ? null : r));
        }}
      >
        <MoreVerticalIcon className="w-[18px] h-[18px]" />
      </ToolButton>

      {pickerAnchor && (
        <EmojiPickerPortal
          anchorRect={pickerAnchor}
          onSelect={(emoji) => { onReact(emoji); setPickerAnchor(null); }}
          onClose={() => setPickerAnchor(null)}
        />
      )}
      {menuAnchor && (
        <PopoverMenu anchorRect={menuAnchor} items={menuItems} onClose={() => setMenuAnchor(null)} />
      )}
    </div>
  );
}
