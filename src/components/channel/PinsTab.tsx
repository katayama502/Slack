// ─────────────────────────────────────────────────────────────────────────────
// 「ピン」タブ: チャンネル内でピン留めされたメッセージ一覧（Slack 準拠）
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useMessages } from '../../hooks/useMessages';
import { setMessagePinned } from '../../services';
import { renderMarkdown } from '../../utils/markdown';
import { formatRelativeTime, formatFullDateTime } from '../../utils/formatDate';
import { toast } from '../ui/Toast';
import Avatar from '../ui/Avatar';
import { PinIcon, MoreVerticalIcon } from '../ui/icons';
import type { Message } from '../../types';

function millis(m: Message): number {
  return m.pinnedAt?.toMillis?.() ?? m.createdAt?.toMillis?.() ?? 0;
}

export default function PinsTab() {
  const messages = useMessages();
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const users = useAppStore((s) => s.users);
  const me = useAppStore((s) => s.auth.user);
  const setChannelTab = useAppStore((s) => s.setChannelTab);
  const setJumpToMessageId = useAppStore((s) => s.setJumpToMessageId);
  const updateMessage = useAppStore((s) => s.updateMessage);

  const pinned = useMemo(
    () => messages.filter((m) => m.pinned).sort((a, b) => millis(b) - millis(a)),
    [messages]
  );

  const jump = (id: string) => {
    setChannelTab('messages');
    setJumpToMessageId(id);
  };

  const unpin = async (m: Message) => {
    if (!activeChannelId || !me) return;
    try {
      await setMessagePinned(activeChannelId, m.id, false, me.uid);
      updateMessage(activeChannelId, m.id, { pinned: false });
      toast.success('ピン留めを外しました');
    } catch {
      toast.error('ピン留めを外せませんでした');
    }
  };

  if (pinned.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center bg-white">
        <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--sk-subtle)', color: 'var(--sk-text-2)' }}>
          <PinIcon className="w-9 h-9" />
        </div>
        <p className="text-[18px] font-black mb-1" style={{ color: 'var(--sk-text)' }}>
          このチャンネルにはピン留めされたアイテムはありません
        </p>
        <p className="text-[15px] max-w-[420px] flex items-center flex-wrap justify-center gap-1" style={{ color: 'var(--sk-text-2)' }}>
          メッセージにカーソルを合わせて
          <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded" style={{ border: '1px solid var(--sk-border)' }}>
            <MoreVerticalIcon className="w-3.5 h-3.5" />
          </span>
          メニューから「チャンネルにピン留めする」を選ぶと、ここに表示されます。
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="px-5 pt-4 pb-2 text-[13px] font-bold" style={{ color: 'var(--sk-text-2)' }}>
        ピン留めされたアイテム {pinned.length} 件
      </div>
      <ul className="flex flex-col gap-2 px-5 pb-6">
        {pinned.map((m) => {
          const author = users.find((u) => u.uid === m.uid);
          const pinnedBy = m.pinnedBy ? users.find((u) => u.uid === m.pinnedBy) : undefined;
          const name = author?.displayName ?? m.displayName;
          return (
            <li key={m.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => jump(m.id)}
                onKeyDown={(e) => { if (e.key === 'Enter') jump(m.id); }}
                className="group relative cursor-pointer bg-white hover:bg-[var(--sk-hover)] p-3"
                style={{ border: '1px solid var(--sk-border)', borderRadius: 'var(--sk-radius-card)' }}
              >
                {pinnedBy && (
                  <p className="flex items-center gap-1 text-[12px] mb-1.5" style={{ color: 'var(--sk-text-2)' }}>
                    <PinIcon filled className="w-3 h-3" style={{ color: 'var(--sk-red)' }} />
                    {pinnedBy.displayName} がピン留めしました
                  </p>
                )}
                <div className="flex gap-2">
                  <Avatar name={name} photoURL={author?.photoURL ?? m.photoURL} size={36} radius={8} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[15px] font-black truncate" style={{ color: 'var(--sk-text)' }}>{name}</span>
                      <span className="text-[12px] flex-shrink-0" style={{ color: 'var(--sk-text-2)' }} title={formatFullDateTime(m.createdAt)}>
                        {formatRelativeTime(m.createdAt)}
                      </span>
                    </div>
                    <div className="text-[15px] leading-[22px] break-words line-clamp-6" style={{ color: 'var(--sk-text)' }}>
                      {renderMarkdown(m.text)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); unpin(m); }}
                  className="absolute top-2 right-2 h-[28px] px-2.5 text-[13px] font-bold rounded-md bg-white opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-[var(--sk-hover)]"
                  style={{ border: '1px solid var(--sk-border-strong)', color: 'var(--sk-text)' }}
                >
                  ピン留めを外す
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
