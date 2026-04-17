# PM WBS & Phase 4 実装指示書
## Slack風チャットアプリ

**作成日**: 2026-04-17  
**PM**: G-Stack AI PMエージェント  
**プロジェクト**: slack-clone

---

## 1. WBS（タスク一覧）

### 全体構成

```
slack-clone/
├── src/
│   ├── services/          # Backend担当（Firebase サービス層）
│   │   ├── firebase.ts
│   │   ├── authService.ts
│   │   ├── channelService.ts
│   │   ├── messageService.ts
│   │   ├── threadService.ts
│   │   ├── mentionService.ts
│   │   └── userService.ts
│   ├── store/             # Backend担当（Zustand）
│   │   ├── authStore.ts
│   │   ├── channelStore.ts
│   │   ├── messageStore.ts
│   │   └── notificationStore.ts
│   ├── components/        # Frontend担当
│   │   ├── layout/
│   │   │   ├── Layout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── ChannelHeader.tsx
│   │   ├── messages/
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageItem.tsx
│   │   │   └── MessageInput.tsx
│   │   ├── thread/
│   │   │   └── ThreadPanel.tsx
│   │   └── auth/
│   │       └── LoginPage.tsx
│   ├── hooks/             # Frontend担当（カスタムフック）
│   ├── types/             # 型定義（全員共通）
│   └── App.tsx            # Frontend担当
├── firestore.rules        # DB Designer担当
├── firestore.indexes.json # DB Designer担当
├── firebase.json          # DB Designer / Infra担当
├── .firebaserc            # DB Designer / Infra担当
├── package.json           # Infra担当
├── vite.config.ts         # Infra担当
├── tailwind.config.js     # Infra担当
├── netlify.toml           # Infra担当
├── index.html             # Infra担当
└── .env.example           # Infra担当
```

---

### DB Designer タスク

| ID | タスク | 優先度 | 依存 |
|----|--------|--------|------|
| DB-01 | Firestoreセキュリティルール作成（channels） | 高 | - |
| DB-02 | Firestoreセキュリティルール作成（messages） | 高 | DB-01 |
| DB-03 | Firestoreセキュリティルール作成（threads） | 高 | DB-02 |
| DB-04 | Firestoreセキュリティルール作成（users） | 高 | - |
| DB-05 | Firestoreセキュリティルール作成（notifications） | 高 | DB-04 |
| DB-06 | 複合インデックス設計（messages: channelId + createdAt） | 高 | - |
| DB-07 | 複合インデックス設計（threads: messageId + createdAt） | 高 | - |
| DB-08 | 複合インデックス設計（notifications: userId + read + createdAt） | 中 | - |
| DB-09 | firestore.indexes.json 作成 | 高 | DB-06〜08 |
| DB-10 | Firebase初期化コード（src/services/firebase.ts）作成 | 高 | - |
| DB-11 | firebase.json 作成 | 中 | - |
| DB-12 | .firebaserc 作成 | 中 | - |

### Frontend タスク

| ID | タスク | 優先度 | 依存 |
|----|--------|--------|------|
| FE-01 | 型定義ファイル（src/types/index.ts）作成 | 高 | - |
| FE-02 | App.tsx（React Router v6 ルーティング）実装 | 高 | FE-01 |
| FE-03 | LoginPage.tsx（Google OAuth UI）実装 | 高 | FE-02 |
| FE-04 | Layout.tsx（3カラムレイアウト）実装 | 高 | FE-02 |
| FE-05 | Sidebar.tsx（チャンネルリスト・DM）実装 | 高 | FE-04 |
| FE-06 | ChannelHeader.tsx 実装 | 中 | FE-04 |
| FE-07 | MessageList.tsx（仮想スクロール）実装 | 高 | FE-04 |
| FE-08 | MessageItem.tsx（hoverアクション・メンションハイライト）実装 | 高 | FE-07 |
| FE-09 | MessageInput.tsx（@メンション補完）実装 | 高 | FE-04 |
| FE-10 | ThreadPanel.tsx 実装 | 高 | FE-08 |
| FE-11 | useMessages カスタムフック実装 | 中 | FE-07 |
| FE-12 | useMentionSuggest カスタムフック実装 | 中 | FE-09 |
| FE-13 | 通知バッジコンポーネント実装 | 低 | FE-05 |
| FE-14 | チャンネル作成モーダル実装 | 低 | FE-05 |

### Backend タスク

| ID | タスク | 優先度 | 依存 |
|----|--------|--------|------|
| BE-01 | authService.ts（Google OAuth・状態監視）実装 | 高 | - |
| BE-02 | userService.ts（プロフィール・オンライン状態）実装 | 高 | BE-01 |
| BE-03 | channelService.ts（CRUD）実装 | 高 | - |
| BE-04 | messageService.ts（送信・編集・削除・購読）実装 | 高 | BE-03 |
| BE-05 | threadService.ts（返信・購読）実装 | 高 | BE-04 |
| BE-06 | mentionService.ts（パース・通知書き込み）実装 | 高 | BE-04 |
| BE-07 | authStore.ts（Zustand）実装 | 高 | BE-01 |
| BE-08 | channelStore.ts（Zustand）実装 | 高 | BE-03 |
| BE-09 | messageStore.ts（Zustand）実装 | 高 | BE-04 |
| BE-10 | notificationStore.ts（Zustand）実装 | 中 | BE-06 |
| BE-11 | オンライン状態リアルタイム更新（Presence）実装 | 中 | BE-02 |

### Infra タスク

| ID | タスク | 優先度 | 依存 |
|----|--------|--------|------|
| IN-01 | package.json 作成（依存関係定義） | 高 | - |
| IN-02 | vite.config.ts 作成 | 高 | IN-01 |
| IN-03 | tailwind.config.js（Slackカラー完全版）作成 | 高 | IN-01 |
| IN-04 | index.html 作成 | 高 | - |
| IN-05 | .env.example 作成 | 高 | - |
| IN-06 | netlify.toml 作成（SPA設定・リダイレクト）| 高 | - |
| IN-07 | tsconfig.json 作成 | 高 | - |
| IN-08 | postcss.config.js 作成 | 中 | IN-03 |
| IN-09 | src/main.tsx 作成 | 高 | - |

