// ─────────────────────────────────────────────────────────────────────────────
// 「メッセージを転送する」モーダル
//   <ForwardModal message={msg} sourceChannelId={channelId} onClose={...} />
// - 転送先: 自分がメンバーのチャンネル + DM（相手の名前で検索）
// - 任意のメッセージ + 元メッセージのプレビュー
// - 送信テキスト = [メモ + "\n"] + "> 元の各行" + "> — 名前（#channel より）"
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { sendMessage } from '../../services';
import { formatFullDateTime, formatRelativeTime } from '../../utils/formatDate';
import { renderMarkdown } from '../../utils/markdown';
import type { Channel, Message, User } from '../../types';
import Avatar from '../ui/Avatar';
import { HashIcon, LockIcon, LinkIcon, CloseIcon } from '../ui/icons';
import { toast } from '../ui/Toast';
import { ModalShell, SkButton } from './overlays';

export interface ForwardModalProps {
  message: Message;
  sourceChannelId: string;
  onClose: () => void;
}

interface Target {
  channel: Channel;
  label: string;
  isDM: boolean;
  dmUser?: User;
  /** DM の場合の相手 uid（通知用） */
  recipientUid?: string;
}

const isDMChannel = (c: Channel) => c.name.startsWith('__dm__');

/** チャンネル / DM の表示名 */
export function channelDisplayName(c: Channel, users: User[], myUid?: string): string {
  if (!isDMChannel(c)) return c.name;
  const otherUid = c.members.find((m) => m !== myUid) ?? myUid;
  const u = users.find((x) => x.uid === otherUid);
  const name = u?.displayName ?? 'ダイレクトメッセージ';
  return otherUid === myUid ? `${name}（自分）` : name;
}

/** 転送テキストを組み立てる */
export function composeForwardText(note: string, original: Message, sourceLabel: string): string {
  const quoted = original.text.split('\n').map((l) => `> ${l}`).join('\n');
  const footer = `> — ${original.displayName}（${sourceLabel} より）`;
  const body = `${quoted}\n${footer}`;
  return note.trim() ? `${note.trim()}\n${body}` : body;
}

