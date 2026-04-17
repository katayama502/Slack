# セキュリティ検査レポート — Slack風チャットアプリ

**検査日**: 2026-04-17  
**担当**: Security Agent (G-Stack AI)  
**プロジェクトルート**: `/Applications/MAMP/htdocs/Slack`

---

## 総合評価

| 重大度 | 件数 |
|--------|------|
| Critical | 0 |
| High | 3 |
| Medium | 4 |
| Low | 3 |

全体的な実装品質は標準的で、`dangerouslySetInnerHTML` の不使用・React の JSX エスケープ活用など基本的な XSS 対策は取れている。一方、Firestore ルールに権限昇格リスク（チャンネル更新の過剰許可）があり、CSP ヘッダーの欠如も本番環境では問題となる。

---

## 1. Firestoreセキュリティルール検査

### [HIGH] チャンネル更新権限が広すぎる

**ファイル**: `firestore.rules` — line 40

```
allow update: if isChannelMember(channelId);
```

**問題点**:  
チャンネルメンバーであれば `createdBy`・`name`・`description` を含む **全フィールドを上書き可能**。悪意あるメンバーが `createdBy` を自分の UID に書き換えることで、チャンネル削除権限を取得できる（権限昇格）。

**修正案**:
```
allow update: if isChannelMember(channelId)
  && request.resource.data.createdBy == resource.data.createdBy
  && request.resource.data.diff(resource.data).affectedKeys()
       .hasOnly(['members', 'description', 'updatedAt']);
```

---

### [HIGH] チャンネルリスト全件取得が可能

**ファイル**: `firestore.rules` / `src/services/index.ts` — line 115-124

**問題点**:  
`subscribeToChannels` はコレクション全体にリアルタイム購読を張るが、Firestore ルール上チャンネルの **list（コレクションクエリ）は `isChannelMember` チェックを経由しない**。  
Firestore では `read` ルールは `get`（単一取得）と `list`（クエリ）の両方をカバーするため、現行の `allow read: if isChannelMember(channelId)` は単一ドキュメント取得には機能するが、クライアント側で `collection('channels')` に対してクエリを発行すると「ドキュメントが1件でもルール違反なら全体拒否」という挙動になる。  
結果として、非メンバーのユーザーが別チャンネルのドキュメントを参照できてしまう可能性がある（チャンネル名・説明・メンバーリストの漏洩）。

**修正案**:  
サービス層でメンバー限定の `where` フィルタを付ける、またはルール側で `list` を明示的に制御する。

```
// Firestore ルールを get と list に分離
allow get: if isChannelMember(channelId);
allow list: if isAuthenticated()
  && request.auth.uid in resource.data.members;
```

---

### [MEDIUM] メッセージ編集時に uid の検証なし（クライアント側バイパスリスク）

**ファイル**: `src/services/index.ts` — line 199-207

```ts
export async function updateMessage(channelId, messageId, text): Promise<void> {
  await updateDoc(doc(db, 'channels', channelId, 'messages', messageId), { text });
}
```

**問題点**:  
クライアントのサービス関数自体には呼び出し元チェックがない。UI 側（`MessageItem.tsx`）では `isOwner` 判定をしているが、攻撃者が直接 Firestore SDK を呼び出せばバイパスできる。  
ただし Firestore ルール（line 55-56）が `resource.data.uid == request.auth.uid` で防いでいるため、バックエンドレベルでは保護されている。**UI のみの防御に依存している設計**という点でコードの意図が不明瞭。

**修正案**:  
サービス関数内でも認証済みユーザーの UID を引数に取るか、ルールへの信頼を明示するコメントを追加する。

---

### [LOW] threads コレクション読み取りがメンバーのみに制限されている（問題なし）

`channels/{channelId}/messages/{messageId}/threads/{threadId}` の read/create は `isChannelMember` を経由しており適切。

---

## 2. 認証・認可

### [HIGH] `getChannels` / `subscribeToChannels` に認証チェックなし

**ファイル**: `src/services/channelService.ts` — line 41-51 / `src/services/index.ts` — line 115-124

