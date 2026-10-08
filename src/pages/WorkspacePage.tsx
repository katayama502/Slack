import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import {
  subscribeToChannels,
  subscribeToNotifications,
  subscribeSavedMessages,
} from '../services';
import Layout from '../components/layout/Layout';

export default function WorkspacePage() {
  const { user } = useAppStore((s) => s.auth);
  const setChannels = useAppStore((s) => s.setChannels);
  const setNotifications = useAppStore((s) => s.setNotifications);
  const setSavedMessages = useAppStore((s) => s.setSavedMessages);
  const notifications = useAppStore((s) => s.notifications);
  const seenNotifIdsRef = useRef<Set<string> | null>(null);
  const navigate = useNavigate();

  // デスクトップ通知の権限リクエスト
  useEffect(() => {
    if (!user) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [user]);

  // 新着の未読通知をデスクトップ通知する
  // - 初回スナップショットは既存分として扱い通知しない
  // - 「通知を一時停止」中は通知しない
  // - チャンネル通知設定が 'off'（ミュート）のチャンネルは通知しない
  useEffect(() => {
    const seen = seenNotifIdsRef.current;
    if (!seen) return; // 初回スナップショット受信前
    seenNotifIdsRef.current = new Set(notifications.map((n) => n.id));

    const { notificationsPaused, channelNotifPrefs } = useAppStore.getState();
    if (notificationsPaused) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible') return;

    notifications
      .filter((n) => !n.read && !seen.has(n.id) && channelNotifPrefs[n.channelId] !== 'off')
      .slice(0, 3)
      .forEach((n) => {
        const desktop = new Notification(`${n.fromDisplayName} からの新着メッセージ`, {
          body: n.text.slice(0, 100),
          icon: '/favicon.ico',
          tag: n.id,
        });
        desktop.onclick = () => {
          window.focus();
          const st = useAppStore.getState();
          st.setActiveChannel(n.channelId);
          if (n.messageId) st.setJumpToMessageId(n.messageId);
        };
      });
  }, [notifications]);

  useEffect(() => {
    if (!user) {
      navigate('/', { replace: true });
      return;
    }
    seenNotifIdsRef.current = null;

    const unsubChannels = subscribeToChannels((channels) => {
      setChannels(channels);
    });
    const unsubNotifications = subscribeToNotifications(user.uid, (notifs) => {
      // 初回スナップショットは既読扱いの基準として記録（デスクトップ通知しない）
      if (!seenNotifIdsRef.current) seenNotifIdsRef.current = new Set(notifs.map((n) => n.id));
      setNotifications(notifs);
    });
    const unsubSaved = subscribeSavedMessages(user.uid, (msgs) => {
      setSavedMessages(msgs);
    });

    return () => {
      unsubChannels();
      unsubNotifications();
      unsubSaved();
    };
  }, [user, setChannels, setNotifications, setSavedMessages, navigate]);

  if (!user) return null;

  return <Layout />;
}
