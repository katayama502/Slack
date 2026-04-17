# Slack Clone - Netlify + Firebase デプロイ手順書

**対象アプリ**: Slack風チャットアプリ (React + Vite + Firebase + Tailwind CSS)  
**デプロイ先**: Netlify (フロントエンド) + Firebase (バックエンド)  
**作成日**: 2026-04-17  
**作成者**: Deployer Agent

---

## 目次

1. [前提条件・必要なアカウント](#1-前提条件必要なアカウント)
2. [Firebase セットアップ](#2-firebase-セットアップ)
3. [Firebase CLI によるルール・インデックスのデプロイ](#3-firebase-cli-によるルールインデックスのデプロイ)
4. [GitHub リポジトリの作成とプッシュ](#4-github-リポジトリの作成とプッシュ)
5. [Netlify デプロイ](#5-netlify-デプロイ)
6. [初回起動確認チェックリスト](#6-初回起動確認チェックリスト)
7. [ローカル開発環境セットアップ](#7-ローカル開発環境セットアップ)
8. [トラブルシューティング](#8-トラブルシューティング)

---

## 1. 前提条件・必要なアカウント

作業を始める前に、以下のアカウントを用意してください。

| サービス | URL | 用途 |
|---------|-----|------|
| Google アカウント | https://accounts.google.com | Firebase Console へのログイン |
| GitHub アカウント | https://github.com | ソースコード管理 |
| Netlify アカウント | https://netlify.com | フロントエンドホスティング |

### ローカル環境の要件

```bash
# バージョン確認コマンド（それぞれターミナルで実行）
node --version   # v18.0.0 以上が必要
npm --version    # v9.0.0 以上が必要
git --version    # 任意のバージョン
```

Node.js がインストールされていない場合は https://nodejs.org から LTS 版をインストールしてください。

---

## 2. Firebase セットアップ

### 2-1. Firebase Console でプロジェクトを作成する

1. https://console.firebase.google.com にアクセスし、Google アカウントでログインします。
2. **「プロジェクトを追加」** をクリックします。
3. **プロジェクト名** に任意の名前を入力します（例: `slack-clone-prod`）。
4. Google アナリティクスの有効化を確認されたら、不要であれば **オフ** にして「プロジェクトを作成」をクリックします。
5. 「新しいプロジェクトの準備ができました」と表示されたら **「続行」** をクリックします。

### 2-2. Authentication を有効化する

1. 左サイドバーの **「構築」→「Authentication」** をクリックします。
2. **「始める」** ボタンをクリックします。
3. **「Sign-in method」タブ** を開きます。

#### メール / パスワード を有効化

1. 「ネイティブのプロバイダ」内の **「メール / パスワード」** をクリックします。
2. **「メール / パスワード」** のトグルを **オン** にします。
3. **「保存」** をクリックします。

#### Google ログインを有効化

1. 「追加のプロバイダ」内の **「Google」** をクリックします。
2. **「有効にする」** トグルを **オン** にします。
3. **「プロジェクトのサポートメール」** にあなたのGoogleアカウントのメールアドレスを選択します。
4. **「保存」** をクリックします。

### 2-3. Firestore Database を作成する

1. 左サイドバーの **「構築」→「Firestore Database」** をクリックします。
2. **「データベースの作成」** ボタンをクリックします。
3. **「本番環境モードで開始」** を選択します（セキュリティルールは後で適切なものをデプロイします）。
4. ロケーションは **`asia-northeast1`（東京）** を選択します。
5. **「有効にする」** をクリックします。
6. データベースの準備が完了するまで1〜2分待ちます。

### 2-4. Storage を有効化する

1. 左サイドバーの **「構築」→「Storage」** をクリックします。
2. **「始める」** ボタンをクリックします。
3. セキュリティルールの設定画面では **「次へ」** をクリックします。
4. ロケーションは Firestore と同じ **`asia-northeast1`** を選択します。
5. **「完了」** をクリックします。

### 2-5. Web アプリを登録して設定値を取得する

1. Firebase Console の **プロジェクトのトップページ** に戻ります（左上のプロジェクト名をクリック）。
2. 画面中央のアイコン一覧から **`</>`（ウェブ）** をクリックします。
3. **アプリのニックネーム** に任意の名前を入力します（例: `slack-clone-web`）。
4. 「Firebase Hosting もセットアップします」のチェックは **外したまま** にします（Netlify を使うため）。
5. **「アプリを登録」** をクリックします。
6. 表示された `firebaseConfig` オブジェクトの値をコピーします。以下のような形式です:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",           // ← VITE_FIREBASE_API_KEY
  authDomain: "your-app.firebaseapp.com",  // ← VITE_FIREBASE_AUTH_DOMAIN
  projectId: "your-app-id",      // ← VITE_FIREBASE_PROJECT_ID
  storageBucket: "your-app.appspot.com",   // ← VITE_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "123456789",// ← VITE_FIREBASE_MESSAGING_SENDER_ID
  appId: "1:123456789:web:abc..."// ← VITE_FIREBASE_APP_ID
};
```

7. 値をメモしたら **「コンソールに進む」** をクリックします。

### 2-6. `.env` ファイルへの設定値の記入

プロジェクトルートの `.env.example` をコピーして `.env` ファイルを作成し、上記の設定値を記入します。

```bash
# プロジェクトのルートディレクトリで実行
cp .env.example .env
```

`.env` ファイルを開き、各行に Firebase Console で取得した値を記入します:

```env
VITE_FIREBASE_API_KEY=AIzaSy...（apiKey の値）
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com（authDomain の値）
VITE_FIREBASE_PROJECT_ID=your-app-id（projectId の値）
VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com（storageBucket の値）
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789（messagingSenderId の値）
VITE_FIREBASE_APP_ID=1:123456789:web:abc...（appId の値）
```

> **注意**: `.env` ファイルは機密情報を含むため、`.gitignore` に追加されていることを確認してください。誤って GitHub にプッシュしないよう注意してください。

---

## 3. Firebase CLI によるルール・インデックスのデプロイ

Firebase のセキュリティルールとインデックスは、コマンドラインツールでデプロイします。

### 3-1. Firebase CLI のインストール

```bash
npm install -g firebase-tools
```

インストールを確認します:

```bash
firebase --version
# 例: 13.x.x と表示されれば OK
```

### 3-2. Firebase にログイン

```bash
firebase login
```

ブラウザが開きます。Google アカウントでログインし、「Firebase CLI へのアクセスを許可」をクリックしてください。

ターミナルに「Success! Logged in as your-email@gmail.com」と表示されれば成功です。

### 3-3. Firebase プロジェクトを初期化する

プロジェクトのルートディレクトリで実行します:

```bash
firebase use --add
```

1. 作成した Firebase プロジェクト（例: `slack-clone-prod`）を矢印キーで選択して Enter を押します。
2. エイリアス名を聞かれたら `default` と入力して Enter を押します。

### 3-4. Firestore セキュリティルールをデプロイする

```bash
firebase deploy --only firestore:rules
```

以下のような出力が表示されれば成功です:

```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/your-project/overview
```

このルールにより、以下のアクセス制御が適用されます:
- チャンネルへの読み書きはメンバーのみ
- メッセージの更新・削除は投稿者本人のみ
- ユーザー情報の書き込みは本人のみ

### 3-5. Firestore インデックスをデプロイする

```bash
firebase deploy --only firestore:indexes
```

インデックスの構築には数分かかることがあります。Firebase Console の **「Firestore Database」→「インデックス」** タブで進捗を確認できます。「有効」になるまで待ちます。

---

## 4. GitHub リポジトリの作成とプッシュ

### 4-1. GitHub でリポジトリを作成する

1. https://github.com にログインします。
2. 右上の **「+」→「New repository」** をクリックします。
3. **Repository name** に `slack-clone` と入力します。
4. **Private**（非公開）を選択します（`.env` の誤コミットを防ぐため）。
5. 「Initialize this repository with a README」のチェックは **外したまま** にします。
6. **「Create repository」** をクリックします。

### 4-2. ローカルからプッシュする

`.gitignore` に `.env` が含まれていることを確認してから実行します:

```bash
# プロジェクトのルートディレクトリで実行
cd /Applications/MAMP/htdocs/Slack

# .gitignore の確認（.env が含まれているか確認）
cat .gitignore | grep .env

# リモートリポジトリを追加（URL は GitHub で作成したリポジトリのものに変更）
git remote add origin https://github.com/あなたのユーザー名/slack-clone.git

# main ブランチにプッシュ
git branch -M main
git push -u origin main
```

---

## 5. Netlify デプロイ

### 5-1. Netlify にサインアップ / ログイン

1. https://netlify.com にアクセスします。
2. **「Sign up」** をクリックし、**「GitHub でサインアップ」** を選択します。
3. GitHub との連携を許可します。

### 5-2. 新しいサイトを作成する

1. Netlify ダッシュボードの **「Add new site」→「Import an existing project」** をクリックします。
2. **「Deploy with GitHub」** をクリックします。
3. GitHub との連携を求められたら **「Authorize Netlify」** をクリックします。
4. リポジトリ一覧から **`slack-clone`** を検索して選択します。

### 5-3. ビルド設定を確認する

以下の設定が自動で入力されていることを確認します（`netlify.toml` から自動読み込みされます）:

| 設定項目 | 値 |
|---------|-----|
| Branch to deploy | `main` |
| Build command | `npm run build` |
| Publish directory | `dist` |

設定が異なる場合は手動で修正してください。

### 5-4. 環境変数を設定する

**この手順を省略するとビルドは成功してもアプリが動作しません。**

1. **「Show advanced」** ボタンをクリックします。
2. **「New variable」** ボタンを 6回クリックして、以下の 6つの変数を全て追加します:

| Key（変数名） | Value（値） |
|--------------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase Console で取得した `apiKey` の値 |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Console で取得した `authDomain` の値 |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Console で取得した `projectId` の値 |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Console で取得した `storageBucket` の値 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Console で取得した `messagingSenderId` の値 |
| `VITE_FIREBASE_APP_ID` | Firebase Console で取得した `appId` の値 |

3. 全て入力したら **「Deploy site」** をクリックします。

### 5-5. デプロイの進捗を確認する

1. デプロイが開始されるとビルドログが表示されます。
2. `npm run build` → TypeScript コンパイル → Vite ビルドの順に処理されます。
3. 最後に **「Published」** と表示されればデプロイ成功です（2〜3分かかります）。
4. サイトの URL（例: `https://random-name-123.netlify.app`）が表示されます。

### 5-6. カスタムドメインの設定（任意）

独自ドメインを使用する場合は、Netlify ダッシュボードの **「Domain settings」** から設定できます。

---

## 6. 初回起動確認チェックリスト

デプロイ完了後、以下の項目を順番に確認してください。

### Firebase 設定の確認

- [ ] Firebase Authentication が有効になっている（Console > Authentication > Users タブが表示される）
- [ ] Google ログインプロバイダが有効になっている（Console > Authentication > Sign-in method > Google: 有効）
- [ ] メール/パスワードプロバイダが有効になっている
- [ ] Firestore Database が作成済みである（Console > Firestore Database > データタブが表示される）
- [ ] Firestoreセキュリティルールがデプロイ済みである（`firebase deploy --only firestore:rules` を実行済み）
- [ ] Firestoreインデックスが「有効」状態である（Console > Firestore Database > インデックスタブで確認）
- [ ] Firebase Storage が有効になっている

### Netlify 設定の確認

- [ ] Netlify ビルドが成功している（Deployments タブ > 最新のデプロイが「Published」）
- [ ] 環境変数が 6変数すべて設定済みである（Site settings > Environment variables で確認）

### アプリ動作確認

Netlify の URL（`https://xxxx.netlify.app`）にアクセスして以下を確認します:

- [ ] ログインページが正しく表示される（ロゴ・入力フォーム・Googleログインボタンが見える）
- [ ] メール/パスワードで新規アカウントを作成できる
- [ ] Google ログインが動作する（Googleアカウント選択画面が開く）
- [ ] ログイン後にサイドバーが表示される
- [ ] チャンネル作成ができる（「+ チャンネルを追加」から作成）
- [ ] チャンネルにメッセージを送信できる
- [ ] 送信したメッセージが画面に表示される（リアルタイム）
- [ ] 別のブラウザ/シークレットウィンドウで同時アクセスし、メッセージがリアルタイムで届く
- [ ] ページをリロードしてもログイン状態が維持される

---

## 7. ローカル開発環境セットアップ

新しいメンバーがローカルで開発を始める手順です。

### 手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/あなたのユーザー名/slack-clone.git
cd slack-clone

# 2. .env ファイルを作成
cp .env.example .env

# 3. .env ファイルを開いて Firebase 設定値を記入
# （2-6 の手順を参照して各値を入力してください）
# macOS の場合:
open -e .env
# または VS Code を使う場合:
code .env

# 4. 依存パッケージをインストール
npm install

# 5. 開発サーバーを起動
npm run dev
```

ブラウザで `http://localhost:5173` にアクセスするとアプリが表示されます。

### ファイルの変更が自動で反映される

Vite の HMR（Hot Module Replacement）により、ファイルを保存するたびにブラウザが自動更新されます。

### ビルド結果の確認

本番ビルドをローカルで確認したい場合:

```bash
# ビルド
npm run build

# ローカルプレビューサーバー起動（http://localhost:4173）
npm run preview
```

---

## 8. トラブルシューティング

### ビルドエラー: 環境変数が undefined になる

**原因**: Netlify に環境変数が設定されていない  
**対処**: Netlify ダッシュボード > Site settings > Environment variables で 6変数が設定されているか確認し、再デプロイを実行します。

### Google ログインが失敗する（auth/unauthorized-domain エラー）

**原因**: Firebase Console に Netlify のドメインが許可されていない  
**対処**:
1. Firebase Console > Authentication > Settings > 承認済みドメイン
2. **「ドメインを追加」** をクリック
3. Netlify のドメイン（例: `random-name-123.netlify.app`）を追加します

### Firestore の読み書きが Permission denied になる

**原因**: セキュリティルールが未デプロイ、またはユーザーが未認証  
**対処**:
1. `firebase deploy --only firestore:rules` を再実行します
2. ユーザーがログインしているか確認します

### npm install でエラーが出る

**原因**: Node.js のバージョンが古い  
**対処**: Node.js v18 以上にアップデートしてください。`nvm` を使っている場合:

```bash
nvm install 18
nvm use 18
npm install
```

### Netlify のビルドが `tsc` エラーで失敗する

**原因**: TypeScript の型エラーがある  
**対処**: ローカルで `npm run build` を実行してエラー内容を確認し、修正してからプッシュします。

---

## 付録: デプロイ後の設定値確認場所

いつでも Firebase の設定値を再確認したい場合は:

1. Firebase Console にログイン
2. 左サイドバー上部の **歯車アイコン（プロジェクトの設定）** をクリック
3. **「全般」タブ** を下にスクロール
4. **「マイアプリ」** セクションに登録済みの Web アプリが表示される
5. **「Firebase SDK snippet」→「構成」** を選択すると `firebaseConfig` が表示される
