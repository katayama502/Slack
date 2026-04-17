# Slack Clone 技術仕様書

**バージョン**: 1.0.0  
**作成日**: 2026-04-17  
**作成者**: G-Stack AI Spec Writer

---

## 1. アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────────┐
│                         ブラウザ (SPA)                           │
│                                                                  │
│  ┌──────────┐   ┌───────────────────────────────────────────┐   │
│  │ React    │   │ Zustand Store (AppStore / ExtendedStore)  │   │
│  │ Router   │   │  auth / channels / messages / threads     │   │
│  │ v6       │   │  notifications / UI state                 │   │
│  └────┬─────┘   └─────────────┬─────────────────────────────┘   │
│       │                       │ selector                         │
│  ┌────▼──────────────────────▼─────────────────────────────┐   │
│  │ Pages: LoginPage / WorkspacePage                         │   │
│  │  └─ Components: Layout / Sidebar / MessageList / etc.   │   │
│  └────────────────────────────┬────────────────────────────┘   │
│                               │ call                             │
│  ┌────────────────────────────▼────────────────────────────┐   │
│  │ Services Layer (src/services/index.ts)                   │   │
│  │  subscribeToAuthState / signInWithGoogle / signOut       │   │
│  │  subscribeToChannels / createChannel                     │   │
│  │  subscribeToMessages / sendMessage / updateMessage       │   │
│  │  deleteMessage / subscribeToThreads / sendThreadReply    │   │
│  │  subscribeToNotifications / markNotificationRead         │   │
│  │  subscribeToUsers / addReaction                          │   │
│  └────────────────────────────┬────────────────────────────┘   │
└───────────────────────────────┼─────────────────────────────────┘
                                │ Firebase SDK v10
          ┌─────────────────────┼──────────────────────┐
          │                     │                      │
   ┌──────▼──────┐   ┌──────────▼────────┐   ┌────────▼───────┐
   │ Firebase    │   │ Cloud Firestore   │   │ Firebase       │
   │ Auth        │   │ (onSnapshot)      │   │ Storage        │
   │             │   │ IndexedDB cache   │   │                │
   │ - Google    │   │ - users           │   │ (現時点未使用) │
   │ - Email/PW  │   │ - channels        │   └────────────────┘
   └─────────────┘   │ - channels/{id}   │
                     │   /messages       │
                     │ - channels/{id}   │
                     │   /messages/{id}  │
                     │   /threads        │
                     │ - notifications   │
                     │   /{uid}/items    │
                     └───────────────────┘
```

**データフロー原則**: 全てのデータ変更は Firebase Firestore に書き込み、`onSnapshot` リスナーがリアルタイムで変更を受信し Zustand Store を更新する。コンポーネントは Store のセレクタを通じてデータを読み取る（一方向データフロー）。

---

## 2. データモデル詳細

### 2.1 Firestore コレクション構造

```
users/
  {uid}/
    uid: string
    displayName: string
    photoURL: string | null
    email: string
    online: boolean
    lastSeen: Timestamp | null

channels/
  {channelId}/
    name: string
    description: string
    createdBy: string          // uid
    createdAt: Timestamp
    members: string[]          // uid[]

    messages/
      {messageId}/
        text: string
        uid: string
        displayName: string
        photoURL: string | null
        createdAt: Timestamp
        mentions: string[]     // uid[]
        threadCount: number
        reactions: {           // フィールド名が絵文字文字列
          [emoji: string]: string[]  // uid[]
        }

        threads/
          {threadId}/
            messageId: string
            text: string
            uid: string
            displayName: string
            photoURL: string | null
            createdAt: Timestamp

notifications/
  {uid}/
    items/
      {notifId}/
        messageId: string
        channelId: string
        fromUser: string       // uid
        fromDisplayName: string
        text: string           // メッセージ冒頭100文字
        read: boolean
        createdAt: Timestamp
