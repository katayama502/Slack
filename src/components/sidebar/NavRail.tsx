// 左端のタブレール（70px）: ワークスペース / ホーム / DM / アクティビティ / ファイル / 後で / その他 / 作成 / テーマ / プロフィール
import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { NavTab, ThemeId } from '../../store/useAppStore';
import { signOut } from '../../services';
import { useUnreadChannels } from '../../hooks/useUnreadChannels';
import Avatar from '../ui/Avatar';
import { StatusPicker } from '../ui/StatusPicker';
import { toast } from '../ui/Toast';
import AddChannelModal from './AddChannelModal';
import { Popover, MenuItem, MenuDivider, NewDMModal, ToggleSwitch, isDMChannel } from './shared';
import {
  HomeIcon, DMIcon, BellIcon, FilesIcon, BookmarkIcon, MoreHorizontalIcon, PlusIcon, MoonIcon, CheckIcon,
} from '../ui/icons';

export const THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: 'crimson', label: 'クリムゾン', swatch: 'linear-gradient(135deg, #7A0F2C, #4A0D3C)' },
  { id: 'aubergine', label: 'オーベルジーヌ', swatch: 'linear-gradient(135deg, #3B0B3C, #350D36)' },
  { id: 'midnight', label: 'ミッドナイト', swatch: 'linear-gradient(135deg, #0B1C3A, #102A54)' },
  { id: 'forest', label: 'フォレスト', swatch: 'linear-gradient(135deg, #0F3D2E, #0B2A26)' },
];

type PopoverKind = 'more' | 'create' | 'theme' | 'profile';

function RailTab({
  label,
  active,
  onClick,
  icon,
  badge,
}: {
  label: string;
  active: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  icon: (filled: boolean) => React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className="group flex flex-col items-center gap-[3px] w-full pt-1 pb-1.5"
    >
      <span
        className={`relative w-9 h-9 flex items-center justify-center rounded-lg text-white transition-colors ${active ? '' : 'group-hover:bg-[var(--sk-rail-hover)]'}`}
        style={{ background: active ? 'var(--sk-rail-active)' : undefined }}
      >
        {icon(active)}
        {badge}
      </span>
      <span className="text-[11px] font-bold text-white leading-[13px] text-center px-0.5">{label}</span>
    </button>
  );
}

