import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import ReactDOM from 'react-dom';
import type { Timestamp } from 'firebase/firestore';
import { useAppStore } from '../../store/useAppStore';
import { useThreads } from '../../hooks/useThreads';
import { useThreadTypingUsers, useSendThreadTyping } from '../../hooks/useTyping';
import {
  sendThreadReply,
  sendMessage,
  toggleReaction,
  toggleThreadReaction,
  updateThreadReply,
  deleteThreadReply,
} from '../../services';
import { formatMessageTime, formatFullDateTime, formatRelativeTime, isCompactMessage } from '../../utils/formatDate';
import { renderMarkdown } from '../../utils/markdown';
import { toast } from '../ui/Toast';
import EmojiPicker from '../ui/EmojiPicker';
import Avatar from '../ui/Avatar';
import {
  MoreVerticalIcon, CloseIcon, EmojiAddIcon, PencilIcon, TrashIcon, LockIcon, HashIcon,
  BoldIcon, ItalicIcon, StrikeIcon, LinkIcon, OrderedListIcon, BulletListIcon, QuoteIcon,
  CodeIcon, CodeBlockIcon, PlusIcon, FormatAaIcon, EmojiIcon, AtIcon, SendFilledIcon,
} from '../ui/icons';
import type { User } from '../../types';

// ─── Emoji picker (portal) ───────────────────────────────────────────────────

function EmojiPickerPortal({
  anchorRect,
  onSelect,
  onClose,
  placeAbove,
}: {
  anchorRect: DOMRect;
  onSelect: (emoji: string) => void;
  onClose: () => void;
  placeAbove?: boolean;
}) {
  const pickerW = 320;
  const pickerH = 380;
  let left = anchorRect.left;
  if (left + pickerW > window.innerWidth - 8) left = window.innerWidth - pickerW - 8;
  if (left < 8) left = 8;
  let top = placeAbove ? anchorRect.top - pickerH - 4 : anchorRect.bottom + 4;
  if (top + pickerH > window.innerHeight - 8) top = Math.max(8, anchorRect.top - pickerH - 4);
  if (top < 8) top = 8;

  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed z-50" style={{ top, left }}>
        <EmojiPicker onSelect={onSelect} onClose={onClose} />
      </div>
    </>,
    document.body
  );
}

// ─── Small UI atoms ──────────────────────────────────────────────────────────

const POPOVER_STYLE: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid var(--sk-border)',
  borderRadius: 8,
  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
};