---

## 2. DB Designerへの指示書

### 概要
Firestoreのセキュリティルール、インデックス設定、Firebase初期化コードを実装してください。

---

### DB-01〜05: firestore.rules（完全版）

ファイルパス: `/Applications/MAMP/htdocs/Slack/firestore.rules`

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // ============================================================
    // ヘルパー関数
    // ============================================================

    // 認証済みユーザーかチェック
    function isAuthenticated() {
      return request.auth != null;
    }

    // 自分自身のリソースかチェック
    function isOwner(uid) {
      return request.auth.uid == uid;
    }

    // チャンネルのメンバーかチェック
    function isChannelMember(channelId) {
      return isAuthenticated() &&
        request.auth.uid in get(/databases/$(database)/documents/channels/$(channelId)).data.members;
    }

    // メッセージの送信者かチェック
    function isMessageOwner(channelId, messageId) {
      return isAuthenticated() &&
        get(/databases/$(database)/documents/channels/$(channelId)/messages/$(messageId)).data.uid == request.auth.uid;
    }

    // ============================================================
    // users/{userId}
    // ============================================================
    match /users/{userId} {
      // 認証済みユーザーなら誰でも読み取り可（メンション候補表示のため）
      allow read: if isAuthenticated();

      // 自分のプロフィールのみ作成・更新可
      allow create: if isOwner(userId) &&
        request.resource.data.keys().hasAll(['displayName', 'email']) &&
        request.resource.data.displayName is string &&
        request.resource.data.email is string;

      allow update: if isOwner(userId) &&
        // uid・emailの変更は不可
        !request.resource.data.diff(resource.data).affectedKeys().hasAny(['email']);

      // 削除不可
      allow delete: if false;
    }

    // ============================================================
    // channels/{channelId}
    // ============================================================
    match /channels/{channelId} {
      // メンバーのみ読み取り可
      allow read: if isAuthenticated() &&
        (resource == null || request.auth.uid in resource.data.members);

      // 認証済みユーザーは作成可（自分をメンバーに含む必要あり）
      allow create: if isAuthenticated() &&
        request.resource.data.keys().hasAll(['name', 'createdBy', 'createdAt', 'members']) &&
        request.auth.uid in request.resource.data.members &&
        request.resource.data.createdBy == request.auth.uid &&
        request.resource.data.name is string &&
        request.resource.data.name.size() >= 1 &&
        request.resource.data.name.size() <= 80;

      // メンバーのみ更新可（チャンネル名・説明・メンバー追加）
      allow update: if isChannelMember(channelId) &&
        // createdBy・createdAt の変更は不可
        !request.resource.data.diff(resource.data).affectedKeys().hasAny(['createdBy', 'createdAt']);

      // 作成者のみ削除可
      allow delete: if isAuthenticated() &&
        resource.data.createdBy == request.auth.uid;

      // ============================================================
      // channels/{channelId}/messages/{messageId}
      // ============================================================
      match /messages/{messageId} {
        // チャンネルメンバーのみ読み取り可
        allow read: if isChannelMember(channelId);

        // チャンネルメンバーのみ送信可
        allow create: if isChannelMember(channelId) &&
          request.resource.data.keys().hasAll(['text', 'uid', 'displayName', 'createdAt']) &&
          request.resource.data.uid == request.auth.uid &&
          request.resource.data.text is string &&
          request.resource.data.text.size() >= 1 &&
          request.resource.data.text.size() <= 4000;

        // 送信者のみ編集可（text のみ変更可）
        allow update: if isChannelMember(channelId) &&
          resource.data.uid == request.auth.uid &&
          request.resource.data.diff(resource.data).affectedKeys().hasOnly(['text', 'editedAt']) &&
          request.resource.data.text is string &&
          request.resource.data.text.size() >= 1;

        // 送信者のみ削除可
        allow delete: if isChannelMember(channelId) &&
          resource.data.uid == request.auth.uid;

        // ============================================================
        // channels/{channelId}/messages/{messageId}/threads/{threadId}
        // ============================================================
        match /threads/{threadId} {
          // チャンネルメンバーのみ読み取り可
          allow read: if isChannelMember(channelId);

          // チャンネルメンバーのみ返信可
          allow create: if isChannelMember(channelId) &&
            request.resource.data.keys().hasAll(['text', 'uid', 'displayName', 'createdAt']) &&
            request.resource.data.uid == request.auth.uid &&
            request.resource.data.text is string &&
            request.resource.data.text.size() >= 1 &&
            request.resource.data.text.size() <= 4000;

          // 送信者のみ編集可
          allow update: if isChannelMember(channelId) &&
            resource.data.uid == request.auth.uid &&
            request.resource.data.diff(resource.data).affectedKeys().hasOnly(['text', 'editedAt']);

          // 送信者のみ削除可
          allow delete: if isChannelMember(channelId) &&
            resource.data.uid == request.auth.uid;
        }
      }
    }

    // ============================================================
    // notifications/{userId}/items/{notifId}
    // ============================================================
    match /notifications/{userId}/items/{notifId} {
      // 自分の通知のみ読み取り可
      allow read: if isOwner(userId);

      // 認証済みユーザーなら誰でも書き込み可（メンション通知のため）
      allow create: if isAuthenticated() &&
        request.resource.data.keys().hasAll(['messageId', 'channelId', 'fromUser', 'text', 'read', 'createdAt']) &&
        request.resource.data.read == false;

      // 自分の通知のみ更新可（既読フラグのみ変更可）
      allow update: if isOwner(userId) &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read']);

      // 自分の通知のみ削除可
      allow delete: if isOwner(userId);
    }
  }
}
```

---

### DB-06〜09: firestore.indexes.json

ファイルパス: `/Applications/MAMP/htdocs/Slack/firestore.indexes.json`

```json
{
  "indexes": [
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "channelId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "channelId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "threads",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "messageId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "items",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "read", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "items",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "channelId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

### DB-10: src/services/firebase.ts（Firebase初期化コード）

ファイルパス: `/Applications/MAMP/htdocs/Slack/src/services/firebase.ts`

```typescript
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  connectAuthEmulator,
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
} from 'firebase/firestore';
import {
  getStorage,
  connectStorageEmulator,
} from 'firebase/storage';

// ============================================================
// Firebase 設定（環境変数から読み込み）
// ============================================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 二重初期化防止
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ============================================================
// サービスインスタンス
// ============================================================
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Google認証スコープ設定
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// ============================================================
// Emulator接続（開発環境のみ）
// ============================================================
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  console.log('[Firebase] Emulator connected');
}

// ============================================================
// オフライン永続化（本番環境のみ）
// ============================================================
if (!import.meta.env.DEV) {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('[Firestore] Persistence failed: multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('[Firestore] Persistence not available in this browser');
    }
  });
}

export default app;
```

### DB-11〜12: firebase.json / .firebaserc

**firebase.json** (`/Applications/MAMP/htdocs/Slack/firebase.json`):

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "storage": { "port": 9199 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

**.firebaserc** (`/Applications/MAMP/htdocs/Slack/.firebaserc`):

```json
{
  "projects": {
    "default": "YOUR_FIREBASE_PROJECT_ID"
  }
}
```

---

## 3. Frontendへの指示書

### 概要
React + Vite + Tailwind CSS + Zustand + React Router v6 でSlack風UIを実装してください。

---

### FE-01: src/types/index.ts（共通型定義）

ファイルパス: `/Applications/MAMP/htdocs/Slack/src/types/index.ts`

```typescript
import { Timestamp } from 'firebase/firestore';

// ============================================================
// Firestoreドキュメント型
// ============================================================

export interface User {
  uid: string;
  displayName: string;
  photoURL: string | null;
  email: string;
  online: boolean;
  lastSeen: Timestamp;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: Timestamp;
  members: string[];
}

export interface Message {
  id: string;
  text: string;
  uid: string;
  displayName: string;
  photoURL: string | null;
  createdAt: Timestamp;
  editedAt?: Timestamp;
  mentions: string[];       // メンションされたUID配列
  threadCount: number;      // スレッド返信数
}

export interface Thread {
  id: string;
  text: string;
  uid: string;
  displayName: string;
  photoURL: string | null;
  createdAt: Timestamp;
  editedAt?: Timestamp;
}

export interface Notification {
  id: string;
  messageId: string;
  channelId: string;
  fromUser: string;         // 送信者UID
  fromUserName: string;     // 送信者表示名
  text: string;
  read: boolean;
  createdAt: Timestamp;
}

// ============================================================
// UI用型
// ============================================================

export interface MentionSuggestion {
  uid: string;
  displayName: string;
  photoURL: string | null;
}

export type ActiveView =
  | { type: 'channel'; channelId: string }
  | { type: 'dm'; userId: string };
```

---

### FE-02: App.tsx

ファイルパス: `/Applications/MAMP/htdocs/Slack/src/App.tsx`

**実装仕様**:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useEffect } from 'react';
import { subscribeToAuthState } from './services/authService';
import Layout from './components/layout/Layout';
import LoginPage from './components/auth/LoginPage';

// ProtectedRoute: 未認証ならログインページへリダイレクト
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (loading) return <div className="flex h-screen items-center justify-center bg-slack-purple-dark text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Firebase Auth 状態監視を開始（アンマウント時に購読解除）
    const unsubscribe = subscribeToAuthState((user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

**ルーティング設計**:
- `/login` → LoginPage
- `/channel/:channelId` → Layout（該当チャンネル表示）
- `/dm/:userId` → Layout（DM表示）
- `/` → Layout（デフォルトチャンネルへリダイレクト）

---

### FE-03: LoginPage.tsx

ファイルパス: `/Applications/MAMP/htdocs/Slack/src/components/auth/LoginPage.tsx`

**props**: なし  
**状態**: `loading: boolean`, `error: string | null`

**実装仕様**:

```typescript
// UI構成
// - 中央揃えカード（bg-slack-purple-dark）
// - Slackロゴ風テキスト「SlackClone」
// - 「Googleでログイン」ボタン（白背景・Googleアイコン）
// - エラーメッセージ表示エリア

// ボタンクリック時の処理
const handleLogin = async () => {
  setLoading(true);
  setError(null);
  try {
    await signInWithGoogle(); // authService経由
    navigate('/');            // ログイン成功後リダイレクト
  } catch (e) {
    setError('ログインに失敗しました。もう一度お試しください。');
  } finally {
    setLoading(false);
  }
};

// スタイリング指針
// 背景: bg-[#4A154B]（Slackパープル）
// カード: bg-white rounded-lg shadow-xl p-8 w-full max-w-sm
// ボタン: flex items-center gap-3 border border-gray-300 rounded px-6 py-3
```

---

### FE-04: Layout.tsx（3カラムレイアウト）

ファイルパス: `/Applications/MAMP/htdocs/Slack/src/components/layout/Layout.tsx`

**レイアウト構成**:
```
┌──────────────────────────────────────────┐
│  Sidebar (240px固定)  │  Main Area        │  Thread Panel (360px, 条件表示) │
│                       │  ChannelHeader    │                                  │
│  WorkspaceName        │  ─────────────── │  ThreadPanel                     │
│  ─────────────────    │  MessageList      │  (activeThreadId がある時のみ)   │
│  # general            │  (flex-1)         │                                  │
│  # random             │  ─────────────── │                                  │
│  + チャンネル追加      │  MessageInput     │                                  │
│  ─────────────────    │                   │                                  │
│  DM                   │                   │                                  │
└──────────────────────────────────────────┘
```

**状態管理**: activeThreadId は messageStore から取得

```typescript
import { Routes, Route, useParams } from 'react-router-dom';

export default function Layout() {
  const { activeThreadMessageId } = useMessageStore();

  return (
    <div className="flex h-screen overflow-hidden bg-slack-bg">
      {/* サイドバー: 固定幅240px */}
      <Sidebar className="w-60 flex-shrink-0" />

      {/* メインエリア: flex-1 */}
      <main className="flex flex-col flex-1 min-w-0">
        <Routes>
          <Route path="/channel/:channelId" element={<ChannelView />} />
          <Route path="/dm/:userId" element={<DMView />} />
          <Route path="/" element={<DefaultRedirect />} />
        </Routes>
      </main>

      {/* スレッドパネル: 条件表示 */}
      {activeThreadMessageId && (
        <ThreadPanel
          messageId={activeThreadMessageId}
          className="w-[360px] flex-shrink-0 border-l border-slack-border"
        />
      )}
    </div>
  );
}
```

---

### FE-05: Sidebar.tsx

ファイルパス: `/Applications/MAMP/htdocs/Slack/src/components/layout/Sidebar.tsx`

**props**: `className?: string`  
**使用ストア**: `channelStore`, `authStore`, `notificationStore`

**実装仕様**:

```typescript
// UI構成
// ┌─────────────────────┐
// │ WorkspaceName       │  (固定ヘッダー、bg-slack-purple-dark)
// │ ─────────────────── │
// │ ▼ チャンネル        │
// │   # general     [1] │  (未読バッジ)
// │   # random          │
// │   + チャンネル追加  │
// │ ─────────────────── │
// │ ▼ ダイレクトメッセージ │
// │   ● 田中太郎        │  (オンライン状態ドット)
// │   ○ 山田花子        │
// │ ─────────────────── │
// │ [avatar] 自分の名前 │  (フッター、ログアウトボタン)
// └─────────────────────┘

// チャンネルクリック → navigate('/channel/:channelId')
// DM項目クリック → navigate('/dm/:userId')
// アクティブ状態: bg-slack-purple-active text-white
// 非アクティブ: text-slack-purple-light hover:bg-slack-purple-hover

// チャンネル追加ボタン（「+」）クリック → CreateChannelModal を表示
// ログアウトボタン → authService.signOut()
```

**Slackカラー変数** (tailwind.config.js で定義済みのものを使用):
- `slack-purple-dark`: #3F0E40（サイドバー背景）
- `slack-purple-active`: #1264A3（アクティブ項目）
- `slack-purple-hover`: rgba(255,255,255,0.1)（ホバー）
- `slack-purple-light`: #CFC3CF（非アクティブテキスト）

---

### FE-06: ChannelHeader.tsx

ファイルパス: `/Applications/MAMP/htdocs/Slack/src/components/layout/ChannelHeader.tsx`

**props**: `channelId: string`

```typescript
// UI構成
// ┌──────────────────────────────────────────┐
// │ # channel-name  │  メンバー数アイコン    │
// │ description     │  検索アイコン（将来）  │
// └──────────────────────────────────────────┘

// channelId から channelStore でチャンネル情報を取得
// members.length を表示
// スタイル: border-b border-slack-border bg-white px-4 py-2 h-14
```

---

### FE-07: MessageList.tsx（仮想スクロール）

ファイルパス: `/Applications/MAMP/htdocs/Slack/src/components/messages/MessageList.tsx`

**props**: `channelId: string`  
**使用ライブラリ**: `@tanstack/react-virtual`

**実装仕様**:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

// 仮想スクロール設定
const virtualizer = useVirtualizer({
  count: messages.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 72,      // 1メッセージの推定高さ(px)
  overscan: 10,                // 上下に先読みするアイテム数
});

// 自動スクロール（新メッセージ追加時）
useEffect(() => {
  if (!isUserScrolling) {
    virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
  }
}, [messages.length]);

// ユーザーのスクロール検出（上にスクロールしたら自動スクロール停止）
// scrollTop < scrollHeight - clientHeight - 100 → isUserScrolling = true

// 日付区切りの表示
// 同じ日付のメッセージは日付ヘッダーを表示
// 例: ─────── 今日 ───────

// 連続メッセージの折り畳み
// 同一ユーザーの5分以内のメッセージ → アバター・名前を省略（compact表示）
```

---

### FE-08: MessageItem.tsx

ファイルパス: `/Applications/MAMP/htdocs/Slack/src/components/messages/MessageItem.tsx`

**props**:
```typescript
interface MessageItemProps {
  message: Message;
  channelId: string;
  isCompact?: boolean;   // 連続メッセージ時は名前・アバター省略
  currentUserId: string;
}
```

**実装仕様**:

```typescript
// UI構成（通常モード）
// ┌─────────────────────────────────────────┐
// │ [avatar] displayName  12:34             │
// │          メッセージテキスト             │
// │          @mention はハイライト表示      │
// │          💬 3 replies（threadCount>0）  │
// │                        [hover actions]  │
// └─────────────────────────────────────────┘

// hover時に表示するアクションボタン（絶対位置、右上）
// - 💬 スレッドで返信  → messageStore.setActiveThread(message.id)
// - ✏️ 編集（自分のメッセージのみ）→ インライン編集モードへ
// - 🗑️ 削除（自分のメッセージのみ）→ 確認なしに削除（Slack同様）
// - 😀 リアクション（将来拡張用、今回はスタブ）

// メンションハイライト
// テキスト内の @displayName を検出して青色ハイライト
// 自分がメンションされている場合は背景色を黄色に

// インライン編集モード
// テキストエリアに変換、Enterで保存、Escでキャンセル
// 「編集済み」ラベルを表示

// threadCount > 0 の場合
// 「💬 N件の返信」ボタンを表示
// クリック → messageStore.setActiveThread(message.id)

// メンションテキストのレンダリング関数
function renderTextWithMentions(text: string, currentUserId: string): React.ReactNode {
  // @[displayName](uid) 形式をパース → spans に変換
  // 自分へのメンション: bg-yellow-100 text-blue-600 font-bold
  // 他者へのメンション: text-blue-500 font-medium
}
```

---

### FE-09: MessageInput.tsx

ファイルパス: `/Applications/MAMP/htdocs/Slack/src/components/messages/MessageInput.tsx`

**props**: `channelId: string`, `placeholder?: string`

**状態**:
```typescript
const [text, setText] = useState('');
const [mentionQuery, setMentionQuery] = useState<string | null>(null);
const [mentionIndex, setMentionIndex] = useState(0);
const [cursorPosition, setCursorPosition] = useState(0);
```

**実装仕様**:

```typescript
// UI構成
// ┌─────────────────────────────────────────┐
// │ [Bフォーマット] [Iフォーマット]         │  ← ツールバー（最小限）
// ├─────────────────────────────────────────┤
// │ # general にメッセージを送信...        │
// │                                         │
// │                    [ファイル] [送信]    │
// └─────────────────────────────────────────┘

// @メンション補完
// 1. @ を入力した瞬間に mentionQuery = '' に設定
// 2. @ 以降の文字でユーザー検索（usersコレクションからローカルフィルタ）
// 3. サジェストポップアップを表示（上方向に展開）
// 4. キーボード操作: ↑↓で選択、Enterで確定、Escでキャンセル
// 5. 確定時: @query を @[displayName](uid) 形式に置換

// キーボード操作
// Enter（Shift無し）→ 送信
// Shift+Enter → 改行
// @ → メンション補完トリガー

// 送信処理
const handleSend = async () => {
  if (!text.trim()) return;
  const mentions = extractMentions(text);  // @[name](uid) から uid 抽出
  await messageService.sendMessage(channelId, {
    text: text.trim(),
    mentions,
    uid: currentUser.uid,
    displayName: currentUser.displayName,
    photoURL: currentUser.photoURL,
  });
  setText('');
};

// メンションサジェストコンポーネント（MentionSuggest）
// props: query, users, selectedIndex, onSelect
// スタイル: absolute bottom-full left-0 bg-white shadow-lg rounded border
// 各項目: avatar + displayName
```

---

### FE-10: ThreadPanel.tsx

ファイルパス: `/Applications/MAMP/htdocs/Slack/src/components/thread/ThreadPanel.tsx`

**props**: `messageId: string`, `channelId: string`, `className?: string`

**実装仕様**:

```typescript
// UI構成
// ┌─────────────────────────────────────────┐
// │ スレッド                    [✕ 閉じる] │
// ├─────────────────────────────────────────┤
// │ [親メッセージ（MessageItemコンポーネント）]│
// │ ─── N件の返信 ────────────────────────  │
// │ [スレッドメッセージ一覧]                │
// ├─────────────────────────────────────────┤
// │ [返信を入力... ]          [送信]        │
// └─────────────────────────────────────────┘

// 親メッセージ: channelId/messages/messageId から取得
// スレッド一覧: threadService.subscribeToThreads(channelId, messageId)
// 閉じるボタン: messageStore.setActiveThread(null)

// スレッドへの返信送信
const handleReply = async () => {
  await threadService.addThread(channelId, messageId, {
    text: replyText.trim(),
    uid: currentUser.uid,
    displayName: currentUser.displayName,
    photoURL: currentUser.photoURL,
  });
  setReplyText('');
};
```

---

## 4. Backendへの指示書

### 概要
Firebase サービス層（src/services/）と Zustand ストア（src/store/）を実装してください。  
全てのFirebase操作はサービス関数経由で行い、コンポーネントが直接Firestoreを操作しないようにしてください。

---

### BE-01: src/services/authService.ts

ファイルパス: `/Applications/MAMP/htdocs/Slack/src/services/authService.ts`

```typescript
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider, db } from './firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { User } from '../types';

// Google OAuth ログイン
export async function signInWithGoogle(): Promise<void> {
  const result = await signInWithPopup(auth, googleProvider);
  const fbUser = result.user;
  // ユーザードキュメントをupsert（初回ログイン時に作成）
  await setDoc(
    doc(db, 'users', fbUser.uid),
    {
      displayName: fbUser.displayName,
      photoURL: fbUser.photoURL,
      email: fbUser.email,
      online: true,
      lastSeen: serverTimestamp(),
    },
    { merge: true }
  );
}

// ログアウト
export async function signOut(): Promise<void> {
  if (auth.currentUser) {
    // オフライン状態に更新してからサインアウト
    await setDoc(
      doc(db, 'users', auth.currentUser.uid),
      { online: false, lastSeen: serverTimestamp() },
      { merge: true }
    );
  }
  await firebaseSignOut(auth);
}

// 認証状態監視（App.tsxで使用）
export function subscribeToAuthState(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

// 現在のユーザーを取得
export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}
```

---

### BE-02: src/services/userService.ts

ファイルパス: `/Applications/MAMP/htdocs/Slack/src/services/userService.ts`

```typescript
import {
  doc,
  getDoc,
  getDocs,
  collection,
  onSnapshot,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { User } from '../types';

// ユーザー一覧を取得（@メンション補完用）
export async function getAllUsers(): Promise<User[]> {
  const snap = await getDocs(
    query(collection(db, 'users'), orderBy('displayName'))
  );
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as User));
}

// 特定ユーザーを取得
export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as User;
}

// ユーザー一覧をリアルタイム購読（オンライン状態更新のため）
export function subscribeToUsers(
  callback: (users: User[]) => void
): () => void {
  return onSnapshot(
    query(collection(db, 'users'), orderBy('displayName')),
    (snap) => {
      const users = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as User));
      callback(users);
    }
  );
}

