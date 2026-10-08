// 「後で」タブ: 保存済みメッセージ（進行中 / アーカイブ済み / 完了）
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { unsaveMessage } from '../../services';
import { formatSidebarDate } from '../../utils/formatDate';
import { toast } from '../ui/Toast';
import Avatar from '../ui/Avatar';
import { CheckCircleIcon, TrashIcon } from '../ui/icons';
import { SidebarHeader, SidebarEmpty, channelLabel, plainPreview } from './shared';

type Tab = 'progress' | 'archived' | 'done';
const TABS: { id: Tab; label: string }[] = [
  { id: 'progress', label: '進行中' },
  { id: 'archived', label: 'アーカイブ済み' },
  { id: 'done', label: '完了' },
];

export default function LaterList() {
  const { user } = useAppStore((s) => s.auth);
  const savedMessages = useAppStore((s) => s.savedMessages);
  const laterDoneIds = useAppStore((s) => s.laterDoneIds);
  const toggleLaterDone = useAppStore((s) => s.toggleLaterDone);
  const removeSavedMessage = useAppStore((s) => s.removeSavedMessage);
  const channels = useAppStore((s) => s.channels);
  const users = useAppStore((s) => s.users);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const setJumpToMessageId = useAppStore((s) => s.setJumpToMessageId);
  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen);
  const [tab, setTab] = useState<Tab>('progress');

  const list =
    tab === 'archived'
      ? []
      : savedMessages.filter((m) => (tab === 'done' ? laterDoneIds.includes(m.messageId) : !laterDoneIds.includes(m.messageId)));
  const count = (t: Tab) =>
    t === 'archived' ? 0 : savedMessages.filter((m) => (t === 'done') === laterDoneIds.includes(m.messageId)).length;

  const handleRemove = async (messageId: string) => {
    if (!user) return;
    try {
      await unsaveMessage(user.uid, messageId);
      removeSavedMessage(messageId);
      toast.success('「後で」から削除しました');
    } catch {
      toast.error('操作に失敗しました');
    }
  };

  return (
    <>
      <SidebarHeader title="後で" />
      <div role="tablist" aria-label="後でのタブ" className="flex items-end gap-4 px-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--sk-sidebar-border)' }}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className="pb-2 text-[13px] font-bold transition-colors whitespace-nowrap"
              style={{
                color: active ? '#FFFFFF' : 'var(--sk-sidebar-text)',
                boxShadow: active ? 'inset 0 -2px 0 #FFFFFF' : undefined,
              }}
            >
              {t.label}{count(t.id) > 0 ? ` ${count(t.id)}` : ''}
            </button>
          );
        })}
      </div>

      <ul className="flex-1 min-h-0 overflow-y-auto sidebar-scroll" aria-label="後でのアイテム">
        {list.length === 0 && (
          <li>
            {tab === 'archived' ? (
              <SidebarEmpty title="アーカイブ済みのアイテムはありません" body="アーカイブはこのバージョンでは未対応です。" />
            ) : tab === 'done' ? (
              <SidebarEmpty title="完了したアイテムはありません" body="進行中のアイテムを完了にするとここに移動します。" />
            ) : (
              <SidebarEmpty title="「後で」にアイテムはありません" body="メッセージのブックマークアイコンをクリックすると、あとで確認できるようにここに保存されます。" />
            )}
          </li>
        )}
        {list.map((m) => {
          const ch = channels.find((c) => c.id === m.channelId);
          const done = laterDoneIds.includes(m.messageId);
          return (
            <li key={m.id} className="group relative" style={{ borderBottom: '1px solid var(--sk-sidebar-border)' }}>
              <button
                type="button"
                onClick={() => {
                  setActiveChannel(m.channelId);
                  setJumpToMessageId(m.messageId);
                  setMobileSidebarOpen(false);
                }}
                className="w-full flex items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-[rgba(255,255,255,0.14)]"
              >
                <Avatar name={m.fromDisplayName ?? '?'} photoURL={m.fromPhotoURL} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="flex-1 truncate text-[13px] text-[var(--sk-sidebar-muted)]">{channelLabel(ch, users, user?.uid)}</span>
                    <span className="text-[12px] flex-shrink-0 text-[var(--sk-sidebar-muted)]">{formatSidebarDate(m.savedAt)}</span>
                  </div>
                  <p className="text-[15px] font-bold text-white truncate" style={{ textDecoration: done ? 'line-through' : undefined }}>{m.fromDisplayName}</p>
                  <p
                    className="text-[14px] leading-[20px] text-[var(--sk-sidebar-text)]"
                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  >
                    {plainPreview(m.text, 160)}
                  </p>
                </div>
              </button>
              <div
                className="absolute right-3 top-2 hidden group-hover:flex group-focus-within:flex items-center rounded-md overflow-hidden"
                style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
              >
                <button
                  type="button"
                  aria-label={done ? '進行中に戻す' : '完了にする'}
                  title={done ? '進行中に戻す' : '完了にする'}
                  onClick={() => toggleLaterDone(m.messageId)}
                  className="w-8 h-8 flex items-center justify-center text-[var(--sk-text-2)] hover:bg-[var(--sk-subtle)]"
                  style={{ color: done ? 'var(--sk-green)' : undefined }}
                >
                  <CheckCircleIcon className="w-[18px] h-[18px]" />
                </button>
                <button
                  type="button"
                  aria-label="「後で」から削除"
                  title="「後で」から削除"
                  onClick={() => handleRemove(m.messageId)}
                  className="w-8 h-8 flex items-center justify-center text-[var(--sk-text-2)] hover:bg-[var(--sk-subtle)] hover:text-[var(--sk-red)]"
                >
                  <TrashIcon className="w-[18px] h-[18px]" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
