import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { subscribeToLatestMessage } from '../services';

const KEY = (channelId: string) => `creatte_lastVisit_${channelId}`;

export function getLastVisit(channelId: string): number {
  const v = localStorage.getItem(KEY(channelId));
  return v ? parseInt(v, 10) : 0;
}

export function markChannelRead(channelId: string): void {
  localStorage.setItem(KEY(channelId), Date.now().toString());
}

/**
 * チャンネルごとの未読状態を返す。
 * 各チャンネルの最新メッセージ timestamp と localStorage の lastVisit を比較して判定。
 */
export function useUnreadChannels(): Set<string> {
  const channels = useAppStore((s) => s.channels);
  const [unread, setUnread] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (channels.length === 0) return;

    const unsubscribers: (() => void)[] = [];

    channels.forEach((channel) => {
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
  }, [channels]);

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