export default function ForwardModal({ message, sourceChannelId, onClose }: ForwardModalProps) {
  const me = useAppStore((s) => s.auth.user);
  const channels = useAppStore((s) => s.channels);
  const users = useAppStore((s) => s.users);

  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<Target | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sourceChannel = channels.find((c) => c.id === sourceChannelId);
  const sourceLabel = sourceChannel
    ? isDMChannel(sourceChannel)
      ? `${channelDisplayName(sourceChannel, users, me?.uid)} との DM`
      : `#${sourceChannel.name}`
    : 'チャンネル';

  const targets: Target[] = useMemo(() => {
    if (!me) return [];
    return channels
      .filter((c) => Array.isArray(c.members) && c.members.includes(me.uid))
      .map((c) => {
        const dm = isDMChannel(c);
        const otherUid = dm ? c.members.find((m) => m !== me.uid) ?? me.uid : undefined;
        return {
          channel: c,
          label: channelDisplayName(c, users, me.uid),
          isDM: dm,
          dmUser: dm ? users.find((u) => u.uid === otherUid) : undefined,
          recipientUid: dm && otherUid !== me.uid ? otherUid : undefined,
        };
      })
      .sort((a, b) => Number(a.isDM) - Number(b.isDM) || a.label.localeCompare(b.label, 'ja'));
  }, [channels, users, me]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? targets.filter((t) => t.label.toLowerCase().includes(q)) : targets;
    return list.slice(0, 50);
  }, [targets, query]);

  const choose = (t: Target) => {
    setTarget(t);
    setQuery('');
    setListOpen(false);
  };

  const handleSend = async () => {
    if (!me || !target || sending) return;
    setSending(true);
    try {
      const text = composeForwardText(note, message, sourceLabel);
      await sendMessage(target.channel.id, text, me, [], target.recipientUid);
      toast.success(`${target.isDM ? target.label : `#${target.label}`} にメッセージを転送しました`);
      onClose();
    } catch (err) {
      console.error('Forward error:', err);
      toast.error('メッセージの転送に失敗しました');
      setSending(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}?channel=${sourceChannelId}&msg=${message.id}`);
      toast.success('リンクをコピーしました');
    } catch {
      toast.error('コピーに失敗しました');
    }
  };

  const targetIcon = (t: Target, size = 20) =>
    t.isDM ? (
      <Avatar name={t.dmUser?.displayName ?? t.label} photoURL={t.dmUser?.photoURL} size={size} radius={4} />
    ) : t.channel.isPrivate ? (
      <LockIcon className="w-4 h-4" />
    ) : (
      <HashIcon className="w-4 h-4" />
    );

  return (
    <ModalShell
      title="メッセージを転送する"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-[14px] font-bold mr-auto"
            style={{ color: 'var(--sk-link)' }}
          >
            <LinkIcon className="w-4 h-4" /> リンクをコピー
          </button>
          <SkButton variant="primary" disabled={!target || sending} onClick={handleSend}>
            {sending ? '転送中…' : '転送する'}
          </SkButton>
        </>
      }
    >
      {/* 転送先 */}
      <div className="relative">
        <div
          className="flex items-center flex-wrap gap-1 cursor-text"
          style={{
            minHeight: 40,
            padding: '4px 8px',
            borderRadius: 8,
            border: `1px solid ${focused ? 'var(--sk-blue)' : 'var(--sk-border-strong)'}`,
            boxShadow: focused ? '0 0 0 3px rgba(29,155,209,0.3)' : 'none',
          }}
          onClick={() => inputRef.current?.focus()}
        >
          {target && (
            <span
              className="flex items-center gap-1.5 text-[14px] font-bold"
              style={{ height: 28, padding: '0 4px 0 6px', borderRadius: 6, background: 'var(--sk-mention-bg)', color: 'var(--sk-link)' }}
            >
              {targetIcon(target, 18)}
              <span className="max-w-[260px] truncate">{target.label}</span>
              <button
                type="button"
                aria-label="転送先を削除"
                onClick={(e) => { e.stopPropagation(); setTarget(null); inputRef.current?.focus(); }}
                className="w-5 h-5 flex items-center justify-center rounded"
              >
                <CloseIcon className="w-3 h-3" />
              </button>
            </span>
          )}
          {!target && (
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setListOpen(true); setHighlight(0); }}
              onFocus={() => { setFocused(true); setListOpen(true); }}
              onBlur={() => { setFocused(false); window.setTimeout(() => setListOpen(false), 150); }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, matches.length - 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
                else if (e.key === 'Enter' && matches[highlight]) { e.preventDefault(); choose(matches[highlight]); }
              }}
              placeholder="名前またはチャンネル名を追加"
              aria-label="転送先"
              className="flex-1 min-w-[160px] text-[15px] bg-transparent focus:outline-none"
              style={{ height: 30, color: 'var(--sk-text)' }}
              autoFocus
            />
          )}
        </div>

        {listOpen && !target && (
          <div
            role="listbox"
            className="absolute left-0 right-0 mt-1 overflow-y-auto"
            style={{
              zIndex: 5,
              maxHeight: 240,
              padding: '8px 0',
              background: '#FFFFFF',
              border: '1px solid var(--sk-border)',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            }}
          >
            {matches.length === 0 ? (
              <div className="px-4 py-2 text-[14px]" style={{ color: 'var(--sk-text-2)' }}>
                一致する結果はありません
              </div>
            ) : (
              matches.map((t, i) => (
                <button
                  key={t.channel.id}
                  type="button"
                  role="option"
                  aria-selected={i === highlight}
                  onMouseDown={(e) => { e.preventDefault(); choose(t); }}
                  onMouseEnter={() => setHighlight(i)}
                  className="flex items-center gap-2 w-full text-left text-[15px]"
                  style={{
                    height: 32,
                    padding: '0 16px',
                    background: i === highlight ? 'var(--sk-link)' : 'transparent',
                    color: i === highlight ? '#FFFFFF' : 'var(--sk-text)',
                  }}
                >
                  <span className="w-5 flex items-center justify-center flex-shrink-0">{targetIcon(t)}</span>
                  <span className="truncate">{t.label}</span>
                  {t.channel.id === sourceChannelId && (
                    <span className="text-[12px] ml-auto opacity-70 flex-shrink-0">現在のチャンネル</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* メモ */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="メッセージを追加（任意）"
        aria-label="メッセージを追加（任意）"
        rows={3}
        className="w-full mt-4 text-[15px] resize-none focus:outline-none"
        style={{
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid var(--sk-border-strong)',
          color: 'var(--sk-text)',
          lineHeight: '22px',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--sk-blue)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(29,155,209,0.3)'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--sk-border-strong)'; e.currentTarget.style.boxShadow = 'none'; }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend(); }
        }}
      />

      {/* 元メッセージのプレビュー */}
      <div
        className="mt-4 mb-2"
        style={{ borderLeft: '4px solid #DDDDDD', padding: '4px 0 4px 12px' }}
      >
        <div className="flex items-center gap-2">
          <Avatar name={message.displayName} photoURL={message.photoURL} size={20} radius={4} />
          <span className="text-[15px] font-black" style={{ color: 'var(--sk-text)' }}>{message.displayName}</span>
        </div>
        <div
          className="text-[15px] mt-1 overflow-hidden"
          style={{ color: 'var(--sk-text)', lineHeight: '22px', maxHeight: 22 * 6 }}
        >
          {renderMarkdown(message.text, { currentUid: me?.uid })}
        </div>
        <div className="text-[12px] mt-1" style={{ color: 'var(--sk-text-2)' }} title={formatFullDateTime(message.createdAt)}>
          {sourceLabel} のメッセージ ｜ {formatRelativeTime(message.createdAt)}
        </div>
      </div>
    </ModalShell>
  );
}
