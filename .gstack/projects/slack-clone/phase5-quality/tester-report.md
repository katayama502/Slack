# Testerレポート - Slack風チャットアプリ

**作成日**: 2026-04-17  
**対象**: `/Applications/MAMP/htdocs/Slack/src`  
**担当**: Testerエージェント

---

## 1. 評価サマリー

| カテゴリ | 評価 | 備考 |
|----------|------|------|
| 認証フロー | ⚠️ 要注意 | 二重実装による不整合あり |
| メッセージ送受信 | ⚠️ 要注意 | API引数ミスマッチ・リアクション未永続化 |
| スレッド機能 | ⚠️ 要注意 | threadCount更新に競合状態あり |
| エラーハンドリング | ❌ 不十分 | ユーザーへのエラー通知が欠落 |
| 型安全性 | ⚠️ 要注意 | `as unknown as` キャストが複数箇所 |
| セキュリティ | ⚠️ 要注意 | クライアント側のみ削除権限チェック |
| UX | ⚠️ 要注意 | ツールバーボタンの未実装機能 |

---

## 2. 発見した問題点（重大度順）

---

### [BUG-01] sendMessage の引数ミスマッチ（重大度: 高）

**ファイル**: `src/components/message/MessageInput.tsx` L137 / `src/services/index.ts` L169

**問題の詳細**:  
`MessageInput.tsx` は `sendMessage(channelId, trimmed, user, mentions)` と4引数で呼び出しているが、`src/services/index.ts` の `sendMessage` 関数のシグネチャは `(channelId, text, user, mentions?)` の形式で4番目引数は `mentions?: string[]` のオプション引数となっている。一見問題ないように見えるが、`src/services/messageService.ts`（個別ファイル）と `src/services/index.ts`（統合ファイル）の2つに `sendMessage` が実装されており、`index.ts` 側は `mentions` を受け取っているが `messageService.ts` 側は受け取っていない（L22-50）。両ファイルが並存しているため、将来的に混乱を招く。

**修正案**:  
`src/services/messageService.ts` の独立した実装ファイルを削除するか、`index.ts` に完全に統合する。

---

### [BUG-02] リアクションがローカル状態のみで永続化されない（重大度: 高）

**ファイル**: `src/components/message/MessageItem.tsx` L44, L73-86

**問題の詳細**:  
```typescript
const [reactions, setReactions] = useState<Record<string, string[]>>({});
```
リアクションはコンポーネントのローカル `useState` で管理されており、Firestore への書き込みが行われていない。`src/services/messageService.ts` には `addReaction()` 関数が実装されているが（L102-112）、`MessageItem` から一切呼び出されていない。さらに `index.ts` の統合サービスには `addReaction` のエクスポートすら存在しない。

**影響**: リアクションがページリロードやチャンネル切替で消える。他ユーザーにリアクションが共有されない。

**修正案**:  
`handleReaction` 内で `addReaction(channelId, message.id, emoji, user.uid)` を呼び出す。また Message 型にリアクションフィールドを追加し、Firestore から初期値を読み込む。

---

### [BUG-03] sendThreadReply の threadCount 更新に競合状態（重大度: 高）

**ファイル**: `src/services/index.ts` L238-263

**問題の詳細**:  
```typescript
// スレッド追加後に全件取得してカウント更新
const snap = await getDocs(query(collection(...'threads')));
await updateDoc(msgRef, { threadCount: snap.size });
```
スレッド追加直後に全件取得してカウントを上書きしているため、複数ユーザーが同時に返信すると取得タイミングによって数が正しくなくなる（競合状態）。

**修正案**:  
`increment(1)` を使用したアトミック更新に変更する。
```typescript
import { increment } from 'firebase/firestore';
await updateDoc(msgRef, { threadCount: increment(1) });
```

---

### [BUG-04] updateMessage が編集タイムスタンプを保存しない（重大度: 中）

**ファイル**: `src/services/index.ts` L199-207 / `src/components/message/MessageItem.tsx` L65

**問題の詳細**:  
`index.ts` の `updateMessage` は `text` のみ更新しており、`editedAt` タイムスタンプを保存しない。一方 `messageService.ts` の `editMessage` は `editedAt: serverTimestamp()` を保存している。実際に使われているのは `index.ts` の `updateMessage`（MessageItem.tsx L4 の import 元は `../../services` = `index.ts`）なので、メッセージが編集されても「編集済み」の履歴が残らない。