```

### 2.2 TypeScript 型定義

| 型 | 主なフィールド | 用途 |
|---|---|---|
| `User` | uid, displayName, photoURL, email, online, lastSeen | ユーザー情報 |
| `Channel` | id, name, description, createdBy, createdAt, members | チャンネル |
| `Message` | id, text, uid, displayName, photoURL, createdAt, mentions, threadCount | チャンネルメッセージ |
| `Thread` | id, messageId, text, uid, displayName, photoURL, createdAt | スレッド返信 |
| `Notification` | id, messageId, channelId, fromUser, fromDisplayName, text, read, createdAt | @メンション通知 |
| `AuthState` | user, loading, error | 認証状態 |
| `AppStore` | (上記すべての状態 + アクション) | Zustand ストア型 |

---

## 3. サービス関数一覧（Firebase API）

### 3.1 認証 (Auth)

| 関数名 | シグネチャ | 説明 |
|---|---|---|
| `subscribeToAuthState` | `(callback: (user: User \| null) => void) => Unsubscribe` | 認証状態変化を購読。ログイン時に Firestore の `users/{uid}` を upsert |
| `signInWithGoogle` | `() => Promise<void>` | Google ポップアップ認証 |
| `signInWithEmail` | `(email, password) => Promise<void>` | メールアドレス認証 |
| `signUpWithEmail` | `(email, password, displayName) => Promise<void>` | 新規アカウント作成 + displayName 設定 |
| `signOut` | `() => Promise<void>` | サインアウト前に `online: false` を Firestore に書き込む |

### 3.2 ユーザー (Users)

| 関数名 | シグネチャ | 説明 |
|---|---|---|
| `subscribeToUsers` | `(callback: (users: User[]) => void) => Unsubscribe` | 全ユーザーをリアルタイム購読 |

### 3.3 チャンネル (Channels)

| 関数名 | シグネチャ | 説明 |
|---|---|---|
| `subscribeToChannels` | `(callback: (channels: Channel[]) => void) => Unsubscribe` | チャンネル一覧を `createdAt` 昇順でリアルタイム購読 |
| `createChannel` | `(name, description, uid) => Promise<Channel>` | チャンネル作成。作成者を `members` に追加 |

### 3.4 メッセージ (Messages)

| 関数名 | シグネチャ | 説明 |
|---|---|---|
| `subscribeToMessages` | `(channelId, callback) => Unsubscribe` | チャンネルのメッセージを `createdAt` 昇順でリアルタイム購読 |
| `sendMessage` | `(channelId, text, user, mentions?) => Promise<void>` | メッセージ送信。メンションがある場合は `notifications/{uid}/items` に通知ドキュメントを作成 |
| `updateMessage` | `(channelId, messageId, text) => Promise<void>` | メッセージ本文を更新 |
| `deleteMessage` | `(channelId, messageId) => Promise<void>` | メッセージを削除 |

### 3.5 スレッド (Threads)

| 関数名 | シグネチャ | 説明 |
|---|---|---|
| `subscribeToThreads` | `(channelId, messageId, callback) => Unsubscribe` | スレッド返信を `createdAt` 昇順でリアルタイム購読 |
| `sendThreadReply` | `(channelId, messageId, text, user) => Promise<void>` | スレッド返信を送信し、親メッセージの `threadCount` を実数でインクリメント |

### 3.6 通知 (Notifications)

| 関数名 | シグネチャ | 説明 |
|---|---|---|
| `subscribeToNotifications` | `(uid, callback) => Unsubscribe` | ユーザーの通知を `createdAt` 降順でリアルタイム購読 |
| `markNotificationRead` | `(uid, notifId) => Promise<void>` | 通知を既読にする |

### 3.7 リアクション (Reactions)

| 関数名 | シグネチャ | 説明 |
|---|---|---|
| `addReaction` | `(channelId, messageId, emoji, uid) => Promise<void>` | `reactions.{emoji}` フィールドに `arrayUnion(uid)` で絵文字リアクションを追加 |

---

## 4. コンポーネント依存関係

```
App
├── LoginPage
│   └── services: signInWithGoogle, signInWithEmail, signUpWithEmail
│
└── WorkspacePage
    ├── services: subscribeToChannels, subscribeToNotifications
    └── Layout
        ├── Sidebar
        │   ├── services: subscribeToUsers, signOut
        │   └── AddChannelModal
        │       └── services: createChannel
        ├── ChannelHeader
        │   └── store: activeChannelId, channels
        ├── MessageList
        │   ├── hooks: useMessages (subscribeToMessages をラップ)
        │   ├── @tanstack/react-virtual: useVirtualizer
        │   └── MessageItem
        │       └── services: deleteMessage, updateMessage, addReaction
        ├── MessageInput
        │   └── services: sendMessage, subscribeToUsers
        └── ThreadPanel (threadPanelMessageId が非 null のときのみ表示)
            └── hooks: useThreads (subscribeToThreads をラップ)
                └── services: sendThreadReply
