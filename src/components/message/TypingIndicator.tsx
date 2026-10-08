import { useTypingUsers } from '../../hooks/useTyping';
import { useAppStore } from '../../store/useAppStore';

// Slack 準拠: コンポーザー下の 20px 行に「◯◯さんが入力中…」を 12px で表示
export default function TypingIndicator() {
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const typers = useTypingUsers(activeChannelId);

  let label = '';
  if (typers.length === 1) label = `${typers[0].displayName}さんが入力中…`;
  else if (typers.length === 2) label = `${typers[0].displayName}さんと${typers[1].displayName}さんが入力中…`;
  else if (typers.length > 2) label = '複数のメンバーが入力中…';

  return (
    <div
      className="h-[20px] px-5 flex items-center flex-shrink-0 overflow-hidden"
      aria-live="polite"
      aria-atomic="true"
    >
      {label && (
        <span className="text-[12px] leading-[20px] truncate" style={{ color: 'var(--sk-text-2)' }}>
          {label}
        </span>
      )}
    </div>
  );
}