// 自分のオンライン状態を更新
export async function updateOnlineStatus(
  uid: string,
  online: boolean
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    { online, lastSeen: serverTimestamp() },
    { merge: true }
  );
}

// プロフィール更新
export async function updateProfile(
  uid: string,
  data: Partial<Pick<User, 'displayName' | 'photoURL'>>
): Promise<void> {
  await setDoc(doc(db, 'users', uid), data, { merge: true });
}
```

---

### BE-03: src/services/channelService.ts

ファイルパス: `/Applications/MAMP/htdocs/Slack/src/services/channelService.ts`

```typescript
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './firebase';
import { Channel } from '../types';

// チャンネル一覧をリアルタイム購読（自分がメンバーのもの）
export function subscribeToChannels(
  uid: string,
  callback: (channels: Channel[]) => void
): () => void {
  const q = query(
    collection(db, 'channels'),
    where('members', 'array-contains', uid)
  );
  return onSnapshot(q, (snap) => {
    const channels = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Channel))
      .sort((a, b) => a.name.localeCompare(b.name));
    callback(channels);
  });
}

// チャンネル作成
export async function createChannel(
  name: string,
  description: string,
  creatorUid: string
): Promise<string> {
  const ref = await addDoc(collection(db, 'channels'), {
    name: name.trim().toLowerCase().replace(/\s+/g, '-'),
    description: description.trim(),
    createdBy: creatorUid,
    createdAt: serverTimestamp(),
    members: [creatorUid],
  });
  return ref.id;
}

