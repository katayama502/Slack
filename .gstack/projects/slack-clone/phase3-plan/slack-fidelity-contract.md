# Slack UI 忠実化 — 実装契約（全エージェント共通・凍結）

目的: 実際の Slack（2025–2026 新デザイン）と同じ UI/UX に近づける。参考スクショは
`/private/tmp/claude-501/-Applications-MAMP-htdocs-Slack/dfd3f770-0236-4c2d-9b33-a281870d8fbe/images/{1,2,3}.webp`（Read で閲覧可）。
スクショは約 1.45 倍スケール（画像px ÷ 1.45 = CSS px）。

## 0. 絶対ルール
- 自分の担当ファイル以外は編集しない（必要なら最終報告で依頼として書く）。
- 既存の機能（Firestore 連携・下書き・メンション・スレッド・リアクション・編集削除・検索・未読・タイピング・保存）を壊さない。
- 色は CSS 変数（`src/index.css` の `--sk-*`）を使う。ハードコードは白/黒系の中立色のみ可。
- アイコンは `src/components/ui/icons.tsx`、アバターは `src/components/ui/Avatar.tsx` を使う（足りないアイコンは自ファイル内に定義可）。
- 文言は日本語版 Slack に合わせる。未実装機能は偽装せず toast（`toast.info('… はこのバージョンでは未対応です')`）。
- セキュリティ: React の生 HTML 挿入 API は使用禁止、URL は http/https のみ、ユーザー入力は React のテキストとして描画。
- 完了後 `npx tsc --noEmit` がエラー 0 であること（他担当の未完成による型エラーは報告のみ）。

## 1. デザイントークン（index.css 定義済み）
本文: `--sk-text #1D1C1D` / 補助 `--sk-text-2 #616061` / 薄 `--sk-text-3` / リンク `--sk-link #1264A3`
境界 `--sk-border rgba(29,28,29,.13)` / 強境界 `--sk-border-strong rgba(29,28,29,.3)` / ホバー `--sk-hover #F8F8F8` / 薄塗り `--sk-subtle rgba(29,28,29,.06)`
アクセント: `--sk-blue #1D9BD1` `--sk-red #E01E5A` `--sk-green #007A5A`(hover `--sk-green-hover`) `--sk-online #2BAC76` `--sk-yellow`
メンション: `--sk-mention-bg`（他人）/ `--sk-mention-me-bg`（自分・@channel）
クローム（テーマ連動）: `--sk-window`（上部バー+レール背景）/ `--sk-sidebar-overlay`（サイドバーは window の上に白10%）
`--sk-sidebar-text`(既読) `--sk-sidebar-text-strong`(未読・白) `--sk-sidebar-muted` `--sk-sidebar-hover` `--sk-sidebar-border`
`--sk-active-item`(選択中チャンネル背景) `--sk-active-item-text` `--sk-rail-active` `--sk-rail-hover` `--sk-badge` `--sk-accent`(タブ下線)
`--sk-radius-card 8px`
フォント: body に Slack-Lato/Lato + 日本語フォールバック設定済み。本文 15px / line-height 22px、名前 15px weight 900、時刻 12px。

## 2. レイアウト（ジオメトリ）
```
┌────────────── 上部バー 40px（背景 --sk-window）──────────────┐
│[サイドバー開閉][←][→][🕘]   [🔍 Creatte 内を検索 (⌘K)]     [?]│
├レール70px┬───────── フローティングカード（右4px・下4px inset、角丸8px）──┐
│ ws icon  │ サイドバー(既定 260px, 可変, 背景 overlay) │ メイン(白)      │ 右パネル │
│ ホーム   │                                          │                 │(スレッド)│
│ DM       │                                          │                 │          │
│ アクティ │                                          │                 │          │
│ ファイル │                                          │                 │          │
│ 後で     │                                          │                 │          │
│ その他   │                                          │                 │          │
│ (+)(☾)👤 │                                          │                 │          │
└──────────┴───────────────────────────────────────────────────────────┘
```
- レール項目: 36×36 角丸8px アイコン箱（アクティブ `--sk-rail-active` + 塗りアイコン / ホバー `--sk-rail-hover`）+ 下に 11px bold ラベル、縦ピッチ約 60px。
- サイドバー項目: 高さ 28px、15px、左右 padding 16px、内側角丸 6px、アイコン 16–18px。
- チャンネルヘッダー: 1 行目 49px（☆・🔒/#・名前 18px weight 900・右に メンバー/ハドル⌄/🔔/🔍/⋮）、2 行目タブ 36px（メッセージ/ピン/ファイルとリンク/+、アクティブは 2px 下線 `--sk-accent`）。

## 3. ストア API（`src/store/useAppStore.ts` 実装済み・変更禁止）
```ts
navTab: 'home'|'dms'|'activity'|'files'|'later';     setNavTab(tab)
mainView: 'channel'|'threads'|'drafts'|'directory'|'huddles'|'slackbot'; setMainView(view)  // threads/drafts パネルフラグも false にする
channelTab: 'messages'|'pins'|'files';                 setChannelTab(tab)  // setActiveChannel で 'messages' にリセット
setActiveChannel(id)  // mainView='channel' に戻し、履歴 push
navHistory: string[]; navIndex: number; navBack(); navForward()
starredChannelIds: string[]; toggleStarChannel(id)
channelNotifPrefs: Record<id,'all'|'mentions'|'off'>; setChannelNotifPref(id, pref)   // 'off' = ミュート
notificationsPaused: boolean; setNotificationsPaused(b)
theme: 'crimson'|'aubergine'|'midnight'|'forest'; setTheme(t)   // <html data-theme> を自動設定
laterDoneIds: string[]; toggleLaterDone(messageId)
shortcutsOpen: boolean; setShortcutsOpen(b)
```
戻り値例: `useAppStore.getState().channelNotifPrefs` → `{ "abc123": "off", "def456": "mentions" }`

