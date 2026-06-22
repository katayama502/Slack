import { useAppStore } from '../../store/useAppStore';
import { renderMarkdown } from '../../utils/markdown';

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins}分前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}時間前`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}日前`;
  return new Date(ms).toLocaleDateString('ja-JP');
}

export default function DraftsPanel() {
  const setDraftsPanelOpen = useAppStore((s) => s.setDraftsPanelOpen);
  const drafts = useAppStore((s) => s.drafts);
  const deleteDraft = useAppStore((s) => s.deleteDraft);
  const channels = useAppStore((s) => s.channels);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);

  const draftList = Object.values(drafts).sort((a, b) => b.savedAt - a.savedAt);

  const getChannelLabel = (channelId: string) => {
    const ch = channels.find((c) => c.id === channelId);
    if (!ch) return channelId;
    if (ch.name.startsWith('__dm__')) return 'DM';
    return `#${ch.name}`;
  };

  const handleOpen = (channelId: string) => {
    setActiveChannel(channelId);
    setDraftsPanelOpen(false);
  };

  const handleDiscard = (channelId: string) => {
    deleteDraft(channelId);
  };

  return (
    <div className="flex flex-col h-full bg-white" style={{ borderLeft: '1px solid #E8E8E8' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ minHeight: '49px', borderBottom: '1px solid #E8E8E8' }}
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5"
            style={{ color: '#616061' }}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
            />
          </svg>
          <h2 className="text-[15px] font-bold text-[#1D1C1D]">下書き</h2>
          {draftList.length > 0 && (
            <span
              className="min-w-[18px] h-[18px] flex items-center justify-center text-white text-[11px] font-bold px-1 rounded-full"
              style={{ background: '#616061' }}
            >
              {draftList.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setDraftsPanelOpen(false)}
          className="w-8 h-8 flex items-center justify-center rounded"
          style={{ color: '#616061' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#F0F0F0';
            e.currentTarget.style.color = '#1D1C1D';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#616061';
          }}
          title="閉じる (Esc)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {draftList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
            <div
              className="w-14 h-14 flex items-center justify-center rounded-full"
              style={{ background: '#F0F0F0' }}
            >
              <svg
                className="w-7 h-7"
                style={{ color: '#616061' }}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
            </div>
            <p className="text-[15px] font-bold text-[#1D1C1D]">下書きはありません</p>
            <p className="text-[13px] text-[#616061] leading-relaxed">
              メッセージを入力すると<br />自動的に下書きが保存されます
            </p>
          </div>
        ) : (
          <>
            {/* Section header */}
            <div className="px-4 pt-4 pb-1">
              <p className="text-[11px] font-bold text-[#616061] uppercase tracking-wide">
                下書き — {draftList.length}件
              </p>
            </div>
            <ul>
              {draftList.map((draft) => {
                const label = getChannelLabel(draft.channelId);
                return (
                  <li key={draft.channelId} className="group">
                    <div
                      className="flex items-start gap-3 px-4 py-3 transition-colors"
                      style={{ borderBottom: '1px solid #F0F0F0' }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background = 'rgba(29,28,29,0.04)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                      }}
                    >
                      {/* Draft icon */}
                      <div
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded mt-0.5"
                        style={{ background: '#F0F0F0' }}
                      >
                        <svg
                          className="w-4 h-4"
                          style={{ color: '#616061' }}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.8}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                          />
                        </svg>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span
                            className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: '#F0F0F0', color: '#616061' }}
                          >
                            {label}
                          </span>
                          <span className="text-[11px]" style={{ color: '#9E9EA6' }}>
                            {formatRelativeTime(draft.savedAt)}に保存
                          </span>
                          <span
                            className="text-[10px] font-medium px-1 py-0.5 rounded"
                            style={{ background: '#FFF3E0', color: '#E8A000', border: '1px solid #F5C97E' }}
                          >
                            下書き
                          </span>
                        </div>

                        {/* Preview text */}
                        <div
                          className="text-[13px] leading-relaxed"
                          style={{
                            color: '#1D1C1D',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                          } as React.CSSProperties}
                        >
                          {renderMarkdown(draft.text.slice(0, 300))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpen(draft.channelId)}
                            className="flex items-center gap-1 text-[12px] font-medium"
                            style={{ color: '#1264A3' }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.textDecoration = 'underline';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.textDecoration = 'none';
                            }}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                            編集を再開
                          </button>
                          <button
                            onClick={() => handleDiscard(draft.channelId)}
                            className="flex items-center gap-1 text-[12px] transition-colors"
                            style={{ color: '#616061' }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.color = '#E01E5A';
                              (e.currentTarget as HTMLButtonElement).style.textDecoration = 'underline';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.color = '#616061';
                              (e.currentTarget as HTMLButtonElement).style.textDecoration = 'none';
                            }}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                            破棄
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Footer note */}
            <div className="px-4 py-3">
              <p className="text-[12px]" style={{ color: '#9E9EA6' }}>
                下書きはブラウザのローカルストレージに保存されます。送信すると自動的に削除されます。
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
