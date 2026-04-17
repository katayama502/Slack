# CTO Architecture Design: Slack風チャットアプリ

**作成日**: 2026-04-17
**担当**: CTOエージェント
**フェーズ**: Phase 2 - Design

---

## 1. ディレクトリ構造

```
src/
├── assets/                    # 静的アセット（ロゴ・アイコン等）
├── components/                # 再利用可能UIコンポーネント
│   ├── common/                # 汎用コンポーネント
│   │   ├── Avatar.jsx
│   │   ├── Button.jsx
│   │   ├── Modal.jsx
│   │   ├── Tooltip.jsx
│   │   └── LoadingSpinner.jsx
│   ├── layout/                # レイアウト構成コンポーネント
│   │   ├── AppLayout.jsx      # メインレイアウト（サイドバー+メイン）
│   │   ├── Sidebar.jsx        # 左サイドバー全体
│   │   ├── SidebarHeader.jsx  # ワークスペース名・設定
│   │   ├── ChannelList.jsx    # チャンネル一覧
│   │   └── DirectMessageList.jsx
│   ├── channel/               # チャンネル関連
│   │   ├── ChannelHeader.jsx  # チャンネル名・メンバー数
│   │   ├── ChannelMessages.jsx
│   │   ├── CreateChannelModal.jsx
│   │   └── ChannelSettings.jsx
│   ├── message/               # メッセージ関連
│   │   ├── MessageList.jsx    # メッセージ一覧（仮想スクロール）
│   │   ├── MessageItem.jsx    # 1件のメッセージ
│   │   ├── MessageInput.jsx   # 入力ボックス（メンション対応）
│   │   ├── MessageReactions.jsx
│   │   ├── MessageActions.jsx # ホバー時アクション
│   │   └── MentionSuggester.jsx # @メンション候補ポップアップ
│   └── thread/                # スレッド関連
│       ├── ThreadPanel.jsx    # 右側スレッドパネル
│       ├── ThreadMessages.jsx
│       └── ThreadInput.jsx
├── hooks/                     # カスタムフック
│   ├── useAuth.js             # 認証状態管理
│   ├── useChannels.js         # チャンネル購読
│   ├── useMessages.js         # メッセージ購読（onSnapshot）
│   ├── useThread.js           # スレッド購読
│   ├── useUsers.js            # ユーザー一覧キャッシュ
│   ├── useMentions.js         # メンション検出・通知
│   └── usePresence.js         # オンライン状態
├── pages/                     # ルートレベルのページ
│   ├── LoginPage.jsx
│   ├── SignupPage.jsx
│   └── WorkspacePage.jsx      # チャット本体（認証済みルート）
├── context/                   # React Context
│   ├── AuthContext.jsx
│   ├── WorkspaceContext.jsx   # 選択中チャンネル・スレッド状態
│   └── NotificationContext.jsx
├── services/                  # Firebaseアクセス層
│   ├── firebase.js            # Firebase初期化
│   ├── authService.js         # 認証操作
│   ├── channelService.js      # チャンネルCRUD
│   ├── messageService.js      # メッセージCRUD
│   ├── threadService.js       # スレッドCRUD
│   ├── userService.js         # ユーザープロフィール
│   └── storageService.js      # ファイルアップロード
├── utils/                     # ユーティリティ
│   ├── mentionParser.js       # @メンション解析
│   ├── dateFormatter.js       # 日時フォーマット
│   ├── notificationHelper.js  # ブラウザ通知
│   └── constants.js
├── styles/                    # グローバルスタイル
│   ├── globals.css
│   └── theme.js               # Chakra UIテーマカスタマイズ
├── App.jsx
└── main.jsx
```

---

## 2. 使用パッケージ一覧

### React関連
| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `react` | ^18.3 | UIライブラリ本体 |
| `react-dom` | ^18.3 | DOMレンダリング |
| `vite` | ^5.x | ビルドツール・開発サーバー |
| `@vitejs/plugin-react` | ^4.x | Vite用Reactプラグイン |

### Firebase SDK
| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `firebase` | ^10.x | Firebase SDK全体（Firestore / Auth / Storage） |

### UIライブラリ（Slack風デザイン）
| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `@chakra-ui/react` | ^2.x | Slack風ダークテーマに最適なコンポーネントライブラリ |
| `@emotion/react` | ^11.x | Chakra UI依存 |
| `@emotion/styled` | ^11.x | Chakra UI依存 |
| `framer-motion` | ^11.x | Chakra UI依存・アニメーション |
| `react-icons` | ^5.x | Slack互換アイコンセット（FaSlack等） |
| `emoji-mart` | ^5.x | 絵文字ピッカー（リアクション機能） |

### 状態管理
| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `zustand` | ^4.x | グローバル状態管理（選択チャンネル・スレッド・UI状態）。Reduxより軽量でFirebase onSnapshotと相性良好 |

