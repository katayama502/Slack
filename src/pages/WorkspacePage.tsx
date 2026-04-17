import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import {
  subscribeToChannels,
  subscribeToNotifications,
} from '../services';
import Layout from '../components/layout/Layout';

// ── ユーザー一覧は Sidebar で使うが、store に保存しておく ──────────────────────
// store に users を追加していないため、ローカルで購読して store を拡張する代わりに
// context 経由で渡す設計とする。ここでは購読だけ行う。

export default function WorkspacePage() {
  const { user } = useAppStore((s) => s.auth);
  const setChannels = useAppStore((s) => s.setChannels);
  const setNotifications = useAppStore((s) => s.setNotifications);
  const navigate = useNavigate();

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

    return () => {
      unsubChannels();
      unsubNotifications();
    };
  }, [user, setChannels, setNotifications, navigate]);

  if (!user) return null;

  return <Layout />;
}
