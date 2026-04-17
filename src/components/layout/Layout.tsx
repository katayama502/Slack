import { useAppStore } from '../../store/useAppStore';
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
      className="flex h-screen overflow-hidden bg-white"
      style={{
        display: 'grid',
        gridTemplateColumns: threadPanelMessageId
          ? '220px 1fr 400px'
          : '220px 1fr',
        gridTemplateRows: '1fr',
      }}
    >
      {/* Sidebar */}
      <aside className="flex flex-col overflow-hidden bg-sidebar-bg">
        <Sidebar />
      </aside>

      {/* Main content */}
      <main className="flex flex-col overflow-hidden border-l border-channel-border">
        {activeChannelId ? (
          <>
            <ChannelHeader />
            <MessageList />
            <MessageInput />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="text-6xl mb-4">#</div>
            <p className="text-lg font-medium text-gray-500">
              チャンネルを選択してください
            </p>
            <p className="text-sm mt-1">
              左のサイドバーからチャンネルを選んで会話を始めましょう
            </p>
          </div>
        )}
      </main>

      {/* Thread Panel */}
      {threadPanelMessageId && (
        <aside className="flex flex-col overflow-hidden border-l border-channel-border">
          <ThreadPanel />
        </aside>
      )}
    </div>
  );
}
