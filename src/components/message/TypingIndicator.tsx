import { useTypingUsers } from '../../hooks/useTyping';
import { useAppStore } from '../../store/useAppStore';

export default function TypingIndicator() {
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const typers = useTypingUsers(activeChannelId);

  if (typers.length === 0) return null;

  const label =
    typers.length === 1
      ? `${typers[0].displayName} が入力中...`
      : typers.length === 2
      ? `${typers[0].displayName} と ${typers[1].displayName} が入力中...`
      : `${typers.length}人が入力中...`;

  return (
    <div className="flex items-center gap-2 px-5 py-1 min-h-[20px]">
      {/* Animated dots */}
      <div className="flex items-end gap-[3px]" style={{ height: '14px' }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-1.5 h-1.5 rounded-full"
            style={{
              background: '#616061',
              animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <span className="text-[12px] text-[#616061]">{label}</span>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
