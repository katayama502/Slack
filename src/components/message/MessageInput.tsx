import {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  useCallback,
} from 'react';
import { useAppStore } from '../../store/useAppStore';
import { sendMessage, subscribeToUsers } from '../../services';
import type { User } from '../../types';

// Parse @[displayName](uid) tokens to extract mention uid list
function parseMentions(text: string): string[] {
  const re = /@\[[^\]]+\]\(([^)]+)\)/g;
  const uids: string[] = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    uids.push(match[1]);
  }
  return uids;
}

export default function MessageInput() {
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const channels = useAppStore((s) => s.channels);
  const { user } = useAppStore((s) => s.auth);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  // Mention suggest state
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestQuery, setSuggestQuery] = useState('');
  const [suggestIndex, setSuggestIndex] = useState(0);
  const [atPos, setAtPos] = useState<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const channel = channels.find((c) => c.id === activeChannelId);

  useEffect(() => {
    const unsub = subscribeToUsers((u) => setUsers(u));
    return () => unsub();
  }, []);

  // Filter users based on query after @
  const filteredUsers = users.filter(
    (u) =>
      u.uid !== user?.uid &&
      u.displayName.toLowerCase().includes(suggestQuery.toLowerCase())
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    // Detect @ trigger
    const cursor = e.target.selectionStart ?? val.length;
    const beforeCursor = val.slice(0, cursor);
    const atMatch = beforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      setAtPos(cursor - atMatch[0].length);
      setSuggestQuery(atMatch[1]);
      setSuggestOpen(true);
      setSuggestIndex(0);
    } else {
      setSuggestOpen(false);
      setAtPos(null);
    }
  };

  const insertMention = useCallback(
    (u: User) => {
      if (atPos === null) return;
      const before = text.slice(0, atPos);
      const after = text.slice(atPos + 1 + suggestQuery.length);
      const token = `@[${u.displayName}](${u.uid})`;
      const newText = before + token + ' ' + after;
      setText(newText);
      setSuggestOpen(false);
      setAtPos(null);
      setSuggestQuery('');
      // refocus and move cursor to after token
      setTimeout(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        const pos = before.length + token.length + 1;
        el.setSelectionRange(pos, pos);
      }, 0);
    },
    [text, atPos, suggestQuery]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Suggestion navigation
    if (suggestOpen && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestIndex((i) => Math.min(i + 1, filteredUsers.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredUsers[suggestIndex];
        if (selected) insertMention(selected);
        return;
      }
      if (e.key === 'Escape') {
        setSuggestOpen(false);
        return;
      }
    }

    // Send on Enter (no shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!activeChannelId || !user || !text.trim() || sending) return;
    const trimmed = text.trim();
    const mentions = parseMentions(trimmed);
    setSending(true);
    setText('');
    setSuggestOpen(false);
    try {
      await sendMessage(activeChannelId, trimmed, user, mentions);
    } catch (err) {
      console.error('Send error:', err);
      setText(trimmed); // restore on error
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  if (!activeChannelId) return null;

  return (
    <div className="px-5 py-3 border-t border-channel-border flex-shrink-0">
      <div className="relative border border-gray-300 rounded-lg hover:border-gray-400 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-colors">
        {/* Mention suggestions dropdown */}
        {suggestOpen && filteredUsers.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-popover max-h-48 overflow-y-auto z-20">
            {filteredUsers.map((u, i) => (
              <button
                key={u.uid}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent textarea blur
                  insertMention(u);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  i === suggestIndex ? 'bg-blue-50' : ''
                }`}
              >
                {u.photoURL ? (
                  <img
                    src={u.photoURL}
                    alt={u.displayName}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold">
                    {u.displayName[0].toUpperCase()}
                  </div>
                )}
                <span className="font-medium">{u.displayName}</span>
                {u.online && (
                  <span className="w-2 h-2 rounded-full bg-online ml-auto" />
                )}
              </button>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={`#${channel?.name ?? ''} にメッセージを送信`}
          rows={1}
          disabled={sending}
          className="w-full px-4 py-3 text-sm text-gray-900 resize-none focus:outline-none bg-transparent leading-relaxed max-h-40 overflow-y-auto"
          style={{ minHeight: '44px' }}
          onInput={(e) => {
            // Auto-resize
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 160) + 'px';
          }}
        />

        {/* Footer toolbar */}
        <div className="flex items-center justify-between px-3 pb-2">
          <div className="flex items-center gap-1 text-gray-400">
            {/* Bold */}
            <button
              title="太字"
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 hover:text-gray-600 transition-colors text-sm font-bold"
            >
              B
            </button>
            {/* Italic */}
            <button
              title="斜体"
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 hover:text-gray-600 transition-colors text-sm italic"
            >
              i
            </button>
            {/* Emoji */}
            <button
              title="絵文字"
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 hover:text-gray-600 transition-colors text-base"
            >
              😊
            </button>
            {/* Mention */}
            <button
              title="メンション"
              onClick={() => {
                const el = textareaRef.current;
                if (!el) return;
                const pos = el.selectionStart;
                const newText = text.slice(0, pos) + '@' + text.slice(pos);
                setText(newText);
                el.focus();
                setTimeout(() => {
                  el.setSelectionRange(pos + 1, pos + 1);
                  setSuggestQuery('');
                  setAtPos(pos);
                  setSuggestOpen(true);
                }, 0);
              }}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 hover:text-gray-600 transition-colors text-sm font-bold"
            >
              @
            </button>
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            title="送信 (Enter)"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              text.trim() && !sending
                ? 'bg-accent text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