### ルーティング
| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `react-router-dom` | ^6.x | SPA内ルーティング（/login, /workspace/:channelId） |

### その他
| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `react-virtual` または `@tanstack/react-virtual` | ^3.x | 大量メッセージの仮想スクロール（パフォーマンス最適化） |
| `date-fns` | ^3.x | 日時フォーマット（「今日 14:30」等） |
| `react-dropzone` | ^14.x | ドラッグ&ドロップファイルアップロード |
| `react-hot-toast` | ^2.x | トースト通知（メンション受信等） |
| `vite-plugin-pwa` | ^0.20.x | PWA対応（任意） |

---

## 3. Firestoreデータモデル設計

### コレクション: `users`
```
users/{userId}
├── uid: string              # Firebase Auth UID（ドキュメントIDと同一）
├── displayName: string      # 表示名
├── email: string            # メールアドレス
├── photoURL: string | null  # アバター画像URL（Storage）
├── status: string           # "online" | "away" | "offline"
├── statusEmoji: string      # カスタムステータス絵文字
├── statusText: string       # カスタムステータステキスト
├── createdAt: Timestamp
└── lastSeenAt: Timestamp
```

**インデックス**: `displayName ASC`（メンション候補検索用）

---

### コレクション: `channels`
```
channels/{channelId}
├── name: string             # チャンネル名（#general 等）
├── description: string      # チャンネル説明
├── isPrivate: boolean       # プライベートチャンネルフラグ
├── createdBy: string        # 作成者UID
├── members: string[]        # 参加メンバーUID配列
├── createdAt: Timestamp
└── lastMessageAt: Timestamp # チャンネルリストのソート用
```

**インデックス**:
- `members ARRAY_CONTAINS` + `lastMessageAt DESC`（サイドバー表示用）
- `isPrivate ASC` + `name ASC`（チャンネル検索用）

---

### コレクション: `messages`（channels サブコレクション）
```
channels/{channelId}/messages/{messageId}
├── id: string               # ドキュメントID
├── channelId: string        # 親チャンネルID（クエリ最適化用）
├── senderId: string         # 送信者UID
├── senderName: string       # 送信者表示名（非正規化・表示高速化）
├── senderPhotoURL: string   # 送信者アバター（非正規化）
├── text: string             # メッセージ本文（プレーンテキスト）
├── parsedText: object[]     # パース済みトークン（テキスト/メンション/リンク）
├── mentions: string[]       # メンション対象UID配列
├── attachments: object[]    # ファイル添付情報
│   └── { url, name, type, size }
├── reactions: object        # リアクション { "👍": ["uid1","uid2"] }
├── threadCount: number      # スレッド返信件数
├── hasThread: boolean       # スレッドが存在するか
├── isEdited: boolean        # 編集済みフラグ
├── deletedAt: Timestamp | null  # 論理削除
└── createdAt: Timestamp
```

**インデックス**:
- `channelId ASC` + `createdAt ASC`（メッセージ一覧取得）
- `mentions ARRAY_CONTAINS` + `createdAt DESC`（メンション通知）

---

### コレクション: `threads`（messages サブコレクション）
```
channels/{channelId}/messages/{messageId}/threads/{threadId}
├── id: string
├── parentMessageId: string  # 親メッセージID
├── channelId: string
├── senderId: string
├── senderName: string       # 非正規化
├── senderPhotoURL: string   # 非正規化
├── text: string
├── parsedText: object[]
├── mentions: string[]
├── attachments: object[]
├── reactions: object
├── isEdited: boolean
├── deletedAt: Timestamp | null
└── createdAt: Timestamp
```

**インデックス**: `parentMessageId ASC` + `createdAt ASC`

---

### コレクション: `notifications`（補助）
```
notifications/{notificationId}
├── targetUserId: string     # 通知受信者UID
├── type: string             # "mention" | "thread_reply"
├── channelId: string
├── messageId: string
├── threadId: string | null
├── fromUserId: string
├── text: string             # プレビューテキスト
├── isRead: boolean
└── createdAt: Timestamp
```

**インデックス**: `targetUserId ASC` + `isRead ASC` + `createdAt DESC`

---

