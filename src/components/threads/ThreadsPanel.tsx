// メインビュー「スレッド」: 自分が参加しているスレッドの一覧
import { useAppStore } from '../../store/useAppStore';
import { renderMarkdown } from '../../utils/markdown';
import { formatRelativeTime, formatFullDateTime } from '../../utils/formatDate';
import Avatar from '../ui/Avatar';
import ViewHeader, { EmptyState } from '../views/ViewHeader';
import { ThreadsIcon, HashIcon, LockIcon } from '../ui/icons';
import { isDMChannel, channelLabel } from '../sidebar/shared';
import type { Message } from '../../types';

export default function ThreadsPanel() {
  const messages = useAppStore((s) => s.messages);
  const channels = useAppStore((s) => s.channels);
  const users = useAppStore((s) => s.users);
  const { user } = useAppStore((s) => s.auth);
  const threads = useAppStore((s) => s.threads);
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const threadPanelMessageId = useAppStore((s) => s.threadPanelMessageId);
  const openThreadPanel = useAppStore((s) => s.openThreadPanel);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const setMainView = useAppStore((s) => s.setMainView);

  const uid = user?.uid ?? '';
  const items: { channelId: string; message: Message; replyCount: number }[] = [];
  for (const [channelId, msgs] of Object.entries(messages)) {
    for (const msg of msgs) {
      const replies = threads[msg.id] ?? [];
      const replyCount = Math.max(msg.threadCount ?? 0, replies.length);
      if (replyCount === 0) continue;
      const participant =
        msg.uid === uid || replies.some((r) => r.uid === uid) || (msg.threadParticipants ?? []).includes(uid);
      if (participant) items.push({ channelId, message: msg, replyCount });
    }
  }
  items.sort((a, b) => {
    const at = (a.message.lastReplyAt ?? a.message.createdAt)?.toMillis?.() ?? 0;
    const bt = (b.message.lastReplyAt ?? b.message.createdAt)?.toMillis?.() ?? 0;
    return bt - at;
  });

  /** ThreadPanel は activeChannelId 前提のため、チャンネルを合わせてからスレッドビューに戻す */
  const openThread = (channelId: string, messageId: string) => {
    if (activeChannelId !== channelId) {
      setActiveChannel(channelId);
      setMainView('threads');
    }
    openThreadPanel(messageId);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <ViewHeader title="スレッド" />
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: 'var(--sk-hover)' }}>
        {items.length === 0 ? (
          <EmptyState
            icon={<ThreadsIcon className="w-8 h-8" />}
            title="スレッドはまだありません"
            body="メッセージに返信するか、スレッドでメンションされると、ここに表示されます。（このセッションで開いたチャンネルのスレッドが対象です）"
          />
        ) : (
          <ul className="max-w-[900px] mx-auto px-5 py-4 flex flex-col gap-4">
            {items.map(({ channelId, message, replyCount }) => {
              const ch = channels.find((c) => c.id === channelId);
              const ChIcon = ch?.isPrivate ? LockIcon : HashIcon;
              const participants = (message.threadParticipants ?? []).slice(0, 3);
              const selected = threadPanelMessageId === message.id;
              return (
                <li
                  key={`${channelId}-${message.id}`}
                  className="rounded-lg bg-white overflow-hidden"
                  style={{ border: selected ? '1px solid var(--sk-blue)' : '1px solid var(--sk-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                >
                  <div className="flex items-center gap-1.5 px-4 pt-3 pb-1 text-[15px] text-[var(--sk-text)]" style={{ fontWeight: 900 }}>
                    {ch && !isDMChannel(ch) && <ChIcon className="w-4 h-4" />}
                    <span className="truncate">{ch ? (isDMChannel(ch) ? channelLabel(ch, users, uid) : ch.name) : '不明なチャンネル'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openThread(channelId, message.id)}
                    className="w-full flex items-start gap-2 px-4 py-2 text-left hover:bg-[var(--sk-hover)]"
                  >
                    <Avatar name={message.displayName ?? '?'} photoURL={message.photoURL} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[15px] text-[var(--sk-text)]" style={{ fontWeight: 900 }}>{message.displayName}</span>
                        <span className="text-[12px] text-[var(--sk-text-2)]" title={formatFullDateTime(message.createdAt)}>
                          {formatRelativeTime(message.createdAt)}
                        </span>
                      </div>
                      <div className="text-[15px] leading-[22px] text-[var(--sk-text)] break-words" style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {renderMarkdown(message.text ?? '')}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="flex -space-x-1">
                          {participants.map((p) => {
                            const pu = users.find((u) => u.uid === p);
                            return <Avatar key={p} name={pu?.displayName ?? '?'} photoURL={pu?.photoURL} size={24} radius={5} />;
                          })}
                        </span>
                        <span className="text-[13px] font-bold text-[var(--sk-link)]">{replyCount} 件の返信</span>
                        {message.lastReplyAt && (
                          <span className="text-[13px] text-[var(--sk-text-2)]">最終返信: {formatRelativeTime(message.lastReplyAt)}</span>
                        )}
                      </div>
                    </div>
                  </button>
                  <div className="px-4 pb-3 pt-1">
                    <button
                      type="button"
                      onClick={() => openThread(channelId, message.id)}
                      className="w-full text-left px-3 rounded-lg text-[15px] text-[var(--sk-text-3)] hover:border-[var(--sk-border-strong)]"
                      style={{ height: 38, border: '1px solid var(--sk-border)' }}
                    >
                      返信する...
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
