import { Timestamp } from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// User
// ─────────────────────────────────────────────────────────────────────────────
export interface UserStatus {
  emoji: string;
  text: string;
}

export interface User {
  uid: string;
  displayName: string;
  photoURL: string | null;
  email: string;
  online: boolean;
  lastSeen: Timestamp | null;
  status?: UserStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Channel
// ─────────────────────────────────────────────────────────────────────────────
export interface Channel {
  id: string;
  name: string;
  description: string;
  createdBy: string;       // uid
  createdAt: Timestamp;
  members: string[];       // uid[]
  isDM?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Message
// ─────────────────────────────────────────────────────────────────────────────
export interface Message {
  id: string;
  text: string;
  uid: string;
  displayName: string;
  photoURL: string | null;
  createdAt: Timestamp;
  editedAt?: Timestamp;
  mentions?: string[];     // uid[]
  threadCount?: number;
  lastReplyAt?: Timestamp;
  threadParticipants?: string[];  // uid[]
  reactions?: Record<string, string[]>; // emoji → uid[]
  channelId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Thread  (messages/{messageId}/threads/{threadId})
// ─────────────────────────────────────────────────────────────────────────────
export interface Thread {
  id: string;
  messageId: string;
  text: string;
  uid: string;
  displayName: string;
  photoURL: string | null;
  createdAt: Timestamp;
  editedAt?: Timestamp;
  reactions?: Record<string, string[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pin  (channels/{channelId}/pins/{pinId})
// ─────────────────────────────────────────────────────────────────────────────
export interface Pin {
  id: string;
  name: string;
  url: string;
  createdBy: string;   // uid
  createdAt: Timestamp;
  order: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification  (notifications/{userId}/items/{notifId})
// ─────────────────────────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  messageId: string;
  channelId: string;
  fromUser: string;            // uid
  fromDisplayName: string;     // 送信者の表示名
  text: string;
  read: boolean;
  createdAt: Timestamp;
}

// ─────────────────────────────────────────────────────────────────────────────
// SavedMessage  (users/{uid}/saved/{messageId})
// ─────────────────────────────────────────────────────────────────────────────
export interface SavedMessage {
  id: string;          // same as messageId
  messageId: string;
  channelId: string;
  text: string;
  fromUid: string;
  fromDisplayName: string;
  fromPhotoURL: string | null;
  savedAt: Timestamp;
  originalCreatedAt: Timestamp;
}

// ─────────────────────────────────────────────────────────────────────────────
// TypingUser  (channels/{channelId}/typing/{uid})
// ─────────────────────────────────────────────────────────────────────────────
export interface TypingUser {
  uid: string;
  displayName: string;
  timestamp: Timestamp;
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthState
// ─────────────────────────────────────────────────────────────────────────────
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// AppStore  (Zustand store 型)
// ─────────────────────────────────────────────────────────────────────────────
export interface AppStore {
  // ── Auth ──────────────────────────────────────────────────────────────────
  auth: AuthState;
  setUser: (user: User | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;

  // ── Channels ──────────────────────────────────────────────────────────────
  channels: Channel[];
  activeChannelId: string | null;
  setChannels: (channels: Channel[]) => void;
  setActiveChannel: (channelId: string | null) => void;
  addChannel: (channel: Channel) => void;
  updateChannel: (channelId: string, data: Partial<Channel>) => void;
  removeChannel: (channelId: string) => void;

  // ── Messages ──────────────────────────────────────────────────────────────
  messages: Record<string, Message[]>;   // channelId → Message[]
  setMessages: (channelId: string, messages: Message[]) => void;
  addMessage: (channelId: string, message: Message) => void;
  updateMessage: (channelId: string, messageId: string, data: Partial<Message>) => void;
  removeMessage: (channelId: string, messageId: string) => void;

  // ── Threads ───────────────────────────────────────────────────────────────
  threads: Record<string, Thread[]>;     // messageId → Thread[]
  setThreads: (messageId: string, threads: Thread[]) => void;
  addThread: (messageId: string, thread: Thread) => void;
  removeThread: (messageId: string, threadId: string) => void;

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[]) => void;
  markNotificationRead: (notifId: string) => void;
  markAllNotificationsRead: () => void;

  // ── Saved Messages ────────────────────────────────────────────────────────
  savedMessages: SavedMessage[];
  setSavedMessages: (messages: SavedMessage[]) => void;
  addSavedMessage: (message: SavedMessage) => void;
  removeSavedMessage: (messageId: string) => void;

  // ── Users (centralized) ───────────────────────────────────────────────────
  users: User[];
  setUsers: (users: User[]) => void;

  // ── UI State ──────────────────────────────────────────────────────────────
  sidebarOpen: boolean;
  threadPanelMessageId: string | null;
  searchQuery: string;
  notificationsPanelOpen: boolean;
  savedItemsPanelOpen: boolean;
  editingMessageId: string | null;
  setSidebarOpen: (open: boolean) => void;
  openThreadPanel: (messageId: string) => void;
  closeThreadPanel: () => void;
  setSearchQuery: (q: string) => void;
  setNotificationsPanelOpen: (open: boolean) => void;
  setSavedItemsPanelOpen: (open: boolean) => void;
  setEditingMessageId: (id: string | null) => void;
}