**修正案**:  
`index.ts` の `updateMessage` に `editedAt: serverTimestamp()` を追加する。

---

### [BUG-05] 認証サービスの二重実装による不整合（重大度: 中）

**ファイル**: `src/services/authService.ts` / `src/services/index.ts`

**問題の詳細**:  
`authService.ts` と `index.ts` の両方に認証関連の関数（`signInWithGoogle`, `signInWithEmail`, `signUpWithEmail`, `signOut`）が実装されている。`App.tsx` と `LoginPage.tsx` は `../../services`（= `index.ts`）から import しているため、`authService.ts` は実際には使用されていない。

具体的な不整合:
- `authService.ts` の `signInWithGoogle` は `User` オブジェクトを返すが、`index.ts` の同名関数は `void` を返す
- `authService.ts` の `onAuthStateChange` は Firestore から完全なユーザードキュメントを取得するが、`index.ts` の `subscribeToAuthState` は Firebase Auth の情報のみで User オブジェクトを構築する（displayName が Firestore と異なる可能性がある）

**修正案**:  
`authService.ts` を削除し、`index.ts` に一本化するか、逆に `authService.ts` の実装を正として `index.ts` を削除する。

---

### [BUG-06] Notification 型と sendMessage の通知書き込みのフィールド不一致（重大度: 中）

**ファイル**: `src/services/index.ts` L186-194 / `src/types/index.ts` L57-66

**問題の詳細**:  
`Notification` 型は `fromDisplayName` フィールドを必須で定義しているが、`index.ts` の `sendMessage` 内でメンション通知を書き込む際に `fromDisplayName` フィールドが含まれていない。また `messageId` も保存されていない。

```typescript
// index.ts L188-194（不足フィールド: fromDisplayName, messageId）
await addDoc(collection(db, 'notifications', uid, 'items'), {
  channelId,
  fromUser: user.uid,
  text: text.slice(0, 100),
  read: false,
  createdAt: serverTimestamp(),
});
```

**影響**: `Notification` 型として読み込んだ際に `fromDisplayName` が `undefined` となり、通知表示でクラッシュまたは「undefined」と表示される。

**修正案**:  
```typescript
await addDoc(collection(db, 'notifications', uid, 'items'), {
  channelId,
  messageId: docRef.id,  // 追加
  fromUser: user.uid,
  fromDisplayName: user.displayName,  // 追加
  text: text.slice(0, 100),
  read: false,
  createdAt: serverTimestamp(),
});
```

---

### [BUG-07] メッセージ削除後に Firestore サブコレクション（threads）が残存（重大度: 中）

**ファイル**: `src/services/index.ts` L209-213

**問題の詳細**:  
`deleteMessage` はメッセージドキュメントのみ削除しているが、`messages/{messageId}/threads/` サブコレクションは削除されない。Firestore ではドキュメントを削除してもサブコレクションは自動削除されないため、孤立データが蓄積される。

**修正案**:  
Cloud Functions の `onDocumentDeleted` トリガーでサブコレクションを再帰削除するか、削除前にスレッドドキュメントを一括削除する処理を追加する。

---

### [BUG-08] MessageInput の @ メンション検知がマルチバイト文字に対応していない（重大度: 低）

**ファイル**: `src/components/message/MessageInput.tsx` L61

**問題の詳細**:  
```typescript
const atMatch = beforeCursor.match(/@(\w*)$/);
```
`\w` は ASCII 英数字とアンダースコアのみにマッチするため、日本語の表示名（例: `山田太郎`）を入力してもメンション候補が絞り込まれない（`suggestQuery` が空文字のまま）。`@山` と入力しても `\w` にマッチしないため `atMatch` が null になり、サジェストが閉じてしまう。

**修正案**:  
```typescript
const atMatch = beforeCursor.match(/@([^@\s]*)$/);
```
スペースと `@` 以外の任意の文字にマッチするよう変更する。

---

### [BUG-09] メッセージ編集後に editText が古い値を保持する可能性（重大度: 低）

**ファイル**: `src/components/message/MessageItem.tsx` L43

