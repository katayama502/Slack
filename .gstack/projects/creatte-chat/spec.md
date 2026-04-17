# Creatte — チャットアプリ 仕様書

**バージョン:** v1.3.0  
**最終更新:** 2026-04-17  
**デプロイ先:** Netlify (grobes-app Firebase プロジェクト)

---

## 1. システム概要

Creatte は、チームリアルタイムコミュニケーションを目的とした Slack ライクなチャットアプリケーションです。

### 技術スタック

| レイヤー | 技術 | バージョン |
|---------|------|---------|
| フロントエンド | React + TypeScript | 18.3.1 / 5.5.3 |
| ビルドツール | Vite | 5.3.4 |
| スタイリング | Tailwind CSS | 3.4.6 |
| 状態管理 | Zustand | 4.5.4 |
| 仮想スクロール | @tanstack/react-virtual | 3.8.1 |
| 日付処理 | date-fns | 3.6.0 |
| ルーティング | react-router-dom | 6.24.0 |
| DB / Auth | Firebase SDK v10 (Firestore + Auth + Storage) | 10.12.0 |
| ホスティング | Netlify | — |

### Firebase プロジェクト情報

```
Project ID:    grobes-app
Auth Domain:   grobes-app.firebaseapp.com
Storage:       grobes-app.firebasestorage.app
Sender ID:     980585133032
```

---

## 2. ページ構成・ルーティング

| パス | コンポーネント | アクセス |
|-----|--------------|--------|
| `/` | LoginPage | 未認証のみ（認証済みは `/workspace` へリダイレクト） |
| `/workspace` | WorkspacePage（PrivateRoute） | 認証済みのみ |
| `/*` | → `/` リダイレクト | — |

---

## 3. 画面レイアウト

```
┌──────┬────────────────────────┬──────────────────────────────┬──────────────────┐
│  56px│  160〜480px（可変）      │  残り全幅（flex-1）           │  240〜600px（可変）│
│NavRail│    Sidebar             │    Main                      │  右パネル（任意）  │
│      │  ┌─────────────────┐  │  ┌──────────────────────┐  │  Thread or       │
│  C   │  │ Creatte          ▼ │  │ ChannelHeader          │  │  Notifications   │
│ Home │  ├─────────────────┤  │  ├──────────────────────┤  │                  │
│  DM  │  │ ▼ チャンネル      │  │                          │  │                  │
│ Bell │  │   # general      │  │     MessageList          │  │                  │
│      │  │   # random       │  │   (仮想スクロール)        │  │                  │
│      │  ├─────────────────┤  │  ├──────────────────────┤  │                  │
│  👤  │  │ ▼ DM            │  │     MessageInput         │  │                  │
│      │  │   User B         │  └──────────────────────┘  │                  │
│      │  └─────────────────┘  │                              │                  │
└──────┴────────────────────────┴──────────────────────────────┴──────────────────┘
         ↕ ドラッグリサイズ                                      ↕ ドラッグリサイズ
```

### パネルリサイズ仕様

| パネル | 最小 | 最大 | デフォルト |
|-------|------|------|---------|
| サイドバー | 160px | 480px | 220px |
| 右パネル（スレッド/通知）| 240px | 600px | 400px |

- 4px の不可視ドラッグハンドルで分割
- ドラッグ中は `cursor: col-resize`・テキスト選択無効
- ハンドルホバーで #1164A3 に変色

---

## 4. 認証

### 対応認証方式

| 方式 | 詳細 |
|-----|------|
| Google OAuth | `signInWithPopup` でブラウザポップアップ |
| メール/パスワード | `signInWithEmailAndPassword` |
| 新規登録 | `createUserWithEmailAndPassword` + `updateProfile(displayName)` |

### 認証フロー

1. `subscribeToAuthState` がアプリ起動時から Firebase Auth をリッスン
2. ログイン成功 → `users/{uid}` ドキュメントを upsert（`merge: true`）
3. `online: true`, `lastSeen: serverTimestamp()` をセット
4. ストア `auth.user` に User オブジェクトをセット
5. `/workspace` へリダイレクト
6. サインアウト時: `online: false`, `lastSeen` 更新 → `firebaseSignOut()`

---

## 5. データモデル

### 5.1 users/{userId}

```typescript
{
  uid: string             // Firebase Auth UID
  displayName: string     // 表示名
  photoURL: string | null // プロフィール写真 URL
  email: string
  online: boolean         // ログイン中: true, ログアウト後: false
  lastSeen: Timestamp | null
}
```

