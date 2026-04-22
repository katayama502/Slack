import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { subscribeToNotifications, markNotificationRead } from '../../services';
import { formatMessageTime } from '../../utils/formatDate';

export default function NotificationsPanel() {
  const { user } = useAppStore((s) => s.auth);
  const users = useAppStore((s) => s.users);
  const notifications = useAppStore((s) => s.notifications);
  const channels = useAppStore((s) => s.channels);
  const setNotifications = useAppStore((s) => s.setNotifications);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAllRead = useAppStore((s) => s.markAllNotificationsRead);
  const setNotificationsPanelOpen = useAppStore((s) => s.setNotificationsPanelOpen);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotifications(user.uid, (notifs) => {
      setNotifications(notifs);
    });
    return () => unsub();
  }, [user, setNotifications]);

  const handleNotifClick = async (notifId: string, channelId: string, isRead: boolean) => {
    setActiveChannel(channelId);
    setNotificationsPanelOpen(false);
    if (!isRead && user) {
      markRead(notifId);
      await markNotificationRead(user.uid, notifId).catch(() => {});
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    markAllRead();
    await Promise.all(
      notifications.filter((n) => !n.read).map((n) => markNotificationRead(user.uid, n.id))
    ).catch(() => {});
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getChannelLabel = (channelId: string) => {
    const ch = channels.find((c) => c.id === channelId);
    if (!ch) return '';
    if (ch.name.startsWith('__dm__')) return 'DM';
    return `#${ch.name}`;
  };

  return (
    <div className="flex flex-col h-full bg-white" style={{ borderLeft: '1px solid #E8E8E8' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ minHeight: '49px', borderBottom: '1px solid #E8E8E8' }}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-bold text-[#1D1C1D]">アクティビティ</h2>
          {unreadCount > 0 && (
            <span
              className="min-w-[18px] h-4.5 flex items-center justify-center text-white text-[11px] font-bold px-1 rounded-full"
              style={{ background: '#E01E5A', lineHeight: '18px', minHeight: '18px' }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[12px] text-[#1264A3] hover:underline px-2 py-1 rounded hover:bg-[#F0F8FF] transition-colors"
            >
              すべて既読
            </button>
          )}
          <button
            onClick={() => setNotificationsPanelOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title="閉じる"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
            <div
              className="w-14 h-14 flex items-center justify-center rounded-full"
              style={{ background: '#F0F7FF' }}
            >
              <svg className="w-7 h-7 text-[#1264A3]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <p className="text-[15px] font-bold text-[#1D1C1D]">通知はありません</p>
            <p className="text-[13px] text-[#616061] leading-relaxed">
              @メンションされるか、DMを受け取ると<br />ここに通知が表示されます
            </p>
          </div>
        ) : (
          <ul>
            {notifications.map((notif) => {
              const fromUser = users.find((u) => u.uid === notif.fromUser);
              const channelLabel = getChannelLabel(notif.channelId);
              return (
                <li key={notif.id}>
                  <button
                    onClick={() => handleNotifClick(notif.id, notif.channelId, notif.read)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F8F8F8]"
                    style={{ borderBottom: '1px solid #F0F0F0', background: notif.read ? 'transparent' : '#F0F7FF' }}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0 mt-0.5">
                      {fromUser?.photoURL ? (
                        <img
                          src={fromUser.photoURL}
                          alt={fromUser.displayName}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: '#1164A3' }}
                        >
                          {(notif.fromDisplayName ?? '?')[0].toUpperCase()}
                        </div>
                      )}
                      {!notif.read && (
                        <span
                          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                          style={{ background: '#E01E5A' }}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="text-[13px] font-semibold text-[#1D1C1D]">{notif.fromDisplayName}</span>
                        <span className="text-[12px] text-[#616061]">があなたをメンション</span>
                        {channelLabel && (
                          <span
                            className="text-[11px] font-medium px-1.5 py-0.5 rounded"
                            style={{ background: '#F0F0F0', color: '#616061' }}
                          >
                            {channelLabel}
                          </span>
                        )}
                      </div>
                      <p
                        className="text-[13px] truncate"
                        style={{ color: notif.read ? '#616061' : '#1D1C1D' }}
                      >
                        {notif.text}
                      </p>
                      <p className="text-[11px] text-[#9E9EA6] mt-0.5">{formatMessageTime(notif.createdAt)}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