// チャンネル参加
export async function joinChannel(
  channelId: string,
  uid: string
): Promise<void> {
  await updateDoc(doc(db, 'channels', channelId), {
    members: arrayUnion(uid),
  });
}

// チャンネル退出
export async function leaveChannel(
  channelId: string,
  uid: string
): Promise<void> {
  await updateDoc(doc(db, 'channels', channelId), {
    members: arrayRemove(uid),
  });
}

// チャンネル更新（名前・説明）
export async function updateChannel(
  channelId: string,
  data: Partial<Pick<Channel, 'name' | 'description'>>
): Promise<void> {
  await updateDoc(doc(db, 'channels', channelId), data);
}

// チャンネル削除
export async function deleteChannel(channelId: string): Promise<void> {
  await deleteDoc(doc(db, 'channels', channelId));
}

// 特定チャンネルを1件取得
export async function getChannel(channelId: string): Promise<Channel | null> {
  const snap = await getDoc(doc(db, 'channels', channelId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Channel;
}
```

---

### BE-04: src/services/messageService.ts

ファイルパス: `/Applications/MAMP/htdocs/Slack/src/services/messageService.ts`

```typescript
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { Message } from '../types';

const MESSAGES_PER_PAGE = 50;

// メッセージをリアルタイム購読（直近50件）
export function subscribeToMessages(
  channelId: string,
  callback: (messages: Message[]) => void
): () => void {
  const q = query(
    collection(db, 'channels', channelId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(MESSAGES_PER_PAGE)
  );
  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as Message));
    callback(messages);
  });
}

