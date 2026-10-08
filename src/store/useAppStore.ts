import { create } from 'zustand';
import type { AppStore, User, Channel, Message, Thread, Notification, SavedMessage, Draft } from '../types';

// ── Draft localStorage helpers ────────────────────────────────────────────────
const DRAFTS_KEY = 'slack_clone_drafts';
function loadDraftsFromStorage(): Record<string, Draft> {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveDraftsToStorage(drafts: Record<string, Draft>) {
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  } catch {
    // ignore quota errors
  }
}

// ── Generic localStorage JSON helpers ─────────────────────────────────────────
function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function saveLS(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / privacy-mode errors
  }
}

/** 左のタブレール（ホーム / DM / アクティビティ / ファイル / 後で / その他） */
export type NavTab = 'home' | 'dms' | 'activity' | 'files' | 'later';
/** メインペインの表示内容 */
export type MainView = 'channel' | 'threads' | 'drafts' | 'directory' | 'huddles' | 'slackbot';
/** チャンネルヘッダー下のタブ */
export type ChannelTab = 'messages' | 'pins' | 'files';
/** チャンネル単位の通知設定 */
export type ChannelNotifPref = 'all' | 'mentions' | 'off';
/** サイドバーテーマ */
export type ThemeId = 'crimson' | 'aubergine' | 'midnight' | 'forest';

const THEME_KEY = 'slack_clone_theme';
const STARRED_KEY = 'slack_clone_starred';
const NOTIF_PREFS_KEY = 'slack_clone_channel_notif';
const PAUSED_KEY = 'slack_clone_notif_paused';
const LATER_DONE_KEY = 'slack_clone_later_done';

function applyTheme(theme: ThemeId) {
  try {
    document.documentElement.dataset.theme = theme;
  } catch {
    // SSR / test env
  }
}
const initialTheme = loadLS<ThemeId>(THEME_KEY, 'crimson');
applyTheme(initialTheme);

// ─────────────────────────────────────────────────────────────────────────────
// 拡張型: タスク要件の追加フィールド・アクションを補完する
// ─────────────────────────────────────────────────────────────────────────────
interface ExtendedStore extends AppStore {
  // Auth (currentUser エイリアス)
  currentUser: User | null
  setCurrentUser: (user: User | null) => void

  // Thread パネル管理
  activeThreadMessageId: string | null
  threadMessages: Thread[]
  setActiveThread: (messageId: string | null) => void
  setThreadMessages: (threads: Thread[]) => void

  // サイドバートグル
  toggleSidebar: () => void

  // モバイル用ドロワー
  mobileSidebarOpen: boolean
  setMobileSidebarOpen: (open: boolean) => void

  // URL共有リンクからのメッセージジャンプ
  jumpToMessageId: string | null
  setJumpToMessageId: (id: string | null) => void

  // チャンネルメッセージのローディング状態
  channelLoading: boolean
  setChannelLoading: (loading: boolean) => void

  // スレッドパネル
  threadsPanelOpen: boolean
  setThreadsPanelOpen: (open: boolean) => void

  // Drafts (already defined in AppStore but repeated here for clarity)
  _draftsLoaded: boolean

  // ── Slack 風ナビゲーション ─────────────────────────────────────────────────
  navTab: NavTab
  setNavTab: (tab: NavTab) => void
  mainView: MainView
  setMainView: (view: MainView) => void
  channelTab: ChannelTab
  setChannelTab: (tab: ChannelTab) => void

  // チャンネル移動履歴（ヘッダーの ← → と 🕘 用）
  navHistory: string[]
  navIndex: number
  navBack: () => void
  navForward: () => void

  // スター付きチャンネル（localStorage 永続化）
  starredChannelIds: string[]
  toggleStarChannel: (channelId: string) => void

  // チャンネル通知設定（localStorage 永続化）
  channelNotifPrefs: Record<string, ChannelNotifPref>
  setChannelNotifPref: (channelId: string, pref: ChannelNotifPref) => void

  // 通知の一時停止（デスクトップ通知を抑止）
  notificationsPaused: boolean
  setNotificationsPaused: (paused: boolean) => void

  // テーマ
  theme: ThemeId
  setTheme: (theme: ThemeId) => void

  // 「後で」タブで完了にしたメッセージ ID
  laterDoneIds: string[]
  toggleLaterDone: (messageId: string) => void

  // キーボードショートカット一覧モーダル
  shortcutsOpen: boolean
  setShortcutsOpen: (open: boolean) => void
}

