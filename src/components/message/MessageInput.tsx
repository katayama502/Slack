import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { sendMessage } from '../../services';
import { toast } from '../ui/Toast';
import type { User } from '../../types';

// ─── HTML → Markdown conversion ─────────────────────────────────────────────

function nodeToMd(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  if (tag === 'span' && el.dataset.mention === 'true') {
    const uid = el.dataset.uid ?? '';
    const name = (el.textContent ?? '').replace(/^@/, '');
    return `@[${name}](${uid})`;
  }

  const cc = () => Array.from(el.childNodes).map(nodeToMd).join('');

  switch (tag) {
    case 'b': case 'strong': return `*${cc()}*`;
    case 'i': case 'em':     return `_${cc()}_`;
    case 's': case 'strike': case 'del': return `~${cc()}~`;
    case 'u':   return cc();
    case 'br':  return '\n';
    case 'a':   return `[${cc()}](${el.getAttribute('href') ?? ''})`;
    case 'code':
      return el.parentElement?.tagName.toLowerCase() === 'pre' ? cc() : `\`${cc()}\``;
    case 'pre':
      return `\`\`\`\n${cc()}\n\`\`\``;
    case 'blockquote':
      return cc().split('\n').map(l => l ? `> ${l}` : '').join('\n');
    case 'ol': {
      let n = 0;
      return '\n' + Array.from(el.querySelectorAll(':scope > li')).map(li => {
        n++;
        return `${n}. ${Array.from(li.childNodes).map(nodeToMd).join('')}`;
      }).join('\n');
    }
    case 'ul':
      return '\n' + Array.from(el.querySelectorAll(':scope > li')).map(li =>
        `• ${Array.from(li.childNodes).map(nodeToMd).join('')}`
      ).join('\n');
    case 'li': return cc();
    case 'div': case 'p': {
      const c = cc();
      if (!c || c === '\n') return '\n';
      return '\n' + c;
    }
    default: return cc();
  }
}

function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let result = Array.from(doc.body.childNodes).map(nodeToMd).join('');
  return result.replace(/^\n/, '').replace(/\n{3,}/g, '\n\n').trimEnd();
}

