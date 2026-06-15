import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { setTyping, subscribeToTyping, setThreadTyping, subscribeToThreadTyping } from '../services';

const TYPING_TIMEOUT_MS = 3000;

/** タイピング中のユーザーを購読するフック（自分を除く） */
export function useTypingUsers(channelId: string | null) {
  const { user } = useAppStore((s) => s.auth);
  const [typers, setTypers] = useState<{ uid: string; displayName: string }[]>([]);

  useEffect(() => {
    if (!channelId) { setTypers([]); return; }
    const unsub = subscribeToTyping(channelId, (list) => {
      setTypers(list.filter((t) => t.uid !== user?.uid));
    });
    return () => unsub();
  }, [channelId, user?.uid]);

  return typers;
}

/** タイピング状態を送信するフック */
export function useSendTyping(channelId: string | null) {
  const { user } = useAppStore((s) => s.auth);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const stopTyping = useCallback(() => {
    if (!channelId || !user) return;
    if (isTypingRef.current) {
      isTypingRef.current = false;
      setTyping(channelId, user.uid, user.displayName, false).catch(() => {});
    }
  }, [channelId, user]);

  const startTyping = useCallback(() => {
    if (!channelId || !user) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      setTyping(channelId, user.uid, user.displayName, true).catch(() => {});
    }
    // Reset timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(stopTyping, TYPING_TIMEOUT_MS);
  }, [channelId, user, stopTyping]);

  // Cleanup on unmount or channel change
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      stopTyping();
    };
  }, [stopTyping]);

  return { startTyping, stopTyping };
}

/** スレッド内でタイピング中のユーザーを購読するフック（自分を除く） */
export function useThreadTypingUsers(channelId: string | null, messageId: string | null) {
  const { user } = useAppStore((s) => s.auth);
  const [typers, setTypers] = useState<{ uid: string; displayName: string }[]>([]);

  useEffect(() => {
    if (!channelId || !messageId) { setTypers([]); return; }
    const unsub = subscribeToThreadTyping(channelId, messageId, (list) => {
      setTypers(list.filter((t) => t.uid !== user?.uid));
    });
    return () => unsub();
  }, [channelId, messageId, user?.uid]);

  return typers;
}

/** スレッド内でタイピング状態を送信するフック */
export function useSendThreadTyping(channelId: string | null, messageId: string | null) {
  const { user } = useAppStore((s) => s.auth);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const stopTyping = useCallback(() => {
    if (!channelId || !messageId || !user) return;
    if (isTypingRef.current) {
      isTypingRef.current = false;
      setThreadTyping(channelId, messageId, user.uid, user.displayName, false).catch(() => {});
    }
  }, [channelId, messageId, user]);

  const startTyping = useCallback(() => {
    if (!channelId || !messageId || !user) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      setThreadTyping(channelId, messageId, user.uid, user.displayName, true).catch(() => {});
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(stopTyping, TYPING_TIMEOUT_MS);
  }, [channelId, messageId, user, stopTyping]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      stopTyping();
    };
  }, [stopTyping]);

  return { startTyping, stopTyping };
}