## 4. Firebase Security Rules の骨格

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ヘルパー関数
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    function isChannelMember(channelId) {
      return isAuthenticated() &&
        request.auth.uid in get(/databases/$(database)/documents/channels/$(channelId)).data.members;
    }

    // ユーザープロフィール
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId)
        && !request.resource.data.diff(resource.data).affectedKeys()
            .hasAny(['uid', 'email', 'createdAt']); // 変更不可フィールドを保護
      allow delete: if false;
    }

    // チャンネル
    match /channels/{channelId} {
      allow read: if isAuthenticated() &&
        (resource.data.isPrivate == false ||
         request.auth.uid in resource.data.members);
      allow create: if isAuthenticated();
      allow update: if isChannelMember(channelId);
      allow delete: if false; // 論理削除のみ許可

      // メッセージ（サブコレクション）
      match /messages/{messageId} {
        allow read: if isChannelMember(channelId);
        allow create: if isChannelMember(channelId)
          && request.resource.data.senderId == request.auth.uid;
        allow update: if isChannelMember(channelId)
          && (isOwner(resource.data.senderId) // 本人が編集
              || request.resource.data.diff(resource.data)
                  .affectedKeys().hasOnly(['reactions'])); // 全員がリアクション可
        allow delete: if false;

        // スレッド（サブコレクション）
        match /threads/{threadId} {
          allow read: if isChannelMember(channelId);
          allow create: if isChannelMember(channelId)
            && request.resource.data.senderId == request.auth.uid;
          allow update: if isChannelMember(channelId)
            && (isOwner(resource.data.senderId)
                || request.resource.data.diff(resource.data)
                    .affectedKeys().hasOnly(['reactions']));
          allow delete: if false;
        }
      }
    }

    // 通知
    match /notifications/{notificationId} {
      allow read: if isAuthenticated()
        && resource.data.targetUserId == request.auth.uid;
      allow create: if isAuthenticated();
      allow update: if isAuthenticated()
        && resource.data.targetUserId == request.auth.uid
        && request.resource.data.diff(resource.data)
            .affectedKeys().hasOnly(['isRead']); // 既読フラグのみ更新可
      allow delete: if false;
    }
  }
}
```

### Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /avatars/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId
        && request.resource.size < 5 * 1024 * 1024  // 5MB制限
        && request.resource.contentType.matches('image/.*');
    }
    match /attachments/{channelId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.resource.size < 25 * 1024 * 1024; // 25MB制限
    }
  }
}
```

---

## 5. リアルタイム通信設計

### onSnapshot 購読管理戦略

```javascript
// hooks/useMessages.js の設計方針

// 購読ライフサイクル管理
// - コンポーネントマウント時に購読開始
// - アンマウント時に必ずunsubscribe（メモリリーク防止）
// - チャンネル切替時は旧購読を解除してから新規購読

const useMessages = (channelId, limit = 50) => {
  const [messages, setMessages] = useState([]);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!channelId) return;

    // 旧購読を解除
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const q = query(
      collection(db, 'channels', channelId, 'messages'),
      where('deletedAt', '==', null),
      orderBy('createdAt', 'asc'),
      limitToLast(limit)           // 最新N件のみ取得
    );

    unsubscribeRef.current = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
    }, (error) => {
      console.error('Messages subscription error:', error);
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [channelId]);

  return messages;
};
```

### 購読スコープ設計
| 購読対象 | 発火場所 | 解除タイミング |
|---------|---------|--------------|
| `channels` | AppLayout マウント時 | アプリ終了時 |
| `channels/{id}/messages` | チャンネル選択時 | チャンネル切替時 |
| `channels/{id}/messages/{id}/threads` | スレッドパネル開閉 | パネルクローズ時 |
| `notifications` | ログイン後 | ログアウト時 |

### メンション (@username) の検出・通知ロジック

```javascript
// utils/mentionParser.js
// メッセージテキストから @mention を抽出するパーサー

export const parseMentions = (text, userMap) => {
  // @displayName パターンを検出（スペース区切り）
  const mentionRegex = /@([a-zA-Z0-9_\-\.]+)/g;
  const tokens = [];
  const mentionedUids = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // マッチ前のテキスト
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    const name = match[1];
    const user = userMap[name]; // displayName -> uid マップ

    if (user) {
      tokens.push({ type: 'mention', value: name, uid: user.uid });
      mentionedUids.push(user.uid);
    } else {
      tokens.push({ type: 'text', value: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return { tokens, mentionedUids: [...new Set(mentionedUids)] };
};
```

```javascript
// メッセージ送信時の通知作成フロー（messageService.js）
export const sendMessage = async (channelId, senderId, text, userMap) => {
  const { tokens, mentionedUids } = parseMentions(text, userMap);
  const batch = writeBatch(db);

  // 1. メッセージ書き込み
  const msgRef = doc(collection(db, 'channels', channelId, 'messages'));
  batch.set(msgRef, {
    channelId,
    senderId,
    text,
    parsedText: tokens,
    mentions: mentionedUids,
    // ... その他フィールド
    createdAt: serverTimestamp(),
  });

  // 2. 通知書き込み（メンション対象者ごと）
  mentionedUids.forEach(targetUserId => {
    if (targetUserId === senderId) return; // 自己メンションは通知不要
    const notifRef = doc(collection(db, 'notifications'));
    batch.set(notifRef, {
      targetUserId,
      type: 'mention',
      channelId,
      messageId: msgRef.id,
      threadId: null,
      fromUserId: senderId,
      text: text.slice(0, 100),
      isRead: false,
      createdAt: serverTimestamp(),
    });
  });

  await batch.commit();

  // 3. ブラウザ通知（フォアグラウンド時）
  if (mentionedUids.includes(currentUserId)) {
    triggerBrowserNotification(`メンションされました`, text);
  }
};
```