```

---

## 5. Zustand ストア設計

ストアファイル: `src/store/useAppStore.ts`

`ExtendedStore` として `AppStore` を拡張し、以下の追加フィールドを持つ:

| フィールド / アクション | 型 | 説明 |
|---|---|---|
| `currentUser` | `User \| null` | `auth.user` への便利なエイリアス |
| `activeThreadMessageId` | `string \| null` | スレッドパネルで表示中のメッセージ ID |
| `threadMessages` | `Thread[]` | スレッドパネル用スレッド一覧 |
| `toggleSidebar` | `() => void` | サイドバー表示トグル |

**メッセージ/スレッドの格納形式**:
- `messages`: `Record<channelId, Message[]>` — チャンネルごとにキーイング
- `threads`: `Record<messageId, Thread[]>` — 親メッセージ ID ごとにキーイング

---

## 6. セキュリティ設計

### 6.1 認証

- Firebase Authentication を使用。クライアント側の認証状態は `onAuthStateChanged` で管理。
- 未認証ユーザーは `PrivateRoute` により `/` にリダイレクト。
- ルーティング: `/ (LoginPage)` / `/workspace (WorkspacePage)` / `* → /`。

### 6.2 Firestore セキュリティルール（推奨設定）

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ユーザー: 認証済みのみ読み取り可。自分のドキュメントのみ書き込み可
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }

    // チャンネル: 認証済みのみ読み書き可
    match /channels/{channelId} {
      allow read, write: if request.auth != null;

      // メッセージ: 認証済みのみ読み取り可。自分の投稿のみ更新・削除可
      match /messages/{messageId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null;
        allow update: if request.auth != null
          && (request.auth.uid == resource.data.uid
              || request.resource.data.diff(resource.data).affectedKeys()
                 .hasOnly(['reactions', 'threadCount']));
        allow delete: if request.auth.uid == resource.data.uid;

        // スレッド: 認証済みのみ読み書き可
        match /threads/{threadId} {
          allow read, write: if request.auth != null;
        }
      }
    }

    // 通知: 自分の通知のみアクセス可
    match /notifications/{uid}/items/{notifId} {
      allow read, write: if request.auth.uid == uid;
    }
  }
}
```

### 6.3 XSS 対策

- ユーザー入力はすべて React の JSX に文字列として渡すため、自動エスケープが適用される。
- `dangerouslySetInnerHTML` は使用していない。
- @メンショントークン `@[displayName](uid)` は正規表現パースにより安全に `<span>` に変換。

---

## 7. パフォーマンス設計

### 7.1 仮想スクロール

`MessageList.tsx` で `@tanstack/react-virtual` の `useVirtualizer` を使用。

```
estimateSize:
  - 日付区切り行:  36px
  - 通常メッセージ: 64px
  - コンパクトメッセージ: 28px (同一ユーザーが5分以内に連投した場合)

overscan: 10  // ビューポート外に10行先読みレンダリング
```

コンパクト判定条件（`isCompactMessage`）:
- 直前のメッセージと同一 uid
- 直前のメッセージから5分以内

自動スクロール:
- 新着メッセージ受信時、ユーザーがリストの最下部（80px 以内）にいる場合は `requestAnimationFrame` で最下部にスクロール。
- チャンネル切り替え時に即座に最下部へスクロール。

### 7.2 オフラインキャッシュ

Firebase SDK v10 の `initializeFirestore` に `persistentLocalCache` を設定:

```typescript
initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager({ forceOwnership: false }),
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  }),
})
```

- IndexedDB にデータをキャッシュするため、オフライン時でも過去データを表示可能。
- `persistentSingleTabManager` により複数タブ間の競合を回避。
- 二重初期化防止: `getApps().length <= 1` を確認してから `initializeFirestore` を呼び出す。