```ts
export function getChannels(callback): Unsubscribe {
  const q = query(collection(db, 'channels'), orderBy('createdAt', 'asc'))
  return onSnapshot(q, ...)
}
```

**問題点**:  
サービス関数がログアウト状態でも呼び出し可能な実装になっている。Firestore ルールが最終的に拒否するが、エラーハンドリングが不十分な場合は空のコールバックが返り続ける。  
また `subscribeToChannels`（index.ts 版）はチャンネルメンバーチェックなしで全チャンネルを購読しようとするため、非メンバーのチャンネルでルールエラーが発生する。

**修正案**:  
呼び出し前に `auth.currentUser` を確認する guard を追加。

```ts
if (!auth.currentUser) throw new Error('Unauthenticated');
```

---

### [MEDIUM] サービス実装の二重化による不整合リスク

**ファイル**: `src/services/messageService.ts` と `src/services/index.ts`

**問題点**:  
`sendMessage`・`deleteMessage`・`updateMessage` が両ファイルに重複実装されており、`messageService.ts` 版は `writeMentionNotifications`（バッチ処理）を使うが、`index.ts` 版は個別 `addDoc` ループで通知を送る。  
セキュリティ観点では `index.ts` 版の `sendMessage` にはメンションの `parseMentions` が含まれておらず、呼び出し元（`MessageInput.tsx`）が手動で `parseMentions` を呼んで渡す設計になっている。この二重責務が将来的にメンション通知のバイパスを引き起こす可能性がある。

---

### [LOW] サインアウト時のオンライン状態更新失敗が無視される

**ファイル**: `src/services/authService.ts` — line 57-66 / `src/services/index.ts` — line 81-94

**問題点**:  
`signOut` 内の `updateDoc` が失敗した場合（ネットワーク切断など）、ユーザーのオンライン状態が `true` のまま残留する。プライバシーの観点でわずかに問題。

**修正案**:  
Firebase Realtime Database の `onDisconnect()` か、Firestore の Cloud Functions トリガーでオフライン化を担保する。

---

## 3. XSS / インジェクション

### XSS リスク: なし（良好）

**ファイル**: `src/components/message/MessageItem.tsx` — line 16-32

```tsx
function renderMessageText(text: string): React.ReactNode[] {
  const parts = text.split(/(@\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^@\[([^\]]+)\]\(([^)]+)\)$/);
    if (match) {
      return <span ...>@{match[1]}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}
```

**評価**:  
`dangerouslySetInnerHTML` を使用していない。すべてのテキストは React の JSX として展開されるため、自動エスケープが機能している。`@[<script>](uid)` のような入力も `match[1]` がテキストノードとして扱われ XSS にならない。

---

### [MEDIUM] メンション表示名に制御文字・Unicode 攻撃が可能

**ファイル**: `src/components/message/MessageItem.tsx` — line 28

```tsx
return <span ...>@{match[1]}</span>;
```

**問題点**:  
`displayName` にゼロ幅文字・右から左への制御文字（`\u202E` など）が含まれる場合、表示が視覚的に偽装される（BiDi 攻撃）。JavaScript の XSS にはならないが、ユーザーへの偽装 UI として悪用できる。

**修正案**:  
`displayName` を正規化・サニタイズする。

```ts
const safeName = displayName.replace(/[\u200B-\u200D\u2028\u2029\u202A-\u202E\uFEFF]/g, '');
```

---

### 入力バリデーション（MessageInput.tsx）

**評価**:  
`text.trim()` による空文字ガードはある。ただし以下は未対策:

- **最大文字数制限なし**: 無制限に長いメッセージを送信できる。Firestore は 1 ドキュメント 1MiB の上限があるが、アプリ側での制限がない。
- **メンションサジェストの `@\w*` パターン**: `handleChange` で `/@(\w*)$/` でのみサジェストを発動。日本語 `\w` は ASCII のみにマッチするため、日本語ユーザー名のサジェストが一部動作しない可能性がある（セキュリティ問題ではないが UX 問題）。