export const useAppStore = create<ExtendedStore>((set, _get) => ({
  // ── Auth ──────────────────────────────────────────────────────────────────
  auth: {
    user: null,
    loading: true,
    error: null,
  },
  // currentUser は auth.user への便利なエイリアス
  currentUser: null,
  setCurrentUser: (user: User | null) => {
    set((state) => ({
      currentUser: user,
      auth: { ...state.auth, user, loading: false },
    }))
  },
  setUser: (user: User | null) =>
    set((state) => ({
      currentUser: user,
      auth: { ...state.auth, user, loading: false },
    })),
  setAuthLoading: (loading: boolean) =>
    set((state) => ({ auth: { ...state.auth, loading } })),
  setAuthError: (error: string | null) =>
    set((state) => ({ auth: { ...state.auth, error } })),

  // ── Channels ──────────────────────────────────────────────────────────────
  channels: [],
  activeChannelId: null,
  setChannels: (channels: Channel[]) => set({ channels }),
  setActiveChannel: (channelId: string | null) =>
    set((state) => {
      if (!channelId) return { activeChannelId: null };
      // 履歴: 現在位置より先を捨てて push（同一チャンネルの連続は無視）
      const base = state.navHistory.slice(0, state.navIndex + 1);
      const navHistory = base[base.length - 1] === channelId ? base : [...base, channelId].slice(-50);
      return {
        activeChannelId: channelId,
        mainView: 'channel',
        channelTab: state.activeChannelId === channelId ? state.channelTab : 'messages',
        navHistory,
        navIndex: navHistory.length - 1,
      };
    }),
  addChannel: (channel: Channel) =>
    set((state) => ({ channels: [...state.channels, channel] })),
  updateChannel: (channelId: string, data: Partial<Channel>) =>
    set((state) => ({
      channels: state.channels.map((c) =>
        c.id === channelId ? { ...c, ...data } : c
      ),
    })),
  removeChannel: (channelId: string) =>
    set((state) => ({
      channels: state.channels.filter((c) => c.id !== channelId),
    })),

  // ── Messages ──────────────────────────────────────────────────────────────
  messages: {},
  setMessages: (channelId: string, messages: Message[]) =>
    set((state) => ({
      messages: { ...state.messages, [channelId]: messages },
    })),
  addMessage: (channelId: string, message: Message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: [...(state.messages[channelId] ?? []), message],
      },
    })),
  updateMessage: (channelId: string, messageId: string, data: Partial<Message>) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: (state.messages[channelId] ?? []).map((m) =>
          m.id === messageId ? { ...m, ...data } : m
        ),
      },
    })),
  removeMessage: (channelId: string, messageId: string) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: (state.messages[channelId] ?? []).filter(
          (m) => m.id !== messageId
        ),
      },
    })),

  // ── Threads ───────────────────────────────────────────────────────────────
  threads: {},
  setThreads: (messageId: string, threads: Thread[]) =>
    set((state) => ({
      threads: { ...state.threads, [messageId]: threads },
    })),
  addThread: (messageId: string, thread: Thread) =>
    set((state) => ({
      threads: {
        ...state.threads,
        [messageId]: [...(state.threads[messageId] ?? []), thread],
      },
    })),
  removeThread: (messageId: string, threadId: string) =>
    set((state) => ({
      threads: {
        ...state.threads,
        [messageId]: (state.threads[messageId] ?? []).filter(
          (t) => t.id !== threadId
        ),
      },
    })),

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications: Notification[]) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),
  markNotificationRead: (notifId: string) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === notifId ? { ...n, read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    }),
  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  // ── Saved Messages ────────────────────────────────────────────────────────
  savedMessages: [],
  setSavedMessages: (savedMessages: SavedMessage[]) => set({ savedMessages }),
  addSavedMessage: (message: SavedMessage) =>
    set((state) => ({
      savedMessages: [message, ...state.savedMessages.filter((m) => m.messageId !== message.messageId)],
    })),
  removeSavedMessage: (messageId: string) =>
    set((state) => ({
      savedMessages: state.savedMessages.filter((m) => m.messageId !== messageId),
    })),

  // ── Thread パネル管理 ─────────────────────────────────────────────────────
  activeThreadMessageId: null,
  threadMessages: [],
  setActiveThread: (messageId: string | null) =>
    set({ activeThreadMessageId: messageId, threadMessages: [] }),
  setThreadMessages: (threads: Thread[]) => set({ threadMessages: threads }),

  // ── Users (centralized) ───────────────────────────────────────────────────
  users: [],
  setUsers: (users: User[]) => set({ users }),

  // ── UI State ──────────────────────────────────────────────────────────────
  sidebarOpen: true,
  threadPanelMessageId: null,
  searchQuery: '',
  notificationsPanelOpen: false,
  savedItemsPanelOpen: false,
  draftsPanelOpen: false,
  threadsPanelOpen: false,
  editingMessageId: null,
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  mobileSidebarOpen: false,
  setMobileSidebarOpen: (open: boolean) => set({ mobileSidebarOpen: open }),
  jumpToMessageId: null,
  setJumpToMessageId: (id: string | null) => set({ jumpToMessageId: id }),
  channelLoading: false,
  setChannelLoading: (loading: boolean) => set({ channelLoading: loading }),
  openThreadPanel: (messageId: string) =>
    set({ threadPanelMessageId: messageId, activeThreadMessageId: messageId }),
  closeThreadPanel: () =>
    set({ threadPanelMessageId: null, activeThreadMessageId: null }),
  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  setNotificationsPanelOpen: (notificationsPanelOpen: boolean) =>
    set({ notificationsPanelOpen, ...(notificationsPanelOpen ? { savedItemsPanelOpen: false, draftsPanelOpen: false, threadsPanelOpen: false } : {}) }),
  setSavedItemsPanelOpen: (savedItemsPanelOpen: boolean) =>
    set({ savedItemsPanelOpen, ...(savedItemsPanelOpen ? { notificationsPanelOpen: false, draftsPanelOpen: false, threadsPanelOpen: false } : {}) }),
  setDraftsPanelOpen: (draftsPanelOpen: boolean) =>
    set({ draftsPanelOpen, ...(draftsPanelOpen ? { notificationsPanelOpen: false, savedItemsPanelOpen: false, threadsPanelOpen: false } : {}) }),
  setThreadsPanelOpen: (threadsPanelOpen: boolean) =>
    set({ threadsPanelOpen, ...(threadsPanelOpen ? { notificationsPanelOpen: false, savedItemsPanelOpen: false, draftsPanelOpen: false } : {}) }),
  setEditingMessageId: (editingMessageId: string | null) => set({ editingMessageId }),

  // ── Slack 風ナビゲーション ─────────────────────────────────────────────────
  navTab: 'home',
  setNavTab: (navTab) => set({ navTab }),
  mainView: 'channel',
  setMainView: (mainView) =>
    set({
      mainView,
      threadsPanelOpen: false,
      draftsPanelOpen: false,
    }),
  channelTab: 'messages',
  setChannelTab: (channelTab) => set({ channelTab }),

  navHistory: [],
  navIndex: -1,
  navBack: () =>
    set((state) => {
      if (state.navIndex <= 0) return {};
      const navIndex = state.navIndex - 1;
      return { navIndex, activeChannelId: state.navHistory[navIndex], mainView: 'channel', channelTab: 'messages' };
    }),
  navForward: () =>
    set((state) => {
      if (state.navIndex >= state.navHistory.length - 1) return {};
      const navIndex = state.navIndex + 1;
      return { navIndex, activeChannelId: state.navHistory[navIndex], mainView: 'channel', channelTab: 'messages' };
    }),

  starredChannelIds: loadLS<string[]>(STARRED_KEY, []),
  toggleStarChannel: (channelId) =>
    set((state) => {
      const starredChannelIds = state.starredChannelIds.includes(channelId)
        ? state.starredChannelIds.filter((id) => id !== channelId)
        : [...state.starredChannelIds, channelId];
      saveLS(STARRED_KEY, starredChannelIds);
      return { starredChannelIds };
    }),

  channelNotifPrefs: loadLS<Record<string, ChannelNotifPref>>(NOTIF_PREFS_KEY, {}),
  setChannelNotifPref: (channelId, pref) =>
    set((state) => {
      const channelNotifPrefs = { ...state.channelNotifPrefs, [channelId]: pref };
      if (pref === 'all') delete channelNotifPrefs[channelId];
      saveLS(NOTIF_PREFS_KEY, channelNotifPrefs);
      return { channelNotifPrefs };
    }),

  notificationsPaused: loadLS<boolean>(PAUSED_KEY, false),
  setNotificationsPaused: (notificationsPaused) => {
    saveLS(PAUSED_KEY, notificationsPaused);
    set({ notificationsPaused });
  },

  theme: initialTheme,
  setTheme: (theme) => {
    saveLS(THEME_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },

  laterDoneIds: loadLS<string[]>(LATER_DONE_KEY, []),
  toggleLaterDone: (messageId) =>
    set((state) => {
      const laterDoneIds = state.laterDoneIds.includes(messageId)
        ? state.laterDoneIds.filter((id) => id !== messageId)
        : [...state.laterDoneIds, messageId];
      saveLS(LATER_DONE_KEY, laterDoneIds);
      return { laterDoneIds };
    }),

  shortcutsOpen: false,
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),

  // ── Drafts ────────────────────────────────────────────────────────────────
  drafts: loadDraftsFromStorage(),
  _draftsLoaded: true,
  saveDraft: (channelId: string, html: string, text: string) =>
    set((state) => {
      const trimmed = text.replace(/\n/g, '').trim();
      let nextDrafts: Record<string, Draft>;
      if (!trimmed) {
        // Empty content → remove draft
        const { [channelId]: _removed, ...rest } = state.drafts;
        nextDrafts = rest;
      } else {
        nextDrafts = {
          ...state.drafts,
          [channelId]: { channelId, html, text: trimmed, savedAt: Date.now() },
        };
      }
      saveDraftsToStorage(nextDrafts);
      return { drafts: nextDrafts };
    }),
  deleteDraft: (channelId: string) =>
    set((state) => {
      const { [channelId]: _removed, ...rest } = state.drafts;
      saveDraftsToStorage(rest);
      return { drafts: rest };
    }),
}));