// 過去メッセージをページネーションで取得
export async function fetchOlderMessages(
  channelId: string,
  beforeDoc: DocumentSnapshot
): Promise<Message[]> {
  const q = query(
    collection(db, 'channels', channelId, 'messages'),
    orderBy('createdAt', 'desc'),
    startAfter(beforeDoc),
    limit(MESSAGES_PER_PAGE)
  );
  const snap = await getDocs(q);
  return snap.docs
    .reverse()
    .map((d) => ({ id: d.id, ...d.data() } as Message));
}

// メッセージ送信
export async function sendMessage(
  channelId: string,
  data: {
    text: string;
    uid: string;
    displayName: string;
    photoURL: string | null;
    mentions: string[];
  }
): Promise<string> {
  const ref = await addDoc(
    collection(db, 'channels', channelId, 'messages'),
    {
      ...data,
      threadCount: 0,
      createdAt: serverTimestamp(),
    }
  );
  return ref.id;
}

// メッセージ編集
export async function editMessage(
  channelId: string,
  messageId: string,
  text: string
): Promise<void> {
  await updateDoc(
    doc(db, 'channels', channelId, 'messages', messageId),
    { text, editedAt: serverTimestamp() }
  );
}

// メッセージ削除
export async function deleteMessage(
  channelId: string,
  messageId: string
): Promise<void> {
  await deleteDoc(doc(db, 'channels', channelId, 'messages', messageId));
}

