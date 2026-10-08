// アクティビティタブ: 通知（メンション / スレッド / DM）一覧
// 通知の購読とデスクトップ通知は WorkspacePage が担当し、ここはストアを表示するだけ。
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { markNotificationRead } from '../../services';
import { formatSidebarDate } from '../../utils/formatDate';
import Avatar from '../ui/Avatar';
import { SidebarHeader, ToggleSwitch, Chip, SidebarEmpty, isDMChannel, plainPreview } from './shared';
import type { Notification } from '../../types';

type Filter = 'all' | 'mention' | 'thread' | 'dm';
type Kind = Exclude<Filter, 'all'>;

export default function ActivityList() {
  const { user } = useAppStore((s) => s.auth);
  const notifications = useAppStore((s) => s.notifications);
  const channels = useAppStore((s) => s.channels);
  const users = useAppStore((s) => s.users);
  const messages = useAppStore((s) => s.messages);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const setJumpToMessageId = useAppStore((s) => s.setJumpToMessageId);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAllRead = useAppStore((s) => s.markAllNotificationsRead);
  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen);

  const [filter, setFilter] = useState<Filter>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);

  /**
   * 種別推定（シンプルな規則）:
   *  1. 通知の channel が DM → 'dm'
   *  2. 読み込み済みメッセージで messageId の threadCount > 0 → 'thread'
   *  3. それ以外 → 'mention'
   */
  const kindOf = (n: Notification): Kind => {
    const ch = channels.find((c) => c.id === n.channelId);
    if (ch && isDMChannel(ch)) return 'dm';
    const msg = (messages[n.channelId] ?? []).find((m) => m.id === n.messageId);
    if (msg && (msg.threadCount ?? 0) > 0) return 'thread';
    return 'mention';
  };

  const items = notifications
    .map((n) => ({ n, kind: kindOf(n) }))
    .filter(({ kind }) => filter === 'all' || kind === filter)
    .filter(({ n }) => !unreadOnly || !n.read);
  const unreadTotal = notifications.filter((n) => !n.read).length;

  const open = async (n: Notification) => {
    setActiveChannel(n.channelId);
    if (n.messageId) setJumpToMessageId(n.messageId);
    setMobileSidebarOpen(false);
    if (!n.read && user) {
      markRead(n.id);
      await markNotificationRead(user.uid, n.id).catch(() => {});
    }
  };

  const handleMarkAll = async () => {
    if (!user) return;
    const unread = notifications.filter((n) => !n.read);
    markAllRead();
    await Promise.all(unread.map((n) => markNotificationRead(user.uid, n.id))).catch(() => {});
  };

  const metaText = (n: Notification, kind: Kind) => {
    const ch = channels.find((c) => c.id === n.channelId);
    if (kind === 'dm') return 'ダイレクトメッセージ';
    const where = ch ? `#${ch.name}` : '';
    return kind === 'thread' ? `${where} のスレッド` : `${where} でメンション`;
  };

  return (
    <>
      <SidebarHeader title="アクティビティ">
        <span className="text-[13px] text-[var(--sk-sidebar-text)] mr-1">未読</span>
        <ToggleSwitch checked={unreadOnly} onChange={setUnreadOnly} label="未読のみ表示" />
      </SidebarHeader>

      <div className="flex items-center gap-1.5 px-3 pb-2 overflow-x-auto flex-shrink-0" role="group" aria-label="フィルター">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>すべて</Chip>
        <Chip active={filter === 'mention'} onClick={() => setFilter('mention')}>メンション</Chip>
        <Chip active={filter === 'thread'} onClick={() => setFilter('thread')}>スレッド</Chip>
        <Chip active={filter === 'dm'} onClick={() => setFilter('dm')}>DM</Chip>
      </div>

      {unreadTotal > 0 && (
        <div className="flex justify-end px-4 pb-1 flex-shrink-0">
          <button type="button" onClick={handleMarkAll} className="text-[13px] text-[var(--sk-sidebar-text)] hover:text-white hover:underline">
            すべて既読にする
          </button>
        </div>
      )}

      <ul className="flex-1 min-h-0 overflow-y-auto sidebar-scroll" aria-label="アクティビティ一覧">
        {items.length === 0 && (
          <li>
            <SidebarEmpty
              title={unreadOnly ? '未読のアクティビティはありません' : 'アクティビティはまだありません'}
              body="メンションやスレッドへの返信、DM を受け取るとここに表示されます。"
            />
          </li>
        )}
        {items.map(({ n, kind }) => {
          const from = users.find((u) => u.uid === n.fromUser);
          return (
            <li key={n.id} style={{ borderBottom: '1px solid var(--sk-sidebar-border)' }}>
              <button
                type="button"
                onClick={() => open(n)}
                className="w-full flex items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-[rgba(255,255,255,0.14)]"
              >
                <span className="relative flex-shrink-0">
                  <Avatar name={n.fromDisplayName ?? '?'} photoURL={from?.photoURL} size={36} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="flex-1 truncate text-[13px] text-[var(--sk-sidebar-muted)]">{metaText(n, kind)}</span>
                    <span className="text-[12px] flex-shrink-0 text-[var(--sk-sidebar-muted)]">{formatSidebarDate(n.createdAt)}</span>
                    {!n.read && <span className="w-2 h-2 rounded-full flex-shrink-0 self-center" style={{ background: 'var(--sk-blue)' }} aria-label="未読" />}
                  </div>
                  <p className="text-[15px] text-white truncate" style={{ fontWeight: n.read ? 700 : 900 }}>
                    {n.fromDisplayName}
                    <span className="font-normal text-[var(--sk-sidebar-text)]">
                      {kind === 'dm' ? ' からのメッセージ' : kind === 'thread' ? ' がスレッドで返信しました' : ' があなたをメンションしました'}
                    </span>
                  </p>
                  <p
                    className="text-[14px] leading-[20px]"
                    style={{
                      color: n.read ? 'var(--sk-sidebar-text)' : 'var(--sk-sidebar-text-strong)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {plainPreview(n.text, 160)}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