## 4. 型・サービス（実装済み）
- `Channel.isPrivate?: boolean`（鍵アイコン表示、参加は招待制）
- `Message.pinned?: boolean; pinnedBy?: string; pinnedAt?: Timestamp`
- `createChannel(name, description, uid, isPrivate=false): Promise<Channel>`
- `setMessagePinned(channelId, messageId, pinned: boolean, uid): Promise<void>`
- `formatSidebarDate(ts)` → `"15:01" | "昨日" | "火曜日" | "9月26日"`（utils/formatDate）
- DM 判定は従来どおり `channel.name.startsWith('__dm__')`。相手は `channel.members` から自分以外。

## 5. 担当ファイル
| Agent | ファイル |
|---|---|
| A Shell | `layout/Layout.tsx`, `sidebar/NavRail.tsx`, `sidebar/Sidebar.tsx`, `sidebar/AddChannelModal.tsx`, 新規 `sidebar/*`（DMList/ActivityList/LaterList/FilesList など）, 新規 `views/*`（Directory/Huddles/Slackbot）, `drafts/DraftsPanel.tsx`, `threads/ThreadsPanel.tsx`, `ui/QuickSwitcher.tsx`(見た目のみ), `ui/StatusPicker.tsx`, `pages/WorkspacePage.tsx`(通知一時停止の反映のみ), `notifications/NotificationsPanel.tsx`, `saved/SavedItemsPanel.tsx` |
| B Channel | `channel/ChannelHeader.tsx`, `channel/PinBar.tsx`, `channel/ChannelSettingsModal.tsx`, `message/MessageList.tsx`, `message/TypingIndicator.tsx`, 新規 `channel/PinsTab.tsx`, `channel/FilesTab.tsx`, `channel/ChannelIntro.tsx` |
| C Message | `message/MessageItem.tsx`, `utils/markdown.tsx`, `ui/EmojiPicker.tsx`, 新規 `message/ForwardModal.tsx`, `message/MessageActions.tsx` など |
| D Composer | `message/MessageInput.tsx`, `thread/ThreadPanel.tsx`, `ui/Toast.tsx`(見た目のみ) |

## 6. 境界の約束
- Layout(A) はメインに `channelTab==='messages'` なら `<ChannelHeader/><PinBar/><MessageList/><TypingIndicator/><MessageInput/>`、
  `'pins'` なら `<ChannelHeader/><PinsTab/>`、`'files'` なら `<ChannelHeader/><FilesTab/>` を描画する（B が `channel/PinsTab.tsx` `channel/FilesTab.tsx` を default export で作る。props なし）。
- `mainView!=='channel'` のとき A がメインにスレッド一覧/下書き/ディレクトリ/ハドル/Slackbot を描画。右パネルはスレッド（ThreadPanel）のみ（通知/保存は左サイドバーのタブへ移行）。
- MessageItem の props は `{ message, isCompact, onThreadClick, searchQuery? }` から変えない（MessageList(B) が使う）。
- ChannelHeader の props は `{ onMenuClick?: () => void }` のまま。

## 7. メッセージ行の仕様（C・D 共通）
- 行 padding 8px 20px（compact は 2px 20px）、アバター 36px 角丸 8px、gap 8px、ホバー背景 `--sk-hover`。
- 名前 15px weight 900 `--sk-text`、時刻 12px `--sk-text-2`（ホバーで下線、title にフル日時）。
- ホバーツールバー: 右上 top:-16px、白、1px `--sk-border`、角丸 8px、影 `0 1px 3px rgba(0,0,0,.08)`、ボタン 32px。
  中身: ✅ 👀 🙌（クイックリアクション）| 絵文字追加 | スレッドで返信 | 転送 | 後で（保存）| ⋮
- リアクション: 高さ 24px 角丸 12px padding 0 6px、絵文字 16px + 数 12px。通常 `--sk-subtle` 背景、自分済み `--sk-mention-bg` + `inset 0 0 0 1px var(--sk-blue)` + 数 `--sk-link` bold。末尾に絵文字追加ピル。
- スレッド概要: 24px アバター×最大3 + 「N 件の返信」13px bold `--sk-link` + 「最終返信: 今日 15:01」13px `--sk-text-2`、ホバーで白背景+枠+右端に「スレッドを表示 ›」。
- メンション: 他人 `--sk-mention-bg`/`--sk-link`、自分・@channel/@here `--sk-mention-me-bg`/`--sk-text`、角丸 3px、padding 0 2px。
- 自分宛メンションを含む行: 背景 `rgba(242,199,68,.1)` + 左ボーダー 2px `#E8A838`。
- インラインコード: 12px monospace、`--sk-red` 文字、背景 `rgba(29,28,29,.04)`、1px `--sk-border`、角丸 3px、padding 2px 3px。
- コードブロック: 同背景/枠、角丸 4px、padding 8px、12px monospace、line-height 1.5。
- 引用: 左 4px `#DDDDDD` バー、padding-left 12px。
- 日付区切り: 1px 線 + 中央ピル（13px bold 白背景 1px `--sk-border` 角丸 24px 高さ 28px padding 0 16px + ⌄）、`position: sticky; top: 8px`。
- 未読区切り: 1px `--sk-red` 線 + 右端に「新着」12px bold `--sk-red`（白背景で線を切る）。
