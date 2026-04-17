import { create } from 'zustand';
import type { AppStore, User, Channel, Message, Thread, Notification } from '../types';

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
    set({ activeChannelId: channelId }),
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

  // ── Thread パネル管理 ─────────────────────────────────────────────────────
  activeThreadMessageId: null,
  threadMessages: [],
  setActiveThread: (messageId: string | null) =>
    set({ activeThreadMessageId: messageId, threadMessages: [] }),
  setThreadMessages: (threads: Thread[]) => set({ threadMessages: threads }),

  // ── UI State ──────────────────────────────────────────────────────────────
  sidebarOpen: true,
  threadPanelMessageId: null,
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  openThreadPanel: (messageId: string) =>
    set({ threadPanelMessageId: messageId, activeThreadMessageId: messageId }),
  closeThreadPanel: () =>
    set({ threadPanelMessageId: null, activeThreadMessageId: null }),
}));
