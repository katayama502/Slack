# Slack Clone

Slack風リアルタイムチャットアプリ。React + Firebase + Netlify で構築。

## 機能

- リアルタイムチャット（Firestore onSnapshot によるリアルタイム同期）
- チャンネル作成・参加・退出
- @メンション（ユーザー補完付きドロップダウン）
- スレッド返信（サイドパネル）
- 絵文字リアクション（👍 ❤️ 😂 🎉 🔥 👀）
- メッセージ編集・削除（投稿者のみ）
- Google ログイン / メールアドレス認証
- オンライン状態表示（ログイン時に `online: true`、サインアウト時に `online: false`）
- メンション通知（未読バッジ付き）
- オフラインキャッシュ（Firestore IndexedDB 永続化）
- 仮想スクロール（大量メッセージを DOM に展開せずにレンダリング）

## 技術スタック

| カテゴリ | ライブラリ / サービス | バージョン |
|---|---|---|
| UI フレームワーク | React | 18.3.1 |
| ルーティング | React Router DOM | 6.24.0 |
| 状態管理 | Zustand | 4.5.4 |
| 仮想スクロール | @tanstack/react-virtual | 3.8.1 |
| 日時フォーマット | date-fns | 3.6.0 |
| アイコン | react-icons | 5.2.1 |
| バックエンド / DB | Firebase (Auth + Firestore + Storage) | 10.12.0 |
| スタイリング | Tailwind CSS | 3.4.6 |
| ビルドツール | Vite | 5.3.4 |
| 言語 | TypeScript | 5.5.3 |
| ホスティング | Netlify | - |

## 画面

| ログイン画面 | ワークスペース画面 |
|---|---|
| *(screenshot)* | *(screenshot)* |

## セットアップ

### 前提条件

- Node.js 18 以上
- Firebase プロジェクト（Authentication / Firestore / Storage を有効化）

### 手順

```bash
# 1. リポジトリをクローン
git clone <REPO_URL>
cd slack-clone

# 2. 依存パッケージをインストール
npm install

# 3. 環境変数を設定
cp .env.example .env
# .env を編集して Firebase の認証情報を入力

# 4. 開発サーバーを起動
npm run dev

# 5. 本番ビルド
npm run build
```

## 環境変数

`.env` ファイルに以下を設定してください（すべて Firebase コンソールから取得できます）。

| 変数名 | 説明 |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase API キー |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth ドメイン |
| `VITE_FIREBASE_PROJECT_ID` | Firebase プロジェクト ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage バケット名 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase メッセージング送信者 ID |
| `VITE_FIREBASE_APP_ID` | Firebase アプリ ID |

## ディレクトリ構造

```
src/
├── main.tsx                  # エントリーポイント
├── App.tsx                   # ルーティング・認証状態初期化
├── types/
│   └── index.ts              # 型定義（User / Channel / Message / Thread / Notification / AppStore）
├── store/
│   └── useAppStore.ts        # Zustand グローバルストア
├── services/
│   ├── firebase.ts           # Firebase 初期化（Auth / Firestore / Storage）
│   ├── index.ts              # 全サービス関数のエクスポート
│   ├── authService.ts        # 認証サービス
│   ├── channelService.ts     # チャンネルサービス
│   ├── messageService.ts     # メッセージサービス
│   ├── threadService.ts      # スレッドサービス
│   ├── userService.ts        # ユーザーサービス
│   └── mentionService.ts     # メンションサービス
├── hooks/
│   ├── useMessages.ts        # チャンネルメッセージ購読フック
│   └── useThreads.ts         # スレッド返信購読フック
├── pages/
│   ├── LoginPage.tsx         # ログイン画面
│   └── WorkspacePage.tsx     # ワークスペース画面（チャンネル・通知購読）
├── components/
│   ├── layout/
│   │   └── Layout.tsx        # 3カラムレイアウト（Sidebar / Main / ThreadPanel）
│   ├── sidebar/
│   │   ├── Sidebar.tsx       # チャンネル一覧・ユーザー情報
│   │   └── AddChannelModal.tsx # チャンネル作成モーダル
│   ├── channel/
│   │   └── ChannelHeader.tsx # チャンネルヘッダー（名前・説明）
│   ├── message/
│   │   ├── MessageList.tsx   # 仮想スクロールメッセージリスト
│   │   ├── MessageItem.tsx   # メッセージ単体（リアクション・編集・削除）
│   │   └── MessageInput.tsx  # メッセージ入力（@メンション補完）
│   └── thread/
│       └── ThreadPanel.tsx   # スレッドサイドパネル
└── utils/
    └── formatDate.ts         # 日時フォーマットユーティリティ
```

## ライセンス

MIT
# Slack