### 5.2 channels/{channelId}

```typescript
{
  name: string        // 通常: 小文字・ハイフン区切り / DM: "__dm__uid1__uid2"
  description: string // 任意
  createdBy: string   // 作成者 UID
  createdAt: Timestamp
  members: string[]   // メンバー UID 配列
  isDM?: boolean      // DM チャンネルの場合 true
}
```

### 5.3 channels/{channelId}/messages/{messageId}

```typescript
{
  text: string          // メッセージ本文（Markdown 記法含む）
  uid: string           // 送信者 UID
  displayName: string   // 送信時の表示名（キャッシュ）
  photoURL: string | null
  createdAt: Timestamp
  mentions: string[]    // メンションされたユーザーの UID 配列
  threadCount: number   // スレッド返信数（デフォルト 0）
  reactions?: {         // リアクション: 絵文字 → UID 配列
    [emoji: string]: string[]
  }
}
```

### 5.4 channels/{channelId}/messages/{messageId}/threads/{threadId}

```typescript
{
  messageId: string     // 親メッセージ ID
  text: string
  uid: string
  displayName: string
  photoURL: string | null
  createdAt: Timestamp
}
```

### 5.5 notifications/{userId}/items/{notifId}

```typescript
{
  channelId: string       // 通知が発生したチャンネル
  messageId: string       // 対象メッセージ ID
  fromUser: string        // 送信者 UID
  fromDisplayName: string // 送信者表示名
  text: string            // メッセージ先頭 100 文字
  read: boolean           // 既読: true
  createdAt: Timestamp
}
```

---