**問題の詳細**:  
```typescript
const [editText, setEditText] = useState(message.text);
```
`useState` の初期値は初回レンダリング時のみ設定される。Firestore のリアルタイム更新で `message.text` が変更された場合でも `editText` は更新されない。編集モードに入るたびに最新の `message.text` をセットするべきだが、現在の `setEditing(true)` 呼び出し時にリセット処理がない。

**修正案**:  
編集開始時に `setEditText(message.text)` を呼ぶ。
```typescript
onClick={() => {
  setEditText(message.text); // 最新値でリセット
  setEditing(true);
}}
```

---

### [BUG-10] ThreadPanel でペアレントメッセージが見つからない場合の表示なし（重大度: 低）

**ファイル**: `src/components/thread/ThreadPanel.tsx` L68

**問題の詳細**:  
```typescript
{parentMessage && (
  <div>...</div>
)}
```
`parentMessage` が `undefined`（メッセージが削除済みまたは未ロード）の場合、親メッセージエリアが丸ごと非表示になる。ユーザーに「元のメッセージが削除されました」等のフィードバックがない。

---

### [ISSUE-01] 書式設定ボタン（太字・斜体・絵文字）が未実装（重大度: 低）

**ファイル**: `src/components/message/MessageInput.tsx` L207-228

**問題の詳細**:  
フッターツールバーの「B（太字）」「i（斜体）」「😊（絵文字）」ボタンはクリックハンドラーが一切実装されていない。表示だけあって動作しない「見せかけのUI」になっている。

**修正案**:  
短期的にはボタン自体を非表示にしてユーザーを混乱させないか、`disabled` スタイルを適用する。中期的には Markdown/テキスト装飾機能を実装する。

---

### [ISSUE-02] クライアント側のみの権限チェック（重大度: 中 - セキュリティ）

**ファイル**: `src/components/message/MessageItem.tsx` L46, L251, L264

**問題の詳細**:  
メッセージの編集・削除ボタンは `isOwner = user?.uid === message.uid` の条件でのみ表示を制御しており、Firestore Security Rules による保護と連動していない。フロントエンドのコードを改変すれば他ユーザーのメッセージも削除・編集できる可能性がある。

**修正案**:  
Firestore Security Rules に以下のルールを設定する:
```
match /channels/{channelId}/messages/{messageId} {
  allow update, delete: if request.auth.uid == resource.data.uid;
}
```

---

### [ISSUE-03] subscribeToMessages に取得件数上限なし（重大度: 低 - パフォーマンス）

**ファイル**: `src/services/index.ts` L152-167

**問題の詳細**:  
`index.ts` の `subscribeToMessages` は `limit()` が設定されていないため、チャンネルのメッセージが増え続けると全件リアルタイム購読になりパフォーマンスが劣化する。一方 `messageService.ts` には `limit(50)` が設定されている。

**修正案**:  
```typescript
const q = query(
  collection(db, 'channels', channelId, 'messages'),
  orderBy('createdAt', 'asc'),
  limit(100)  // 上限を設定
);
```

---

### [ISSUE-04] 仮想スクロールの estimateSize が rows 配列の参照を毎回生成（重大度: 低 - パフォーマンス）

**ファイル**: `src/components/message/MessageList.tsx` L51-64

**問題の詳細**:  
```typescript
const rows = buildRows(messages); // レンダリングのたびに再生成

const virtualizer = useVirtualizer({
  estimateSize: useCallback(
    (index: number) => { ... },
    [rows]  // rows が変わるたびに再生成
  ),
```
`rows` は `buildRows(messages)` で毎回新しい配列が生成されるため、`useCallback` の依存配列が常に変化し、メモ化の効果がない。

**修正案**:  
```typescript
const rows = useMemo(() => buildRows(messages), [messages]);
```

---

## 3. テストケース一覧

### 3-1. 正常系テストケース

