import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { subscribeToMessages } from '../services';
import type { Message } from '../types';

/**
 * activeChannelId が変わるたびに Firestore のメッセージを購読し直す。
 * コンポーネントのアンマウント時またはチャンネル切替時に unsubscribe する。
 */
export function useMessages(): Message[] {
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const setMessages = useAppStore((s) => s.setMessages);
  const setChannelLoading = useAppStore((s) => s.setChannelLoading);
  const messages = useAppStore((s) =>
    activeChannelId ? (s.messages[activeChannelId] ?? []) : []
  );

  useEffect(() => {
    if (!activeChannelId) return;
    setChannelLoading(true);

    const unsubscribe = subscribeToMessages(activeChannelId, (msgs) => {
      setMessages(activeChannelId, msgs);
      setChannelLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [activeChannelId, setMessages, setChannelLoading]);

  return messages;
}
