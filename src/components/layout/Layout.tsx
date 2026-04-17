import { useAppStore } from '../../store/useAppStore';
import NavRail from '../sidebar/NavRail';
import Sidebar from '../sidebar/Sidebar';
import ChannelHeader from '../channel/ChannelHeader';
import MessageList from '../message/MessageList';
import MessageInput from '../message/MessageInput';
import ThreadPanel from '../thread/ThreadPanel';

export default function Layout() {
  const threadPanelMessageId = useAppStore((s) => s.threadPanelMessageId);
  const activeChannelId = useAppStore((s) => s.activeChannelId);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateColumns: threadPanelMessageId
          ? '56px 220px 1fr 400px'
          : '56px 220px 1fr',
        gridTemplateRows: '1fr',
      }}
    >
      {/* Left nav rail */}
      <NavRail />

      {/* Sidebar */}
      <aside className="flex flex-col overflow-hidden" style={{ background: '#3F0E40' }}>
        <Sidebar />
      </aside>

      {/* Main content */}
      <main className="flex flex-col overflow-hidden bg-white" style={{ borderLeft: '1px solid #E8E8E8' }}>
        {activeChannelId ? (
          <>
            <ChannelHeader />
            <MessageList />
            <MessageInput />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ background: '#F8F8F8' }}>
            <div
              className="w-16 h-16 flex items-center justify-center text-white font-bold text-3xl"
              style={{ borderRadius: '12px', background: '#3F0E40' }}
            >
              #
            </div>
            <p className="text-[18px] font-bold text-[#1D1C1D]">チャンネルを選択してください</p>
            <p className="text-[14px] text-[#616061]">左のサイドバーからチャンネルを選んで会話を始めましょう</p>
          </div>
        )}
      </main>

      {/* Thread Panel */}
      {threadPanelMessageId && (
        <aside className="flex flex-col overflow-hidden" style={{ borderLeft: '1px solid #E8E8E8' }}>
          <ThreadPanel />
        </aside>
      )}
    </div>
  );
}
