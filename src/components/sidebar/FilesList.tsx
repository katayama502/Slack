// ファイルタブ: 読み込み済みメッセージから添付（📎 行）とリンクを抽出して一覧表示
import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { formatSidebarDate } from '../../utils/formatDate';
import { FilesIcon, LinkIcon } from '../ui/icons';
import { SidebarHeader, SidebarEmpty, channelLabel } from './shared';
import type { Timestamp } from 'firebase/firestore';

interface FileEntry {
  key: string;
  kind: 'file' | 'link';
  title: string;
  channelId: string;
  messageId: string;
  author: string;
  createdAt: Timestamp;
}

const URL_RE = /https?:\/\/[^\s<>"'）)]+/g;
const FILE_RE = /^📎\s*(.+)$/gm;

export default function FilesList() {
  const { user } = useAppStore((s) => s.auth);
  const messages = useAppStore((s) => s.messages);
  const channels = useAppStore((s) => s.channels);
  const users = useAppStore((s) => s.users);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const setJumpToMessageId = useAppStore((s) => s.setJumpToMessageId);
  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen);

  const entries = useMemo(() => {
    const out: FileEntry[] = [];
    for (const [channelId, msgs] of Object.entries(messages)) {
      for (const m of msgs) {
        const text = m.text ?? '';
        let i = 0;
        for (const match of text.matchAll(FILE_RE)) {
          out.push({ key: `${m.id}-f${i++}`, kind: 'file', title: match[1].trim(), channelId, messageId: m.id, author: m.displayName, createdAt: m.createdAt });
        }
        for (const match of text.matchAll(URL_RE)) {
          out.push({ key: `${m.id}-l${i++}`, kind: 'link', title: match[0], channelId, messageId: m.id, author: m.displayName, createdAt: m.createdAt });
        }
      }
    }
    return out.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  }, [messages]);

  const files = entries.filter((e) => e.kind === 'file');
  const links = entries.filter((e) => e.kind === 'link');

  const jump = (e: FileEntry) => {
    setActiveChannel(e.channelId);
    setJumpToMessageId(e.messageId);
    setMobileSidebarOpen(false);
  };

  const renderRow = (e: FileEntry) => {
    const ch = channels.find((c) => c.id === e.channelId);
    const Icon = e.kind === 'file' ? FilesIcon : LinkIcon;
    return (
      <li key={e.key}>
        <button
          type="button"
          onClick={() => jump(e)}
          className="w-full flex items-center gap-2.5 mx-2 px-2 py-1.5 rounded-md text-left hover:bg-[var(--sk-sidebar-hover)]"
          style={{ width: 'calc(100% - 16px)' }}
        >
          <span className="w-9 h-9 flex items-center justify-center rounded-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <Icon className="w-[18px] h-[18px] text-white" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block truncate text-[15px] font-bold text-white">{e.title}</span>
            <span className="block truncate text-[12px] text-[var(--sk-sidebar-muted)]">
              {e.author} · {channelLabel(ch, users, user?.uid)} · {formatSidebarDate(e.createdAt)}
            </span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <>
      <SidebarHeader title="ファイル" />
      <div className="flex-1 min-h-0 overflow-y-auto sidebar-scroll pb-4">
        {entries.length === 0 ? (
          <SidebarEmpty
            title="ファイルはまだありません"
            body="開いたチャンネルで共有されたファイルやリンクがここに表示されます。"
          />
        ) : (
          <>
            {files.length > 0 && (
              <section aria-label="最近のファイル" className="pt-1">
                <h3 className="px-4 py-2 text-[13px] font-bold text-[var(--sk-sidebar-text)]">最近のファイル</h3>
                <ul>{files.map(renderRow)}</ul>
              </section>
            )}
            {links.length > 0 && (
              <section aria-label="リンク" className="pt-2">
                <h3 className="px-4 py-2 text-[13px] font-bold text-[var(--sk-sidebar-text)]">リンク</h3>
                <ul>{links.map(renderRow)}</ul>
              </section>
            )}
            <p className="px-4 pt-3 text-[12px] leading-[16px] text-[var(--sk-sidebar-muted)]">
              表示中の一覧は、このセッションで開いたチャンネルのメッセージから作成されています。
            </p>
          </>
        )}
      </div>
    </>
  );
}
