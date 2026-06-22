import { useAppStore } from '../../store/useAppStore';
import { renderMarkdown } from '../../utils/markdown';
import type { Message } from '../../types';

function formatTime(ts: { seconds: number } | null | undefined): string {
  if (!ts) return '';
  const d = new Date(ts.seconds * 1000);
  return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

export default function ThreadsPanel() {
  const setThreadsPanelOpen = useAppStore((s) => (s as any).setThreadsPanelOpen);
  const messages = useAppStore((s) => s.messages);
  const channels = useAppStore((s) => s.channels);
  const { user } = useAppStore((s) => s.auth);
  const openThreadPanel = useAppStore((s) => s.openThreadPanel);
  const threads = useAppStore((s) => s.threads);

  // Collect messages with replies or where current user participated
  const threadItems: { channelId: string; channelName: string; message: Message; replyCount: number }[] = [];

  for (const [channelId, msgs] of Object.entries(messages)) {
    const channel = channels.find((c) => c.id === channelId);
    const channelName = channel
      ? channel.name.startsWith('__dm__')
        ? 'DM'
        : `#${channel.name}`
      : channelId;

    for (const msg of msgs) {
      const msgReplies = threads[msg.id] ?? [];
      const replyCount = (msg.threadCount ?? 0) + msgReplies.length;
      if (replyCount === 0) continue;

      // Include if: user sent original, or user replied
      const userReplied = msgReplies.some((r) => r.uid === user?.uid);
      const userSent = msg.uid === user?.uid;
      const userParticipant = msg.threadParticipants?.includes(user?.uid ?? '');

      if (userSent || userReplied || userParticipant) {
        threadItems.push({ channelId, channelName, message: msg, replyCount });
      }
    }
  }

  // Sort by most recent reply / message
  threadItems.sort((a, b) => {
    const aTs = (a.message.lastReplyAt ?? a.message.createdAt)?.seconds ?? 0;
    const bTs = (b.message.lastReplyAt ?? b.message.createdAt)?.seconds ?? 0;
    return bTs - aTs;
  });

  return (
    <div className="flex flex-col h-full" style={{ background: '#FFFFFF' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ height: '49px', borderBottom: '1px solid #E8E8E8' }}
      >
        <h2 className="text-[18px] font-bold text-[#1D1C1D]">スレッド</h2>
        <button
          onClick={() => setThreadsPanelOpen(false)}
          className="w-8 h-8 flex items-center justify-center rounded transition-colors text-[#616061] hover:bg-[#F8F8F8] hover:text-[#1D1C1D]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {threadItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
            <div
              className="w-14 h-14 flex items-center justify-center rounded-full"
              style={{ background: '#F8F8F8' }}
            >
              <svg className="w-7 h-7 text-[#616061]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
            </div>
            <p className="text-[15px] font-bold text-[#1D1C1D]">スレッドなし</p>
            <p className="text-[13px] text-[#616061]">
              参加しているスレッドがここに表示されます。メッセージに返信するとスレッドが始まります。
            </p>
          </div>
        ) : (
          <div>
            {threadItems.map(({ channelId, channelName, message, replyCount }) => (
              <button
                key={`${channelId}-${message.id}`}
                onClick={() => {
                  openThreadPanel(message.id);
                  setThreadsPanelOpen(false);
                }}
                className="w-full text-left px-4 py-3 transition-colors"
                style={{ borderBottom: '1px solid #F0F0F0' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F8F8F8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Channel label */}
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[12px] font-semibold text-[#616061]">{channelName}</span>
                  <span className="text-[11px] text-[#9E9EA6]">·</span>
                  <span className="text-[11px] text-[#9E9EA6]">{formatTime(message.createdAt as any)}</span>
                </div>

                {/* Original message preview */}
                <div className="flex items-start gap-2">
                  {message.photoURL ? (
                    <img
                      src={message.photoURL}
                      alt={message.displayName ?? ''}
                      className="w-8 h-8 rounded flex-shrink-0 object-cover"
                      style={{ borderRadius: '4px' }}
                    />
                  ) : (
                    <div
                      className="w-8 h-8 flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ borderRadius: '4px', background: '#1164A3' }}
                    >
                      {(message.displayName ?? '?')[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-bold text-[#1D1C1D] mr-2">{message.displayName}</span>
                    <div className="text-[13px] text-[#1D1C1D] line-clamp-2 mt-0.5">
                      {renderMarkdown(message.text ?? '')}
                    </div>
                  </div>
                </div>

                {/* Reply count */}
                <div className="mt-1.5 ml-10">
                  <span className="text-[12px] font-semibold text-[#1264A3]">
                    {replyCount}件の返信
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
