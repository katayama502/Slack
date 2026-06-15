import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { joinChannelIfNeeded, getOrCreateDMChannel, getDMChannelName } from '../../services';
import { markChannelRead } from '../../hooks/useUnreadChannels';
import { Timestamp } from 'firebase/firestore';

interface QuickSwitcherProps {
  onClose: () => void;
}

export default function QuickSwitcher({ onClose }: QuickSwitcherProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const { user } = useAppStore((s) => s.auth);
  const channels = useAppStore((s) => s.channels);
  const users = useAppStore((s) => s.users);
  const allMessages = useAppStore((s) => s.messages);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const addChannel = useAppStore((s) => s.addChannel);

  const regularChannels = channels.filter((c) => !c.name.startsWith('__dm__'));
  const otherUsers = users.filter((u) => u.uid !== user?.uid);

  // Filter results based on query
  const q = query.trim().toLowerCase();
  const filteredChannels = q
    ? regularChannels.filter((c) => c.name.toLowerCase().includes(q))
    : regularChannels.slice(0, 5);
  const filteredUsers = q
    ? otherUsers.filter((u) => u.displayName.toLowerCase().includes(q))
    : otherUsers.slice(0, 5);

  // Message full-text search across loaded channels (query ≥ 2 chars)
  type MessageResult = {
    type: 'message';
    id: string;
    name: string;
    channelId: string;
    channelName: string;
    text: string;
    displayName: string;
  };
  const filteredMessages: MessageResult[] = q.length >= 2
    ? Object.entries(allMessages).flatMap(([channelId, msgs]) => {
        const ch = channels.find((c) => c.id === channelId);
        if (!ch) return [];
        return msgs
          .filter((m) => m.text.toLowerCase().includes(q))
          .slice(0, 3)
          .map((m) => ({
            type: 'message' as const,
            id: m.id,
            name: m.text,
            channelId,
            channelName: ch.name.startsWith('__dm__') ? 'DM' : `#${ch.name}`,
            text: m.text,
            displayName: m.displayName,
          }));
      }).slice(0, 5)
    : [];

  type ResultItem =
    | { type: 'channel'; id: string; name: string }
    | { type: 'user'; id: string; name: string; photoURL?: string | null; online?: boolean }
    | MessageResult;

  const results: ResultItem[] = [
    ...filteredChannels.map((c) => ({ type: 'channel' as const, id: c.id, name: c.name })),
    ...filteredUsers.map((u) => ({ type: 'user' as const, id: u.uid, name: u.displayName, photoURL: u.photoURL, online: u.online })),
    ...filteredMessages,
  ];

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleSelect = async (item: ResultItem) => {
    if (!user) return;
    onClose();
    if (item.type === 'channel') {
      await joinChannelIfNeeded(item.id, user.uid).catch(() => {});
      markChannelRead(item.id);
      setActiveChannel(item.id);
    } else if (item.type === 'message') {
      markChannelRead(item.channelId);
      setActiveChannel(item.channelId);
    } else {
      // Open DM
      try {
        const channelId = await getOrCreateDMChannel(user.uid, item.id);
        const existing = useAppStore.getState().channels.find((c) => c.id === channelId);
        if (!existing) {
          addChannel({
            id: channelId,
            name: getDMChannelName(user.uid, item.id),
            description: '',
            createdBy: user.uid,
            createdAt: Timestamp.now(),
            members: [user.uid, item.id],
          });
        }
        markChannelRead(channelId);
        setActiveChannel(channelId);
      } catch (err) {
        console.error('DM open error:', err);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = results[selectedIndex];
      if (item) handleSelect(item);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="クイック切り替え"
        aria-modal="true"
        className="w-full max-w-lg rounded-xl overflow-hidden"
        style={{
          background: '#FFFFFF',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.06)',
          animation: 'popIn 150ms ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4"
          style={{ borderBottom: results.length > 0 ? '1px solid #EEEEEE' : undefined, minHeight: '56px' }}
        >
          <svg className="w-5 h-5 text-[#616061] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-autocomplete="list"
            aria-label="チャンネル・メンバー・メッセージを検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="チャンネル・メンバー・メッセージを検索..."
            className="flex-1 text-[16px] text-[#1D1C1D] placeholder-[#999] focus:outline-none py-4 bg-transparent"
          />
          <kbd
            className="flex-shrink-0 text-[11px] text-[#616061] px-1.5 py-0.5 font-mono"
            style={{ background: '#F8F8F8', border: '1px solid #DDDDDD', borderRadius: '4px', boxShadow: '0 1px 0 #BBBBBB' }}
          >
            Esc
          </kbd>
        </div>

        {/* Results list */}
        {results.length > 0 && (
          <ul ref={listRef} className="max-h-80 overflow-y-auto py-1.5">
            {/* Section: Channels */}
            {filteredChannels.length > 0 && (
              <li className="px-4 py-1">
                <span className="text-[11px] font-bold text-[#616061] uppercase tracking-wide">チャンネル</span>
              </li>
            )}
            {filteredChannels.map((ch, i) => {
              const idx = i;
              const isSelected = idx === selectedIndex;
              return (
                <li key={ch.id}>
                  <button
                    onClick={() => handleSelect({ type: 'channel', id: ch.id, name: ch.name })}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left press-subtle"
                    style={{
                      background: isSelected ? '#EBF5FF' : 'transparent',
                      borderLeft: isSelected ? '2px solid #1164A3' : '2px solid transparent',
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <span
                      className="w-8 h-8 flex items-center justify-center rounded text-[#616061] flex-shrink-0 text-[16px] font-bold"
                      style={{ background: isSelected ? '#DBEAFE' : '#F8F8F8', border: '1px solid #EEEEEE' }}
                    >#</span>
                    <span className="text-[14px] text-[#1D1C1D] font-medium">{ch.name}</span>
                  </button>
                </li>
              );
            })}

            {/* Section: People */}
            {filteredUsers.length > 0 && (
              <li className="px-4 py-1 mt-1">
                <span className="text-[11px] font-bold text-[#616061] uppercase tracking-wide">メンバー</span>
              </li>
            )}
            {filteredUsers.map((u, i) => {
              const idx = filteredChannels.length + i;
              const isSelected = idx === selectedIndex;
              return (
                <li key={u.uid}>
                  <button
                    onClick={() => handleSelect({ type: 'user', id: u.uid, name: u.displayName, photoURL: u.photoURL, online: u.online })}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left press-subtle"
                    style={{
                      background: isSelected ? '#EBF5FF' : 'transparent',
                      borderLeft: isSelected ? '2px solid #1164A3' : '2px solid transparent',
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="relative flex-shrink-0">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt={u.displayName} className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold" style={{ background: '#1164A3' }}>
                          {u.displayName[0].toUpperCase()}
                        </div>
                      )}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${u.online ? 'bg-[#007A5A]' : 'bg-[#AAAAAA]'}`}
                      />
                    </div>
                    <div>
                      <p className="text-[14px] text-[#1D1C1D] font-medium">{u.displayName}</p>
                      <p className="text-[11px] text-[#616061]">{u.online ? 'アクティブ' : 'オフライン'}</p>
                    </div>
                  </button>
                </li>
              );
            })}

            {/* Section: Messages */}
            {filteredMessages.length > 0 && (
              <li className="px-4 py-1 mt-1">
                <span className="text-[11px] font-bold text-[#616061] uppercase tracking-wide">メッセージ</span>
              </li>
            )}
            {filteredMessages.map((msg, i) => {
              const idx = filteredChannels.length + filteredUsers.length + i;
              const isSelected = idx === selectedIndex;
              const preview = msg.text.length > 60 ? msg.text.slice(0, 60) + '…' : msg.text;
              return (
                <li key={`${msg.channelId}-${msg.id}`}>
                  <button
                    onClick={() => handleSelect(msg)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left press-subtle"
                    style={{
                      background: isSelected ? '#EBF5FF' : 'transparent',
                      borderLeft: isSelected ? '2px solid #1164A3' : '2px solid transparent',
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div
                      className="w-8 h-8 flex items-center justify-center rounded flex-shrink-0"
                      style={{ background: isSelected ? '#DBEAFE' : '#F8F8F8', border: '1px solid #EEEEEE' }}
                    >
                      <svg className="w-4 h-4 text-[#616061]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-semibold text-[#1164A3] flex-shrink-0">{msg.channelName}</span>
                        <span className="text-[12px] text-[#616061] truncate">{msg.displayName}</span>
                      </div>
                      <p className="text-[13px] text-[#1D1C1D] truncate">{preview}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {results.length === 0 && query && (
          <div className="px-4 py-6 text-center">
            <p className="text-[14px] text-[#616061]">「{query}」に一致する結果がありません</p>
          </div>
        )}

        {/* Footer hint */}
        <div
          className="flex items-center gap-3 px-4 py-2"
          style={{ borderTop: '1px solid #EEEEEE', background: '#F8F8F8' }}
        >
          <span className="text-[11px] text-[#616061]">
            <kbd className="font-mono px-1" style={{ background: '#FFFFFF', border: '1px solid #DDDDDD', borderRadius: '3px' }}>↑↓</kbd> 選択
            <kbd className="font-mono px-1" style={{ background: '#FFFFFF', border: '1px solid #DDDDDD', borderRadius: '3px' }}>Enter</kbd> 決定
            <kbd className="font-mono px-1" style={{ background: '#FFFFFF', border: '1px solid #DDDDDD', borderRadius: '3px' }}>Esc</kbd> 閉じる
          </span>
        </div>
      </div>
    </div>
  );
}
