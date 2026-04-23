import { useAppStore } from '../../store/useAppStore';
import { unsaveMessage } from '../../services';
import { renderMarkdown } from '../../utils/markdown';
import { formatMessageTime } from '../../utils/formatDate';
import { toast } from '../ui/Toast';

export default function SavedItemsPanel() {
  const { user } = useAppStore((s) => s.auth);
  const savedMessages = useAppStore((s) => s.savedMessages);
  const removeSavedMessage = useAppStore((s) => s.removeSavedMessage);
  const setSavedItemsPanelOpen = useAppStore((s) => s.setSavedItemsPanelOpen);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const channels = useAppStore((s) => s.channels);

  const getChannelLabel = (channelId: string) => {
    const ch = channels.find((c) => c.id === channelId);
    if (!ch) return '';
    if (ch.name.startsWith('__dm__')) return 'DM';
    return `#${ch.name}`;
  };

  const handleUnsave = async (messageId: string) => {
    if (!user) return;
    try {
      await unsaveMessage(user.uid, messageId);
      removeSavedMessage(messageId);
      toast.success('保存を解除しました');
    } catch {
      toast.error('操作に失敗しました');
    }
  };

  const handleJump = (channelId: string) => {
    setActiveChannel(channelId);
    setSavedItemsPanelOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-white" style={{ borderLeft: '1px solid #E8E8E8' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ minHeight: '49px', borderBottom: '1px solid #E8E8E8' }}
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-[#E8A400]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
          </svg>
          <h2 className="text-[15px] font-bold text-[#1D1C1D]">保存済みアイテム</h2>
          {savedMessages.length > 0 && (
            <span
              className="min-w-[18px] h-[18px] flex items-center justify-center text-white text-[11px] font-bold px-1 rounded-full"
              style={{ background: '#E8A400' }}
            >
              {savedMessages.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setSavedItemsPanelOpen(false)}
          className="w-8 h-8 flex items-center justify-center rounded text-gray-500 press-subtle"
          onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F0F0'; e.currentTarget.style.color = '#1D1C1D'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = ''; }}
          title="閉じる (Esc)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {savedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
            <div
              className="w-14 h-14 flex items-center justify-center rounded-full"
              style={{ background: '#FFF8E1' }}
            >
              <svg className="w-7 h-7 text-[#E8A400]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
              </svg>
            </div>
            <p className="text-[15px] font-bold text-[#1D1C1D]">保存済みアイテムはありません</p>
            <p className="text-[13px] text-[#616061] leading-relaxed">
              メッセージをブックマークすると<br />ここに表示されます
            </p>
          </div>
        ) : (
          <ul>
            {savedMessages.map((saved) => {
              const channelLabel = getChannelLabel(saved.channelId);
              return (
                <li key={saved.id} className="group">
                  <div
                    className="flex items-start gap-3 px-4 py-3 hover:bg-[#F8F8F8] transition-colors"
                    style={{ borderBottom: '1px solid #F0F0F0' }}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0 mt-0.5">
                      {saved.fromPhotoURL ? (
                        <img
                          src={saved.fromPhotoURL}
                          alt={saved.fromDisplayName}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: '#1164A3' }}
                        >
                          {(saved.fromDisplayName ?? '?')[0].toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-[13px] font-semibold text-[#1D1C1D]">
                          {saved.fromDisplayName}
                        </span>
                        {channelLabel && (
                          <span
                            className="text-[11px] font-medium px-1.5 py-0.5 rounded"
                            style={{ background: '#F0F0F0', color: '#616061' }}
                          >
                            {channelLabel}
                          </span>
                        )}
                        <span className="text-[11px] text-[#9E9EA6] ml-auto">
                          {formatMessageTime(saved.originalCreatedAt)}
                        </span>
                      </div>
                      <div
                        className="text-[13px] text-[#1D1C1D] leading-relaxed line-clamp-3"
                        style={{ WebkitLineClamp: 3 }}
                      >
                        {renderMarkdown(saved.text)}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleJump(saved.channelId)}
                          className="flex items-center gap-1 text-[12px] text-[#1264A3] hover:underline font-medium"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                          チャンネルへ移動
                        </button>
                        <button
                          onClick={() => handleUnsave(saved.messageId)}
                          className="flex items-center gap-1 text-[12px] text-[#616061] hover:text-[#E01E5A] hover:underline"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          保存を解除
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
