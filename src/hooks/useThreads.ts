import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { subscribeToThreads } from '../services';
import type { Thread } from '../types';

/**
 * threadPanelMessageId と activeChannelId が変わるたびにスレッドを購読し直す。
 * コンポーネントのアンマウント時またはメッセージ切替時に unsubscribe する。
 */
export function useThreads(): Thread[] {
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const threadPanelMessageId = useAppStore((s) => s.threadPanelMessageId);
  const setThreads = useAppStore((s) => s.setThreads);
  const threads = useAppStore((s) =>
    threadPanelMessageId ? (s.threads[threadPanelMessageId] ?? []) : []
  );

  useEffect(() => {
    if (!activeChannelId || !threadPanelMessageId) return;

    const unsubscribe = subscribeToThreads(
      activeChannelId,
      threadPanelMessageId,
      (threadList) => {
        setThreads(threadPanelMessageId, threadList);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activeChannelId, threadPanelMessageId, setThreads]);

  return threads;
}
