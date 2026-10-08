// ─────────────────────────────────────────────────────────────────────────────
// 「ファイルとリンク」タブ: チャンネル内メッセージから
//   - "📎 filename" 形式の添付
//   - http/https リンク
// を抽出して新しい順に表示する（Slack 準拠）。
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useMessages } from '../../hooks/useMessages';
import { formatRelativeTime, formatFullDateTime } from '../../utils/formatDate';
import { FilesIcon, LinkIcon, PaperclipIcon } from '../ui/icons';
import type { Message } from '../../types';

type Item =
  | { kind: 'file'; key: string; name: string; message: Message }
  | { kind: 'link'; key: string; url: string; host: string; message: Message };

type Filter = 'all' | 'file' | 'link';

const URL_RE = /https?:\/\/[^\s<>()"'`\]]+/gi;

function safeHttpUrl(raw: string): URL | null {
  // 末尾の句読点を除去
  const cleaned = raw.replace(/[.,;:!?。、）」』]+$/u, '');
  try {
    const u = new URL(cleaned);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u : null;
  } catch {
    return null;
  }
}

function extract(messages: Message[]): Item[] {
  const items: Item[] = [];
  for (const m of messages) {
    m.text.split('\n').forEach((line, li) => {
      const t = line.trim();
      if (t.startsWith('📎')) {
        const name = t.replace(/^📎\s*/u, '').trim();
        if (name) items.push({ kind: 'file', key: `${m.id}-f${li}`, name, message: m });
      }
    });
    const seen = new Set<string>();
    for (const found of m.text.match(URL_RE) ?? []) {
      const u = safeHttpUrl(found);
      if (!u) continue;
      const href = u.toString();
      if (seen.has(href)) continue;
      seen.add(href);
      items.push({ kind: 'link', key: `${m.id}-l${seen.size}`, url: href, host: u.hostname, message: m });
    }
  }
  return items.sort(
    (a, b) => (b.message.createdAt?.toMillis?.() ?? 0) - (a.message.createdAt?.toMillis?.() ?? 0)
  );
}

function fileExt(name: string): string {
  const found = name.match(/\.([a-z0-9]{1,6})$/i);
  return found ? found[1].toUpperCase() : 'ファイル';
}

export default function FilesTab() {
  const messages = useMessages();
  const users = useAppStore((s) => s.users);
  const setChannelTab = useAppStore((s) => s.setChannelTab);
  const setJumpToMessageId = useAppStore((s) => s.setJumpToMessageId);
  const [filter, setFilter] = useState<Filter>('all');

  const items = useMemo(() => extract(messages), [messages]);
  const visible = filter === 'all' ? items : items.filter((i) => i.kind === filter);
  const counts = {
    all: items.length,
    file: items.filter((i) => i.kind === 'file').length,
    link: items.filter((i) => i.kind === 'link').length,
  };

  const chips: { key: Filter; label: string }[] = [
    { key: 'all', label: 'すべて' },
    { key: 'file', label: 'ファイル' },
    { key: 'link', label: 'リンク' },
  ];

  const jump = (id: string) => {
    setChannelTab('messages');
    setJumpToMessageId(id);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      <div className="flex items-center gap-2 px-5 py-3 flex-shrink-0">
        {chips.map((c) => {
          const active = filter === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              aria-pressed={active}
              className="h-[28px] px-3 rounded-full text-[13px] font-bold"
              style={
                active
                  ? { background: 'var(--sk-text)', color: '#FFFFFF', border: '1px solid var(--sk-text)' }
                  : { background: '#FFFFFF', color: 'var(--sk-text)', border: '1px solid var(--sk-border-strong)' }
              }
            >
              {c.label}
              <span className="ml-1 font-normal" style={{ opacity: 0.75 }}>{counts[c.key]}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--sk-subtle)', color: 'var(--sk-text-2)' }}>
            <FilesIcon className="w-9 h-9" />
          </div>
          <p className="text-[18px] font-black mb-1" style={{ color: 'var(--sk-text)' }}>
            {filter === 'link' ? 'まだリンクは共有されていません' : filter === 'file' ? 'まだファイルは共有されていません' : 'まだファイルやリンクは共有されていません'}
          </p>
          <p className="text-[15px] max-w-[420px]" style={{ color: 'var(--sk-text-2)' }}>
            この会話で共有されたファイルやリンクがここに表示されます。
          </p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto px-5 pb-6 flex flex-col gap-2">
          {visible.map((item) => {
            const m = item.message;
            const sender = users.find((u) => u.uid === m.uid)?.displayName ?? m.displayName;
            return (
              <li key={item.key}>
                <div
                  className="group flex items-center gap-3 p-3 bg-white hover:bg-[var(--sk-hover)]"
                  style={{ border: '1px solid var(--sk-border)', borderRadius: 'var(--sk-radius-card)' }}
                >
                  <span
                    className="w-[40px] h-[40px] rounded-lg flex items-center justify-center flex-shrink-0"
                    style={
                      item.kind === 'file'
                        ? { background: 'var(--sk-red)', color: '#FFFFFF' }
                        : { background: 'var(--sk-subtle)', color: 'var(--sk-text-2)' }
                    }
                  >
                    {item.kind === 'file' ? <PaperclipIcon className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                  </span>
                  <div className="min-w-0 flex-1 flex flex-col">
                    {item.kind === 'file' ? (
                      <>
                        <span className="text-[15px] font-bold truncate" style={{ color: 'var(--sk-text)' }}>{item.name}</span>
                        <span className="text-[13px]" style={{ color: 'var(--sk-text-2)' }}>{fileExt(item.name)}</span>
                      </>
                    ) : (
                      <>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[15px] font-bold truncate hover:underline"
                          style={{ color: 'var(--sk-link)' }}
                          title={item.url}
                        >
                          {item.url}
                        </a>
                        <span className="text-[13px] truncate" style={{ color: 'var(--sk-text-2)' }}>{item.host}</span>
                      </>
                    )}
                    <span className="text-[13px] truncate" style={{ color: 'var(--sk-text-2)' }}>
                      {sender} ・ <span title={formatFullDateTime(m.createdAt)}>{formatRelativeTime(m.createdAt)}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => jump(m.id)}
                    className="h-[28px] px-2.5 text-[13px] font-bold rounded-md bg-white flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-[var(--sk-hover)]"
                    style={{ border: '1px solid var(--sk-border-strong)', color: 'var(--sk-text)' }}
                  >
                    メッセージを表示
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