---

## 4. Firebase設定

### 評価: 適切（注意点あり）

**ファイル**: `src/services/firebase.ts`、`.env.example`

- `VITE_` プレフィックスにより環境変数はビルド時にバンドルへ埋め込まれる。Firebase のクライアント設定（API キー等）は **公開前提の設計**であり、Firestore ルールによる保護が本質的なセキュリティ境界となる。この点は設計として適切。
- `.env.example` に実際の値は含まれていない（適切）。
- `.gitignore` に `.env` が含まれているかは別途確認が必要。

### [LOW] `.gitignore` に `.env` が含まれているか未確認

**推奨**: `.gitignore` に `.env` および `.env.local` が明記されていることを確認する。

---

## 5. Netlifyセキュリティヘッダー

**ファイル**: `netlify.toml`

### 設定済み（良好）

| ヘッダー | 値 | 評価 |
|----------|-----|------|
| X-Frame-Options | DENY | クリックジャッキング対策 OK |
| X-Content-Type-Options | nosniff | MIME スニッフィング対策 OK |
| Referrer-Policy | strict-origin-when-cross-origin | OK |

### [HIGH] Content-Security-Policy (CSP) が未設定

**問題点**:  
CSP ヘッダーが存在しない。万一 XSS が発生した場合のインライン スクリプト実行・外部リソース読み込みを防ぐ最終防衛ラインが欠如している。

**修正案**（`netlify.toml` に追加）:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.googleusercontent.com https://firebasestorage.googleapis.com; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com; frame-ancestors 'none';"
    Strict-Transport-Security = "max-age=63072000; includeSubDomains; preload"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### [MEDIUM] HSTS (Strict-Transport-Security) が未設定

**問題点**:  
HTTPS 強制ヘッダーがない。Netlify はデフォルトで HTTPS を提供するが、明示的な HSTS 設定がないと一部の中間者攻撃シナリオで問題になる。

---

## 6. 総合評価と優先修正リスト

### Critical（即時対応必須）
なし

### High（リリース前に対応必須）

| # | 場所 | 内容 |
|---|------|------|
| H-1 | `firestore.rules` line 40 | チャンネル更新で `createdBy` 書き換えによる権限昇格 |
| H-2 | `firestore.rules` / `channelService.ts` | 全チャンネルリスト取得に非メンバーがアクセスできる可能性 |
| H-3 | `netlify.toml` | CSP ヘッダーの欠如 |

### Medium（次スプリントで対応）

| # | 場所 | 内容 |
|---|------|------|
| M-1 | `netlify.toml` | HSTS ヘッダーの追加 |
| M-2 | `src/services/index.ts` | `messageService.ts` との重複実装の統一 |
| M-3 | `MessageInput.tsx` | メッセージ最大文字数バリデーションなし |
| M-4 | `MessageItem.tsx` | BiDi 制御文字による視覚偽装の可能性 |

### Low（改善推奨）

| # | 場所 | 内容 |
|---|------|------|
| L-1 | `authService.ts` / `index.ts` | サインアウト時オンライン状態がネットワーク断で残留 |
| L-2 | `.gitignore` | `.env` 除外設定の確認 |
| L-3 | `messageService.ts` / `index.ts` | 認証ガードのサービス層への追加（Firestore ルール依存の明示） |

---

## 付録: 検査対象ファイル一覧

| ファイル | 検査完了 |
|----------|----------|
| `firestore.rules` | ✅ |
| `src/services/authService.ts` | ✅ |
| `src/services/messageService.ts` | ✅ |
| `src/services/mentionService.ts` | ✅ |
| `src/services/channelService.ts` | ✅ |
| `src/services/userService.ts` | ✅ |
| `src/services/index.ts` | ✅（重複実装として追加確認） |
| `src/services/firebase.ts` | ✅ |
| `src/components/message/MessageItem.tsx` | ✅ |
| `src/components/message/MessageInput.tsx` | ✅ |
| `netlify.toml` | ✅ |
| `.env.example` | ✅ |
