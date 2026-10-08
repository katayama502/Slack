import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { format } from 'date-fns';
import { useAppStore } from '../../store/useAppStore';
import { sendMessage } from '../../services';
import { useSendTyping } from '../../hooks/useTyping';
import { toast } from '../ui/Toast';
import EmojiPickerComponent from '../ui/EmojiPicker';
import Avatar from '../ui/Avatar';
import {
  BoldIcon, ItalicIcon, UnderlineIcon, StrikeIcon, LinkIcon, OrderedListIcon, BulletListIcon,
  QuoteIcon, CodeIcon, CodeBlockIcon, PlusIcon, FormatAaIcon, EmojiIcon, AtIcon, VideoIcon,
  MicIcon, SlashBoxIcon, SendFilledIcon, ChevronDownIcon, LockIcon, HashIcon, PaperclipIcon,
  CalendarClockIcon, CloseIcon,
} from '../ui/icons';
import type { User } from '../../types';

// ── Draft auto-save (debounced 800 ms) ───────────────────────────────────────
function useDraftAutoSave(channelId: string | null) {
  const saveDraft = useAppStore((s) => s.saveDraft);
  const deleteDraft = useAppStore((s) => s.deleteDraft);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = useCallback((html: string, text: string) => {
    if (!channelId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveDraft(channelId, html, text);
    }, 800);
  }, [channelId, saveDraft]);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clear = useCallback(() => {
    flush();
    if (channelId) deleteDraft(channelId);
  }, [channelId, deleteDraft, flush]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { schedule, clear };
}

// ── Scheduled messages (client-side, localStorage) ───────────────────────────
// 制約: サーバー側のスケジューラは無いため、このブラウザでアプリを開いている間にのみ送信される。
const SCHEDULED_KEY = 'slack_clone_scheduled';

export interface ScheduledItem {
  id: string;
  channelId: string;
  text: string;          // markdown
  mentions: string[];
  sendAt: number;        // epoch ms
  dmRecipientUid?: string;
  uid?: string;          // 予約したユーザー（別ユーザーとして送信しないためのガード）
}

function loadScheduled(): ScheduledItem[] {
  try {
    const raw = localStorage.getItem(SCHEDULED_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is ScheduledItem =>
        !!x && typeof x.id === 'string' && typeof x.channelId === 'string' &&
        typeof x.text === 'string' && typeof x.sendAt === 'number'
    );
  } catch {
    return [];
  }
}

function saveScheduled(items: ScheduledItem[]) {
  try {
    localStorage.setItem(SCHEDULED_KEY, JSON.stringify(items));
  } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event('slack-scheduled-changed'));
}

/** 二重送信防止（同一タブ内） */
const scheduledInFlight = new Set<string>();

function useScheduledItems(): ScheduledItem[] {
  const [items, setItems] = useState<ScheduledItem[]>(() => loadScheduled());
  useEffect(() => {
    const reload = () => setItems(loadScheduled());
    window.addEventListener('slack-scheduled-changed', reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener('slack-scheduled-changed', reload);
      window.removeEventListener('storage', reload);
    };
  }, []);
  return items;
}

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
  const result = Array.from(doc.body.childNodes).map(nodeToMd).join('');
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

/** insertHTML に埋め込む文字列は必ずエスケープする */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

function selectionInside(el: HTMLElement): boolean {
  const sel = window.getSelection();
  return !!sel && sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).commonAncestorContainer);
}

function placeCaretAtEnd(el: HTMLElement) {
  const r = document.createRange();
  const sel = window.getSelection();
  r.selectNodeContents(el);
  r.collapse(false);
  sel?.removeAllRanges();
  sel?.addRange(r);
}

function formatScheduleLabel(ts: number): string {
  return format(new Date(ts), 'M月d日 HH:mm');
}

function scheduleOptions(): { label: string; sub: string; at: number }[] {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 60 * 1000);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const nextMon = new Date(now);
  const add = ((8 - now.getDay()) % 7) || 7; // 次の月曜（今日が月曜なら翌週）
  nextMon.setDate(now.getDate() + add);
  nextMon.setHours(9, 0, 0, 0);
  return [
    { label: '今日', sub: `${format(in30, 'HH:mm')}（30分後）`, at: in30.getTime() },
    { label: '明日', sub: '9:00', at: tomorrow.getTime() },
    { label: '来週月曜', sub: '9:00', at: nextMon.getTime() },
  ];
}

// ─── Toolbar button ─────────────────────────────────────────────────────────