function IconBtn({
  title, onClick, onMouseDown, children, size = 32, active, round,
}: {
  title: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  size?: number;
  active?: boolean;
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
      className="flex items-center justify-center flex-shrink-0"
      style={{
        width: size, height: size, borderRadius: round ? '50%' : size >= 32 ? 6 : 4,
        color: active ? 'var(--sk-text)' : 'var(--sk-text-2)', background: restBg,
        transition: 'background 120ms, color 120ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = round ? 'rgba(29,28,29,0.12)' : 'var(--sk-subtle)'; e.currentTarget.style.color = 'var(--sk-text)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = restBg; e.currentTarget.style.color = active ? 'var(--sk-text)' : 'var(--sk-text-2)'; }}
    >
      {children}
    </button>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  const base = danger ? 'var(--sk-red)' : 'var(--sk-text)';
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center px-4 text-left text-[15px] whitespace-nowrap"
      style={{ height: 32, color: base }}
      onMouseEnter={(e) => { e.currentTarget.style.background = danger ? 'var(--sk-red)' : 'var(--sk-link)'; e.currentTarget.style.color = '#FFFFFF'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = base; }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 mx-1 flex-shrink-0" style={{ background: 'var(--sk-border)' }} />;
}

const QUICK_REACTIONS = ['✅', '👀', '🙌'];

// ─── Message row (parent & replies, contract §7) ─────────────────────────────

interface RowProps {
  id: string;
  name: string;
  photoURL: string | null;
  text: string;
  createdAt: Timestamp;
  editedAt?: Timestamp;
  reactions?: Record<string, string[]>;
  isCompact: boolean;
  isOwner: boolean;
  isParent?: boolean;
  isEditing?: boolean;
  editText?: string;
  setEditText?: (v: string) => void;
  onEditSave?: () => void;
  onEditCancel?: () => void;
  onEditStart?: () => void;
  onDelete?: () => void;
  onReact: (emoji: string) => void;
  onOpenPicker: (rect: DOMRect) => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCopyLink?: () => void;
  users: User[];
  myUid?: string;
}

function ThreadRow(p: RowProps) {
  const reactions = Object.entries(p.reactions ?? {}).filter(([, uids]) => uids.length > 0);
  const timeLabel = p.isParent ? formatRelativeTime(p.createdAt) : formatMessageTime(p.createdAt);

  return (
    <div
      className="group relative flex gap-2"
      style={{ padding: p.isCompact ? '2px 20px' : '8px 20px' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sk-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Gutter */}
      <div className="flex-shrink-0" style={{ width: 36 }}>
        {p.isCompact ? (
          <span
            className="hidden group-hover:block text-right text-[12px] pt-[3px] cursor-default"
            style={{ color: 'var(--sk-text-2)' }}
            title={formatFullDateTime(p.createdAt)}
          >
            {formatMessageTime(p.createdAt)}
          </span>
        ) : (
          <Avatar name={p.name} photoURL={p.photoURL} size={36} radius={8} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        {!p.isCompact && (
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] truncate" style={{ fontWeight: 900, color: 'var(--sk-text)' }}>{p.name}</span>
            <span
              className="text-[12px] hover:underline cursor-default flex-shrink-0"
              style={{ color: 'var(--sk-text-2)' }}
              title={formatFullDateTime(p.createdAt)}
            >
              {timeLabel}
            </span>
          </div>
        )}

        {p.isEditing ? (
          <div className="mt-1">
            <textarea
              value={p.editText}
              onChange={(e) => p.setEditText?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); p.onEditSave?.(); }
                if (e.key === 'Escape') p.onEditCancel?.();
              }}
              className="w-full text-[15px] resize-none focus:outline-none px-3 py-2"
              style={{
                color: 'var(--sk-text)', background: '#FFFFFF', minHeight: 64, lineHeight: '22px',
                border: '1px solid rgba(29,28,29,0.5)', boxShadow: '0 0 0 1px rgba(29,28,29,0.5)', borderRadius: 8,
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-1.5">
              <button
                type="button"
                onClick={p.onEditCancel}
                className="px-3 h-7 text-[13px] font-bold"
                style={{ border: '1px solid var(--sk-border-strong)', borderRadius: 4, color: 'var(--sk-text)', background: '#FFFFFF' }}
              >キャンセル</button>
              <button
                type="button"
                onClick={p.onEditSave}
                className="px-3 h-7 text-[13px] font-bold"
                style={{ borderRadius: 4, background: 'var(--sk-green)', color: '#FFFFFF' }}
              >保存</button>
            </div>
          </div>
        ) : (
          <div className="text-[15px]" style={{ color: 'var(--sk-text)', lineHeight: '22px' }}>
            {renderMarkdown(p.text, { currentUid: p.myUid })}
            {p.editedAt && <span className="text-[12px] ml-1" style={{ color: 'var(--sk-text-3)' }}>（編集済み）</span>}
          </div>
        )}

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-1">
            {reactions.map(([emoji, uids]) => {
              const mine = !!p.myUid && uids.includes(p.myUid);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => p.onReact(emoji)}
                  title={uids.map((uid) => p.users.find((u) => u.uid === uid)?.displayName ?? '不明なユーザー').join('、') + ' がリアクションしました'}
                  className="flex items-center gap-1"
                  style={{
                    height: 24, borderRadius: 12, padding: '0 6px',
                    background: mine ? 'var(--sk-mention-bg)' : 'var(--sk-subtle)',
                    boxShadow: mine ? 'inset 0 0 0 1px var(--sk-blue)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{emoji}</span>
                  <span className="text-[12px]" style={{ color: mine ? 'var(--sk-link)' : 'var(--sk-text-2)', fontWeight: mine ? 700 : 400 }}>
                    {uids.length}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              title="リアクションする"
              onClick={(e) => p.onOpenPicker(e.currentTarget.getBoundingClientRect())}
              className="flex items-center justify-center"
              style={{ height: 24, width: 32, borderRadius: 12, background: 'var(--sk-subtle)', color: 'var(--sk-text-2)' }}
            >
              <EmojiAddIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Hover toolbar */}
      {!p.isEditing && (
        <div
          className={`absolute flex items-center ${p.menuOpen ? 'flex' : 'hidden group-hover:flex'}`}
          style={{
            top: -16, right: 20, background: '#FFFFFF', border: '1px solid var(--sk-border)',
            borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: 2, zIndex: 5,
          }}
        >
          {QUICK_REACTIONS.map((emoji) => (
            <IconBtn key={emoji} title={`${emoji} でリアクションする`} onClick={() => p.onReact(emoji)}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{emoji}</span>
            </IconBtn>
          ))}
          <IconBtn title="リアクションする" onClick={(e) => p.onOpenPicker(e.currentTarget.getBoundingClientRect())}>
            <EmojiAddIcon className="w-[18px] h-[18px]" />
          </IconBtn>
          {p.isOwner && p.onEditStart && (
            <IconBtn title="メッセージを編集する" onClick={p.onEditStart}>
              <PencilIcon className="w-[18px] h-[18px]" />
            </IconBtn>
          )}
          {p.isOwner && p.onDelete && (
            <IconBtn title="メッセージを削除する" onClick={p.onDelete}>
              <TrashIcon className="w-[18px] h-[18px]" />
            </IconBtn>
          )}
          <div className="relative">
            <IconBtn title="その他" onClick={p.onToggleMenu} active={p.menuOpen}>
              <MoreVerticalIcon className="w-[18px] h-[18px]" />
            </IconBtn>
            {p.menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-30 py-2" style={{ ...POPOVER_STYLE, minWidth: 220 }}>
                <MenuItem onClick={() => {
                  navigator.clipboard?.writeText(p.text).then(
                    () => toast.success('テキストをコピーしました'),
                    () => toast.error('コピーに失敗しました'),
                  );
                  p.onToggleMenu();
                }}>テキストをコピー</MenuItem>
                {p.onCopyLink && <MenuItem onClick={() => { p.onCopyLink?.(); p.onToggleMenu(); }}>リンクをコピー</MenuItem>}
                {p.isOwner && p.onEditStart && <MenuItem onClick={() => { p.onToggleMenu(); p.onEditStart?.(); }}>メッセージを編集する</MenuItem>}
                {p.isOwner && p.onDelete && <MenuItem danger onClick={() => { p.onToggleMenu(); p.onDelete?.(); }}>メッセージを削除する</MenuItem>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type SuggestItem =
  | { kind: 'special'; key: 'channel' | 'here' }
  | { kind: 'user'; user: User };

// ─── Panel ───────────────────────────────────────────────────────────────────

export default function ThreadPanel() {
  const { user } = useAppStore((s) => s.auth);
  const users = useAppStore((s) => s.users);
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const channels = useAppStore((s) => s.channels);
  const threadPanelMessageId = useAppStore((s) => s.threadPanelMessageId);
  const closeThreadPanel = useAppStore((s) => s.closeThreadPanel);
  const messages = useAppStore((s) =>
    activeChannelId ? (s.messages[activeChannelId] ?? []) : []
  );

  const threads = useThreads();
  const threadTypers = useThreadTypingUsers(activeChannelId, threadPanelMessageId);
  const { startTyping: startThreadTyping, stopTyping: stopThreadTyping } = useSendThreadTyping(activeChannelId, threadPanelMessageId);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [alsoSendToChannel, setAlsoSendToChannel] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [reactionAnchor, setReactionAnchor] = useState<{ rect: DOMRect; targetId: string; isParent: boolean } | null>(null);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [rowMenuId, setRowMenuId] = useState<string | null>(null);
  const [showToolbar, setShowToolbar] = useState(true);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [suggest, setSuggest] = useState<{ query: string; start: number } | null>(null);
  const [suggestIndex, setSuggestIndex] = useState(0);
  const mentionMapRef = useRef<Map<string, string>>(new Map()); // "@name" → uid
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputEmojiRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const parentMessage = messages.find((m) => m.id === threadPanelMessageId);
  const channel = channels.find((c) => c.id === activeChannelId);
  const isDM = channel?.name.startsWith('__dm__') ?? false;
  const dmOther = isDM ? users.find((u) => u.uid !== user?.uid && channel?.members?.includes(u.uid)) : undefined;
  const headerLabel = isDM ? (dmOther?.displayName ?? '自分') : channel?.name ?? '';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads.length]);

  // Reset composer state when switching threads
  useEffect(() => {
    setEditingThreadId(null);
    setRowMenuId(null);
    setSuggest(null);
    mentionMapRef.current.clear();
  }, [threadPanelMessageId]);

  // Autosize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [replyText]);

  /** "@表示名" を markdown のメンション記法へ変換し、メンション先 uid を返す */
  const resolveMentions = (text: string): { text: string; uids: string[] } => {
    let out = text;
    const uids: string[] = [];
    // 長い名前から置換（部分一致の誤置換を防ぐ）
    const entries = [...mentionMapRef.current.entries()].sort((a, b) => b[0].length - a[0].length);
    for (const [token, uid] of entries) {
      if (!out.includes(token)) continue;
      const name = token.slice(1);
      out = out.split(token).join(`@[${name}](${uid})`);
      uids.push(uid);
    }
    return { text: out, uids };
  };

  const handleSend = async () => {
    if (!activeChannelId || !threadPanelMessageId || !user || !replyText.trim() || sending) return;
    const original = replyText;
    const { text: trimmed, uids: mentionUids } = resolveMentions(replyText.trim());
    setSending(true);
    setReplyText('');
    setSuggest(null);
    stopThreadTyping();
    try {
      // スレッドの親メッセージ投稿者・既存の参加者・メンション先に通知
      const notifyUids = [
        parentMessage?.uid ?? '',
        ...(parentMessage?.threadParticipants ?? []),
        ...mentionUids,
      ].filter(Boolean) as string[];
      await sendThreadReply(activeChannelId, threadPanelMessageId, trimmed, user, notifyUids);
      if (alsoSendToChannel) {
        await sendMessage(activeChannelId, trimmed, user, mentionUids, isDM ? dmOther?.uid : undefined).catch(() => {
          toast.error('チャンネルへの投稿に失敗しました');
        });
      }
      mentionMapRef.current.clear();
    } catch (err) {
      console.error('Thread reply error:', err);
      setReplyText(original);
      toast.error('返信の送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  // ── Textarea formatting (markdown markers) ────────────────────────────────

  const applyEdit = (newText: string, selStart: number, selEnd: number) => {
    setReplyText(newText);
    const el = textareaRef.current;
    setTimeout(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    }, 0);
  };

  const wrapSelection = (before: string, after: string = before, placeholder = '') => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = replyText.slice(start, end) || placeholder;
    const newText = replyText.slice(0, start) + before + selected + after + replyText.slice(end);
    applyEdit(newText, start + before.length, start + before.length + selected.length);
  };

  const prefixLines = (makePrefix: (i: number) => string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const lineStart = replyText.lastIndexOf('\n', start - 1) + 1;
    const nextNl = replyText.indexOf('\n', end);
    const lineEnd = nextNl === -1 ? replyText.length : nextNl;
    const block = replyText.slice(lineStart, lineEnd);
    const replaced = block.split('\n').map((l, i) => makePrefix(i) + l).join('\n');
    const newText = replyText.slice(0, lineStart) + replaced + replyText.slice(lineEnd);
    applyEdit(newText, lineStart + replaced.length, lineStart + replaced.length);
  };

  const insertLink = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const label = replyText.slice(start, end) || 'テキスト';
    const url = 'https://';
    const insert = `[${label}](${url})`;
    const newText = replyText.slice(0, start) + insert + replyText.slice(end);
    const urlStart = start + label.length + 3;
    applyEdit(newText, urlStart, urlStart + url.length);
  };

  const insertAtCaret = (s: string) => {
    const el = textareaRef.current;
    const start = el ? el.selectionStart : replyText.length;
    const end = el ? el.selectionEnd : replyText.length;
    const newText = replyText.slice(0, start) + s + replyText.slice(end);
    applyEdit(newText, start + s.length, start + s.length);
    return start + s.length;
  };

  // ── Mention suggest (textarea) ────────────────────────────────────────────

  const q = suggest?.query.toLowerCase() ?? '';
  const suggestItems: SuggestItem[] = suggest
    ? [
        ...(!isDM ? (['channel', 'here'] as const).filter((k) => k.startsWith(q)).map((k): SuggestItem => ({ kind: 'special', key: k })) : []),
        ...users
          .filter((u) => u.uid !== user?.uid && u.displayName.toLowerCase().includes(q))
          .slice(0, 20)
          .map((u): SuggestItem => ({ kind: 'user', user: u })),
      ]
    : [];

  const detectSuggest = (value: string, caret: number) => {
    const before = value.slice(0, caret);
    const m = before.match(/(?:^|\s)@([^\s@]*)$/);
    if (m) {
      setSuggest({ query: m[1], start: caret - m[1].length - 1 });
      setSuggestIndex(0);
    } else {
      setSuggest(null);
    }
  };

  const pickSuggestion = (item: SuggestItem) => {
    if (!suggest) return;
    const el = textareaRef.current;
    const caret = el ? el.selectionStart : replyText.length;
    let token: string;
    if (item.kind === 'special') {
      token = `@${item.key}`;
    } else {
      token = `@${item.user.displayName}`;
      mentionMapRef.current.set(token, item.user.uid);
    }
    const insert = token + ' ';
    const newText = replyText.slice(0, suggest.start) + insert + replyText.slice(caret);
    const pos = suggest.start + insert.length;
    setSuggest(null);
    applyEdit(newText, pos, pos);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggest && suggestItems.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSuggestIndex((i) => Math.min(i + 1, suggestItems.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSuggestIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); const it = suggestItems[suggestIndex]; if (it) pickSuggestion(it); return; }
      if (e.key === 'Escape') { e.preventDefault(); setSuggest(null); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); wrapSelection('*'); return;
        case 'i': e.preventDefault(); wrapSelection('_'); return;
        case 'k': e.preventDefault(); insertLink(); return;
      }
    }
  };

  // ── Reactions / edit / delete ─────────────────────────────────────────────

  const handleReaction = async (messageId: string, emoji: string, isParent = false) => {
    if (!user || !activeChannelId || !threadPanelMessageId) return;
    try {
      if (isParent) {
        const parentMsg = messages.find((m) => m.id === messageId);
        await toggleReaction(activeChannelId, messageId, emoji, user.uid, parentMsg?.reactions ?? {});
      } else {
        const thread = threads.find((t) => t.id === messageId);
        await toggleThreadReaction(activeChannelId, threadPanelMessageId, messageId, emoji, user.uid, thread?.reactions ?? {});
      }
    } catch (err) {
      console.error('Reaction error:', err);
    }
    setReactionAnchor(null);
  };

  const handleEditSave = async (threadId: string) => {
    if (!activeChannelId || !threadPanelMessageId || !editText.trim()) return;
    try {
      await updateThreadReply(activeChannelId, threadPanelMessageId, threadId, editText.trim());
      setEditingThreadId(null);
      toast.success('編集しました');
    } catch {
      toast.error('編集に失敗しました');
    }
  };

  const handleDelete = async (threadId: string) => {
    if (!activeChannelId || !threadPanelMessageId) return;
    if (!window.confirm('この返信を削除しますか？この操作は取り消せません。')) return;
    try {
      await deleteThreadReply(activeChannelId, threadPanelMessageId, threadId);
      toast.success('返信を削除しました');
    } catch {
      toast.error('削除に失敗しました');
    }
  };

  const copyThreadLink = () => {
    if (!activeChannelId || !threadPanelMessageId) return;
    const url = `${window.location.origin}${window.location.pathname}?channel=${encodeURIComponent(activeChannelId)}&msg=${encodeURIComponent(threadPanelMessageId)}`;
    navigator.clipboard?.writeText(url).then(
      () => toast.success('リンクをコピーしました'),
      () => toast.error('コピーに失敗しました'),
    );
  };

  const hasText = replyText.trim().length > 0;
  const canSend = hasText && !sending;
  const toolbarDim = !focused && !hasText;
  const iconCls = 'w-[18px] h-[18px]';

  return (
    <div className="flex flex-col h-full min-w-0" style={{ background: '#FFFFFF' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between pl-5 pr-3 flex-shrink-0"
        style={{ height: 49, borderBottom: '1px solid var(--sk-border)' }}
      >
        <div className="flex items-baseline gap-2 min-w-0">
          <h3 className="text-[18px] flex-shrink-0" style={{ fontWeight: 900, color: 'var(--sk-text)' }}>スレッド</h3>
          {headerLabel && (
            <span className="flex items-center gap-0.5 text-[13px] truncate min-w-0" style={{ color: 'var(--sk-text-2)' }}>
              {!isDM && (channel?.isPrivate
                ? <LockIcon className="flex-shrink-0 self-center" style={{ width: 12, height: 12 }} />
                : <HashIcon className="flex-shrink-0 self-center" style={{ width: 12, height: 12 }} />)}
              <span className="truncate">{headerLabel}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <div className="relative">
            <IconBtn title="その他のオプション" onClick={() => setHeaderMenuOpen((v) => !v)} active={headerMenuOpen}>
              <MoreVerticalIcon className="w-[18px] h-[18px]" />
            </IconBtn>
            {headerMenuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setHeaderMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-30 py-2" style={{ ...POPOVER_STYLE, minWidth: 240 }}>
                  <MenuItem onClick={() => { setHeaderMenuOpen(false); copyThreadLink(); }}>スレッドのリンクをコピー</MenuItem>
                  <MenuItem onClick={() => { setHeaderMenuOpen(false); toast.info('スレッドの通知オフはこのバージョンでは未対応です'); }}>通知をオフにする</MenuItem>
                </div>
              </>
            )}
          </div>
          <IconBtn title="閉じる" onClick={closeThreadPanel}>
            <CloseIcon className="w-[18px] h-[18px]" />
          </IconBtn>
        </div>
      </div>

      {/* Scroll area */}
      <div className="flex-1 overflow-y-auto pt-4">
        {rowMenuId && <div className="fixed inset-0 z-[4]" onClick={() => setRowMenuId(null)} />}

        {parentMessage && (
          <ThreadRow
            id={parentMessage.id}
            name={parentMessage.displayName}
            photoURL={parentMessage.photoURL}
            text={parentMessage.text}
            createdAt={parentMessage.createdAt}
            editedAt={parentMessage.editedAt}
            reactions={parentMessage.reactions}
            isCompact={false}
            isOwner={false}
            isParent
            onReact={(emoji) => handleReaction(parentMessage.id, emoji, true)}
            onOpenPicker={(rect) => setReactionAnchor({ rect, targetId: parentMessage.id, isParent: true })}
            menuOpen={rowMenuId === parentMessage.id}
            onToggleMenu={() => setRowMenuId((id) => (id === parentMessage.id ? null : parentMessage.id))}
            onCopyLink={copyThreadLink}
            users={users}
            myUid={user?.uid}
          />
        )}

        {/* Reply count divider */}
        {threads.length > 0 && (
          <div className="flex items-center gap-2 px-5 py-2">
            <span className="text-[13px] flex-shrink-0" style={{ color: 'var(--sk-text-2)' }}>
              {threads.length} 件の返信
            </span>
            <span className="flex-1 h-px" style={{ background: 'var(--sk-border)' }} />
          </div>
        )}

        {/* Replies */}
        <div className="pb-4">
          {threads.map((thread, i) => {
            const prev = threads[i - 1];
            const compact = !!prev && !prev.editedAt && isCompactMessage(prev.createdAt, thread.createdAt, prev.uid, thread.uid);
            const isOwner = thread.uid === user?.uid;
            return (
              <ThreadRow
                key={thread.id}
                id={thread.id}
                name={thread.displayName}
                photoURL={thread.photoURL}
                text={thread.text}
                createdAt={thread.createdAt}
                editedAt={thread.editedAt}
                reactions={thread.reactions}
                isCompact={compact}
                isOwner={isOwner}
                isEditing={editingThreadId === thread.id}
                editText={editText}
                setEditText={setEditText}
                onEditStart={() => { setEditingThreadId(thread.id); setEditText(thread.text); }}
                onEditSave={() => handleEditSave(thread.id)}
                onEditCancel={() => setEditingThreadId(null)}
                onDelete={() => handleDelete(thread.id)}
                onReact={(emoji) => handleReaction(thread.id, emoji)}
                onOpenPicker={(rect) => setReactionAnchor({ rect, targetId: thread.id, isParent: false })}
                menuOpen={rowMenuId === thread.id}
                onToggleMenu={() => setRowMenuId((id) => (id === thread.id ? null : thread.id))}
                users={users}
                myUid={user?.uid}
              />
            );
          })}
        </div>

        {/* Composer (Slack はスレッドの末尾に入力欄を置く) */}
        <div className="px-5 pb-2">
          <div
            className="relative"
            style={{
              background: '#FFFFFF',
              border: `1px solid ${focused ? 'rgba(29,28,29,0.5)' : 'var(--sk-border-strong)'}`,
              boxShadow: focused ? '0 0 0 1px rgba(29,28,29,0.5)' : 'none',
              borderRadius: 8,
              transition: 'border-color 150ms, box-shadow 150ms',
            }}
          >
            {/* Mention suggest */}
            {suggest && suggestItems.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-1 max-h-60 overflow-y-auto z-20 py-2" style={POPOVER_STYLE}>
                <div className="px-4 pb-1 text-[13px] font-bold" style={{ color: 'var(--sk-text-2)' }}>メンバー</div>
                {suggestItems.map((item, i) => {
                  const sel = i === suggestIndex;
                  const key = item.kind === 'special' ? `__${item.key}` : item.user.uid;
                  return (
                    <button
                      key={key}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); pickSuggestion(item); }}
                      onMouseEnter={() => setSuggestIndex(i)}
                      className="w-full flex items-center gap-2 px-4 text-left"
                      style={{ height: 36, background: sel ? 'var(--sk-link)' : 'transparent', color: sel ? '#FFFFFF' : 'var(--sk-text)' }}
                    >
                      {item.kind === 'special' ? (
                        <>
                          <span className="w-6 h-6 flex items-center justify-center flex-shrink-0" style={{ borderRadius: 6, background: sel ? 'rgba(255,255,255,0.2)' : 'var(--sk-subtle)' }}>
                            <AtIcon className="w-4 h-4" />
                          </span>
                          <span className="font-bold text-[15px]">@{item.key}</span>
                        </>
                      ) : (
                        <>
                          <Avatar name={item.user.displayName} photoURL={item.user.photoURL} size={24} radius={6} />
                          <span className="font-bold text-[15px] truncate">{item.user.displayName}</span>
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={item.user.online ? { background: 'var(--sk-online)' } : { border: `1px solid ${sel ? '#FFFFFF' : 'var(--sk-text-3)'}` }}
                          />
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Formatting toolbar */}
            {showToolbar && (
              <div
                className="flex items-center gap-0.5 px-1.5 overflow-hidden"
                style={{
                  height: 36, background: 'var(--sk-hover)', borderTopLeftRadius: 8, borderTopRightRadius: 8,
                  opacity: toolbarDim ? 0.5 : 1, transition: 'opacity 150ms',
                }}
              >
                <IconBtn size={28} title="太字 (⌘B)" onMouseDown={(e) => { e.preventDefault(); wrapSelection('*'); }}><BoldIcon className={iconCls} /></IconBtn>
                <IconBtn size={28} title="斜体 (⌘I)" onMouseDown={(e) => { e.preventDefault(); wrapSelection('_'); }}><ItalicIcon className={iconCls} /></IconBtn>
                <IconBtn size={28} title="取り消し線" onMouseDown={(e) => { e.preventDefault(); wrapSelection('~'); }}><StrikeIcon className={iconCls} /></IconBtn>
                <Divider />
                <IconBtn size={28} title="リンク (⌘K)" onMouseDown={(e) => { e.preventDefault(); insertLink(); }}><LinkIcon className={iconCls} /></IconBtn>
                <Divider />
                <IconBtn size={28} title="番号付きリスト" onMouseDown={(e) => { e.preventDefault(); prefixLines((i) => `${i + 1}. `); }}><OrderedListIcon className={iconCls} /></IconBtn>
                <IconBtn size={28} title="箇条書き" onMouseDown={(e) => { e.preventDefault(); prefixLines(() => '• '); }}><BulletListIcon className={iconCls} /></IconBtn>
                <Divider />
                <IconBtn size={28} title="引用" onMouseDown={(e) => { e.preventDefault(); prefixLines(() => '> '); }}><QuoteIcon className={iconCls} /></IconBtn>
                <Divider />
                <IconBtn size={28} title="コード" onMouseDown={(e) => { e.preventDefault(); wrapSelection('`', '`', 'コード'); }}><CodeIcon className={iconCls} /></IconBtn>
                <IconBtn size={28} title="コードブロック" onMouseDown={(e) => { e.preventDefault(); wrapSelection('```\n', '\n```', 'コードをここに入力'); }}><CodeBlockIcon className={iconCls} /></IconBtn>
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={replyText}
              onChange={(e) => {
                const v = e.target.value;
                setReplyText(v);
                if (v.trim()) startThreadTyping(); else stopThreadTyping();
                detectSuggest(v, e.target.selectionStart);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => { setFocused(false); stopThreadTyping(); setTimeout(() => setSuggest(null), 150); }}
              placeholder="返信する…"
              aria-label="スレッドに返信する"
              rows={1}
              disabled={sending}
              className="block w-full px-3 py-[11px] text-[15px] resize-none focus:outline-none bg-transparent placeholder:text-[var(--sk-text-3)]"
              style={{ color: 'var(--sk-text)', minHeight: 44, maxHeight: 200, lineHeight: '22px' }}
            />

            {/* Also send to channel */}
            {channel && (
              <label className="flex items-center gap-2 px-3 pb-1 cursor-pointer select-none w-fit">
                <input
                  type="checkbox"
                  checked={alsoSendToChannel}
                  onChange={(e) => setAlsoSendToChannel(e.target.checked)}
                  className="w-3.5 h-3.5 cursor-pointer"
                  style={{ accentColor: 'var(--sk-link)' }}
                />
                <span className="flex items-center gap-0.5 text-[13px]" style={{ color: 'var(--sk-text-2)' }}>
                  {isDM ? (
                    'ダイレクトメッセージにも送信'
                  ) : (
                    <>
                      以下にも投稿する：
                      {channel.isPrivate
                        ? <LockIcon className="flex-shrink-0" style={{ width: 12, height: 12 }} />
                        : <HashIcon className="flex-shrink-0" style={{ width: 12, height: 12 }} />}
                      <span className="font-bold truncate">{channel.name}</span>
                    </>
                  )}
                </span>
              </label>
            )}

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between px-1.5" style={{ height: 40 }}>
              <div className="flex items-center gap-0.5 relative">
                <IconBtn size={28} round title="添付" active={plusMenuOpen} onClick={() => setPlusMenuOpen((v) => !v)}>
                  <PlusIcon className={iconCls} />
                </IconBtn>
                {plusMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setPlusMenuOpen(false)} />
                    <div className="absolute bottom-full left-0 mb-2 z-30 py-2" style={{ ...POPOVER_STYLE, minWidth: 280 }}>
                      <MenuItem onClick={() => { setPlusMenuOpen(false); wrapSelection('```\n', '\n```', 'コードをここに入力'); }}>
                        コードまたはテキストのスニペット
                      </MenuItem>
                      <MenuItem onClick={() => { setPlusMenuOpen(false); toast.info('スレッドでのファイルアップロードはこのバージョンでは未対応です'); }}>
                        ファイルをアップロード
                      </MenuItem>
                    </div>
                  </>
                )}
                <IconBtn size={28} title={showToolbar ? '書式設定を非表示にする' : '書式設定を表示する'} active={showToolbar} onClick={() => setShowToolbar((v) => !v)}>
                  <FormatAaIcon className={iconCls} />
                </IconBtn>
                <button
                  ref={inputEmojiRef}
                  type="button"
                  title="絵文字"
                  aria-label="絵文字"
                  onClick={() => setEmojiPickerOpen((p) => !p)}
                  className="w-7 h-7 flex items-center justify-center flex-shrink-0"
                  style={{ borderRadius: 4, color: emojiPickerOpen ? 'var(--sk-text)' : 'var(--sk-text-2)', background: emojiPickerOpen ? 'var(--sk-subtle)' : 'transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sk-subtle)'; e.currentTarget.style.color = 'var(--sk-text)'; }}
                  onMouseLeave={(e) => { if (!emojiPickerOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sk-text-2)'; } }}
                >
                  <EmojiIcon className={iconCls} />
                </button>
                <IconBtn size={28} title="メンション" onMouseDown={(e) => {
                  e.preventDefault();
                  const el = textareaRef.current;
                  const caret = el ? el.selectionStart : replyText.length;
                  const needSpace = caret > 0 && !/\s/.test(replyText[caret - 1] ?? ' ');
                  const pos = insertAtCaret(needSpace ? ' @' : '@');
                  setSuggest({ query: '', start: pos - 1 });
                  setSuggestIndex(0);
                }}>
                  <AtIcon className={iconCls} />
                </IconBtn>
              </div>

              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                title={canSend ? '送信する (Enter)' : 'メッセージを入力してください'}
                aria-label="送信する"
                className="w-7 h-7 flex items-center justify-center flex-shrink-0"
                style={{
                  borderRadius: 4,
                  background: canSend ? 'var(--sk-green)' : 'transparent',
                  color: canSend ? '#FFFFFF' : 'var(--sk-text-3)',
                  cursor: canSend ? 'pointer' : 'default',
                  transition: 'background 120ms',
                }}
                onMouseEnter={(e) => { if (canSend) e.currentTarget.style.background = 'var(--sk-green-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = canSend ? 'var(--sk-green)' : 'transparent'; }}
              >
                <SendFilledIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Typing indicator / hint */}
          <div className="flex items-center justify-between min-h-[20px] mt-0.5 text-[12px]" aria-live="polite" aria-atomic="true" style={{ color: 'var(--sk-text-2)' }}>
            <span className="truncate">
              {threadTypers.length === 1
                ? `${threadTypers[0].displayName} が入力中…`
                : threadTypers.length === 2
                ? `${threadTypers[0].displayName} と ${threadTypers[1].displayName} が入力中…`
                : threadTypers.length > 2
                ? `${threadTypers.length} 人が入力中…`
                : ''}
            </span>
            {hasText && (
              <span className="flex-shrink-0 hidden md:inline" style={{ color: 'var(--sk-text-3)' }}>
                <b>Shift + Enter</b> で改行
              </span>
            )}
          </div>
        </div>

        <div ref={bottomRef} />
      </div>

      {emojiPickerOpen && inputEmojiRef.current && (
        <EmojiPickerPortal
          anchorRect={inputEmojiRef.current.getBoundingClientRect()}
          placeAbove
          onSelect={(emoji) => { insertAtCaret(emoji); setEmojiPickerOpen(false); }}
          onClose={() => setEmojiPickerOpen(false)}
        />
      )}
      {reactionAnchor && (
        <EmojiPickerPortal
          anchorRect={reactionAnchor.rect}
          onSelect={(emoji) => handleReaction(reactionAnchor.targetId, emoji, reactionAnchor.isParent)}
          onClose={() => setReactionAnchor(null)}
        />
      )}
    </div>
  );
}