// threadCount インクリメント（threadService から呼ぶ）
export async function incrementThreadCount(
  channelId: string,
  messageId: string,
  delta: number = 1
): Promise<void> {
  const ref = doc(db, 'channels', channelId, 'messages', messageId);
  const snap = await getDocs(query(collection(db, 'channels', channelId, 'messages')));
  // increment は firebase/firestore の increment() を使用
  const { increment } = await import('firebase/firestore');
  await updateDoc(ref, { threadCount: increment(delta) });
}
```

---

### BE-05: src/services/threadService.ts

ファイルパス: `/Applications/MAMP/htdocs/Slack/src/services/threadService.ts`

```typescript
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { Thread } from '../types';
import { incrementThreadCount } from './messageService';

// スレッドをリアルタイム購読
export function subscribeToThreads(
  channelId: string,
  messageId: string,
  callback: (threads: Thread[]) => void
): () => void {
  const q = query(
    collection(db, 'channels', channelId, 'messages', messageId, 'threads'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    const threads = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as Thread));
    callback(threads);
  });
}

// スレッド返信を追加
export async function addThread(
  channelId: string,
  messageId: string,
  data: {
    text: string;
    uid: string;
    displayName: string;
    photoURL: string | null;
  }
): Promise<string> {
  const ref = await addDoc(
    collection(db, 'channels', channelId, 'messages', messageId, 'threads'),
    { ...data, createdAt: serverTimestamp() }
  );
  // 親メッセージの threadCount を +1
  await incrementThreadCount(channelId, messageId, 1);
  return ref.id;
}

// スレッド編集
export async function editThread(
  channelId: string,
  messageId: string,
  threadId: string,
  text: string
): Promise<void> {
  await updateDoc(
    doc(db, 'channels', channelId, 'messages', messageId, 'threads', threadId),
    { text, editedAt: serverTimestamp() }
  );
}

// スレッド削除
export async function deleteThread(
  channelId: string,
  messageId: string,
  threadId: string
): Promise<void> {
  await deleteDoc(
    doc(db, 'channels', channelId, 'messages', messageId, 'threads', threadId)
  );
  // 親メッセージの threadCount を -1
  await incrementThreadCount(channelId, messageId, -1);
}
```

---

### BE-06: src/services/mentionService.ts

ファイルパス: `/Applications/MAMP/htdocs/Slack/src/services/mentionService.ts`

```typescript
import {
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { User } from '../types';

// メッセージテキストから @[displayName](uid) 形式のメンションを抽出
export function extractMentions(text: string): string[] {
  const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const uids: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    uids.push(match[2]); // uid部分
  }
  return [...new Set(uids)]; // 重複排除
}