function ToolBtn({
  title,
  onClick,
  onMouseDown,
  active,
  children,
  round,
}: {
  title: string;
  onClick?: () => void;
  onMouseDown?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  active?: boolean;
  children: React.ReactNode;
  round?: boolean;
}) {
  const restBg = active || round ? 'var(--sk-subtle)' : 'transparent';
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      onMouseDown={onMouseDown}
      className="w-7 h-7 flex items-center justify-center flex-shrink-0"
      style={{
        borderRadius: round ? '50%' : 4,
        color: active ? 'var(--sk-text)' : 'var(--sk-text-2)',
        background: restBg,
        transition: 'background 120ms ease, color 120ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = round ? 'rgba(29,28,29,0.12)' : 'var(--sk-subtle)';
        e.currentTarget.style.color = 'var(--sk-text)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = restBg;
        e.currentTarget.style.color = active ? 'var(--sk-text)' : 'var(--sk-text-2)';
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 mx-1 flex-shrink-0" style={{ background: 'var(--sk-border)' }} />;
}

/** Slack 風メニュー項目（ホバーで青背景・白文字） */
function MenuItem({ children, onClick, icon }: { children: React.ReactNode; onClick: () => void; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-4 text-left text-[15px]"
      style={{ height: 32, color: 'var(--sk-text)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sk-link)'; e.currentTarget.style.color = '#FFFFFF'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sk-text)'; }}
    >
      {icon}
      <span className="flex-1 truncate">{children}</span>
    </button>
  );
}

const POPOVER_STYLE: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid var(--sk-border)',
  borderRadius: 8,
  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
};

const SELECTED_BG = 'var(--sk-link)'; // Slack のキーボード選択色 #1264A3

// ─── Constants ───────────────────────────────────────────────────────────────

const CODE_STYLE = "font-family:'SFMono-Regular',Consolas,monospace;font-size:12px;background:rgba(29,28,29,0.04);border:1px solid rgba(29,28,29,0.13);border-radius:3px;padding:2px 3px;color:#E01E5A";
const BLOCKQUOTE_STYLE = "border-left:4px solid #DDDDDD;margin:4px 0;padding:0 0 0 12px;display:block";
const MENTION_STYLE = 'background:var(--sk-mention-bg);color:var(--sk-link);border-radius:3px;padding:0 2px;font-weight:400';

type SuggestItem =
  | { kind: 'special'; key: 'channel' | 'here'; desc: string }
  | { kind: 'user'; user: User };

const SPECIAL_MENTIONS: SuggestItem[] = [
  { kind: 'special', key: 'channel', desc: 'このチャンネルの全員に通知します' },
  { kind: 'special', key: 'here', desc: 'このチャンネルのアクティブなメンバーに通知します' },
];

const SLASH_COMMANDS = [
  { name: 'me', description: 'アクションメッセージを送信', usage: '[テキスト]' },
  { name: 'shrug', description: '¯\\_(ツ)_/¯ を送信', usage: '[メッセージ]' },
  { name: 'tableflip', description: '(╯°□°）╯︵ ┻━┻ を送信', usage: '' },
  { name: 'unflip', description: '┬─┬ ノ( ゜-゜ノ) を送信', usage: '' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function MessageInput() {
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const channels = useAppStore((s) => s.channels);
  const messages = useAppStore((s) => s.messages);
  const { user } = useAppStore((s) => s.auth);
  const users = useAppStore((s) => s.users);
  const setEditingMessageId = useAppStore((s) => s.setEditingMessageId);
  const drafts = useAppStore((s) => s.drafts);
  const { schedule: scheduleDraftSave, clear: clearDraft } = useDraftAutoSave(activeChannelId);
  const scheduledItems = useScheduledItems();

  const [sending, setSending] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestQuery, setSuggestQuery] = useState('');
  const [suggestIndex, setSuggestIndex] = useState(0);
  const [slashCmdOpen, setSlashCmdOpen] = useState(false);
  const [slashCmdQuery, setSlashCmdQuery] = useState('');
  const [slashCmdIndex, setSlashCmdIndex] = useState(0);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [showTopBar, setShowTopBar] = useState(true);
  const [charCount, setCharCount] = useState(0);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [scheduleMenuOpen, setScheduleMenuOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [scheduledListOpen, setScheduledListOpen] = useState(false);
  const lastSentAtRef = useRef<number>(0);  // rate limiting

  const filteredSlashCmds = SLASH_COMMANDS.filter(
    (c) => c.name.startsWith(slashCmdQuery.toLowerCase())
  );

  // Active format states (updated on selectionchange)
  const [fmt, setFmt] = useState({ bold: false, italic: false, underline: false, strike: false, ol: false, ul: false, blockquote: false, code: false });

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
  const { startTyping, stopTyping } = useSendTyping(activeChannelId);

  const channel = channels.find((c) => c.id === activeChannelId);
  const isDM = channel?.name.startsWith('__dm__') ?? false;
  const dmOtherUser = isDM
    ? users.find((u) => u.uid !== user?.uid && channel?.members?.includes(u.uid))
    : null;
  const isSelfDM = isDM && !dmOtherUser;
  const placeholderText = isDM
    ? isSelfDM
      ? '自分へのメモ…'
      : `${dmOtherUser!.displayName} へのメッセージ`
    : channel ? `${channel.isPrivate ? '🔒' : '#'}${channel.name} へのメッセージ` : 'メッセージを送信';

  const channelScheduled = scheduledItems
    .filter((s) => s.channelId === activeChannelId && (!s.uid || s.uid === user?.uid))
    .sort((a, b) => a.sendAt - b.sendAt);

  // Reset / restore editor on channel change
  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    setSuggestOpen(false);
    setAttachedFiles([]);
    setLinkPopupOpen(false);
    setScheduledListOpen(false);

    const draft = activeChannelId ? drafts[activeChannelId] : undefined;
    if (draft && draft.html) {
      // Restore draft content: parse through DOMParser for defensive sanitisation,
      // then transplant nodes (avoids setting innerHTML directly).
      const parsed = new DOMParser().parseFromString(draft.html, 'text/html');
      el.textContent = '';
      Array.from(parsed.body.childNodes).forEach((node) => {
        el.appendChild(document.importNode(node, true));
      });
      setIsEmpty(false);
      placeCaretAtEnd(el);
    } else {
      el.textContent = '';
      setIsEmpty(true);
    }
  // drafts excluded from deps — run only when channel changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannelId]);

  // Track active formatting via selectionchange
  useEffect(() => {
    const update = () => {
      const el = editableRef.current;
      if (!el || !selectionInside(el)) return;
      setFmt({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
        ol: isInsideTag('ol', el),
        ul: isInsideTag('ul', el),
        blockquote: isInsideTag('blockquote', el),
        code: isInsideTag('code', el),
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

  // ── Scheduled sender: 15 秒ごとに期限が来た予約メッセージを送信 ─────────────
  useEffect(() => {
    if (!user) return;
    const tick = async () => {
      const now = Date.now();
      const due = loadScheduled().filter(
        (s) => s.sendAt <= now && (!s.uid || s.uid === user.uid) && !scheduledInFlight.has(s.id)
      );
      for (const item of due) {
        scheduledInFlight.add(item.id);
        // 先にストレージから取り除いて「確保」する（他タブとの二重送信も抑止）
        saveScheduled(loadScheduled().filter((s) => s.id !== item.id));
        try {
          await sendMessage(item.channelId, item.text, user, item.mentions ?? [], item.dmRecipientUid);
          toast.success('送信予定のメッセージを送信しました');
        } catch (err) {
          console.error('Scheduled send error:', err);
          // 失敗時は戻して次回リトライ
          const cur = loadScheduled();
          if (!cur.some((s) => s.id === item.id)) saveScheduled([...cur, item]);
        } finally {
          scheduledInFlight.delete(item.id);
        }
      }
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [user]);

  const q = suggestQuery.toLowerCase();
  const suggestItems: SuggestItem[] = [
    ...(!isDM ? SPECIAL_MENTIONS.filter((s) => s.kind === 'special' && s.key.startsWith(q)) : []),
    ...users
      .filter((u) => u.uid !== user?.uid && u.displayName.toLowerCase().includes(q))
      .map((u): SuggestItem => ({ kind: 'user', user: u })),
  ];

  const runCmd = (command: string, value?: string) => {
    editableRef.current?.focus();
    document.execCommand(command, false, value);
  };

  // ── Link ──────────────────────────────────────────────────────────────────

  const openLinkPopup = (e?: { preventDefault: () => void }) => {
    e?.preventDefault();
    const el = editableRef.current;
    const sel = window.getSelection();
    if (el && sel && selectionInside(el)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      setLinkText(sel.toString());
    } else {
      savedRangeRef.current = null;
      setLinkText('');
    }
    setLinkUrl('');
    setLinkPopupOpen(true);
  };

  const commitLink = () => {
    if (!linkUrl.trim()) { setLinkPopupOpen(false); return; }
    const rawUrl = linkUrl.trim();
    // http/https のみ許可（javascript: / data: などを拒否）
    const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    let safeUrl: string;
    try {
      safeUrl = new URL(withProtocol).toString();
    } catch {
      setLinkPopupOpen(false);
      return; // 無効なURLは無視
    }
    if (!/^https?:\/\//i.test(safeUrl)) { setLinkPopupOpen(false); return; }

    const el = editableRef.current;
    const sel = window.getSelection();
    el?.focus();
    if (savedRangeRef.current) {
      sel?.removeAllRanges();
      sel?.addRange(savedRangeRef.current);
    } else if (el) {
      placeCaretAtEnd(el);
    }
    if (!savedRangeRef.current || savedRangeRef.current.collapsed) {
      // 選択範囲なし → DOM API で安全にリンク挿入（textContent でエスケープ）
      const a = document.createElement('a');
      a.href = safeUrl;
      a.textContent = linkText.trim() || safeUrl;
      a.style.color = '#1264A3';
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
      document.execCommand('insertHTML', false, a.outerHTML + ' ');
    } else {
      // 選択範囲をリンクで囲む
      document.execCommand('createLink', false, safeUrl);
      el?.querySelectorAll('a').forEach((a) => {
        if (a.getAttribute('href') !== safeUrl) return;
        a.style.color = '#1264A3';
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
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

    el.focus();
    const selected = window.getSelection()?.toString() ?? '';
    document.execCommand('insertHTML', false,
      `<code style="${CODE_STYLE}">${escapeHtml(selected || 'コード')}</code>`);
    setIsEmpty(false);
  };

  // ── Blockquote ────────────────────────────────────────────────────────────

  const handleBlockquote = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = editableRef.current;
    if (!el) return;
    el.focus();

    if (isInsideTag('blockquote', el)) {
      document.execCommand('outdent');
      document.execCommand('formatBlock', false, 'div');
      return;
    }

    const selected = window.getSelection()?.toString() ?? '';
    document.execCommand('insertHTML', false,
      `<blockquote style="${BLOCKQUOTE_STYLE}">${escapeHtml(selected || '引用テキスト')}</blockquote>`);
    setIsEmpty(false);
  };

  // ── Code block ────────────────────────────────────────────────────────────

  const insertCodeBlock = () => {
    const el = editableRef.current;
    if (!el) return;
    el.focus();
    if (!selectionInside(el)) placeCaretAtEnd(el);
    const selected = window.getSelection()?.toString() ?? '';
    const inner = escapeHtml(selected || 'コードをここに入力');
    document.execCommand('insertHTML', false,
      `<pre style="font-family:'SFMono-Regular',Consolas,monospace;font-size:12px;line-height:1.5;background:rgba(29,28,29,0.04);border:1px solid rgba(29,28,29,0.13);border-radius:4px;padding:8px;margin:4px 0;overflow-x:auto;white-space:pre"><code style="font-family:inherit;background:none;border:none;padding:0;color:#1D1C1D">${inner}</code></pre><br>`);
    setIsEmpty(false);
  };

  const handleCodeBlock = (e: React.MouseEvent) => {
    e.preventDefault();
    insertCodeBlock();
  };

  // ── File attachment ───────────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setAttachedFiles((prev) => [...prev, ...files]);
    setIsEmpty(false);
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

    if (len > 0) startTyping(); else stopTyping();

    scheduleDraftSave(el.innerHTML, raw);

    const textBefore = getTextBeforeCaret(el);
    const atMatch = textBefore.match(/(?:^|\s)@([^\s@]*)$/);
    if (atMatch) {
      setSuggestQuery(atMatch[1]);
      setSuggestOpen(true);
      setSuggestIndex(0);
      setSlashCmdOpen(false);
    } else {
      setSuggestOpen(false);
    }

    // Slash command suggestions (only while the first word is "/xxx")
    const rawText = el.innerText?.trim() ?? '';
    const slashMatch = rawText.match(/^\/(\w*)/);
    if (slashMatch && !atMatch && !/^\/\w*\s/.test(rawText)) {
      setSlashCmdQuery(slashMatch[1]);
      setSlashCmdOpen(true);
      setSlashCmdIndex(0);
    } else {
      setSlashCmdOpen(false);
    }
  };

  /** 先頭の "/xxx" をコマンド名に置き換える（それ以外の本文は保持） */
  const applySlashCommand = (name: string) => {
    const el = editableRef.current;
    if (!el) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let first = walker.nextNode() as Text | null;
    while (first && !(first.textContent ?? '').trim()) first = walker.nextNode() as Text | null;
    if (first && /^\s*\/\w*/.test(first.textContent ?? '')) {
      first.textContent = (first.textContent ?? '').replace(/^\s*\/\w*\s?/, `/${name} `);
    } else {
      el.textContent = `/${name} `;
    }
    setSlashCmdOpen(false);
    setIsEmpty(false);
    el.focus();
    placeCaretAtEnd(el);
  };

  /** キャレット直前の "@xxx" を選択状態にする */
  const selectAtToken = (): boolean => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    const textNode = range.startContainer;
    if (textNode.nodeType !== Node.TEXT_NODE) return false;
    const text = textNode.textContent ?? '';
    const offset = range.startOffset;
    const atIdx = text.slice(0, offset).lastIndexOf('@');
    if (atIdx < 0) return false;
    const newRange = document.createRange();
    newRange.setStart(textNode, atIdx);
    newRange.setEnd(textNode, offset);
    sel.removeAllRanges();
    sel.addRange(newRange);
    return true;
  };

  const insertSuggestion = useCallback((item: SuggestItem) => {
    if (selectAtToken()) {
      if (item.kind === 'special') {
        document.execCommand('insertText', false, `@${item.key} `);
      } else {
        const u = item.user;
        document.execCommand('insertHTML', false,
          `<span data-uid="${escapeHtml(u.uid)}" data-mention="true" contenteditable="false" style="${MENTION_STYLE}">@${escapeHtml(u.displayName)}</span> `
        );
      }
    }
    setSuggestOpen(false);
    setSuggestQuery('');
    setIsEmpty(false);
  }, []);

  const insertEmoji = (emoji: string) => {
    const el = editableRef.current;
    el?.focus();
    if (el && !selectionInside(el)) placeCaretAtEnd(el);
    document.execCommand('insertText', false, emoji);
    setEmojiPickerOpen(false);
    setIsEmpty(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (slashCmdOpen && filteredSlashCmds.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashCmdIndex((i) => Math.min(i + 1, filteredSlashCmds.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSlashCmdIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const cmd = filteredSlashCmds[slashCmdIndex];
        if (cmd) applySlashCommand(cmd.name);
        return;
      }
      if (e.key === 'Escape') { setSlashCmdOpen(false); return; }
    }

    if (suggestOpen && suggestItems.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSuggestIndex((i) => Math.min(i + 1, suggestItems.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSuggestIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); const s = suggestItems[suggestIndex]; if (s) insertSuggestion(s); return; }
      if (e.key === 'Escape') { setSuggestOpen(false); return; }
    }

    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); runCmd('bold'); return;
        case 'i': e.preventDefault(); runCmd('italic'); return;
        case 'u': e.preventDefault(); runCmd('underline'); return;
        case 'k': e.preventDefault(); openLinkPopup(e); return;
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

    if (e.key === 'Enter') {
      const el = editableRef.current;
      const insideList = el ? (isInsideTag('li', el) || isInsideTag('ul', el) || isInsideTag('ol', el)) : false;

      if (insideList) {
        if (e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
        return;
      }

      if (!e.shiftKey) { e.preventDefault(); handleSend(); return; }
      e.preventDefault(); document.execCommand('insertLineBreak'); return;
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  /** エディタ内容を送信用 markdown に変換（スラッシュコマンド・添付名を反映） */
  const buildPayload = (): { html: string; markdown: string; mentions: string[] } | null => {
    const el = editableRef.current;
    if (!el || !user) return null;
    const html = el.innerHTML;
    let markdown = htmlToMarkdown(html);

    const trimmed = markdown.trim();
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('/me ')) {
      const action = trimmed.slice(4).trim();
      markdown = `_${user.displayName} ${action}_`;
    } else if (lower === '/shrug' || lower.startsWith('/shrug ')) {
      const rest = trimmed.slice(6).trim();
      markdown = rest ? `${rest} ¯\\_(ツ)_/¯` : '¯\\_(ツ)_/¯';
    } else if (lower === '/tableflip') {
      markdown = '(╯°□°）╯︵ ┻━┻';
    } else if (lower === '/unflip') {
      markdown = '┬─┬ ノ( ゜-゜ノ)';
    }

    if (attachedFiles.length > 0) {
      const fileList = attachedFiles.map((f) => `📎 ${f.name.slice(0, 100)}`).join('\n');
      markdown = markdown ? `${markdown}\n${fileList}` : fileList;
    }
    if (!markdown.trim()) return null;
    return { html, markdown, mentions: parseMentionsFromHTML(html) };
  };

  const resetEditor = () => {
    const el = editableRef.current;
    stopTyping();
    clearDraft();
    if (el) el.textContent = '';
    setIsEmpty(true);
    setCharCount(0);
    setAttachedFiles([]);
    setSuggestOpen(false);
    setSlashCmdOpen(false);
  };

  const handleSend = async () => {
    const el = editableRef.current;
    if (!el || !activeChannelId || !user || sending) return;
    if (isEmpty && attachedFiles.length === 0) return;

    const now = Date.now();
    if (now - lastSentAtRef.current < 1000) {
      toast.info('少し待ってから送信してください');
      return;
    }

    const payload = buildPayload();
    if (!payload) return;
    const { html, markdown, mentions } = payload;
    setSending(true);
    lastSentAtRef.current = now;
    resetEditor();
    try {
      await sendMessage(activeChannelId, markdown, user, mentions, dmOtherUser?.uid);
    } catch (err) {
      console.error('Send error:', err);
      // Restore content on failure
      el.textContent = '';
      Array.from(new DOMParser().parseFromString(html, 'text/html').body.childNodes).forEach((node) => {
        el.appendChild(document.importNode(node, true));
      });
      setIsEmpty(false);
      toast.error('メッセージの送信に失敗しました');
    } finally {
      setSending(false);
      el.focus();
    }
  };

  const scheduleSend = (sendAt: number) => {
    setScheduleMenuOpen(false);
    setCustomOpen(false);
    if (!activeChannelId || !user) return;
    if (!Number.isFinite(sendAt) || sendAt <= Date.now()) {
      toast.error('未来の日時を指定してください');
      return;
    }
    const payload = buildPayload();
    if (!payload) return;
    const item: ScheduledItem = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      channelId: activeChannelId,
      text: payload.markdown.slice(0, 4000),
      mentions: payload.mentions,
      sendAt,
      dmRecipientUid: dmOtherUser?.uid,
      uid: user.uid,
    };
    saveScheduled([...loadScheduled(), item]);
    resetEditor();
    toast.success(`${formatScheduleLabel(sendAt)} に送信予定です（アプリを開いている間に送信されます）`);
  };

  const cancelScheduled = (id: string) => {
    saveScheduled(loadScheduled().filter((s) => s.id !== id));
    toast.info('送信予定のメッセージをキャンセルしました');
  };

  /** スラッシュボタン: 先頭に "/" を入れてコマンドメニューを開く */
  const openSlashMenu = () => {
    const el = editableRef.current;
    if (!el) return;
    el.focus();
    const slash = document.createTextNode('/');
    if (isEmpty) el.textContent = '';
    el.insertBefore(slash, el.firstChild);
    const r = document.createRange();
    r.setStart(slash, 1);
    r.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
    setIsEmpty(false);
    setSlashCmdQuery('');
    setSlashCmdIndex(0);
    setSlashCmdOpen(true);
    setSuggestOpen(false);
  };

  const insertAtSign = () => {
    const el = editableRef.current;
    if (!el) return;
    el.focus();
    if (!selectionInside(el)) placeCaretAtEnd(el);
    const before = getTextBeforeCaret(el);
    document.execCommand('insertText', false, before && !/\s$/.test(before) ? ' @' : '@');
    setSuggestQuery('');
    setSuggestIndex(0);
    setSuggestOpen(true);
    setIsEmpty(false);
  };

  if (!activeChannelId) return null;

  const canSend = (!isEmpty || attachedFiles.length > 0) && !sending;
  const toolbarDim = !isFocused && isEmpty && attachedFiles.length === 0;
  const anyMenuOpen = plusMenuOpen || scheduleMenuOpen;
  const closeMenus = () => { setPlusMenuOpen(false); setScheduleMenuOpen(false); setCustomOpen(false); };

  const defaultCustom = () => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0, 0);
    return format(d, "yyyy-MM-dd'T'HH:mm");
  };

  const iconCls = 'w-[18px] h-[18px]';

  return (
    <div className="px-5 pb-5 flex-shrink-0 relative">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* ── Scheduled messages bar ── */}
      {channelScheduled.length > 0 && (
        <div className="relative mb-1">
          <div
            className="flex items-center gap-2 px-3 text-[13px]"
            style={{ height: 32, color: 'var(--sk-text-2)', background: 'var(--sk-hover)', border: '1px solid var(--sk-border)', borderRadius: 8 }}
          >
            <CalendarClockIcon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 truncate">
              このチャンネルに送信予定のメッセージが {channelScheduled.length} 件あります
            </span>
            <button
              type="button"
              onClick={() => setScheduledListOpen((v) => !v)}
              className="font-bold hover:underline flex-shrink-0"
              style={{ color: 'var(--sk-link)' }}
            >
              {scheduledListOpen ? '閉じる' : '表示'}
            </button>
          </div>
          {scheduledListOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setScheduledListOpen(false)} />
              <div className="absolute bottom-full left-0 right-0 mb-1 z-30 py-2 max-h-72 overflow-y-auto" style={POPOVER_STYLE}>
                <div className="px-4 pb-1 text-[13px] font-bold" style={{ color: 'var(--sk-text-2)' }}>送信予定のメッセージ</div>
                {channelScheduled.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-1.5" style={{ minHeight: 36 }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px]" style={{ color: 'var(--sk-text-2)' }}>{formatScheduleLabel(s.sendAt)} に送信</div>
                      <div className="text-[14px] truncate" style={{ color: 'var(--sk-text)' }}>{s.text}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => cancelScheduled(s.id)}
                      className="text-[13px] font-bold px-2 h-7 flex-shrink-0"
                      style={{ border: '1px solid var(--sk-border-strong)', borderRadius: 4, color: 'var(--sk-text)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sk-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      キャンセル
                    </button>
                  </div>
                ))}
                <div className="px-4 pt-1 text-[12px]" style={{ color: 'var(--sk-text-3)' }}>
                  ※ 予約送信はこのブラウザでアプリを開いている間にのみ実行されます
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div
        className="relative"
        style={{
          background: '#FFFFFF',
          border: `1px solid ${isFocused ? 'rgba(29,28,29,0.5)' : 'var(--sk-border-strong)'}`,
          borderRadius: 8,
          boxShadow: isFocused ? '0 0 0 1px rgba(29,28,29,0.5)' : 'none',
          transition: 'border-color 150ms, box-shadow 150ms',
        }}
      >
        {/* Slash command suggest */}
        {slashCmdOpen && filteredSlashCmds.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-1 z-20 py-2" style={POPOVER_STYLE}>
            <div className="px-4 pb-1 text-[13px] font-bold" style={{ color: 'var(--sk-text-2)' }}>スラッシュコマンド</div>
            {filteredSlashCmds.map((cmd, i) => {
              const sel = i === slashCmdIndex;
              return (
                <button key={cmd.name}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); applySlashCommand(cmd.name); }}
                  onMouseEnter={() => setSlashCmdIndex(i)}
                  className="w-full flex items-center gap-2 px-4 text-left"
                  style={{ height: 36, background: sel ? SELECTED_BG : 'transparent', color: sel ? '#FFFFFF' : 'var(--sk-text)' }}
                >
                  <span className="font-bold text-[15px]">/{cmd.name}</span>
                  {cmd.usage && <span className="text-[13px]" style={{ color: sel ? 'rgba(255,255,255,0.8)' : 'var(--sk-text-3)' }}>{cmd.usage}</span>}
                  <span className="ml-auto text-[13px] truncate" style={{ color: sel ? 'rgba(255,255,255,0.9)' : 'var(--sk-text-2)' }}>{cmd.description}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Mention suggest */}
        {suggestOpen && suggestItems.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-1 max-h-64 overflow-y-auto z-20 py-2" style={POPOVER_STYLE}>
            <div className="px-4 pb-1 text-[13px] font-bold" style={{ color: 'var(--sk-text-2)' }}>メンバー</div>
            {suggestItems.map((item, i) => {
              const sel = i === suggestIndex;
              const key = item.kind === 'special' ? `__${item.key}` : item.user.uid;
              return (
                <button key={key}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); insertSuggestion(item); }}
                  onMouseEnter={() => setSuggestIndex(i)}
                  className="w-full flex items-center gap-2 px-4 text-left"
                  style={{ height: 36, background: sel ? SELECTED_BG : 'transparent', color: sel ? '#FFFFFF' : 'var(--sk-text)' }}
                >
                  {item.kind === 'special' ? (
                    <>
                      <span className="w-6 h-6 flex items-center justify-center flex-shrink-0" style={{ borderRadius: 6, background: sel ? 'rgba(255,255,255,0.2)' : 'var(--sk-subtle)' }}>
                        <AtIcon className="w-4 h-4" />
                      </span>
                      <span className="font-bold text-[15px]">@{item.key}</span>
                      <span className="text-[13px] truncate" style={{ color: sel ? 'rgba(255,255,255,0.85)' : 'var(--sk-text-2)' }}>{item.desc}</span>
                    </>
                  ) : (
                    <>
                      <Avatar name={item.user.displayName} photoURL={item.user.photoURL} size={24} radius={6} />
                      <span className="font-bold text-[15px] truncate">{item.user.displayName}</span>
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={item.user.online
                          ? { background: 'var(--sk-online)' }
                          : { border: `1px solid ${sel ? '#FFFFFF' : 'var(--sk-text-3)'}` }}
                        title={item.user.online ? 'アクティブ' : '離席中'}
                      />
                      {item.user.status?.emoji && <span className="text-[13px]">{item.user.status.emoji}</span>}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Emoji picker */}
        {emojiPickerOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setEmojiPickerOpen(false)} />
            <div className="absolute bottom-full left-0 mb-1 z-30">
              <EmojiPickerComponent
                onSelect={(emoji) => { insertEmoji(emoji); }}
                onClose={() => setEmojiPickerOpen(false)}
              />
            </div>
          </>
        )}

        {/* Link popup */}
        {linkPopupOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setLinkPopupOpen(false)} />
            <div
              className="absolute bottom-full left-2 mb-2 z-40 p-4 flex flex-col gap-2"
              style={{ ...POPOVER_STYLE, minWidth: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[15px] font-bold" style={{ color: 'var(--sk-text)' }}>リンクを追加</p>
              <label className="text-[13px] font-bold" style={{ color: 'var(--sk-text)' }}>テキスト</label>
              <input
                type="text"
                placeholder="表示するテキスト（省略可）"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                className="text-[14px] focus:outline-none"
                style={{ border: '1px solid var(--sk-border-strong)', borderRadius: 4, padding: '6px 8px', color: 'var(--sk-text)' }}
              />
              <label className="text-[13px] font-bold" style={{ color: 'var(--sk-text)' }}>リンク</label>
              <input
                ref={linkUrlInputRef}
                type="text"
                placeholder="https://"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitLink(); }
                  if (e.key === 'Escape') setLinkPopupOpen(false);
                }}
                className="text-[14px] focus:outline-none"
                style={{ border: '1px solid var(--sk-link)', borderRadius: 4, padding: '6px 8px', boxShadow: '0 0 0 1px var(--sk-link)', color: 'var(--sk-text)' }}
              />
              <div className="flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setLinkPopupOpen(false)}
                  className="px-3 h-8 text-[14px] font-bold"
                  style={{ border: '1px solid var(--sk-border-strong)', borderRadius: 4, color: 'var(--sk-text)' }}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={commitLink}
                  disabled={!linkUrl.trim()}
                  className="px-3 h-8 text-[14px] font-bold"
                  style={{
                    borderRadius: 4,
                    background: linkUrl.trim() ? 'var(--sk-green)' : 'var(--sk-subtle)',
                    color: linkUrl.trim() ? '#FFFFFF' : 'var(--sk-text-3)',
                  }}
                >
                  保存
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Top formatting toolbar ── */}
        {showTopBar && (
          <div
            className="flex items-center gap-0.5 px-1.5 overflow-hidden"
            style={{
              height: 36,
              background: 'var(--sk-hover)',
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              opacity: toolbarDim ? 0.5 : 1,
              transition: 'opacity 150ms',
            }}
          >
            <ToolBtn title="太字 (⌘B)" active={fmt.bold} onMouseDown={(e) => { e.preventDefault(); runCmd('bold'); }}>
              <BoldIcon className={iconCls} />
            </ToolBtn>
            <ToolBtn title="斜体 (⌘I)" active={fmt.italic} onMouseDown={(e) => { e.preventDefault(); runCmd('italic'); }}>
              <ItalicIcon className={iconCls} />
            </ToolBtn>
            <ToolBtn title="下線 (⌘U)" active={fmt.underline} onMouseDown={(e) => { e.preventDefault(); runCmd('underline'); }}>
              <UnderlineIcon className={iconCls} />
            </ToolBtn>
            <ToolBtn title="取り消し線" active={fmt.strike} onMouseDown={(e) => { e.preventDefault(); runCmd('strikeThrough'); }}>
              <StrikeIcon className={iconCls} />
            </ToolBtn>
            <Divider />
            <ToolBtn title="リンク (⌘K)" onMouseDown={(e) => openLinkPopup(e)}>
              <LinkIcon className={iconCls} />
            </ToolBtn>
            <Divider />
            <ToolBtn title="番号付きリスト" active={fmt.ol} onMouseDown={(e) => { e.preventDefault(); runCmd('insertOrderedList'); }}>
              <OrderedListIcon className={iconCls} />
            </ToolBtn>
            <ToolBtn title="箇条書き" active={fmt.ul} onMouseDown={(e) => { e.preventDefault(); runCmd('insertUnorderedList'); }}>
              <BulletListIcon className={iconCls} />
            </ToolBtn>
            <Divider />
            <ToolBtn title="引用" active={fmt.blockquote} onMouseDown={handleBlockquote}>
              <QuoteIcon className={iconCls} />
            </ToolBtn>
            <Divider />
            <ToolBtn title="コード" active={fmt.code} onMouseDown={handleInlineCode}>
              <CodeIcon className={iconCls} />
            </ToolBtn>
            <ToolBtn title="コードブロック" onMouseDown={handleCodeBlock}>
              <CodeBlockIcon className={iconCls} />
            </ToolBtn>
          </div>
        )}

        {/* ── Attached files preview ── */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-2">
            {attachedFiles.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2 h-7 text-[13px]"
                style={{ background: 'var(--sk-hover)', border: '1px solid var(--sk-border)', borderRadius: 6, maxWidth: 220 }}
              >
                <PaperclipIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--sk-text-2)' }} />
                <span className="truncate" style={{ color: 'var(--sk-text)' }}>{file.name}</span>
                <button
                  type="button"
                  title="削除"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => removeFile(i)}
                  className="flex-shrink-0 ml-0.5"
                  style={{ color: 'var(--sk-text-2)' }}
                >
                  <CloseIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Editable content area ── */}
        <div className="relative">
          {isEmpty && attachedFiles.length === 0 && (
            <div
              className="absolute top-0 left-0 right-0 px-3 py-[11px] text-[15px] pointer-events-none select-none flex items-center min-w-0"
              style={{ color: 'var(--sk-text-3)', lineHeight: '22px' }}
              aria-hidden="true"
            >
              {isDM || !channel ? (
                <span className="truncate">{placeholderText}</span>
              ) : (
                <>
                  {channel.isPrivate
                    ? <LockIcon className="flex-shrink-0" style={{ width: 14, height: 14 }} />
                    : <HashIcon className="flex-shrink-0" style={{ width: 14, height: 14 }} />}
                  <span className="truncate">{channel.name} へのメッセージ</span>
                </>
              )}
            </div>
          )}
          <div
            ref={editableRef}
            contentEditable={!sending}
            role="textbox"
            aria-multiline="true"
            aria-label={placeholderText}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full px-3 py-[11px] text-[15px] focus:outline-none"
            style={{ color: 'var(--sk-text)', minHeight: 44, maxHeight: 280, overflowY: 'auto', wordBreak: 'break-word', lineHeight: '22px' }}
            suppressContentEditableWarning
          />
        </div>

        {/* ── Bottom toolbar ── */}
        <div className="flex items-center justify-between px-1.5" style={{ height: 40 }}>
          <div className="flex items-center gap-0.5 relative min-w-0">
            <ToolBtn title="添付" round active={plusMenuOpen} onClick={() => { setPlusMenuOpen((v) => !v); setScheduleMenuOpen(false); }}>
              <PlusIcon className={iconCls} />
            </ToolBtn>
            {plusMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 z-40 py-2" style={{ ...POPOVER_STYLE, minWidth: 320 }}>
                <MenuItem
                  icon={<PaperclipIcon className="w-4 h-4 flex-shrink-0" />}
                  onClick={() => { setPlusMenuOpen(false); fileInputRef.current?.click(); }}
                >
                  ファイルをアップロード（ファイル名を添付）
                </MenuItem>
                <MenuItem
                  icon={<CodeBlockIcon className="w-4 h-4 flex-shrink-0" />}
                  onClick={() => { setPlusMenuOpen(false); insertCodeBlock(); }}
                >
                  コードまたはテキストのスニペット
                </MenuItem>
              </div>
            )}

            <ToolBtn title={showTopBar ? '書式設定を非表示にする' : '書式設定を表示する'} active={showTopBar} onClick={() => setShowTopBar((v) => !v)}>
              <FormatAaIcon className={iconCls} />
            </ToolBtn>
            <ToolBtn title="絵文字" onClick={() => setEmojiPickerOpen((p) => !p)} active={emojiPickerOpen}>
              <EmojiIcon className={iconCls} />
            </ToolBtn>
            <ToolBtn title="メンション" onMouseDown={(e) => { e.preventDefault(); insertAtSign(); }}>
              <AtIcon className={iconCls} />
            </ToolBtn>
            <Divider />
            <ToolBtn title="ビデオクリップを録画する" onClick={() => toast.info('ビデオクリップ/音声クリップはこのバージョンでは未対応です')}>
              <VideoIcon className={iconCls} />
            </ToolBtn>
            <ToolBtn title="音声クリップを録音する" onClick={() => toast.info('ビデオクリップ/音声クリップはこのバージョンでは未対応です')}>
              <MicIcon className={iconCls} />
            </ToolBtn>
            <Divider />
            <ToolBtn title="ショートカットを実行する" onMouseDown={(e) => { e.preventDefault(); openSlashMenu(); }}>
              <SlashBoxIcon className={iconCls} />
            </ToolBtn>
          </div>

          {/* Send split button */}
          <div className="relative flex-shrink-0">
            <div
              className="flex items-center h-7"
              style={{
                borderRadius: 4,
                background: canSend ? 'var(--sk-green)' : 'transparent',
                color: canSend ? '#FFFFFF' : 'var(--sk-text-3)',
                transition: 'background 120ms',
              }}
            >
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                title={canSend ? '今すぐ送信する (Enter)' : 'メッセージを入力してください'}
                aria-label="今すぐ送信する"
                className="w-7 h-7 flex items-center justify-center"
                style={{ borderRadius: '4px 0 0 4px', cursor: canSend ? 'pointer' : 'default' }}
                onMouseEnter={(e) => { if (canSend) e.currentTarget.style.background = 'var(--sk-green-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <SendFilledIcon className="w-4 h-4" />
              </button>
              <span className="w-px h-5" style={{ background: canSend ? 'rgba(255,255,255,0.5)' : 'var(--sk-border)' }} />
              <button
                type="button"
                onClick={() => { if (canSend) { setScheduleMenuOpen((v) => !v); setPlusMenuOpen(false); setCustomOpen(false); } }}
                disabled={!canSend}
                title="送信日時を設定"
                aria-label="送信日時を設定"
                aria-expanded={scheduleMenuOpen}
                className="h-7 flex items-center justify-center"
                style={{ width: 20, borderRadius: '0 4px 4px 0', cursor: canSend ? 'pointer' : 'default' }}
                onMouseEnter={(e) => { if (canSend) e.currentTarget.style.background = 'var(--sk-green-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <ChevronDownIcon className="w-4 h-4" />
              </button>
            </div>

            {scheduleMenuOpen && (
              <div className="absolute bottom-full right-0 mb-2 z-40 py-2" style={{ ...POPOVER_STYLE, width: 300 }}>
                <div className="px-4 pb-1 text-[15px] font-bold" style={{ color: 'var(--sk-text)' }}>送信日時を設定</div>
                {scheduleOptions().map((o) => (
                  <MenuItem key={o.label} onClick={() => scheduleSend(o.at)}>
                    {o.label} <span className="opacity-80">{o.sub}</span>
                  </MenuItem>
                ))}
                <div className="my-1 h-px" style={{ background: 'var(--sk-border)' }} />
                {!customOpen ? (
                  <MenuItem onClick={() => { setCustomValue(defaultCustom()); setCustomOpen(true); }}>
                    カスタム時刻…
                  </MenuItem>
                ) : (
                  <div className="px-4 py-1 flex flex-col gap-2">
                    <input
                      type="datetime-local"
                      value={customValue}
                      min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                      onChange={(e) => setCustomValue(e.target.value)}
                      className="text-[14px] focus:outline-none"
                      style={{ border: '1px solid var(--sk-border-strong)', borderRadius: 4, padding: '5px 8px', color: 'var(--sk-text)' }}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setCustomOpen(false)}
                        className="px-3 h-7 text-[13px] font-bold"
                        style={{ border: '1px solid var(--sk-border-strong)', borderRadius: 4, color: 'var(--sk-text)' }}
                      >キャンセル</button>
                      <button
                        type="button"
                        onClick={() => scheduleSend(new Date(customValue).getTime())}
                        disabled={!customValue}
                        className="px-3 h-7 text-[13px] font-bold"
                        style={{ borderRadius: 4, background: 'var(--sk-green)', color: '#FFFFFF' }}
                      >送信予約</button>
                    </div>
                  </div>
                )}
                <div className="px-4 pt-1 text-[12px]" style={{ color: 'var(--sk-text-3)' }}>
                  ※ アプリを開いている間に送信されます
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {anyMenuOpen && <div className="fixed inset-0 z-30" onClick={closeMenus} />}

      {/* Hint row: テキスト入力中のみ表示 */}
      {(!isEmpty || charCount > 3500) && (
        <div className="absolute right-5 bottom-[2px] flex items-center gap-3 text-[12px] pointer-events-none" style={{ color: 'var(--sk-text-3)' }}>
          {charCount > 3500 && (
            <span className="font-medium" style={{ color: charCount > 4000 ? 'var(--sk-red)' : '#E8A000' }}>
              {charCount} / 4000
            </span>
          )}
          {!isEmpty && <span className="hidden md:inline"><b>Shift + Enter</b> で改行</span>}
        </div>
      )}
    </div>
  );
}
