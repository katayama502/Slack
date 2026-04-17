import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { subscribeToNotifications, markNotificationRead } from '../../services';
import { formatMessageTime } from '../../utils/formatDate';

export default function NotificationsPanel() {
  const { user } = useAppStore((s) => s.auth);
  const notifications = useAppStore((s) => s.notifications);
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

  return (
    <div className="flex flex-col h-full bg-white" style={{ borderLeft: '1px solid #E8E8E8' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ minHeight: '49px', borderBottom: '1px solid #E8E8E8' }}
      >
        <h2 className="text-[15px] font-bold text-[#1D1C1D]">アクティビティ</h2>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[12px] text-[#1264A3] hover:underline px-2 py-1"
            >
              すべて既読にする
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
              className="w-12 h-12 flex items-center justify-center rounded-full"
              style={{ background: '#F8F8F8' }}
            >
              <svg className="w-6 h-6 text-[#616061]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <p className="text-[14px] font-bold text-[#1D1C1D]">通知はありません</p>
            <p className="text-[13px] text-[#616061]">@メンションされると、ここに表示されます</p>
          </div>
        ) : (
          <ul>
            {notifications.map((notif) => (
              <li key={notif.id}>
                <button
                  onClick={() => handleNotifClick(notif.id, notif.channelId, notif.read)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F8F8F8]"
                  style={{ borderBottom: '1px solid #F0F0F0', background: notif.read ? 'transparent' : '#F0F7FF' }}
                >
                  {/* Unread indicator */}
                  <div className="flex-shrink-0 mt-1.5">
                    {!notif.read ? (
                      <span className="w-2 h-2 rounded-full bg-[#E01E5A] block" />
                    ) : (
                      <span className="w-2 h-2 block" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[13px] font-semibold text-[#1D1C1D]">{notif.fromDisplayName}</span>
                      <span className="text-[12px] text-[#616061]">があなたをメンションしました</span>
                    </div>
                    <p className="text-[13px] text-[#616061] truncate">{notif.text}</p>
                    <p className="text-[11px] text-[#9E9EA6] mt-0.5">{formatMessageTime(notif.createdAt)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