// メッセージテキストをレンダリング用に変換（表示名のみ残す）
export function parseMentionText(text: string): string {
  return text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
}

// メンション通知を書き込む
// messageService.sendMessage の直後に呼ぶ
export async function createMentionNotifications(params: {
  mentionedUids: string[];
  channelId: string;
  messageId: string;
  fromUser: string;
  fromUserName: string;
  text: string;
}): Promise<void> {
  const { mentionedUids, channelId, messageId, fromUser, fromUserName, text } = params;

  const promises = mentionedUids
    .filter((uid) => uid !== fromUser) // 自己メンションは通知しない
    .map((uid) =>
      addDoc(collection(db, 'notifications', uid, 'items'), {
        messageId,
        channelId,
        fromUser,
        fromUserName,
        text: text.slice(0, 100), // プレビュー用に100文字
        read: false,
        createdAt: serverTimestamp(),
      })
    );

  await Promise.all(promises);
}

// ユーザーのサジェストをフィルタリング（@入力時のローカルフィルタ）
export function filterUserSuggestions(
  users: User[],
  query: string,
  excludeUid?: string
): User[] {
  const lower = query.toLowerCase();
  return users
    .filter(
      (u) =>
        u.uid !== excludeUid &&
        u.displayName.toLowerCase().includes(lower)
    )
    .slice(0, 8); // 最大8件
}
```

---

### BE-07〜10: Zustand ストア設計

#### src/store/authStore.ts

```typescript
import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';

interface AuthState {
  user: FirebaseUser | null;
  loading: boolean;
  setUser: (user: FirebaseUser | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
}));
```

#### src/store/channelStore.ts

```typescript
import { create } from 'zustand';
import { Channel } from '../types';

interface ChannelState {
  channels: Channel[];
  activeChannelId: string | null;
  setChannels: (channels: Channel[]) => void;
  setActiveChannelId: (id: string | null) => void;
  getActiveChannel: () => Channel | undefined;
}

export const useChannelStore = create<ChannelState>((set, get) => ({
  channels: [],
  activeChannelId: null,
  setChannels: (channels) => set({ channels }),
  setActiveChannelId: (activeChannelId) => set({ activeChannelId }),
  getActiveChannel: () => {
    const { channels, activeChannelId } = get();
    return channels.find((c) => c.id === activeChannelId);
  },
}));
```

#### src/store/messageStore.ts

```typescript
import { create } from 'zustand';
import { Message } from '../types';

interface MessageState {
  messagesByChannel: Record<string, Message[]>;  // channelId → messages
  activeThreadMessageId: string | null;          // スレッドパネルで表示中のmessageId
  setMessages: (channelId: string, messages: Message[]) => void;
  setActiveThread: (messageId: string | null) => void;
  updateMessage: (channelId: string, messageId: string, data: Partial<Message>) => void;
  removeMessage: (channelId: string, messageId: string) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  messagesByChannel: {},
  activeThreadMessageId: null,
  setMessages: (channelId, messages) =>
    set((state) => ({
      messagesByChannel: { ...state.messagesByChannel, [channelId]: messages },
    })),
  setActiveThread: (messageId) => set({ activeThreadMessageId: messageId }),
  updateMessage: (channelId, messageId, data) =>
    set((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: state.messagesByChannel[channelId]?.map((m) =>
          m.id === messageId ? { ...m, ...data } : m
        ) ?? [],
      },
    })),
  removeMessage: (channelId, messageId) =>
    set((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: state.messagesByChannel[channelId]?.filter(
          (m) => m.id !== messageId
        ) ?? [],
      },
    })),
}));
```

#### src/store/notificationStore.ts

```typescript
import { create } from 'zustand';
import { Notification } from '../types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[]) => void;
  markAsRead: (notifId: string) => void;
  markAllAsRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),
  markAsRead: (notifId) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notifId ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
}));
```

---

## 5. Infraへの指示書

### 概要
プロジェクトの基盤ファイル（設定・環境変数・ビルド設定）を実装してください。

---

### IN-01: package.json

ファイルパス: `/Applications/MAMP/htdocs/Slack/package.json`

```json
{
  "name": "slack-clone",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "firebase": "^10.12.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.1",
    "zustand": "^4.5.2",
    "@tanstack/react-virtual": "^3.5.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@typescript-eslint/eslint-plugin": "^7.11.0",
    "@typescript-eslint/parser": "^7.11.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "eslint-plugin-react-hooks": "^4.6.2",
    "eslint-plugin-react-refresh": "^0.4.7",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.5",
    "vite": "^5.2.12"
  }
}
```

---

### IN-02: vite.config.ts

ファイルパス: `/Applications/MAMP/htdocs/Slack/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // コード分割: Firebase・React・アプリコードを別チャンク
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          react: ['react', 'react-dom', 'react-router-dom'],
          vendor: ['zustand', '@tanstack/react-virtual'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
  },
});
```

---

### IN-03: tailwind.config.js（Slackカラー完全版）

ファイルパス: `/Applications/MAMP/htdocs/Slack/tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ============================================================
        // Slack ブランドカラー
        // ============================================================
        slack: {
          // サイドバー系（パープル）
          'purple-darkest': '#1A1D21',   // 最暗のサイドバー
          'purple-dark':    '#3F0E40',   // サイドバー背景（Slack本家）
          'purple-mid':     '#611f69',   // ホバー背景
          'purple-active':  '#1264A3',   // アクティブ項目背景（実は青）
          'purple-hover':   'rgba(255, 255, 255, 0.1)',  // ホバーオーバーレイ
          'purple-light':   '#CFC3CF',   // 非アクティブテキスト
          'purple-lighter': '#E8D4E8',   // 薄いアクセント

          // メインエリア系
          'bg':             '#FFFFFF',   // メインエリア背景
          'bg-secondary':   '#F8F8F8',   // セカンダリ背景
          'border':         '#DDDDDD',   // ボーダー

          // テキスト系
          'text-primary':   '#1D1C1D',   // メインテキスト
          'text-secondary': '#616061',   // サブテキスト（タイムスタンプ等）
          'text-muted':     '#ABAAAB',   // ミュートテキスト

          // アクション系
          'blue':           '#1264A3',   // リンク・ボタン
          'blue-hover':     '#0F5487',   // ボタンホバー
          'blue-light':     '#D9E8F5',   // 薄い青背景

          // 通知・メンション系
          'mention-bg':     '#FFF8C5',   // 自分へのメンション背景
          'mention-border': '#FFD700',   // メンションボーダー
          'unread-dot':     '#E01E5A',   // 未読バッジ（赤）
          'unread-bg':      '#E01E5A',

          // オンライン状態
          'online':         '#2BAC76',   // オンライン（緑）
          'away':           '#ECB22E',   // 離席中（黄）
          'offline':        '#ABAAAB',   // オフライン（グレー）

          // ホバーアクション
          'action-hover':   '#F8F8F8',   // メッセージhover背景
          'action-button':  'rgba(0,0,0,0.08)',  // アクションボタン背景
        },
      },
      fontFamily: {
        slack: [
          'Lato',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Helvetica',
          'Arial',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
        ],
      },
      fontSize: {
        'slack-xs':  ['11px', { lineHeight: '16px' }],
        'slack-sm':  ['13px', { lineHeight: '18px' }],
        'slack-md':  ['15px', { lineHeight: '22px' }],
        'slack-lg':  ['18px', { lineHeight: '24px' }],
        'slack-xl':  ['22px', { lineHeight: '28px' }],
      },
      boxShadow: {
        'slack-tooltip': '0 0 0 1px rgba(29,28,29,.1),0 4px 12px rgba(29,28,29,.3)',
        'slack-modal':   '0 4px 24px rgba(0,0,0,.25)',
        'slack-hover':   '0 1px 3px rgba(0,0,0,.2)',
      },
      spacing: {
        // Slackは4px基準グリッド
        '18': '72px',
        '22': '88px',
      },
    },
  },
  plugins: [],
};
```

---

### IN-04: index.html

ファイルパス: `/Applications/MAMP/htdocs/Slack/index.html`

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="SlackClone - リアルタイムチャットアプリ" />
    <meta name="theme-color" content="#4A154B" />

    <!-- Google Fonts: Lato -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap"
      rel="stylesheet"
    />

    <title>SlackClone</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

### IN-05: .env.example

ファイルパス: `/Applications/MAMP/htdocs/Slack/.env.example`

```
# Firebase Configuration
# Firebase Consoleから取得: https://console.firebase.google.com
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Development Options
VITE_USE_EMULATOR=false
```

---

### IN-06: netlify.toml

ファイルパス: `/Applications/MAMP/htdocs/Slack/netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