### 7.3 Zustand セレクタ最適化

各コンポーネントでは `useAppStore((s) => s.xxx)` のように必要な値だけをセレクタで取得することで、無関係な状態変化による再レンダリングを防ぐ。

### 7.4 入力欄の自動リサイズ

`MessageInput` と `ThreadPanel` の `<textarea>` は `onInput` で `scrollHeight` を計算し動的に高さを変更（最大 160px / 120px）。

---

## 8. UI/UX 設計

### 8.1 レイアウト

3カラム構成:
```
┌──────────┬─────────────────────────┬──────────────────┐
│ Sidebar  │ Main Area               │ Thread Panel     │
│ (240px)  │ (flex-1)                │ (320px, 条件表示)│
│          │ ┌─────────────────────┐ │                  │
│ チャンネル│ │ ChannelHeader       │ │ 親メッセージ     │
│ 一覧     │ ├─────────────────────┤ │ ──────────────   │
│          │ │ MessageList         │ │ スレッド返信一覧  │
│ ユーザー  │ │ (virtual scroll)    │ │                  │
│ 情報     │ ├─────────────────────┤ │ 返信入力欄       │
│          │ │ MessageInput        │ │                  │
└──────────┴─────────────────────────┴──────────────────┘
```

### 8.2 @メンション入力フロー

1. `<textarea>` で `@` を入力するとカーソル前の文字列 `/@(\w*)$/` を検出
2. ユーザーリストをフィルタリングしてドロップダウンを表示
3. `↑↓` キーで選択、`Enter` / `Tab` で確定、`Esc` でキャンセル
4. 確定するとトークン `@[displayName](uid)` をインライン挿入
5. 送信時に正規表現 `/@\[[^\]]+\]\(([^)]+)\)/g` でトークンをパースし uid 配列を抽出
6. 各 uid に対して `notifications/{uid}/items` に通知を書き込む

---

## 9. 既知の制限事項

| 項目 | 内容 |
|---|---|
| リアクションのトグル | `addReaction` は `arrayUnion` のみ実装。`arrayRemove` によるトグル解除は UI 側でのみ管理しており、リロード後にリセットされる |
| スレッドの `threadCount` 更新 | 返信送信後に全スレッドを `getDocs` で再カウントするため、高頻度の返信時に書き込みが増加する |
| Firebase Storage | 初期化のみ。ファイル・画像アップロード機能は未実装 |
| メッセージのページネーション | `subscribeToMessages` はチャンネルの全メッセージを購読する。大量メッセージ時はクエリカーソルによるページネーションが必要 |
| チャンネルへの参加管理 | `members` フィールドはあるが、参加 / 退出 UI は未実装。全チャンネルが全ユーザーに表示される |
| マルチタブ対応 | `persistentSingleTabManager` を使用しているため、複数タブでの同時利用時に一方のタブでキャッシュが読み取り専用になる場合がある |

---

## 10. 今後の拡張候補

| 優先度 | 機能 | 概要 |
|---|---|---|
| 高 | メッセージのページネーション | Firestore クエリカーソルで最新 N 件のみ取得し、スクロール上限到達時に追加ロード |
| 高 | リアクションのトグル解除 | `arrayRemove` を使って一度付けたリアクションを外せるようにする |
| 高 | チャンネル参加 / 退出 | `members` フィールドを利用して参加管理を実装 |
| 中 | ファイル・画像アップロード | Firebase Storage を利用したメッセージへの添付 |
| 中 | ダイレクトメッセージ (DM) | ユーザー間の 1:1 チャット機能 |
| 中 | プッシュ通知 | Firebase Cloud Messaging (FCM) による OS ネイティブ通知 |
| 低 | スレッドの @メンション | スレッド返信でも @メンション補完と通知を有効化 |
| 低 | メッセージ検索 | Firestore の全文検索（Algolia 連携など） |
| 低 | 絵文字ピッカー | emoji-mart などを使ったフル絵文字ピッカー |
| 低 | モバイル対応 | レスポンシブデザイン・タッチ操作の最適化 |
