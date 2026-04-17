import { useRef, useState, useCallback, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import NavRail from '../sidebar/NavRail';
import Sidebar from '../sidebar/Sidebar';
import ChannelHeader from '../channel/ChannelHeader';
import MessageList from '../message/MessageList';
import MessageInput from '../message/MessageInput';
import ThreadPanel from '../thread/ThreadPanel';
import NotificationsPanel from '../notifications/NotificationsPanel';

const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 480;
const SIDEBAR_DEFAULT = 220;
const RIGHT_MIN = 240;
const RIGHT_MAX = 600;
const RIGHT_DEFAULT = 400;
const NAVRAIL_WIDTH = 56;

export default function Layout() {
  const threadPanelMessageId = useAppStore((s) => s.threadPanelMessageId);
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const notificationsPanelOpen = useAppStore((s) => s.notificationsPanelOpen);

  const rightPanel = threadPanelMessageId || notificationsPanelOpen;

  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [rightPanelWidth, setRightPanelWidth] = useState(RIGHT_DEFAULT);

  const draggingSidebar = useRef(false);
  const draggingRight = useRef(false);

  const handleSidebarMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingSidebar.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleRightMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRight.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (draggingSidebar.current) {
        const newWidth = e.clientX - NAVRAIL_WIDTH;
        setSidebarWidth(Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, newWidth)));
      }
      if (draggingRight.current) {
        const newWidth = window.innerWidth - e.clientX;
        setRightPanelWidth(Math.max(RIGHT_MIN, Math.min(RIGHT_MAX, newWidth)));
      }
    };
    const onMouseUp = () => {
      draggingSidebar.current = false;
      draggingRight.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left nav rail — fixed 56px */}
      <NavRail />

      {/* Sidebar */}
      <aside
        className="flex flex-col overflow-hidden flex-shrink-0"
        style={{ width: sidebarWidth, background: '#3F0E40' }}
      >
        <Sidebar />
      </aside>

      {/* Sidebar resize handle */}
      <div
        onMouseDown={handleSidebarMouseDown}
        className="flex-shrink-0 hover:bg-[#1164A3] transition-colors"
        style={{ width: '4px', cursor: 'col-resize', background: 'rgba(0,0,0,0.08)', zIndex: 10 }}
        title="ドラッグしてサイドバーの幅を変更"
      />

      {/* Main content */}
      <main className="flex flex-col overflow-hidden bg-white flex-1 min-w-0">
        {activeChannelId ? (
          <>
            <ChannelHeader />
            <MessageList />
            <MessageInput />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ background: '#F8F8F8' }}>
            <div
              className="w-16 h-16 flex items-center justify-center text-white font-bold text-xl"
              style={{ borderRadius: '12px', background: '#3F0E40', letterSpacing: '-0.5px' }}
            >
              Cr
            </div>
            <p className="text-[18px] font-bold text-[#1D1C1D]">チャンネルを選択してください</p>
            <p className="text-[14px] text-[#616061]">左のサイドバーからチャンネルを選んで会話を始めましょう</p>
          </div>
        )}
      </main>

      {/* Right panel resize handle */}
      {rightPanel && (
        <div
          onMouseDown={handleRightMouseDown}
          className="flex-shrink-0 hover:bg-[#1164A3] transition-colors"
          style={{ width: '4px', cursor: 'col-resize', background: 'rgba(0,0,0,0.08)', zIndex: 10 }}
          title="ドラッグしてパネルの幅を変更"
        />
      )}

      {/* Right Panel: Thread or Notifications */}
      {rightPanel && (
        <aside
          className="flex flex-col overflow-hidden flex-shrink-0"
          style={{ width: rightPanelWidth, borderLeft: 'none' }}
        >
          {threadPanelMessageId ? <ThreadPanel /> : <NotificationsPanel />}
        </aside>
      )}
    </div>
  );
}