function parseMentionsFromHTML(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const uids: string[] = [];
  doc.querySelectorAll('[data-mention="true"]').forEach(el => {
    const uid = (el as HTMLElement).dataset.uid;
    if (uid) uids.push(uid);
  });
  return uids;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTextBeforeCaret(el: HTMLElement): string {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return '';
  const range = sel.getRangeAt(0).cloneRange();
  range.setStart(el, 0);
  return range.toString();
}

function isInsideTag(tagName: string, editorEl: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
  while (node && node !== editorEl) {
    if ((node as HTMLElement).tagName?.toLowerCase() === tagName) return true;
    node = node.parentNode;
  }
  return false;
}

// ─── Toolbar button ─────────────────────────────────────────────────────────

function ToolBtn({
  title,
  onClick,
  onMouseDown,
  active,
  children,
}: {
  title: string;
  onClick?: () => void;
  onMouseDown?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      onMouseDown={onMouseDown}
      className="w-7 h-7 flex items-center justify-center rounded transition-colors flex-shrink-0"
      style={{
        color: active ? '#1D1C1D' : '#616061',
        background: active ? '#E8E8E8' : 'transparent',
        fontWeight: active ? 700 : undefined,
      }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = '#F0F0F0'; e.currentTarget.style.color = '#1D1C1D'; } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#616061'; } }}
    >
      {children}
    </button>
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EMOJI_LIST = ['😀','😂','🥰','😎','🤔','😅','😭','🎉','👍','👏','🔥','❤️','✅','🚀','💡','🙏','😊','👀','💪','🤝'];

const CODE_STYLE = "font-family:'SFMono-Regular',Consolas,monospace;font-size:12.5px;background:rgba(29,28,29,0.06);border:1px solid rgba(29,28,29,0.13);border-radius:3px;padding:2px 5px;color:#E01E5A";
const BLOCKQUOTE_STYLE = "border-left:3px solid #DDDDDD;margin:4px 0;padding:2px 10px;color:#616061;display:block";

// ─── Component ───────────────────────────────────────────────────────────────

export default function MessageInput() {
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const channels = useAppStore((s) => s.channels);
  const messages = useAppStore((s) => s.messages);
  const { user } = useAppStore((s) => s.auth);
  const users = useAppStore((s) => s.users);
  const setEditingMessageId = useAppStore((s) => s.setEditingMessageId);

  const [sending, setSending] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestQuery, setSuggestQuery] = useState('');
  const [suggestIndex, setSuggestIndex] = useState(0);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [showTopBar, setShowTopBar] = useState(true);
  const [charCount, setCharCount] = useState(0);
  const lastSentAtRef = useRef<number>(0);  // rate limiting

  // Active format states (updated on selectionchange)
  const [fmt, setFmt] = useState({ bold: false, italic: false, underline: false, strike: false });

  // Link popup
  const [linkPopupOpen, setLinkPopupOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const savedRangeRef = useRef<Range | null>(null);
  const linkUrlInputRef = useRef<HTMLInputElement>(null);

  // File attachment
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const editableRef = useRef<HTMLDivElement>(null);

  const channel = channels.find((c) => c.id === activeChannelId);
  const isDM = channel?.name.startsWith('__dm__') ?? false;
  const dmOtherUser = isDM
    ? users.find((u) => u.uid !== user?.uid && channel?.members?.includes(u.uid))
    : null;
  const placeholder = isDM
    ? `${dmOtherUser?.displayName ?? 'ダイレクトメッセージ'} にメッセージを送信`
    : channel ? `#${channel.name} にメッセージを送信` : 'メッセージを送信';

  // Reset editor on channel change
  useEffect(() => {
    if (editableRef.current) editableRef.current.innerHTML = '';
    setIsEmpty(true);
    setSuggestOpen(false);
    setAttachedFiles([]);
    setLinkPopupOpen(false);
  }, [activeChannelId]);

  // Track active formatting via selectionchange
  useEffect(() => {
    const update = () => {
      const el = editableRef.current;
      if (!el) return;
      // Only update when editor is focused or selection is inside editor
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const node = sel.getRangeAt(0).commonAncestorContainer;
      if (!el.contains(node)) return;

      setFmt({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
      });
    };
    document.addEventListener('selectionchange', update);
    return () => document.removeEventListener('selectionchange', update);
  }, []);

  // Focus link URL input when popup opens
  useEffect(() => {
    if (linkPopupOpen) {
      setTimeout(() => linkUrlInputRef.current?.focus(), 30);
    }
  }, [linkPopupOpen]);

  const filteredUsers = users.filter(
    (u) => u.uid !== user?.uid && u.displayName.toLowerCase().includes(suggestQuery.toLowerCase())
  );

  const exec = (command: string, value?: string) => {
    editableRef.current?.focus();
    document.execCommand(command, false, value);
  };

  // ── Link ──────────────────────────────────────────────────────────────────

  const openLinkPopup = (e: React.MouseEvent) => {
    e.preventDefault();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      setLinkText(sel.toString());
    }
    setLinkUrl('');
    setLinkPopupOpen(true);
  };

  const commitLink = () => {
    if (!linkUrl.trim()) { setLinkPopupOpen(false); return; }
    const rawUrl = linkUrl.trim();
    // http/https のみ許可（javascript: / data: などを拒否）
    const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    // URL文字として無効な文字を除去（XSS対策）
    let safeUrl: string;
    try {
      safeUrl = new URL(withProtocol).toString();
    } catch {
      setLinkPopupOpen(false);
      return; // 無効なURLは無視
    }
    if (!/^https?:\/\//i.test(safeUrl)) { setLinkPopupOpen(false); return; }

    const sel = window.getSelection();
    editableRef.current?.focus();
    if (savedRangeRef.current) {
      sel?.removeAllRanges();
      sel?.addRange(savedRangeRef.current);
    }
    if (linkText.trim() && savedRangeRef.current?.collapsed) {
      // テキスト指定あり・選択範囲なし → DOM APIで安全にリンク挿入
      const a = document.createElement('a');
      a.href = safeUrl;
      a.textContent = linkText.trim();
      a.style.color = '#1264A3';
      a.style.textDecoration = 'underline';
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
      document.execCommand('insertHTML', false, a.outerHTML + '\u00A0');
    } else {
      // 選択範囲をリンクで囲む
      document.execCommand('createLink', false, safeUrl);
      const links = editableRef.current?.querySelectorAll(`a[href="${safeUrl}"]`) ?? [];
      links.forEach((a) => {
        (a as HTMLElement).style.color = '#1264A3';
        (a as HTMLElement).style.textDecoration = 'underline';
        (a as HTMLElement).setAttribute('target', '_blank');
        (a as HTMLElement).setAttribute('rel', 'noopener noreferrer');
      });
    }
    setLinkPopupOpen(false);
    setLinkUrl('');
    setLinkText('');
    setIsEmpty(false);
  };

  // ── Inline code toggle ────────────────────────────────────────────────────

  const handleInlineCode = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = editableRef.current;
    if (!el) return;

    // If cursor/selection is inside a <code> element → unwrap it
    if (isInsideTag('code', el)) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
        while (node && node !== el) {
          const htmlEl = node as HTMLElement;
          if (htmlEl.tagName?.toLowerCase() === 'code' &&
              htmlEl.parentElement?.tagName?.toLowerCase() !== 'pre') {
            const parent = htmlEl.parentNode!;
            while (htmlEl.firstChild) parent.insertBefore(htmlEl.firstChild, htmlEl);
            parent.removeChild(htmlEl);
            return;
          }
          node = node.parentNode;
        }
      }
    }

    // Wrap selection (or insert placeholder)
    el.focus();
    const sel = window.getSelection();
    const selected = sel?.toString() ?? '';
    document.execCommand('insertHTML', false,
      `<code style="${CODE_STYLE}">${selected || 'コード'}</code>`);
  };

  // ── Blockquote ────────────────────────────────────────────────────────────

  const handleBlockquote = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = editableRef.current;
    if (!el) return;
    el.focus();

    // Toggle: if already inside blockquote, unwrap
    if (isInsideTag('blockquote', el)) {
      document.execCommand('outdent');
      // execCommand outdent may not remove blockquote; force with formatBlock
      document.execCommand('formatBlock', false, 'div');
      return;
    }

    const sel = window.getSelection();
    const selected = sel?.toString() ?? '';
    if (selected) {
      document.execCommand('insertHTML', false,
        `<blockquote style="${BLOCKQUOTE_STYLE}">${selected}</blockquote>`);
    } else {
      document.execCommand('insertHTML', false,
        `<blockquote style="${BLOCKQUOTE_STYLE}">引用テキスト</blockquote>`);
    }
  };

  // ── Code block ────────────────────────────────────────────────────────────

  const handleCodeBlock = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = editableRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    const selected = sel?.toString() ?? '';
    const inner = selected || 'コードをここに入力';
    document.execCommand('insertHTML', false,
      `<pre style="font-family:'SFMono-Regular',Consolas,monospace;font-size:12.5px;line-height:1.55;background:rgba(29,28,29,0.04);border:1px solid rgba(29,28,29,0.13);border-radius:4px;padding:8px 12px;margin:4px 0;overflow-x:auto;white-space:pre"><code contenteditable="true" style="font-family:inherit;background:none;border:none;padding:0;color:#1D1C1D">${inner}</code></pre><br>`);
  };

  // ── File attachment ───────────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setAttachedFiles((prev) => [...prev, ...files]);
    setIsEmpty(false);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0 && editableRef.current) {
        const raw = editableRef.current.innerText?.replace(/\n/g, '').trim() ?? '';
        if (raw.length === 0) setIsEmpty(true);
      }
      return next;
    });
  };

  // ── Input handlers ────────────────────────────────────────────────────────

  const handleInput = () => {
    const el = editableRef.current;
    if (!el) return;
    const raw = el.innerText ?? '';
    const len = raw.replace(/\n/g, '').trim().length;
    setIsEmpty(len === 0 && attachedFiles.length === 0);
    setCharCount(raw.length);

    const textBefore = getTextBeforeCaret(el);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) {
      setSuggestQuery(atMatch[1]);
      setSuggestOpen(true);
      setSuggestIndex(0);
    } else {
      setSuggestOpen(false);
    }
  };

  const insertMention = useCallback((u: User) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const textNode = range.startContainer;

    if (textNode.nodeType === Node.TEXT_NODE) {
      const text = textNode.textContent ?? '';
      const offset = range.startOffset;
      const beforeCursor = text.slice(0, offset);
      const atIdx = beforeCursor.lastIndexOf('@');
      if (atIdx >= 0) {
        const newRange = document.createRange();
        newRange.setStart(textNode, atIdx);
        newRange.setEnd(textNode, offset);
        sel.removeAllRanges();
        sel.addRange(newRange);
        document.execCommand('insertHTML', false,
          `<span data-uid="${u.uid}" data-mention="true" contenteditable="false" style="color:#1264A3;background:rgba(18,100,163,0.1);border-radius:3px;padding:0 3px;font-weight:600">@${u.displayName}</span>\u00A0`
        );
      }
    }
    setSuggestOpen(false);
    setSuggestQuery('');
    setIsEmpty(false);
  }, []);

  const insertEmoji = (emoji: string) => {
    editableRef.current?.focus();
    document.execCommand('insertText', false, emoji);
    setEmojiPickerOpen(false);
    setIsEmpty(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Mention suggestions navigation
    if (suggestOpen && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSuggestIndex((i) => Math.min(i + 1, filteredUsers.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSuggestIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); const s = filteredUsers[suggestIndex]; if (s) insertMention(s); return; }
      if (e.key === 'Escape') { setSuggestOpen(false); return; }
    }

    // Keyboard shortcuts for formatting
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); exec('bold'); return;
        case 'i': e.preventDefault(); exec('italic'); return;
        case 'u': e.preventDefault(); exec('underline'); return;
        case 'k': e.preventDefault(); openLinkPopup(e as unknown as React.MouseEvent); return;
      }
    }

    // ↑ キーで最後の自分のメッセージを編集
    if (e.key === 'ArrowUp' && isEmpty && activeChannelId && user) {
      const channelMsgs = messages[activeChannelId] ?? [];
      const lastOwn = [...channelMsgs].reverse().find((m) => m.uid === user.uid);
      if (lastOwn) {
        e.preventDefault();
        setEditingMessageId(lastOwn.id);
        return;
      }
    }

    // Enter / Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); return; }
    if (e.key === 'Enter' && e.shiftKey)  { e.preventDefault(); document.execCommand('insertLineBreak'); return; }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const handleSend = async () => {
    const el = editableRef.current;
    if (!el || !activeChannelId || !user || sending) return;
    if (isEmpty && attachedFiles.length === 0) return;

    // Rate limiting: 1秒に1回まで
    const now = Date.now();
    if (now - lastSentAtRef.current < 1000) {
      toast.info('少し待ってから送信してください');
      return;
    }

    const html = el.innerHTML;
    let markdown = htmlToMarkdown(html);

    // ファイル名をテキストとして追記
    if (attachedFiles.length > 0) {
      const fileList = attachedFiles.map((f) => `📎 ${f.name.slice(0, 100)}`).join('\n');
      markdown = markdown ? `${markdown}\n${fileList}` : fileList;
    }

    if (!markdown.trim()) return;
    const mentions = parseMentionsFromHTML(html);
    setSending(true);
    lastSentAtRef.current = now;
    el.innerHTML = '';
    setIsEmpty(true);
    setCharCount(0);
    setAttachedFiles([]);
    setSuggestOpen(false);
    try {
      await sendMessage(activeChannelId, markdown, user, mentions, dmOtherUser?.uid);
    } catch (err) {
      console.error('Send error:', err);
      el.innerHTML = html;
      setIsEmpty(false);
      toast.error('メッセージの送信に失敗しました');
    } finally {
      setSending(false);
      el.focus();
    }
  };

  if (!activeChannelId) return null;

  const canSend = (!isEmpty || attachedFiles.length > 0) && !sending;

  return (
    <div className="px-4 pb-4 pt-2 flex-shrink-0">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      <div
        className="relative transition-all"
        style={{
          border: `1px solid ${isEmpty && attachedFiles.length === 0 ? '#DDDDDD' : '#1D1C1D'}`,
          borderRadius: '8px',
          boxShadow: isEmpty && attachedFiles.length === 0 ? 'none' : '0 0 0 1px #1D1C1D',
        }}
      >
        {/* Mention suggest */}
        {suggestOpen && filteredUsers.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-1 max-h-48 overflow-y-auto z-20"
            style={{ background: '#FFFFFF', border: '1px solid #DDDDDD', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <div className="px-3 py-1.5">
              <span className="text-[11px] font-bold text-[#616061] uppercase tracking-wide">チャンネルメンバー</span>
            </div>
            {filteredUsers.map((u, i) => (
              <button key={u.uid}
                onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-[#F8F8F8] transition-colors"
                style={{ background: i === suggestIndex ? '#F8F8F8' : undefined }}>
                <div className="relative flex-shrink-0">
                  {u.photoURL
                    ? <img src={u.photoURL} alt={u.displayName} className="w-7 h-7 object-cover" style={{ borderRadius: '4px' }} />
                    : <div className="w-7 h-7 flex items-center justify-center text-white text-xs font-bold" style={{ borderRadius: '4px', background: '#1164A3' }}>{u.displayName[0].toUpperCase()}</div>}
                  {u.online && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-[#007A5A]" />}
                </div>
                <span className="font-semibold text-[14px] text-[#1D1C1D]">{u.displayName}</span>
                {u.online && <span className="text-[12px] text-[#616061] ml-auto">アクティブ</span>}
              </button>
            ))}
          </div>
        )}

        {/* Emoji picker */}
        {emojiPickerOpen && (
          <div className="absolute bottom-full left-0 mb-1 z-20 p-2"
            style={{ background: '#FFFFFF', border: '1px solid #DDDDDD', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', width: '260px' }}>
            <p className="text-[11px] font-bold text-[#616061] uppercase tracking-wide px-1 mb-1.5">絵文字</p>
            <div className="grid grid-cols-10 gap-0.5">
              {EMOJI_LIST.map((emoji) => (
                <button key={emoji} onMouseDown={(e) => { e.preventDefault(); insertEmoji(emoji); }}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#F8F8F8] text-[18px]">{emoji}</button>
              ))}
            </div>
          </div>
        )}

        {/* Link popup */}
        {linkPopupOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setLinkPopupOpen(false)} />
            <div
              className="absolute bottom-full left-2 mb-2 z-40 p-3 flex flex-col gap-2"
              style={{
                background: '#FFFFFF',
                border: '1px solid #DDDDDD',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                minWidth: '280px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[12px] font-bold text-[#616061] uppercase tracking-wide">リンクを挿入</p>
              {!linkText && (
                <input
                  type="text"
                  placeholder="テキスト（省略可）"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="text-[13px] text-[#1D1C1D] focus:outline-none"
                  style={{ border: '1px solid #DDDDDD', borderRadius: '4px', padding: '5px 8px' }}
                />
              )}
              <input
                ref={linkUrlInputRef}
                type="text"
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitLink(); }
                  if (e.key === 'Escape') setLinkPopupOpen(false);
                }}
                className="text-[13px] text-[#1D1C1D] focus:outline-none"
                style={{ border: '1px solid #1D9BD1', borderRadius: '4px', padding: '5px 8px', boxShadow: '0 0 0 1px #1D9BD1' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={commitLink}
                  disabled={!linkUrl.trim()}
                  className="flex-1 py-1.5 rounded text-[13px] font-semibold text-white transition-colors"
                  style={{ background: linkUrl.trim() ? '#007A5A' : '#DDDDDD', color: linkUrl.trim() ? '#FFFFFF' : '#999999' }}
                >
                  挿入
                </button>
                <button
                  onClick={() => setLinkPopupOpen(false)}
                  className="flex-1 py-1.5 rounded text-[13px] text-[#1D1C1D] transition-colors hover:bg-[#F8F8F8]"
                  style={{ border: '1px solid #DDDDDD' }}
                >
                  キャンセル
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Top formatting toolbar ── */}
        {showTopBar && (
          <div className="flex items-center gap-0.5 px-2 py-1.5 flex-wrap"
            style={{ borderBottom: '1px solid #EEEEEE' }}>

            <ToolBtn title="太字 (Ctrl+B)" active={fmt.bold} onMouseDown={(e) => { e.preventDefault(); exec('bold'); }}>
              <span style={{ fontWeight: 700, fontSize: '13px', fontFamily: 'inherit' }}>B</span>
            </ToolBtn>
            <ToolBtn title="斜体 (Ctrl+I)" active={fmt.italic} onMouseDown={(e) => { e.preventDefault(); exec('italic'); }}>
              <span style={{ fontStyle: 'italic', fontSize: '13px' }}>I</span>
            </ToolBtn>
            <ToolBtn title="下線 (Ctrl+U)" active={fmt.underline} onMouseDown={(e) => { e.preventDefault(); exec('underline'); }}>
              <span style={{ textDecoration: 'underline', fontSize: '13px' }}>U</span>
            </ToolBtn>
            <ToolBtn title="打ち消し線" active={fmt.strike} onMouseDown={(e) => { e.preventDefault(); exec('strikeThrough'); }}>
              <span style={{ textDecoration: 'line-through', fontSize: '13px' }}>S</span>
            </ToolBtn>

            <div className="w-px h-4 bg-[#DDDDDD] mx-0.5 flex-shrink-0" />

            {/* Link (Ctrl+K) */}
            <ToolBtn title="リンク (Ctrl+K)" onMouseDown={openLinkPopup}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
            </ToolBtn>

            <div className="w-px h-4 bg-[#DDDDDD] mx-0.5 flex-shrink-0" />

            {/* Ordered list */}
            <ToolBtn title="番号付きリスト" onMouseDown={(e) => { e.preventDefault(); exec('insertOrderedList'); }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6l1.5-.75v5.25M3 16.5h1.5M3 18.75h1.5c0-.75.75-.75.75-1.5s-.75-1.5-.75-1.5" />
              </svg>
            </ToolBtn>
            {/* Bullet list */}
            <ToolBtn title="箇条書き" onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList'); }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </ToolBtn>

            <div className="w-px h-4 bg-[#DDDDDD] mx-0.5 flex-shrink-0" />

            {/* Blockquote */}
            <ToolBtn title="引用" onMouseDown={handleBlockquote}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h11M3 14h7m-7-8h16" />
              </svg>
            </ToolBtn>

            {/* Inline code */}
            <ToolBtn title="インラインコード" onMouseDown={handleInlineCode}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            </ToolBtn>

            {/* Code block */}
            <ToolBtn title="コードブロック" onMouseDown={handleCodeBlock}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
              </svg>
            </ToolBtn>
          </div>
        )}

        {/* ── Attached files preview ── */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-2">
            {attachedFiles.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2 py-1 rounded text-[12px]"
                style={{ background: '#F0F0F0', border: '1px solid #DDDDDD', maxWidth: '200px' }}
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0 text-[#616061]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
                <span className="truncate text-[#1D1C1D]">{file.name}</span>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => removeFile(i)}
                  className="flex-shrink-0 text-[#616061] hover:text-[#E01E5A] transition-colors ml-0.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Editable content area ── */}
        <div className="relative">
          {isEmpty && attachedFiles.length === 0 && (
            <div
              className="absolute top-0 left-0 px-4 py-3 text-[15px] pointer-events-none select-none leading-relaxed"
              style={{ color: '#616061' }}
            >
              {placeholder}
            </div>
          )}
          <div
            ref={editableRef}
            contentEditable={!sending}
            role="textbox"
            aria-multiline="true"
            aria-label={placeholder}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className="w-full px-4 py-3 text-[15px] text-[#1D1C1D] focus:outline-none leading-relaxed"
            style={{ minHeight: '64px', maxHeight: '200px', overflowY: 'auto', wordBreak: 'break-word' }}
            suppressContentEditableWarning
          />
        </div>

        {/* ── Bottom secondary toolbar ── */}
        <div className="flex items-center justify-between px-2 py-1.5"
          style={{ borderTop: '1px solid #EEEEEE' }}>
          <div className="flex items-center gap-0.5">
            {/* File attachment */}
            <ToolBtn title="ファイルを添付（ファイル名をテキストに追加）" onClick={() => fileInputRef.current?.click()}>
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
            </ToolBtn>

            {/* Aa — toggles top formatting toolbar */}
            <ToolBtn title="書式設定" onClick={() => setShowTopBar((v) => !v)} active={showTopBar}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
              </svg>
            </ToolBtn>

            {/* Emoji */}
            <ToolBtn title="絵文字" onClick={() => setEmojiPickerOpen((p) => !p)} active={emojiPickerOpen}>
              <span style={{ fontSize: '16px', lineHeight: 1 }}>😊</span>
            </ToolBtn>

            {/* @ mention */}
            <ToolBtn title="メンション" onMouseDown={(e) => {
              e.preventDefault();
              editableRef.current?.focus();
              document.execCommand('insertText', false, '@');
              setSuggestQuery('');
              setSuggestOpen(true);
              setIsEmpty(false);
            }}>
              <span style={{ fontWeight: 700, fontSize: '14px' }}>@</span>
            </ToolBtn>

            <div className="w-px h-4 bg-[#DDDDDD] mx-0.5 flex-shrink-0" />

            {/* Video (decorative) */}
            <ToolBtn title="ビデオクリップ（未対応）">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </ToolBtn>

            {/* Mic (decorative) */}
            <ToolBtn title="音声メッセージ（未対応）">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </ToolBtn>
          </div>

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            title="送信 (Enter)"
            className="w-8 h-8 flex items-center justify-center rounded transition-colors flex-shrink-0"
            style={{
              background: canSend ? '#007A5A' : '#DDDDDD',
              color: canSend ? '#FFFFFF' : '#999999',
              cursor: canSend ? 'pointer' : 'not-allowed',
            }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="hidden md:flex items-center justify-between mt-1 px-1">
        <p className="text-[12px] text-[#616061]">
          <kbd className="font-mono bg-[#F8F8F8] border border-[#DDDDDD] rounded px-1">Enter</kbd> で送信・
          <kbd className="font-mono bg-[#F8F8F8] border border-[#DDDDDD] rounded px-1">Shift+Enter</kbd> で改行・
          <kbd className="font-mono bg-[#F8F8F8] border border-[#DDDDDD] rounded px-1">Ctrl+/</kbd> でショートカット一覧
        </p>
        {charCount > 3500 && (
          <span
            className="text-[12px] font-medium flex-shrink-0 ml-2"
            style={{ color: charCount > 4000 ? '#E01E5A' : '#E8A000' }}
          >
            {charCount} / 4000
          </span>
        )}
      </div>
    </div>
  );
}