| TC-ID | カテゴリ | テスト内容 | 期待結果 |
|-------|----------|-----------|----------|
| TC-001 | 認証 | Googleアカウントでサインイン | /workspace へリダイレクト、ユーザー情報がサイドバーに表示 |
| TC-002 | 認証 | メールアドレス・パスワードでサインイン | /workspace へリダイレクト |
| TC-003 | 認証 | 新規アカウント作成（表示名・メール・パスワード） | アカウント作成後 /workspace へリダイレクト |
| TC-004 | 認証 | ログアウト | / へリダイレクト、Firestore の online フラグが false になる |
| TC-005 | 認証 | 認証済み状態で / にアクセス | /workspace へ自動リダイレクト |
| TC-006 | 認証 | 未認証状態で /workspace にアクセス | / へリダイレクト |
| TC-007 | チャンネル | チャンネル一覧がサイドバーに表示 | Firestore の channels コレクションと一致 |
| TC-008 | チャンネル | 新規チャンネル作成モーダルを開いて作成 | チャンネルが一覧に追加される |
| TC-009 | チャンネル | チャンネルをクリックして切替 | メインエリアにそのチャンネルのメッセージが表示 |
| TC-010 | メッセージ | テキストを入力して Enter で送信 | メッセージがリストに追加される |
| TC-011 | メッセージ | テキストを入力して送信ボタンで送信 | メッセージがリストに追加される |
| TC-012 | メッセージ | Shift+Enter で改行 | メッセージが送信されず改行が挿入される |
| TC-013 | メッセージ | 自分のメッセージにホバーして編集 | テキストエリアが表示され内容を編集できる |
| TC-014 | メッセージ | 自分のメッセージを削除 | 確認ダイアログ後、メッセージが削除される |
| TC-015 | メッセージ | 他のユーザーのメッセージにホバー | 編集・削除ボタンが表示されない |
| TC-016 | メッセージ | メッセージにリアクション（絵文字）を追加 | リアクションがメッセージ下部に表示される |
| TC-017 | メッセージ | 同じリアクションを再度クリックして取消 | リアクションが取消される |
| TC-018 | スレッド | メッセージの「スレッドで返信」をクリック | 右側にスレッドパネルが開く |
| TC-019 | スレッド | スレッドパネルで返信を入力して送信 | 返信がスレッドに追加される |
| TC-020 | スレッド | スレッドパネルを閉じる | パネルが閉じ、2カラムレイアウトに戻る |
| TC-021 | メンション | @ 入力でサジェストが表示 | ユーザー一覧が候補として表示される |
| TC-022 | メンション | 候補をキーボード（↑↓）で選択して Enter | メンショントークンがテキストに挿入される |
| TC-023 | メンション | メンション入りメッセージ送信 | 対象ユーザーに通知が作成される |
| TC-024 | 通知 | メンション通知を受信 | 未読件数バッジが表示される |
| TC-025 | スクロール | 新しいメッセージ受信時にリスト末尾にいる | 自動スクロールされる |
| TC-026 | スクロール | リストを上にスクロールした状態で新メッセージ受信 | スクロール位置が変わらない |
| TC-027 | スクロール | チャンネル切替 | リストが最新メッセージまでスクロール |

---

### 3-2. 異常系テストケース

