import { useState, useRef, useEffect, KeyboardEvent, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { sendMessage, subscribeToUsers } from '../../services';
import type { User } from '../../types';

function parseMentions(text: string): string[] {
  const re = /@\[[^\]]+\]\(([^)]+)\)/g;
  const uids: string[] = [];
  let match;
  while ((match = re.exec(text)) !== null) uids.push(match[1]);
  return uids;
}

// テキストエリアの選択範囲をマーカーで囲む
function wrapSelection(
  textarea: HTMLTextAreaElement,
  marker: string,
  setText: (v: string) => void
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end);
  const wrapped = selected
    ? `${marker}${selected}${marker}`
    : `${marker}テキスト${marker}`;
  const newValue = value.slice(0, start) + wrapped + value.slice(end);
  setText(newValue);
  setTimeout(() => {
    textarea.focus();
    const newPos = selected ? start + wrapped.length : start + marker.length;
    const selEnd = selected ? newPos : newPos + 3; // "テキスト" の長さ
    textarea.setSelectionRange(selected ? newPos : start + marker.length, selEnd);
  }, 0);
}

const EMOJI_LIST = ['😀','😂','🥰','😎','🤔','😅','😭','🎉','👍','👏','🔥','❤️','✅','🚀','💡','🙏','😊','👀','💪','🤝'];