### MentionSuggester（入力補完UI）
- `@` 入力検知 → `users` コレクションから displayName プレフィックス検索
- Zustand で候補リスト・選択インデックスを管理
- `Tab` / `Enter` で確定、`Escape` でキャンセル

---

## 6. Netlify設定

### `netlify.toml`
```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

# SPA ルーティング: 全リクエストを index.html にリダイレクト
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
    Content-Security-Policy = """
      default-src 'self';
      script-src 'self' 'unsafe-inline' https://apis.google.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' https://fonts.gstatic.com;
      img-src 'self' data: https://firebasestorage.googleapis.com https://lh3.googleusercontent.com;
      connect-src 'self' https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com;
    """

# 静的アセットのキャッシュ
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### 環境変数管理

**.env.local（ローカル開発用・.gitignore対象）**
```
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
```

**Netlify管理画面**: Site settings > Environment variables に同キーを登録

**アクセス方法（firebase.js）**:
```javascript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  // ...
};
```

**注意事項**:
- `VITE_` プレフィックスのついた変数のみクライアントバンドルに含まれる
- Firebase API Key はフロントエンドに露出するが、Security Rulesで保護するため問題なし
- シークレットな処理（管理機能等）が必要な場合はNetlify Functionsを使用

---

## 7. 主要コンポーネント設計

### コンポーネントツリー

```
App
├── AuthProvider (Context)
│   └── WorkspaceProvider (Context)
│       └── NotificationProvider (Context)
│           ├── Router
│           │   ├── /login         → LoginPage
│           │   ├── /signup        → SignupPage
│           │   └── /workspace/*   → WorkspacePage（ProtectedRoute）
│           │       └── AppLayout
│           │           ├── Sidebar
│           │           │   ├── SidebarHeader（ワークスペース名・ユーザーアバター）
│           │           │   ├── ChannelList
│           │           │   │   └── ChannelItem × N（未読バッジ付き）
│           │           │   └── DirectMessageList
│           │           │       └── DMItem × N
│           │           ├── MainArea
│           │           │   ├── ChannelHeader（チャンネル名・説明・メンバー数）
│           │           │   ├── MessageList（仮想スクロール）
│           │           │   │   └── MessageItem × N
│           │           │   │       ├── Avatar
│           │           │   │       ├── MessageText（メンションハイライト付き）
│           │           │   │       ├── MessageReactions
│           │           │   │       └── MessageActions（ホバー時: リアクション/スレッド/編集/削除）
│           │           │   └── MessageInput
│           │           │       ├── RichTextEditor（メンション入力対応）
│           │           │       ├── MentionSuggester（@入力時ポップアップ）
│           │           │       ├── EmojiPicker
│           │           │       └── FileUploadButton
│           │           └── ThreadPanel（右側、hasThread時に表示）
│           │               ├── ThreadHeader（親メッセージ）
│           │               ├── ThreadMessages
│           │               │   └── MessageItem × N
│           │               └── ThreadInput
│           └── NotificationToast（画面右上・グローバル）
```

### 状態管理（Zustand）設計

```javascript
// store/workspaceStore.js
{
  // チャンネル選択
  selectedChannelId: string | null,
  setSelectedChannel: (id) => void,

  // スレッド
  selectedThreadMessageId: string | null,
  openThread: (messageId) => void,
  closeThread: () => void,

  // UI
  isSidebarOpen: boolean,

  // ユーザーキャッシュ（メンション補完用）
  usersMap: { [uid]: UserProfile },
  setUsersMap: (map) => void,
}
```

---

## 技術選定の根拠

| 観点 | 選択 | 理由 |
|------|------|------|
| UI | Chakra UI | Slack風ダークテーマのカスタマイズが容易。コンポーネントが豊富で開発速度が高い |
| 状態管理 | Zustand | Redux比で80%コード削減。Firebase onSnapshotと組み合わせたローカルUIステートのみ管理する最小構成に最適 |
| 仮想スクロール | @tanstack/react-virtual | チャンネルに数千メッセージがある場合もDOMノード数を一定に保ちパフォーマンス確保 |
| リアルタイム | Firestore onSnapshot | WebSocket管理不要。Firebaseの課金モデル（読み取り数）を考慮し購読スコープを最小化 |
| デプロイ | Netlify | Viteビルドとの相性良好。SPA redirect設定が1行。プレビューデプロイでQAが容易 |
