import { useAppStore } from '../../store/useAppStore';

export default function ChannelHeader() {
  const channels = useAppStore((s) => s.channels);
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const channel = channels.find((c) => c.id === activeChannelId);

  if (!channel) return null;

  const memberCount = channel.members?.length ?? 0;

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-channel-border bg-white min-h-[56px] flex-shrink-0">
      {/* Left: channel info */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-gray-500 font-semibold text-lg">#</span>
          <h2 className="text-base font-bold text-gray-900 truncate">
            {channel.name}
          </h2>
        </div>
        {channel.description && (
          <>
            <span className="text-gray-300 hidden sm:block">|</span>
            <p className="text-sm text-gray-500 truncate hidden sm:block max-w-xs">
              {channel.description}
            </p>
          </>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Member count */}
        <div className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 cursor-pointer">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="text-sm font-medium">{memberCount}</span>
        </div>

        {/* Search */}
        <button
          title="検索"
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span className="hidden sm:block">検索</span>
        </button>
      </div>
    </header>
  );
}