## 6. Firestore セキュリティルール

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() { return request.auth != null; }
    function isOwner(uid) { return isAuthenticated() && request.auth.uid == uid; }
    function isChannelMember(channelId) {
      return isAuthenticated() &&
        request.auth.uid in get(/databases/$(database)/documents/channels/$(channelId)).data.members;
    }

    match /channels/{channelId} {
      allow read:   if isAuthenticated();
      allow create: if isAuthenticated()
                    && request.resource.data.createdBy == request.auth.uid
                    && request.auth.uid in request.resource.data.members;
      allow update: if isAuthenticated() && (
        // メンバーは name/description/members を更新可
        (isChannelMember(channelId) && request.resource.data.diff(resource.data)
          .affectedKeys().hasOnly(['name','description','members']))
        ||
        // 非メンバーも「自分自身を追加」のみ可（DM 除く）
        (!resource.data.get('isDM', false)
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['members'])
          && request.resource.data.members.hasAll(resource.data.members)
          && request.resource.data.members.size() == resource.data.members.size() + 1
          && request.auth.uid in request.resource.data.members)
      );
      allow delete: if isAuthenticated() && resource.data.createdBy == request.auth.uid;

      match /messages/{messageId} {
        allow read, create:   if isChannelMember(channelId);
        allow update, delete: if isAuthenticated() && resource.data.uid == request.auth.uid;

        match /threads/{threadId} {
          allow read, create:   if isChannelMember(channelId);
          allow update, delete: if isAuthenticated() && resource.data.uid == request.auth.uid;
        }
      }
    }

    match /users/{userId} {
      allow read:  if isAuthenticated();
      allow write: if isOwner(userId);
    }

    match /notifications/{userId}/items/{notifId} {
      allow read, update, delete: if isOwner(userId);
      allow create: if isAuthenticated() && request.resource.data.fromUser == request.auth.uid;
    }
  }
}
```

---

## 7. 機能仕様

### 7.1 チャンネル

#### 作成
- サイドバー「+」ボタン → AddChannelModal
- 入力: チャンネル名（必須）、説明（任意）
- 名前は自動変換: 大文字→小文字、スペース→ハイフン
- 作成者が自動的に members に追加される

#### 参加
- チャンネルをクリックすると `joinChannelIfNeeded` を自動実行
- members に含まれていない場合は `arrayUnion(uid)` で自動追加

#### 表示
- `__dm__` プレフィックスを持つチャンネルはサイドバーのチャンネル一覧から除外
- 作成日時順（昇順）で表示

### 7.2 メッセージ

#### 送信
- `Enter` で送信、`Shift+Enter` で改行
- 空白のみのメッセージは送信不可
- 送信中はボタン・入力を無効化

#### Markdown 記法

| 記法 | 出力 |
|-----|------|
| `*テキスト*` | **太字** |
| `_テキスト_` | *斜体* |
| `~テキスト~` | ~~打ち消し~~ |
| `@[名前](uid)` | @名前（青色ハイライト） |

#### 編集・削除
- 自分のメッセージのみ可能
- 編集: インライン textarea → Enter で保存、Esc でキャンセル
- 削除: 確認ダイアログ後に完全削除

#### 表示ルール
| 条件 | 表示 |
|-----|------|
| 同一ユーザー + 5分以内の連続メッセージ | コンパクト（アバター省略・パディング縮小） |
| 日付が変わるタイミング | 日付区切り（今日 / 昨日 / M月d日(E)） |
| メッセージなし | 「このチャンネルへようこそ」空状態 UI |

### 7.3 フォーマットツールバー

| ボタン | 機能 |
|--------|------|
| B | 選択テキストを `*...*` で囲む |
| i | 選択テキストを `_..._` で囲む |
| S | 選択テキストを `~...~` で囲む |
| ≡ | カーソル位置に `• ` を挿入 |
| 😊 | 20種の絵文字ピッカーを開く |
| @ | `@` を挿入してメンションサジェストを起動 |

### 7.4 @メンション

- テキストエリアで `@` に続けて文字を入力するとユーザー一覧をフィルタリング
- 自分以外のユーザーのみサジェスト対象
- ↑↓ キーで選択、Enter/Tab で挿入、Esc でキャンセル
- 挿入形式: `@[displayName](uid) `（末尾スペース付き）
- 送信時に `parseMentions` が UID を抽出して通知を生成

### 7.5 リアクション

- メッセージホバー時のツールバーから 6種のクイックリアクション（👍 ❤️ 😂 🎉 🔥 👀）
- クリックでトグル（追加 / 削除）
- Firestore: `reactions.${emoji}: string[]`（uid の配列）
- 自分のリアクション: 青枠・青背景で区別

### 7.6 スレッド

- メッセージホバーツールバーの「返信」ボタンで右パネルに展開
- 親メッセージと返信一覧を表示
- 返信数は親メッセージの `threadCount` に自動反映
- 親メッセージに「N件の返信」リンクを表示

### 7.7 ダイレクトメッセージ (DM)

- サイドバー「ダイレクトメッセージ」セクションのユーザー名をクリック
- チャンネル名: `__dm__${[uid1, uid2].sort().join('__')}` で一意に識別
- 初回クリック時に自動作成（既存なら再利用）
- 送信時に受信者へ自動通知
- DM チャンネルへのメンバー追加は不可（isDM フラグで制御）

### 7.8 通知

| イベント | 通知先 |
|---------|-------|
| `@メンション` | メンションされたユーザー |
| DM 送信 | DM の相手 |

- NavRail の「アクティビティ」ボタンに未読カウントバッジ（最大「9+」表示）
- 通知クリックで該当チャンネルに移動して既読化
- 「すべて既読にする」ボタンで一括既読

### 7.9 検索

- ChannelHeader の検索ボタンでインライン入力欄を展開
- 現在のチャンネルのメッセージをクライアント側でリアルタイムフィルタリング
- 大文字・小文字を区別しない
- チャンネル切替時に自動クリア
- Escape キーで入力欄を閉じる

### 7.10 オンライン状態

| 状態 | ドット色 | 条件 |
|-----|---------|------|
| オンライン | #007A5A（緑） | `online: true`（ログイン中） |
| オフライン | #616061（グレー）| `online: false`（ログアウト後） |

---

## 8. コンポーネント一覧

| コンポーネント | 役割 |
|-------------|------|
| `App` | ルーティング・認証状態購読 |
| `LoginPage` | Google / Email 認証フォーム |
| `WorkspacePage` | チャンネル・通知の購読起点 |
| `Layout` | 3カラム リサイズ可能レイアウト |
| `NavRail` | 56px 固定左ナビゲーション |
| `Sidebar` | チャンネル・DM リスト |
| `AddChannelModal` | チャンネル作成モーダル |
| `ChannelHeader` | チャンネル名・検索・メンバー数 |
| `MessageList` | 仮想スクロール メッセージ一覧 |
| `MessageItem` | 1メッセージ（ツールバー・リアクション・スレッドリンク） |
| `MessageInput` | 送信フォーム（ツールバー・メンションサジェスト・絵文字ピッカー） |
| `ThreadPanel` | スレッド返信パネル |
| `NotificationsPanel` | 通知一覧パネル |

---

## 9. カスタムフック・ユーティリティ

### フック

| フック | 返り値 | 役割 |
|------|-------|------|
| `useMessages()` | `Message[]` | activeChannelId のメッセージを購読 |
| `useThreads()` | `Thread[]` | threadPanelMessageId のスレッドを購読 |

### ユーティリティ

| 関数 | 役割 |
|-----|------|
| `formatMessageTime(ts)` | `HH:mm` 形式 |
| `formatDateDivider(ts)` | 今日 / 昨日 / M月d日(E) |
| `isSameDay(a, b)` | 同じ日付か判定 |
| `isCompactMessage(...)` | コンパクト表示判定（同一ユーザー + 5分以内） |
| `renderMarkdown(text)` | Markdown → React ノード配列 |
| `getDMChannelName(uid1, uid2)` | `__dm__uid1__uid2` 生成 |
| `parseMentions(text)` | `@[name](uid)` から UID 配列を抽出 |

---

## 10. サービス関数一覧

### 認証

| 関数 | 説明 |
|-----|------|
| `subscribeToAuthState(cb)` | Firebase Auth 状態を購読・users ドキュメントを upsert |
| `signInWithGoogle()` | Google OAuth ポップアップ |
| `signInWithEmail(email, pw)` | メール/パスワード ログイン |
| `signUpWithEmail(email, pw, name)` | アカウント作成 |
| `signOut()` | online: false 更新後サインアウト |

### チャンネル

| 関数 | 説明 |
|-----|------|
| `subscribeToChannels(cb)` | 全チャンネルをリアルタイム購読 |
| `createChannel(name, desc, uid)` | チャンネル作成 |
| `joinChannelIfNeeded(channelId, uid)` | 未参加の場合のみ members に追加 |
| `getOrCreateDMChannel(uid1, uid2)` | DM チャンネル ID を返す（なければ作成） |
| `getDMChannelName(uid1, uid2)` | DM チャンネル名を生成 |

### メッセージ

| 関数 | 説明 |
|-----|------|
| `subscribeToMessages(channelId, cb)` | メッセージをリアルタイム購読 |
| `sendMessage(channelId, text, user, mentions?, dmRecipientUid?)` | 送信 + 通知作成 |
| `updateMessage(channelId, msgId, text)` | 本文更新 |
| `deleteMessage(channelId, msgId)` | メッセージ削除 |
| `toggleReaction(channelId, msgId, emoji, uid, currentReactions)` | リアクション追加/削除 |

### スレッド

| 関数 | 説明 |
|-----|------|
| `subscribeToThreads(channelId, msgId, cb)` | スレッドをリアルタイム購読 |
| `sendThreadReply(channelId, msgId, text, user)` | 返信送信 + threadCount 更新 |

### ユーザー

| 関数 | 説明 |
|-----|------|
| `subscribeToUsers(cb)` | 全ユーザーをリアルタイム購読 |

### 通知

| 関数 | 説明 |
|-----|------|
| `subscribeToNotifications(uid, cb)` | 通知をリアルタイム購読（降順） |
| `markNotificationRead(uid, notifId)` | 単一通知を既読化 |

---

## 11. デプロイ構成

### Netlify (netlify.toml)

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to   = "/index.html"
  status = 200  # SPA フォールバック

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "... Firebase/Google API を許可"
    Strict-Transport-Security = "max-age=31536000"

[[headers]]
  for = "/assets/*"
  Cache-Control = "public, max-age=31536000, immutable"
```

### Firestore インデックス (firestore.indexes.json)

| コレクション | フィールド | 目的 |
|------------|---------|------|
| messages | channelId ASC, createdAt ASC | チャンネルのメッセージ取得 |
| threads | messageId ASC, createdAt ASC | スレッド返信取得 |
| items (notifications) | userId ASC, read ASC, createdAt DESC | 未読通知の取得 |

---

## 12. 未実装機能（将来拡張候補）

| 機能 | 備考 |
|-----|------|
| チャンネル削除 UI | Firestore ルールは実装済み |
| プロフィール写真アップロード | Firebase Storage 初期化済み |
| ファイル添付 | Storage 初期化済み |
| メッセージ無限スクロール（ページネーション） | 現状は全件取得 |
| スレッド返信の編集・削除 | ルールは実装済み |
| NavRail「DM」「ファイル」ボタンの機能化 | UI のみ実装 |
| チャンネル情報・設定パネル | 「i」ボタン UI のみ |
| プッシュ通知（FCM） | Firebase Messaging 未導入 |

---

*仕様書生成: Claude Sonnet 4.6 / v1.3.0*
