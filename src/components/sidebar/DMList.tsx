// DM タブ（スクショ 3 準拠）: 最新メッセージ順の DM 一覧
import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { subscribeToLatestMessage } from '../../services';
import { useUnreadChannels, markChannelRead } from '../../hooks/useUnreadChannels';
import { formatSidebarDate } from '../../utils/formatDate';
import Avatar from '../ui/Avatar';
import { ComposeIcon } from '../ui/icons';
import {
  SidebarHeader, HeaderIconButton, SidebarSearch, ToggleSwitch, NewDMModal, SidebarEmpty,
  isDMChannel, dmPeerUid, plainPreview,
} from './shared';
import type { Message } from '../../types';

export default function DMList() {
  const { user } = useAppStore((s) => s.auth);
  const channels = useAppStore((s) => s.channels);
  const users = useAppStore((s) => s.users);
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const mainView = useAppStore((s) => s.mainView);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen);
  const unreadChannels = useUnreadChannels();

  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [latest, setLatest] = useState<Record<string, Message | null>>({});
  const loadedMessages = useAppStore((s) => s.messages);

  const uid = user?.uid ?? '';
  const dmChannels = useMemo(
    () => channels.filter((c) => isDMChannel(c) && (c.members ?? []).includes(uid)),
    [channels, uid]
  );
  const dmIdsKey = dmChannels.map((c) => c.id).join(',');

  // 各 DM の最新メッセージを購読（アンマウント / 一覧変化で解除）
  useEffect(() => {
    if (!uid) return;
    const unsubs = dmChannels.map((c) =>
      subscribeToLatestMessage(c.id, (msg) => setLatest((prev) => ({ ...prev, [c.id]: msg })))
    );
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dmIdsKey, uid]);

  const q = search.trim().toLowerCase();
  const rows = dmChannels
    .map((c) => {
      const peerUid = dmPeerUid(c, uid);
      const peer = users.find((u) => u.uid === peerUid);
      // 購読結果がまだ無い場合は、ストアに読み込み済みのメッセージで補う
      const loaded = loadedMessages[c.id];
      const msg = latest[c.id] ?? (loaded && loaded.length > 0 ? loaded[loaded.length - 1] : null);
      return { channel: c, peerUid, peer, msg, ts: msg?.createdAt?.toMillis?.() ?? c.createdAt?.toMillis?.() ?? 0 };
    })
    .filter((r) => !q || (r.peer?.displayName ?? '').toLowerCase().includes(q))
    .filter((r) => !unreadOnly || unreadChannels.has(r.channel.id))
    .sort((a, b) => b.ts - a.ts);

  return (
    <>
      <SidebarHeader title="ダイレクトメッセージ">
        <span className="text-[13px] text-[var(--sk-sidebar-text)] mr-1 truncate">未読</span>
        <ToggleSwitch checked={unreadOnly} onChange={setUnreadOnly} label="未読のみ表示" />
        <HeaderIconButton label="新規メッセージ" onClick={() => setShowNewDM(true)}>
          <ComposeIcon className="w-[18px] h-[18px]" />
        </HeaderIconButton>
      </SidebarHeader>
      <SidebarSearch value={search} onChange={setSearch} placeholder="DM を見つける..." />

      <ul className="flex-1 min-h-0 overflow-y-auto sidebar-scroll" aria-label="ダイレクトメッセージ一覧">
        {rows.length === 0 && (
          <li>
            <SidebarEmpty
              title={unreadOnly ? '未読の DM はありません' : 'DM はまだありません'}
              body={unreadOnly ? undefined : '右上のボタンから新しいメッセージを送信できます。'}
            />
          </li>
        )}
        {rows.map(({ channel, peerUid, peer, msg }) => {
          const active = channel.id === activeChannelId && mainView === 'channel';
          const unread = unreadChannels.has(channel.id) && !active;
          const isSelf = peerUid === uid;
          const name = peer?.displayName ?? (isSelf ? (user?.displayName ?? 'あなた') : '不明なユーザー');
          const preview = msg ? `${msg.uid === uid ? 'あなた: ' : ''}${plainPreview(msg.text, 140)}` : 'メッセージはまだありません';
          return (
            <li key={channel.id} style={{ borderBottom: '1px solid var(--sk-sidebar-border)' }}>
              <button
                type="button"
                onClick={() => { markChannelRead(channel.id); setActiveChannel(channel.id); setMobileSidebarOpen(false); }}
                aria-current={active ? 'page' : undefined}
                className="w-full flex items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-[rgba(255,255,255,0.14)]"
                style={{ background: active ? 'rgba(255,255,255,0.18)' : undefined, minHeight: 70 }}
              >
                <Avatar name={name} photoURL={peer?.photoURL ?? (isSelf ? user?.photoURL : null)} size={36} online={peer?.online ?? isSelf} ringColor="transparent" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="flex-1 truncate text-[15px] text-white" style={{ fontWeight: unread ? 900 : 700 }}>
                      {name}{isSelf && <span className="font-normal">（自分）</span>}
                    </span>
                    <span className="text-[12px] flex-shrink-0 text-[var(--sk-sidebar-muted)]">{formatSidebarDate(msg?.createdAt)}</span>
                  </div>
                  <p
                    className="text-[14px] leading-[20px] mt-0.5"
                    style={{
                      color: unread ? 'var(--sk-sidebar-text-strong)' : 'var(--sk-sidebar-text)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordBreak: 'break-all',
                    }}
                  >
                    {preview}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {showNewDM && <NewDMModal onClose={() => setShowNewDM(false)} />}
    </>
  );
}