| TC-ID | カテゴリ | テスト内容 | 期待結果 |
|-------|----------|-----------|----------|
| TC-101 | 認証 | 存在しないメールでサインイン | エラーメッセージ表示（現状: ✅ 動作） |
| TC-102 | 認証 | パスワード誤りでサインイン | エラーメッセージ表示（現状: ✅ 動作） |
| TC-103 | 認証 | 空のパスワードでサインアップ | バリデーションエラー表示 |
| TC-104 | 認証 | パスワード6文字未満でサインアップ | Firebase の "weak-password" エラーが表示される |
| TC-105 | 認証 | Googleポップアップをキャンセル | エラーメッセージなく元の画面に戻る（現状: ⚠️ loading が解除されるか確認要） |
| TC-106 | メッセージ | 空文字メッセージを送信 | 送信ボタンが disabled のまま送信されない（現状: ✅ 動作） |
| TC-107 | メッセージ | 空白のみのメッセージを送信 | 送信ボタンが disabled のまま送信されない（現状: ✅ `trim()` による） |
| TC-108 | メッセージ | 送信中にネットワーク切断 | エラー時にテキストがリストアされる（現状: ✅ `setText(trimmed)` による） |
| TC-109 | メッセージ | 編集を Escape キーでキャンセル | 元のテキストに戻る（現状: ✅ 動作） |
| TC-110 | メッセージ | 他ユーザーのメッセージを削除しようとする（API直接コール） | Firestore Security Rules でブロックされる（現状: ⚠️ Rules が未設定の可能性） |
| TC-111 | メッセージ | 極端に長いメッセージを送信（10000文字以上） | エラーなく送信できるか、または適切な制限メッセージ（現状: ❌ 入力制限なし） |
| TC-112 | スレッド | 親メッセージが削除された後にスレッドパネルを開く | 「元のメッセージが削除されました」等のフィードバック（現状: ❌ 空白表示） |
| TC-113 | メンション | 日本語の表示名を持つユーザーに @ でメンション | サジェストリストで絞り込みが機能する（現状: ❌ \w regex のバグで動作しない） |
| TC-114 | メンション | 全ユーザーへのメンション (@全員) | 適切に処理される（現状: 未実装） |
| TC-115 | チャンネル | 重複した名前のチャンネルを作成 | エラーメッセージまたは重複防止（現状: ⚠️ 防止ロジック確認要） |
| TC-116 | チャンネル | チャンネル名が空のまま作成 | バリデーションエラー（現状: ⚠️ AddChannelModal 確認要） |
| TC-117 | ネットワーク | Firestore 接続断でページを開く | ローディングが無限に続かない（現状: ❌ タイムアウト処理なし） |
| TC-118 | 権限 | 未ログインで直接 API を呼び出す | Firebase Auth エラーで拒否（Firestore Rules 依存） |
| TC-119 | パフォーマンス | 1000件以上のメッセージがあるチャンネルを開く | 仮想スクロールにより遅延なく表示（現状: ⚠️ limit なしのため全件取得リスク） |

---

## 4. 修正優先度まとめ

### 優先度: 高（即座に修正が必要）

| ID | 問題 | ファイル |
|----|------|---------|
| BUG-02 | リアクションが永続化されない | `MessageItem.tsx`, `index.ts` |
| BUG-03 | threadCount の競合状態 | `index.ts` L238-263 |
| BUG-06 | 通知の型不一致（fromDisplayName 欠如） | `index.ts` L186-194 |

### 優先度: 中（次スプリントで修正）

| ID | 問題 | ファイル |
|----|------|---------|
| BUG-01 | sendMessage の二重実装 | `messageService.ts`, `index.ts` |
| BUG-04 | 編集タイムスタンプ未保存 | `index.ts` L199-207 |
| BUG-05 | 認証サービスの二重実装 | `authService.ts`, `index.ts` |
| BUG-07 | 削除時サブコレクション残存 | `index.ts` L209-213 |
| ISSUE-02 | クライアント側のみの権限チェック | Firestore Rules |

### 優先度: 低（バックログ）

| ID | 問題 | ファイル |
|----|------|---------|
| BUG-08 | 日本語メンション検知の不具合 | `MessageInput.tsx` L61 |
| BUG-09 | editText が古い値を保持 | `MessageItem.tsx` L43 |
| BUG-10 | 削除済み親メッセージの表示 | `ThreadPanel.tsx` L68 |
| ISSUE-01 | 書式設定ボタンが未実装 | `MessageInput.tsx` L207-228 |
| ISSUE-03 | メッセージ取得に上限なし | `index.ts` L152-167 |
| ISSUE-04 | 仮想スクロールのメモ化漏れ | `MessageList.tsx` L49 |

---

## 5. 総評

全体的なアーキテクチャは Zustand + Firebase Realtime + React の組み合わせとして妥当な設計です。仮想スクロール（@tanstack/react-virtual）の採用やリアルタイム購読のクリーンアップも正しく実装されています。

一方で、最も懸念されるのは **`src/services/index.ts` と個別サービスファイル（`authService.ts`, `messageService.ts` 等）の二重実装**です。実際に使用されているのは `index.ts` 側ですが、個別ファイルにも異なる実装が残存しており、混乱の温床になっています。

また **リアクション機能が UI のみで Firestore に保存されない**点は機能として不完全であり、ユーザー体験に直接影響します。

セキュリティ面では Firestore Security Rules の整備が必須です。現在はクライアント側の表示制御のみで権限管理をしているため、APIを直接呼び出すことで任意のメッセージを操作できる可能性があります。
