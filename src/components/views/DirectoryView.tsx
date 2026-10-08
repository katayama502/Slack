// メインビュー「ディレクトリ」: メンバー / チャンネル
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { joinChannelIfNeeded } from '../../services';
import { markChannelRead } from '../../hooks/useUnreadChannels';
import { toast } from '../ui/Toast';
import Avatar from '../ui/Avatar';
import ViewHeader, { ViewTabs, EmptyState } from './ViewHeader';
import { SearchIcon, HashIcon, LockIcon, UsersIcon, CheckIcon } from '../ui/icons';
import { useOpenDM, isDMChannel } from '../sidebar/shared';

type Tab = 'members' | 'channels';

export default function DirectoryView() {
  const { user } = useAppStore((s) => s.auth);
  const users = useAppStore((s) => s.users);
  const channels = useAppStore((s) => s.channels);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const { openDM } = useOpenDM();
  const [tab, setTab] = useState<Tab>('members');
  const [query, setQuery] = useState('');
  const [joining, setJoining] = useState<string | null>(null);

  const uid = user?.uid ?? '';
  const q = query.trim().toLowerCase();
  const members = users
    .filter((u) => !q || u.displayName.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q))
    .sort((a, b) => Number(b.online) - Number(a.online) || a.displayName.localeCompare(b.displayName, 'ja'));
  const visibleChannels = channels
    .filter((c) => !isDMChannel(c) && (!c.isPrivate || (c.members ?? []).includes(uid)))
    .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'));

  const openChannel = async (channelId: string, isMember: boolean) => {
    if (!user) return;
    if (!isMember) {
      setJoining(channelId);
      try {
        await joinChannelIfNeeded(channelId, user.uid);
        toast.success('チャンネルに参加しました');
      } catch {
        toast.error('チャンネルに参加できませんでした');
        setJoining(null);
        return;
      }
      setJoining(null);
    }
    markChannelRead(channelId);
    setActiveChannel(channelId);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <ViewHeader title="ディレクトリ" />
      <ViewTabs<Tab>
        label="ディレクトリのタブ"
        value={tab}
        onChange={(t) => { setTab(t); setQuery(''); }}
        tabs={[
          { id: 'members', label: 'メンバー', count: users.length },
          { id: 'channels', label: 'チャンネル', count: visibleChannels.length },
        ]}
      />
      <div className="px-5 pt-4 pb-3 flex-shrink-0">
        <label className="flex items-center gap-2 px-3 rounded-lg focus-within:shadow-[0_0_0_1px_var(--sk-blue),0_0_0_5px_rgba(29,155,209,0.3)]" style={{ height: 36, border: '1px solid var(--sk-border-strong)' }}>
          <SearchIcon className="w-4 h-4 text-[var(--sk-text-2)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === 'members' ? 'メンバーを検索する' : 'チャンネルを検索する'}
            aria-label={tab === 'members' ? 'メンバーを検索する' : 'チャンネルを検索する'}
            className="flex-1 text-[15px] text-[var(--sk-text)] focus:outline-none bg-transparent"
          />
        </label>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6">
        {tab === 'members' ? (
          members.length === 0 ? (
            <EmptyState icon={<UsersIcon className="w-8 h-8" />} title="該当するメンバーはいません" body="別のキーワードで検索してみてください。" />
          ) : (
            <ul className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}>
              {members.map((u) => (
                <li key={u.uid}>
                  <button
                    type="button"
                    onClick={() => openDM(u.uid)}
                    className="w-full text-left rounded-lg overflow-hidden hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-shadow"
                    style={{ border: '1px solid var(--sk-border)' }}
                    aria-label={`${u.displayName} にメッセージを送信`}
                  >
                    <div className="aspect-square w-full flex items-center justify-center" style={{ background: 'var(--sk-subtle)' }}>
                      <Avatar name={u.displayName} photoURL={u.photoURL} size={120} radius={12} />
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="flex items-center gap-1.5 text-[15px] text-[var(--sk-text)] truncate" style={{ fontWeight: 900 }}>
                        <span className="truncate">{u.displayName}{u.uid === uid ? '（自分）' : ''}</span>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: u.online ? 'var(--sk-online)' : 'transparent', border: u.online ? undefined : '1.5px solid var(--sk-text-3)' }} aria-label={u.online ? 'アクティブ' : '離席中'} />
                      </p>
                      <p className="text-[13px] text-[var(--sk-text-2)] truncate mt-0.5">
                        {u.status ? `${u.status.emoji} ${u.status.text}` : u.online ? 'アクティブ' : '離席中'}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : visibleChannels.length === 0 ? (
          <EmptyState icon={<HashIcon className="w-8 h-8" />} title="該当するチャンネルはありません" body="別のキーワードで検索してみてください。" />
        ) : (
          <ul className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--sk-border)' }}>
            {visibleChannels.map((c, i) => {
              const isMember = (c.members ?? []).includes(uid);
              const Icon = c.isPrivate ? LockIcon : HashIcon;
              return (
                <li key={c.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-[var(--sk-hover)]" style={{ borderTop: i === 0 ? undefined : '1px solid var(--sk-border)' }}>
                  <button type="button" onClick={() => openChannel(c.id, isMember)} className="flex-1 min-w-0 text-left">
                    <p className="flex items-center gap-1 text-[15px] text-[var(--sk-text)]" style={{ fontWeight: 900 }}>
                      <Icon className="w-4 h-4 flex-shrink-0" /><span className="truncate">{c.name}</span>
                    </p>
                    <p className="text-[13px] text-[var(--sk-text-2)] truncate mt-0.5">
                      {isMember && <span className="inline-flex items-center gap-0.5 text-[var(--sk-green)] font-bold mr-1"><CheckIcon className="w-3 h-3" />参加済み</span>}
                      {(c.members ?? []).length} 人のメンバー{c.description ? ` · ${c.description}` : ''}
                    </p>
                  </button>
                  {isMember ? (
                    <button
                      type="button"
                      onClick={() => openChannel(c.id, true)}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 px-3 rounded-lg text-[13px] font-bold text-[var(--sk-text)] bg-white"
                      style={{ height: 28, border: '1px solid var(--sk-border-strong)' }}
                    >
                      表示する
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openChannel(c.id, false)}
                      disabled={joining === c.id}
                      className="px-3 rounded-lg text-[13px] font-bold text-white"
                      style={{ height: 28, background: 'var(--sk-green)' }}
                    >
                      {joining === c.id ? '参加中...' : '参加する'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
