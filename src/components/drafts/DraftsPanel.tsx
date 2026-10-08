// メインビュー「下書き＆送信済み」
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { formatRelativeTime } from '../../utils/formatDate';
import Avatar from '../ui/Avatar';
import ViewHeader, { ViewTabs, EmptyState } from '../views/ViewHeader';
import { SendIcon, PencilIcon, TrashIcon, HashIcon, LockIcon } from '../ui/icons';
import { isDMChannel, channelLabel, plainPreview } from '../sidebar/shared';
import type { Channel, Message } from '../../types';

type Tab = 'drafts' | 'sent';

function relativeMs(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins} 分前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} 時間前`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} 日前`;
  return new Date(ms).toLocaleDateString('ja-JP');
}

export default function DraftsPanel() {
  const { user } = useAppStore((s) => s.auth);
  const drafts = useAppStore((s) => s.drafts);
  const deleteDraft = useAppStore((s) => s.deleteDraft);
  const channels = useAppStore((s) => s.channels);
  const users = useAppStore((s) => s.users);
  const messages = useAppStore((s) => s.messages);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const setJumpToMessageId = useAppStore((s) => s.setJumpToMessageId);
  const [tab, setTab] = useState<Tab>('drafts');

  const uid = user?.uid ?? '';
  const draftList = Object.values(drafts).sort((a, b) => b.savedAt - a.savedAt);
  const sent: { channelId: string; message: Message }[] = Object.entries(messages)
    .flatMap(([channelId, msgs]) => msgs.filter((m) => m.uid === uid).map((message) => ({ channelId, message })))
    .sort((a, b) => (b.message.createdAt?.toMillis?.() ?? 0) - (a.message.createdAt?.toMillis?.() ?? 0))
    .slice(0, 100);

  const ChannelTitle = ({ ch }: { ch?: Channel }) => {
    const Icon = ch?.isPrivate ? LockIcon : HashIcon;
    return (
      <span className="flex items-center gap-1 text-[15px] text-[var(--sk-text)]" style={{ fontWeight: 900 }}>
        {ch && !isDMChannel(ch) && <Icon className="w-4 h-4" />}
        <span className="truncate">{ch ? (isDMChannel(ch) ? channelLabel(ch, users, uid) : ch.name) : '不明な会話'}</span>
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <ViewHeader title="下書き＆送信済み" />
      <ViewTabs<Tab>
        label="下書き＆送信済みのタブ"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'drafts', label: '下書き', count: draftList.length },
          { id: 'sent', label: '送信済み' },
        ]}
      />

      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === 'drafts' ? (
          draftList.length === 0 ? (
            <EmptyState
              icon={<PencilIcon className="w-8 h-8" />}
              title="下書きはありません"
              body="送信前のメッセージは自動的に下書きとして保存され、ここから再開できます。"
            />
          ) : (
            <ul>
              {draftList.map((d) => {
                const ch = channels.find((c) => c.id === d.channelId);
                return (
                  <li key={d.channelId} className="group relative" style={{ borderBottom: '1px solid var(--sk-border)' }}>
                    <button
                      type="button"
                      onClick={() => setActiveChannel(d.channelId)}
                      className="w-full text-left px-5 py-3 hover:bg-[var(--sk-hover)]"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <ChannelTitle ch={ch} />
                        <span className="text-[12px] text-[var(--sk-text-2)]">{relativeMs(d.savedAt)}</span>
                      </div>
                      <p className="text-[15px] leading-[22px] text-[var(--sk-text)] truncate">
                        <span className="text-[var(--sk-red)] font-bold mr-1">下書き</span>
                        {plainPreview(d.text, 200)}
                      </p>
                    </button>
                    <div className="absolute right-4 top-3 hidden group-hover:flex group-focus-within:flex items-center rounded-lg bg-white" style={{ border: '1px solid var(--sk-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                      <button
                        type="button"
                        aria-label="下書きを編集"
                        title="下書きを編集"
                        onClick={() => setActiveChannel(d.channelId)}
                        className="w-8 h-8 flex items-center justify-center text-[var(--sk-text-2)] hover:bg-[var(--sk-subtle)] rounded-l-lg"
                      >
                        <PencilIcon className="w-[18px] h-[18px]" />
                      </button>
                      <button
                        type="button"
                        aria-label="下書きを削除"
                        title="下書きを削除"
                        onClick={() => deleteDraft(d.channelId)}
                        className="w-8 h-8 flex items-center justify-center text-[var(--sk-text-2)] hover:bg-[var(--sk-subtle)] hover:text-[var(--sk-red)] rounded-r-lg"
                      >
                        <TrashIcon className="w-[18px] h-[18px]" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        ) : sent.length === 0 ? (
          <EmptyState
            icon={<SendIcon className="w-8 h-8" />}
            title="送信済みのメッセージはありません"
            body="このセッションで開いたチャンネルで送信したメッセージがここに表示されます。"
          />
        ) : (
          <ul>
            {sent.map(({ channelId, message }) => {
              const ch = channels.find((c) => c.id === channelId);
              return (
                <li key={`${channelId}-${message.id}`} style={{ borderBottom: '1px solid var(--sk-border)' }}>
                  <button
                    type="button"
                    onClick={() => { setActiveChannel(channelId); setJumpToMessageId(message.id); }}
                    className="w-full flex items-start gap-2 text-left px-5 py-3 hover:bg-[var(--sk-hover)]"
                  >
                    <Avatar name={message.displayName ?? '?'} photoURL={message.photoURL} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <ChannelTitle ch={ch} />
                        <span className="text-[12px] text-[var(--sk-text-2)]">{formatRelativeTime(message.createdAt)}</span>
                      </div>
                      <p className="text-[15px] leading-[22px] text-[var(--sk-text)]" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {plainPreview(message.text, 240)}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
