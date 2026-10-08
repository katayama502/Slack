import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { subscribeToLatestMessage } from '../services';

const KEY = (channelId: string) => `creatte_lastVisit_${channelId}`;

export function getLastVisit(channelId: string): number {
  const v = localStorage.getItem(KEY(channelId));
  return v ? parseInt(v, 10) : 0;
}

// チャンネルを開く直前の lastVisit（「新着」区切り線の位置計算用）
const visitBeforeOpen = new Map<string, number>();

export function markChannelRead(channelId: string): void {
  const now = Date.now();
  const prev = getLastVisit(channelId);
  // 同じ操作内の多重呼び出し（サイドバー → ストア購読）で上書きしないよう 2 秒の猶予
  if (now - prev > 2000) visitBeforeOpen.set(channelId, prev);
  localStorage.setItem(KEY(channelId), now.toString());
}

/** チャンネルを開いた時点より前の最終訪問時刻（未訪問なら 0） */
export function getVisitBeforeOpen(channelId: string): number {
  return visitBeforeOpen.get(channelId) ?? getLastVisit(channelId);
}

export function markChannelUnreadFrom(channelId: string, timestampMs: number): void {
  localStorage.setItem(KEY(channelId), (timestampMs - 1).toString());
}

/**
 * チャンネルごとの未読状態を返す。
 * 各チャンネルの最新メッセージ timestamp と localStorage の lastVisit を比較して判定。
 */
export function useUnreadChannels(): Set<string> {
  const channels = useAppStore((s) => s.channels);
  const { user } = useAppStore((s) => s.auth);
  const [unread, setUnread] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (channels.length === 0 || !user) return;

    const unsubscribers: (() => void)[] = [];

    // 自分がメンバーのチャンネルのみ購読（非メンバーはpermission-deniedになるため）
    const memberChannels = channels.filter(
      (ch) => Array.isArray(ch.members) && ch.members.includes(user.uid)
    );

    memberChannels.forEach((channel) => {
      const unsub = subscribeToLatestMessage(channel.id, (msg) => {
        if (!msg?.createdAt) return;
        const msgTime = msg.createdAt.toMillis();
        const lastVisit = getLastVisit(channel.id);
        const currentActive = useAppStore.getState().activeChannelId;

        setUnread((prev) => {
          const next = new Set(prev);
          if (msgTime > lastVisit && channel.id !== currentActive) {
            next.add(channel.id);
          } else {
            next.delete(channel.id);
          }
          return next;
        });
      });
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach((u) => u());
  }, [channels, user]);

  // アクティブチャンネル切替時に既読にする
  useEffect(() => {
    const activeChannelId = useAppStore.getState().activeChannelId;
    if (!activeChannelId) return;
    markChannelRead(activeChannelId);
    setUnread((prev) => {
      const next = new Set(prev);
      next.delete(activeChannelId);
      return next;
    });
  }, []);

  // チャンネル切替を購読して既読マーク
  useEffect(() => {
    let prev = useAppStore.getState().activeChannelId;
    return useAppStore.subscribe((state) => {
      const next = state.activeChannelId;
      if (next && next !== prev) {
        markChannelRead(next);
        setUnread((u) => {
          const s = new Set(u);
          s.delete(next);
          return s;
        });
      }
      prev = next;
    });
  }, []);

  return unread;
}