export default function NavRail() {
  const { user } = useAppStore((s) => s.auth);
  const users = useAppStore((s) => s.users);
  const navTab = useAppStore((s) => s.navTab);
  const setNavTab = useAppStore((s) => s.setNavTab);
  const setMainView = useAppStore((s) => s.setMainView);
  const unreadCount = useAppStore((s) => s.unreadCount);
  const channels = useAppStore((s) => s.channels);
  const channelNotifPrefs = useAppStore((s) => s.channelNotifPrefs);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const notificationsPaused = useAppStore((s) => s.notificationsPaused);
  const setNotificationsPaused = useAppStore((s) => s.setNotificationsPaused);
  const setShortcutsOpen = useAppStore((s) => s.setShortcutsOpen);
  const unreadChannels = useUnreadChannels();

  const [pop, setPop] = useState<{ kind: PopoverKind; anchor: DOMRect } | null>(null);
  const [showNewDM, setShowNewDM] = useState(false);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [statusAnchor, setStatusAnchor] = useState<DOMRect | null>(null);

  const me = users.find((u) => u.uid === user?.uid) ?? user;
  const close = () => setPop(null);
  const openPop = (kind: PopoverKind) => (e: React.MouseEvent<HTMLElement>) => {
    const anchor = e.currentTarget.getBoundingClientRect();
    setPop((p) => (p?.kind === kind ? null : { kind, anchor }));
  };

  // サイドバーの歯車メニュー等からテーマピッカーを開く
  useEffect(() => {
    const handler = () => {
      const el = document.getElementById('rail-theme-button');
      if (el) setPop({ kind: 'theme', anchor: el.getBoundingClientRect() });
    };
    window.addEventListener('open-theme-picker', handler);
    return () => window.removeEventListener('open-theme-picker', handler);
  }, []);

  // ホームの未読ドット: ミュートでないチャンネル / DM のいずれかが未読
  const homeHasUnread = Array.from(unreadChannels).some((id) => {
    const ch = channels.find((c) => c.id === id);
    return ch && !isDMChannel(ch) && channelNotifPrefs[id] !== 'off';
  });
  const dmHasUnread = Array.from(unreadChannels).some((id) => {
    const ch = channels.find((c) => c.id === id);
    return ch && isDMChannel(ch);
  });

  const tab = (t: NavTab) => () => { setNavTab(t); close(); };
  const dot = (show: boolean) =>
    show ? <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-white" style={{ boxShadow: '0 0 0 2px rgba(0,0,0,0.15)' }} aria-hidden="true" /> : null;

  const handleSignOut = async () => {
    close();
    try { await signOut(); } catch (err) { console.error('Sign out error:', err); }
  };

  return (
    <div className="flex flex-col items-center flex-shrink-0 pb-3" style={{ width: 70 }} aria-label="タブ">
      {/* Workspace icon */}
      <button
        type="button"
        title="Creatte"
        aria-label="Creatte ワークスペース"
        onClick={tab('home')}
        className="mt-1 mb-3 w-9 h-9 flex items-center justify-center rounded-lg bg-white text-[20px] leading-none"
        style={{ color: '#4A154B', fontWeight: 900, boxShadow: '0 0 0 3px rgba(255,255,255,0.25)' }}
      >
        C
      </button>

      <div className="flex flex-col items-center w-full gap-1">
        <RailTab label="ホーム" active={navTab === 'home'} onClick={tab('home')} icon={(f) => <HomeIcon filled={f} className="w-5 h-5" />} badge={dot(homeHasUnread && navTab !== 'home')} />
        <RailTab label="DM" active={navTab === 'dms'} onClick={tab('dms')} icon={(f) => <DMIcon filled={f} className="w-5 h-5" />} badge={dot(dmHasUnread && navTab !== 'dms')} />
        <RailTab
          label="アクティビティ"
          active={navTab === 'activity'}
          onClick={tab('activity')}
          icon={(f) => <BellIcon filled={f} className="w-5 h-5" />}
          badge={unreadCount > 0 ? (
            <span
              className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ background: 'var(--sk-badge)', boxShadow: '0 0 0 2px rgba(0,0,0,0.2)' }}
              aria-label={`未読 ${unreadCount} 件`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : undefined}
        />
        <RailTab label="ファイル" active={navTab === 'files'} onClick={tab('files')} icon={(f) => <FilesIcon filled={f} className="w-5 h-5" />} />
        <RailTab label="後で" active={navTab === 'later'} onClick={tab('later')} icon={(f) => <BookmarkIcon filled={f} className="w-5 h-5" />} />
        <RailTab label="その他" active={pop?.kind === 'more'} onClick={openPop('more')} icon={() => <MoreHorizontalIcon className="w-5 h-5" />} />
      </div>

      <div className="flex-1" />

      {/* Bottom: create / theme / profile */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          aria-label="作成する"
          title="作成する"
          onClick={openPop('create')}
          className="w-9 h-9 flex items-center justify-center rounded-full text-white transition-colors hover:bg-[rgba(255,255,255,0.3)]"
          style={{ background: 'rgba(255,255,255,0.2)' }}
        >
          <PlusIcon className="w-5 h-5" />
        </button>
        <button
          id="rail-theme-button"
          type="button"
          aria-label="テーマを変更"
          title="テーマを変更"
          onClick={openPop('theme')}
          className="w-9 h-9 flex items-center justify-center rounded-full text-white transition-colors hover:bg-[var(--sk-rail-hover)]"
          style={{ background: 'rgba(255,255,255,0.12)' }}
        >
          <MoonIcon className="w-5 h-5" />
        </button>
        <button type="button" aria-label="プロフィール" title={me?.displayName ?? 'プロフィール'} onClick={openPop('profile')} className="rounded-lg">
          <Avatar name={me?.displayName ?? '?'} photoURL={me?.photoURL} size={36} online={me?.online ?? true} ringColor="rgba(0,0,0,0.35)" />
        </button>
      </div>

      {/* ── Popovers ── */}
      {pop?.kind === 'more' && (
        <Popover anchor={pop.anchor} onClose={close} label="その他">
          <p className="px-6 pb-1 text-[13px] font-bold text-[var(--sk-text-2)]">その他</p>
          <MenuItem onClick={() => { close(); setNavTab('home'); setMainView('directory'); }}>ディレクトリ</MenuItem>
          <MenuItem onClick={() => { close(); setNavTab('home'); setMainView('huddles'); }}>ハドルミーティング</MenuItem>
          <MenuItem onClick={() => { close(); setMainView('slackbot'); }}>Slackbot</MenuItem>
          <MenuDivider />
          <MenuItem onClick={() => { const el = document.getElementById('rail-theme-button'); if (el) setPop({ kind: 'theme', anchor: el.getBoundingClientRect() }); }}>テーマを変更</MenuItem>
          <MenuItem onClick={() => { close(); setShortcutsOpen(true); }}>キーボードショートカット</MenuItem>
          <MenuDivider />
          <MenuItem onClick={handleSignOut}>サインアウト</MenuItem>
        </Popover>
      )}

      {pop?.kind === 'create' && (
        <Popover anchor={pop.anchor} placement="right-up" width={280} onClose={close} label="作成">
          <p className="px-6 pb-1 text-[13px] font-bold text-[var(--sk-text-2)]">作成する</p>
          <MenuItem onClick={() => { close(); setShowNewDM(true); }}>メッセージ</MenuItem>
          <MenuItem onClick={() => { close(); setShowAddChannel(true); }}>チャンネル</MenuItem>
        </Popover>
      )}

      {pop?.kind === 'theme' && (
        <Popover anchor={pop.anchor} placement="right-up" width={300} onClose={close} label="テーマ">
          <p className="px-5 pb-2 text-[15px] font-bold">テーマ</p>
          <div className="grid grid-cols-2 gap-2 px-4 pb-2">
            {THEMES.map((t) => {
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => setTheme(t.id)}
                  className="flex items-center gap-2 p-1.5 rounded-lg text-left text-[13px] hover:bg-[var(--sk-subtle)]"
                  style={{ boxShadow: active ? 'inset 0 0 0 2px var(--sk-blue)' : 'inset 0 0 0 1px var(--sk-border)' }}
                >
                  <span className="w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center text-white" style={{ background: t.swatch }}>
                    {active && <CheckIcon className="w-4 h-4" />}
                  </span>
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>
          <MenuDivider />
          <div className="flex items-center justify-between px-5" style={{ height: 32 }}>
            <span className="text-[15px]">通知を一時停止</span>
            <ToggleSwitch dark={false} checked={notificationsPaused} onChange={setNotificationsPaused} label="通知を一時停止" />
          </div>
        </Popover>
      )}

      {pop?.kind === 'profile' && (
        <Popover anchor={pop.anchor} placement="right-up" width={300} onClose={close} label="プロフィール">
          <div className="flex items-center gap-3 px-5 pb-3">
            <Avatar name={me?.displayName ?? '?'} photoURL={me?.photoURL} size={36} />
            <div className="min-w-0">
              <p className="text-[15px] truncate" style={{ fontWeight: 900 }}>{me?.displayName ?? 'ユーザー'}</p>
              <p className="text-[13px] text-[var(--sk-text-2)] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: notificationsPaused ? 'var(--sk-text-3)' : 'var(--sk-online)' }} />
                {notificationsPaused ? '通知を一時停止中' : 'アクティブ'}
              </p>
            </div>
          </div>
          <div className="px-4 pb-2">
            <button
              type="button"
              onClick={(e) => { setStatusAnchor(e.currentTarget.getBoundingClientRect()); close(); }}
              className="w-full flex items-center gap-2 px-3 rounded-md text-left text-[14px] text-[var(--sk-text-2)]"
              style={{ height: 36, border: '1px solid var(--sk-border-strong)' }}
            >
              <span>{me?.status?.emoji ?? '🙂'}</span>
              <span className="truncate">{me?.status?.text ?? 'ステータスを更新'}</span>
            </button>
          </div>
          <MenuItem onClick={() => setNotificationsPaused(!notificationsPaused)} right={<span className="text-[13px] opacity-70">{notificationsPaused ? 'オン' : 'オフ'}</span>}>
            {notificationsPaused ? '通知を再開する' : '通知を一時停止'}
          </MenuItem>
          <MenuDivider />
          <MenuItem onClick={() => { close(); toast.info('プロフィール編集はこのバージョンでは未対応です'); }}>プロフィール</MenuItem>
          <MenuDivider />
          <MenuItem onClick={handleSignOut}>Creatte からサインアウト</MenuItem>
        </Popover>
      )}

      {showNewDM && <NewDMModal onClose={() => setShowNewDM(false)} />}
      {showAddChannel && <AddChannelModal onClose={() => setShowAddChannel(false)} />}
      {statusAnchor && <StatusPicker anchor={statusAnchor} currentStatus={me?.status} onClose={() => setStatusAnchor(null)} />}
    </div>
  );
}