export default function MessageInput() {
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const channels = useAppStore((s) => s.channels);
  const { user } = useAppStore((s) => s.auth);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestQuery, setSuggestQuery] = useState('');
  const [suggestIndex, setSuggestIndex] = useState(0);
  const [atPos, setAtPos] = useState<number | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const channel = channels.find((c) => c.id === activeChannelId);

  useEffect(() => {
    const unsub = subscribeToUsers((u) => setUsers(u));
    return () => unsub();
  }, []);

  const filteredUsers = users.filter(
    (u) => u.uid !== user?.uid && u.displayName.toLowerCase().includes(suggestQuery.toLowerCase())
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    const cursor = e.target.selectionStart ?? val.length;
    const atMatch = val.slice(0, cursor).match(/@(\w*)$/);
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

  const insertMention = useCallback((u: User) => {
    if (atPos === null) return;
    const before = text.slice(0, atPos);
    const after = text.slice(atPos + 1 + suggestQuery.length);
    const token = `@[${u.displayName}](${u.uid})`;
    setText(before + token + ' ' + after);
    setSuggestOpen(false);
    setAtPos(null);
    setSuggestQuery('');
    setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const pos = before.length + token.length + 1;
      el.setSelectionRange(pos, pos);
    }, 0);
  }, [text, atPos, suggestQuery]);

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const pos = el.selectionStart;
    const newText = text.slice(0, pos) + emoji + text.slice(pos);
    setText(newText);
    setEmojiPickerOpen(false);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(pos + emoji.length, pos + emoji.length);
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestOpen && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSuggestIndex((i) => Math.min(i + 1, filteredUsers.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSuggestIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); const s = filteredUsers[suggestIndex]; if (s) insertMention(s); return; }
      if (e.key === 'Escape') { setSuggestOpen(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSend = async () => {
    if (!activeChannelId || !user || !text.trim() || sending) return;
    const trimmed = text.trim();
    const mentions = parseMentions(trimmed);
    setSending(true);
    setText('');
    setSuggestOpen(false);
    // テキストエリアの高さをリセット
    if (textareaRef.current) textareaRef.current.style.height = '44px';
    try {
      await sendMessage(activeChannelId, trimmed, user, mentions);
    } catch (err) {
      console.error('Send error:', err);
      setText(trimmed);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  if (!activeChannelId) return null;

  const hasText = text.trim().length > 0;

  return (
    <div className="px-4 pb-4 pt-2 flex-shrink-0">
      <div className="relative transition-all" style={{ border: '1px solid #DDDDDD', borderRadius: '8px', boxShadow: hasText ? '0 0 0 1px #1D1C1D' : undefined }}>

        {/* メンションサジェスト */}
        {suggestOpen && filteredUsers.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-1 max-h-48 overflow-y-auto z-20" style={{ background: '#FFFFFF', border: '1px solid #DDDDDD', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <div className="px-3 py-1.5"><span className="text-[11px] font-bold text-[#616061] uppercase tracking-wide">チャンネルメンバー</span></div>
            {filteredUsers.map((u, i) => (
              <button key={u.uid} onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors hover:bg-[#F8F8F8]"
                style={{ background: i === suggestIndex ? '#F8F8F8' : undefined }}>
                <div className="relative flex-shrink-0">
                  {u.photoURL ? <img src={u.photoURL} alt={u.displayName} className="w-7 h-7 object-cover" style={{ borderRadius: '4px' }} />
                    : <div className="w-7 h-7 flex items-center justify-center text-white text-xs font-bold" style={{ borderRadius: '4px', background: '#1164A3' }}>{u.displayName[0].toUpperCase()}</div>}
                  {u.online && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-[#007A5A]" />}
                </div>
                <span className="font-semibold text-[14px] text-[#1D1C1D]">{u.displayName}</span>
                {u.online && <span className="text-[12px] text-[#616061] ml-auto">アクティブ</span>}
              </button>
            ))}
          </div>
        )}

        {/* 絵文字ピッカー */}
        {emojiPickerOpen && (
          <div className="absolute bottom-full left-0 mb-1 z-20 p-2" style={{ background: '#FFFFFF', border: '1px solid #DDDDDD', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', width: '260px' }}>
            <p className="text-[11px] font-bold text-[#616061] uppercase tracking-wide px-1 mb-1.5">絵文字</p>
            <div className="grid grid-cols-10 gap-0.5">
              {EMOJI_LIST.map((emoji) => (
                <button key={emoji} onClick={() => insertEmoji(emoji)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#F8F8F8] text-[18px]">{emoji}</button>
              ))}
            </div>
          </div>
        )}

        {/* テキストエリア */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={`#${channel?.name ?? ''} にメッセージを送信`}
          rows={1}
          disabled={sending}
          className="w-full px-4 pt-3 pb-1 text-[15px] text-[#1D1C1D] resize-none focus:outline-none bg-transparent leading-relaxed max-h-52 overflow-y-auto placeholder-[#616061]"
          style={{ minHeight: '44px' }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 200) + 'px';
          }}
        />

        {/* ツールバー */}
        <div className="flex items-center justify-between px-2 pb-2 pt-1">
          <div className="flex items-center gap-0.5">
            {/* Bold */}
            <button title="太字 (*テキスト*)" onMouseDown={(e) => { e.preventDefault(); if (textareaRef.current) wrapSelection(textareaRef.current, '*', setText); }}
              className="w-8 h-8 flex items-center justify-center rounded text-[#616061] hover:bg-[#F8F8F8] hover:text-[#1D1C1D] transition-colors font-bold text-[14px]">B</button>
            {/* Italic */}
            <button title="斜体 (_テキスト_)" onMouseDown={(e) => { e.preventDefault(); if (textareaRef.current) wrapSelection(textareaRef.current, '_', setText); }}
              className="w-8 h-8 flex items-center justify-center rounded text-[#616061] hover:bg-[#F8F8F8] hover:text-[#1D1C1D] transition-colors italic text-[14px]">i</button>
            {/* Strikethrough */}
            <button title="打ち消し線 (~テキスト~)" onMouseDown={(e) => { e.preventDefault(); if (textareaRef.current) wrapSelection(textareaRef.current, '~', setText); }}
              className="w-8 h-8 flex items-center justify-center rounded text-[#616061] hover:bg-[#F8F8F8] hover:text-[#1D1C1D] transition-colors text-[14px] line-through">S</button>

            <div className="w-px h-4 bg-[#DDDDDD] mx-1" />

            {/* List */}
            <button title="箇条書き" onMouseDown={(e) => {
              e.preventDefault();
              const el = textareaRef.current;
              if (!el) return;
              const pos = el.selectionStart;
              const newText = text.slice(0, pos) + '• ' + text.slice(pos);
              setText(newText);
              setTimeout(() => { el.focus(); el.setSelectionRange(pos + 2, pos + 2); }, 0);
            }} className="w-8 h-8 flex items-center justify-center rounded text-[#616061] hover:bg-[#F8F8F8] hover:text-[#1D1C1D] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </button>

            <div className="w-px h-4 bg-[#DDDDDD] mx-1" />

            {/* Emoji picker */}
            <button title="絵文字" onClick={() => setEmojiPickerOpen((p) => !p)}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors text-[16px] ${emojiPickerOpen ? 'bg-[#F8F8F8] text-[#1D1C1D]' : 'text-[#616061] hover:bg-[#F8F8F8] hover:text-[#1D1C1D]'}`}>
              😊
            </button>

            {/* Mention */}
            <button title="メンション (@)" onMouseDown={(e) => {
              e.preventDefault();
              const el = textareaRef.current;
              if (!el) return;
              const pos = el.selectionStart;
              const newText = text.slice(0, pos) + '@' + text.slice(pos);
              setText(newText);
              el.focus();
              setTimeout(() => { el.setSelectionRange(pos + 1, pos + 1); setSuggestQuery(''); setAtPos(pos); setSuggestOpen(true); }, 0);
            }} className="w-8 h-8 flex items-center justify-center rounded text-[#616061] hover:bg-[#F8F8F8] hover:text-[#1D1C1D] transition-colors font-bold text-[14px]">@</button>
          </div>

          {/* 送信ボタン */}
          <button
            onClick={handleSend}
            disabled={!hasText || sending}
            title="送信 (Enter)"
            className="w-8 h-8 flex items-center justify-center rounded transition-colors"
            style={{ background: hasText && !sending ? '#007A5A' : '#DDDDDD', color: hasText && !sending ? '#FFFFFF' : '#999999', cursor: hasText && !sending ? 'pointer' : 'not-allowed' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
          </button>
        </div>
      </div>
      <p className="text-[12px] text-[#616061] mt-1 px-1">
        <kbd className="font-mono bg-[#F8F8F8] border border-[#DDDDDD] rounded px-1">Enter</kbd> で送信・
        <kbd className="font-mono bg-[#F8F8F8] border border-[#DDDDDD] rounded px-1">Shift+Enter</kbd> で改行
      </p>
    </div>
  );
}