# SPA用リダイレクト設定（React Router対応）
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# セキュリティヘッダー
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com; img-src 'self' data: https://*.googleusercontent.com https://lh3.googleusercontent.com;"

# キャッシュ設定
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

---

### IN-07: tsconfig.json

ファイルパス: `/Applications/MAMP/htdocs/Slack/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**tsconfig.node.json** (`/Applications/MAMP/htdocs/Slack/tsconfig.node.json`):

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

---

### IN-08: postcss.config.js

ファイルパス: `/Applications/MAMP/htdocs/Slack/postcss.config.js`

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

---

### IN-09: src/main.tsx

ファイルパス: `/Applications/MAMP/htdocs/Slack/src/main.tsx`

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

**src/index.css** (`/Applications/MAMP/htdocs/Slack/src/index.css`):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply font-slack text-slack-text-primary antialiased;
  }

  * {
    box-sizing: border-box;
  }

  /* スクロールバーカスタマイズ（Slack風） */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.35);
  }
}
```

---

## 付録: エージェント間の依存関係

```
Infra（環境構築）
    ↓ package.json / vite.config.ts / tailwind.config.js
DB Designer（Firebase設定）
    ↓ firebase.ts / firestore.rules
Backend（サービス層）
    ↓ authService / channelService / messageService...
Frontend（UI）
    ↓ コンポーネント実装
```

**並列実行可能な部分**:
- DB Designer と Infra は独立して並列実行可能
- Backend は DB Designer の firebase.ts 完成後に開始
- Frontend は Backend の型定義（types/index.ts）完成後に開始

---

## 完了チェックリスト

### DB Designer
- [ ] firestore.rules（全コレクション対応）
- [ ] firestore.indexes.json（全インデックス）
- [ ] src/services/firebase.ts
- [ ] firebase.json
- [ ] .firebaserc

### Frontend
- [ ] src/types/index.ts
- [ ] src/App.tsx
- [ ] src/components/auth/LoginPage.tsx
- [ ] src/components/layout/Layout.tsx
- [ ] src/components/layout/Sidebar.tsx
- [ ] src/components/layout/ChannelHeader.tsx
- [ ] src/components/messages/MessageList.tsx
- [ ] src/components/messages/MessageItem.tsx
- [ ] src/components/messages/MessageInput.tsx
- [ ] src/components/thread/ThreadPanel.tsx

### Backend
- [ ] src/services/authService.ts
- [ ] src/services/userService.ts
- [ ] src/services/channelService.ts
- [ ] src/services/messageService.ts
- [ ] src/services/threadService.ts
- [ ] src/services/mentionService.ts
- [ ] src/store/authStore.ts
- [ ] src/store/channelStore.ts
- [ ] src/store/messageStore.ts
- [ ] src/store/notificationStore.ts

### Infra
- [ ] package.json
- [ ] vite.config.ts
- [ ] tailwind.config.js
- [ ] index.html
- [ ] .env.example
- [ ] netlify.toml
- [ ] tsconfig.json
- [ ] tsconfig.node.json
- [ ] postcss.config.js
- [ ] src/main.tsx
- [ ] src/index.css
