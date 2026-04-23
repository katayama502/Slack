import { useTypingUsers } from '../../hooks/useTyping';
import { useAppStore } from '../../store/useAppStore';

export default function TypingIndicator() {
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const users = useAppStore((s) => s.users);
  const typers = useTypingUsers(activeChannelId);

  if (typers.length === 0) return <div className="h-[20px] px-5" />;

  const label =
    typers.length === 1
      ? `${typers[0].displayName} が入力中...`
      : typers.length === 2
      ? `${typers[0].displayName} と ${typers[1].displayName} が入力中...`
      : `${typers.length}人が入力中...`;

  // Look up photo URLs for up to 3 typers
  const typerUsers = typers.slice(0, 3).map((t) => ({
    ...t,
    photoURL: users.find((u) => u.uid === t.uid)?.photoURL ?? null,
  }));

  return (
    <div className="flex items-center gap-2 px-5 py-1 min-h-[20px]">
      {/* User avatars */}
      <div className="flex items-center" style={{ marginRight: '2px' }}>
        {typerUsers.map((u, i) => (
          <div
            key={u.uid}
            className="flex-shrink-0"
            style={{
              width: '16px',
              height: '16px',
              marginLeft: i > 0 ? '-4px' : '0',
              borderRadius: '3px',
              overflow: 'hidden',
              border: '1.5px solid #FFFFFF',
            }}
          >
            {u.photoURL ? (
              <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white"
                style={{ fontSize: '8px', fontWeight: 700, background: '#1164A3' }}
              >
                {u.displayName[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
        ))}
      </div>

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
