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
  const prevUnreadCountRef = useRef(0);
  const navigate = useNavigate();

  // デスクトップ通知の権限リクエスト
  useEffect(() => {
    if (!user) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [user]);

  // 未読通知が増えたときにデスクトップ通知を送る
  const notifications = useAppStore((s) => s.notifications);
  useEffect(() => {
    const unread = notifications.filter((n) => !n.read);
    if (
      unread.length > prevUnreadCountRef.current &&
      document.visibilityState !== 'visible' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      const latest = unread[0];
      if (latest) {
        new Notification(`${latest.fromDisplayName} からメッセージ`, {
          body: latest.text,
          icon: '/favicon.ico',
        });
      }
    }
    prevUnreadCountRef.current = unread.length;
  }, [notifications]);

  useEffect(() => {
    if (!user) {
      navigate('/', { replace: true });
      return;
    }

    // チャンネルを購読
    const unsubChannels = subscribeToChannels((channels) => {
      setChannels(channels);
    });

    // 通知を購読
    const unsubNotifications = subscribeToNotifications(user.uid, (notifs) => {
      setNotifications(notifs);
    });

    // 保存済みメッセージを購読
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
