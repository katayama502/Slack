# Slack Clone UI/UX デザイン仕様書

**作成日**: 2026-04-17
**フェーズ**: Phase 2 - Design
**担当**: Designer Agent

---

## 1. デザインシステム

### 1.1 カラーパレット

#### ブランドカラー（Slack準拠）

| トークン名 | HEX値 | 用途 |
|-----------|-------|------|
| `sidebar-bg` | `#3F0E40` | サイドバー背景（Slackデフォルト紫） |
| `sidebar-hover` | `#350D36` | サイドバーアイテムhover |
| `sidebar-active` | `#1164A3` | アクティブチャンネル（青） |
| `sidebar-text` | `#CFC3CF` | サイドバー通常テキスト |
| `sidebar-text-active` | `#FFFFFF` | サイドバーアクティブテキスト |
| `sidebar-icon` | `#E8D5E8` | サイドバーアイコン |
| `main-bg` | `#FFFFFF` | メインエリア背景 |
| `message-hover-bg` | `#F8F8F8` | メッセージhover背景 |
| `input-bg` | `#FFFFFF` | 入力エリア背景 |
| `input-border` | `#C6C6C6` | 入力エリアボーダー |
| `input-border-focus` | `#1D9BD1` | フォーカス時ボーダー |
| `accent-blue` | `#1D9BD1` | リンク・アクション強調 |
| `accent-green` | `#007A5A` | オンライン状態インジケーター |
| `accent-red` | `#E01E5A` | バッジ・エラー |
| `accent-yellow` | `#ECB22E` | 警告・スター |
| `text-primary` | `#1D1C1D` | メインテキスト |
| `text-secondary` | `#616061` | セカンダリテキスト |
| `text-muted` | `#8B8B8B` | タイムスタンプ等 |
| `divider` | `#E8E8E8` | 区切り線 |
| `header-bg` | `#FFFFFF` | チャンネルヘッダー背景 |
| `header-border` | `#DDDDDD` | ヘッダー下ボーダー |
| `thread-bg` | `#FFFFFF` | スレッドパネル背景 |
| `thread-border` | `#E8E8E8` | スレッドパネル左ボーダー |
| `mention-bg` | `#FFF8C5` | メンションハイライト背景 |
| `mention-border` | `#E8D44D` | メンションハイライトボーダー |
| `unread-badge` | `#E01E5A` | 未読バッジ |
| `tooltip-bg` | `#1D1C1D` | ツールチップ背景 |
| `modal-overlay` | `rgba(0,0,0,0.5)` | モーダルオーバーレイ |

#### ダークモード対応トークン（将来拡張用）
- `--color-sidebar-bg`: ライト `#3F0E40` / ダーク `#1A1A2E`
- `--color-main-bg`: ライト `#FFFFFF` / ダーク `#222529`

---

### 1.2 タイポグラフィ

#### フォントファミリー
```css
/* プライマリフォント */
font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;

/* コードフォント */
font-family: 'Monaco', 'Menlo', 'Courier New', Courier, monospace;
```

#### フォントスケール

| トークン | サイズ | ウェイト | 行高 | 用途 |
|---------|-------|---------|------|------|
| `text-xs` | 11px | 400 | 1.4 | タイムスタンプ・バッジ |
| `text-sm` | 13px | 400 | 1.5 | サイドバーアイテム・補助テキスト |
| `text-base` | 15px | 400 | 1.5 | メッセージ本文（Slack標準） |
| `text-md` | 15px | 700 | 1.5 | メッセージ送信者名 |
| `text-lg` | 18px | 700 | 1.4 | チャンネル名ヘッダー |
| `text-xl` | 22px | 700 | 1.3 | ワークスペース名 |
| `text-code` | 12px | 400 | 1.5 | インラインコード |

---

### 1.3 スペーシング規則

4px基準のスケール:

| トークン | 値 | 用途例 |
|---------|---|-------|
| `space-1` | 4px | アイコンとテキスト間 |
| `space-2` | 8px | 小要素の内側パディング |
| `space-3` | 12px | メッセージアバター右マージン |
| `space-4` | 16px | セクションの内側パディング |
| `space-5` | 20px | メッセージブロック縦パディング |
| `space-6` | 24px | セクション間マージン |
| `space-8` | 32px | 大セクション間マージン |

メッセージエリアの具体的なスペーシング:
- メッセージ間: `8px` (連続メッセージ), `16px` (新しい送信者)
- サイドバーアイテム高: `28px`
- サイドバー内側パディング: `0 16px`
- メッセージ左パディング（アバター分）: `72px`

---

### 1.4 ボーダーラジウス

| トークン | 値 | 用途 |
|---------|---|------|
| `radius-sm` | 3px | インラインコード・バッジ |
| `radius-md` | 4px | ボタン・入力フィールド |
| `radius-lg` | 8px | メッセージアクションツールバー・モーダル |
| `radius-xl` | 12px | リアクションピル |
| `radius-full` | 9999px | アバター・ステータスドット |

---

### 1.5 シャドウ

| トークン | 値 | 用途 |
|---------|---|------|
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.08)` | カード・入力 |
| `shadow-md` | `0 4px 12px rgba(0,0,0,0.15)` | ドロップダウン・サジェスト |
| `shadow-lg` | `0 8px 24px rgba(0,0,0,0.20)` | モーダル |
| `shadow-toolbar` | `0 0 0 1px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.12)` | メッセージアクションツールバー |

---

## 2. レイアウト仕様

### 2.1 全体構造（3カラム）

```
┌─────────────────────────────────────────────────────────────┐
│  [Sidebar: 220px]  │  [Main Chat]  │  [Thread: 400px]       │
│                    │               │  (条件付き表示)          │
│  min-width: 180px  │  flex: 1      │  min-width: 300px      │
│  max-width: 320px  │  min-w: 400px │  max-width: 500px      │
└─────────────────────────────────────────────────────────────┘
```

#### グリッドCSS定義
```css
.app-layout {
  display: grid;
  grid-template-columns: var(--sidebar-width, 220px) 1fr var(--thread-width, 0px);
  grid-template-rows: 100vh;
  overflow: hidden;
}

/* スレッドパネル表示時 */
.app-layout--thread-open {
  --thread-width: 400px;
}
```

---

### 2.2 左サイドバー

**幅**: 220px (デフォルト), ドラッグリサイズ可能 (180px〜320px)

```
┌────────────────────────────┐
│  ワークスペース名エリア (56px) │  ← height: 56px, border-bottom
│  ┌─────────────────────┐   │
│  │ 🏢 WorkspaceName  ▼ │   │
│  └─────────────────────┘   │
├────────────────────────────┤
│  スクロール可能エリア          │  ← overflow-y: auto
│                            │
│  ▸ チャンネルセクション        │  ← セクションヘッダー
│    # general               │
│    # random               │
│    + チャンネルを追加        │
│                            │
│  ▸ ダイレクトメッセージ        │
│    ● 田中太郎               │  ← ● = オンラインドット
│    ○ 山田花子               │  ← ○ = オフライン
│    + メンバーを追加          │
│                            │
└────────────────────────────┘
```

**サイドバー要素の詳細**:

- ワークスペース名エリア: `height: 56px`, 背景 `#350D36`（少し暗い）, クリックでメニュー表示
- セクションヘッダー: `font-size: 13px`, `font-weight: 700`, `color: #CFC3CF`, `padding: 16px 16px 4px`
- チャンネルアイテム: `height: 28px`, `padding: 0 16px`, `border-radius: 4px`, `cursor: pointer`
- アクティブアイテム: `background: #1164A3`, `color: #FFFFFF`
- hoverアイテム: `background: rgba(255,255,255,0.1)`, `color: #FFFFFF`
- 通常テキスト: `color: #CFC3CF`
- 未読チャンネル: `font-weight: 700`, `color: #FFFFFF`

---

### 2.3 メインチャット領域

```
┌──────────────────────────────────────────┐
│  チャンネルヘッダー (56px)                  │  ← border-bottom: 1px solid #DDDDDD
│  # general  👥 12   ━━  🔍 検索           │
├──────────────────────────────────────────┤
│                                          │
│  メッセージリスト (flex: 1, overflow-y: auto) │
│                                          │
│  ── 2026年4月17日 ──                     │  ← 日付区切り
│                                          │
│  [avatar] 田中太郎 10:30                 │
│           こんにちは！                    │
│                                          │
│  [avatar] 山田花子 10:31                 │
│           よろしくお願いします             │
│                                          │
├──────────────────────────────────────────┤
│  メッセージ入力エリア (min: 44px)           │  ← padding: 0 20px 20px
│  ┌──────────────────────────────────┐    │
│  │ # general へのメッセージ...  [📎][😀] │ │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

---

### 2.4 スレッドパネル（右側）

**幅**: 400px (デフォルト), ドラッグリサイズ可能 (300px〜500px)
**表示**: スレッドクリック時にスライドイン

```
┌────────────────────────────────┐
│  スレッドヘッダー (56px)          │
│  スレッド                    ✕ │
├────────────────────────────────┤
│  親メッセージエリア               │
│  [avatar] 田中太郎 10:30       │
│           元のメッセージ内容     │
│                               │
│  返信 3件 ────────────────    │
│                               │
│  返信リスト (scroll)            │
│  [avatar] 山田花子 10:35      │
│           返信内容             │
├────────────────────────────────┤
│  返信入力エリア                  │
│  ┌──────────────────────────┐  │
│  │ 返信を入力...         [送信] │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

---

### 2.5 レスポンシブ挙動

| ブレークポイント | レイアウト変更 |
|--------------|------------|
| `>= 1024px` | 3カラム全表示 |
| `768px〜1023px` | サイドバー折りたたみ（ハンバーガーメニュー）、スレッドはオーバーレイ |
| `< 768px` | 1カラム、サイドバーはドロワー、スレッドはフルスクリーン |

---

## 3. 主要コンポーネントUI仕様

### 3.1 サイドバー (Sidebar)

#### ワークスペース名コンポーネント
```
┌──────────────────────────────────┐
│  ■ My Workspace            ▼    │  height: 56px
│  ● 田中太郎 (自分)               │  font-size: 18px, font-weight: 700
└──────────────────────────────────┘
```

- ワークスペース名: `color: #FFFFFF`, `font-weight: 700`, `font-size: 18px`
- ステータスドット（自分）: `width: 8px`, `height: 8px`, `background: #007A5A`, `border-radius: 50%`
- クリックでワークスペースメニュードロップダウン表示

#### チャンネルアイテムコンポーネント
```jsx
// 構造
<div class="sidebar-item [sidebar-item--active] [sidebar-item--unread]">
  <span class="sidebar-item__icon">#</span>  // または🔒（プライベート）
  <span class="sidebar-item__name">general</span>
  <span class="sidebar-item__badge">3</span>  // 未読バッジ（条件付き）
</div>
```

- アイコン（#）: `color: inherit`, `font-size: 15px`, `margin-right: 6px`
- 未読バッジ: `background: #E01E5A`, `color: #FFFFFF`, `border-radius: 9999px`, `padding: 0 6px`, `font-size: 11px`, `font-weight: 700`

#### DMアイテムコンポーネント
```jsx
<div class="sidebar-item">
  <div class="avatar avatar--sm">  // 16x16px
    <img src="avatar.jpg" />
    <span class="status-dot status-dot--online"></span>  // 条件付き
  </div>
  <span class="sidebar-item__name">山田花子</span>
</div>
```

---

### 3.2 チャンネルヘッダー (ChannelHeader)

```
┌─────────────────────────────────────────────────────┐
│  # general    ─────    👥 12    │    🔍    ☎    ⋮   │
│  チャンネルの説明テキスト（オプション）                   │
└─────────────────────────────────────────────────────┘
  height: 56px, padding: 0 16px
  border-bottom: 1px solid #DDDDDD
  box-shadow: 0 1px 0 rgba(0,0,0,0.05)
```

- チャンネル名: `font-size: 18px`, `font-weight: 700`, `color: #1D1C1D`
- 区切り線: `height: 1px`, `background: #DDDDDD`, `width: 1px`, `margin: 0 12px`
- メンバーアイコン: `font-size: 13px`, `color: #616061`, hover時アンダーライン
- アクションアイコン群（右）: `width: 28px`, `height: 28px`, `border-radius: 4px`, hover時 `background: #F8F8F8`

---

### 3.3 メッセージバブル (Message)

#### 標準メッセージ（新規送信者）
```
[avatar 36x36]  田中太郎  10:30 AM
                メッセージ本文がここに入ります。
                複数行になることもあります。

                [👍 2] [🎉 1]   ← リアクション
```

```jsx
<div class="message [message--highlighted]">  // highlighted: メンション時
  <div class="message__avatar">
    <img class="avatar avatar--md" />  // 36x36px
  </div>
  <div class="message__body">
    <div class="message__header">
      <span class="message__author">田中太郎</span>
      <span class="message__timestamp">10:30 AM</span>
    </div>
    <div class="message__content">本文テキスト</div>
    <div class="message__reactions">
      <button class="reaction">👍 <span>2</span></button>
    </div>
  </div>
  <!-- hover時に表示 -->
  <div class="message__actions">
    <button>😀</button>  // リアクション追加
    <button>↩</button>  // スレッド返信
    <button>⋮</button>  // その他メニュー
  </div>
</div>
```

寸法:
- アバター: `width: 36px`, `height: 36px`, `border-radius: 4px`, `margin-right: 12px`
- メッセージコンテナ: `padding: 4px 16px 4px 72px`
- 送信者名: `font-size: 15px`, `font-weight: 700`, `color: #1D1C1D`, `margin-right: 8px`
- タイムスタンプ: `font-size: 11px`, `color: #8B8B8B`
- 本文: `font-size: 15px`, `color: #1D1C1D`, `line-height: 1.46668`

#### 連続メッセージ（同一送信者、5分以内）
```
            10:31  メッセージ本文（アバター・名前なし）
```
- アバターなし、名前なし
- `padding: 2px 16px 2px 72px`
- hover時にタイムスタンプ表示（左side）

#### メンションハイライト
- コンテナ: `background: #FFF8C5`, `border-left: 3px solid #E8D44D`
- `@username`: `background: #1164A3`, `color: #FFFFFF`, `border-radius: 3px`, `padding: 0 3px`

#### リアクションピル
```
[😀 2]
```
- `background: #F8F8F8`, `border: 1px solid #E8E8E8`, `border-radius: 12px`
- `padding: 2px 8px`, `font-size: 13px`, `cursor: pointer`
- hover: `background: #E8E8E8`
- 自分が押した場合: `background: #E8F2FC`, `border-color: #1D9BD1`

---

### 3.4 メッセージ入力エリア (MessageInput)

```
┌──────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────┐    │
│  │ B  I  S  ─  ≡  ≡  <>  @  ＃              [送信] │    │  ← ツールバー
│  ├──────────────────────────────────────────────────┤    │
│  │                                                  │    │
│  │  # general へのメッセージ...                      │    │  ← テキストエリア
│  │                                                  │    │
│  ├──────────────────────────────────────────────────┤    │
│  │  📎  😀  @                              [↵ 送信] │    │  ← フッター
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
  padding: 0 20px 20px
```

- 外枠: `border: 1px solid #C6C6C6`, `border-radius: 8px`, `box-shadow: 0 1px 3px rgba(0,0,0,0.08)`
- フォーカス時外枠: `border-color: #1D9BD1`, `box-shadow: 0 0 0 3px rgba(29,155,209,0.2)`
- テキストエリア: `min-height: 44px`, `max-height: 300px`, `padding: 11px 16px`, `font-size: 15px`, `resize: none`
- ツールバー: `height: 36px`, `padding: 0 8px`, `border-bottom: 1px solid #E8E8E8`
- ツールバーボタン: `width: 28px`, `height: 28px`, `border-radius: 4px`
- 送信ボタン（フッター）: `background: #007A5A`, `color: #FFFFFF`, `border-radius: 4px`, `padding: 6px 12px`
- 送信ボタン disabled: `background: #E8E8E8`, `color: #8B8B8B`

#### メンションサジェストドロップダウン
```
┌──────────────────────────────────────┐
│  @で絞り込み中...                     │
│  ┌────────────────────────────────┐  │
│  │ [avatar] 田中太郎  taro.t      │  │  ← ハイライト選択中
│  │ [avatar] 山田花子  hana.y      │  │
│  │ [avatar] 鈴木一郎  ichiro.s   │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```
- 位置: 入力エリアの上方に表示（transform: translateY(-100%)）
- 幅: 入力エリアに合わせる
- `background: #FFFFFF`, `border: 1px solid #DDDDDD`, `border-radius: 6px`, `box-shadow: 0 4px 12px rgba(0,0,0,0.15)`
- アイテム: `padding: 8px 12px`, `cursor: pointer`
- アイテムhover/selected: `background: #1164A3`, `color: #FFFFFF`
- アバター: `width: 24px`, `height: 24px`, `margin-right: 8px`
- ユーザー名: `font-weight: 700`, `font-size: 14px`
- ハンドル: `font-size: 12px`, `color: #616061`（選択中は `#FFFFFF`）

---

### 3.5 スレッドパネル (ThreadPanel)

#### ヘッダー
- `height: 56px`, `padding: 0 16px`
- タイトル「スレッド」: `font-size: 18px`, `font-weight: 700`
- 閉じるボタン（✕）: 右端, `width: 28px`, `height: 28px`
- `border-bottom: 1px solid #E8E8E8`

#### 親メッセージエリア
- `background: #F8F8F8`, `border-radius: 8px`, `margin: 12px 16px`
- `padding: 12px`
- 同一メッセージコンポーネントを再利用

#### 返信件数バナー
```
返信 3件  ─────────────────
```
- `font-size: 13px`, `color: #616061`, `margin: 8px 16px`

#### 返信リスト
- スクロール可能エリア
- メッセージコンポーネントと同一、ただし `padding-left: 16px`

#### 返信入力
- メインの入力エリアと同一コンポーネント
- プレースホルダー: 「返信を入力...」

---

## 4. インタラクション仕様

### 4.1 メッセージhoverアクションツールバー

**トリガー**: メッセージ要素に `mouseenter`
**表示位置**: メッセージ右上端（`position: absolute`, `top: -16px`, `right: 16px`）

```
┌─────────────────────────────────────┐
│  [😀]  [↩ 返信]  [🔖]  [⋮]         │
└─────────────────────────────────────┘
  background: #FFFFFF
  border: 1px solid #E8E8E8
  border-radius: 8px
  box-shadow: 0 0 0 1px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.12)
  padding: 2px
```

アクションボタン:
| アイコン | 機能 | tooltip |
|---------|------|---------|
| 😀 | リアクション追加 | 「リアクションする」 |
| ↩ | スレッド返信 | 「スレッドで返信する」 |
| 🔖 | ブックマーク | 「後で読む」 |
| ⋮ | その他メニュー | 「その他のアクション」 |

各ボタン: `width: 32px`, `height: 32px`, `border-radius: 4px`, hover時 `background: #F8F8F8`

トランジション:
```css
.message__actions {
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 100ms ease, transform 100ms ease;
}
.message:hover .message__actions {
  opacity: 1;
  transform: translateY(0);
}
```

---

### 4.2 @メンションサジェスト

**トリガー**: 入力エリアで `@` を入力
**フィルタリング**: `@` 以降の文字列でリアルタイム絞り込み（大文字小文字無視）

実装フロー:
1. `@` 入力検出 → サジェスト表示
2. キーボード操作:
   - `↑` / `↓`: 選択移動
   - `Enter` / `Tab`: 選択確定
   - `Escape`: サジェスト閉じる
3. 選択確定時: `@username ` をテキストに挿入（末尾スペース付き）
4. サジェスト外クリック: 閉じる

---

### 4.3 スレッドパネルオープン/クローズ

**トリガー**: 「スレッドで返信する」ボタンクリック、または既存スレッドの「X件の返信」クリック

アニメーション:
```css
.thread-panel {
  transform: translateX(100%);
  transition: transform 200ms ease;
}
.thread-panel--open {
  transform: translateX(0);
}
```

- メインエリアはスレッドパネル分だけ幅が縮む（グリッドが再計算）
- モバイルではフルスクリーンオーバーレイとして表示

---

### 4.4 オンライン状態インジケーター

**表示位置**: アバター右下角（`position: absolute`, `bottom: -1px`, `right: -1px`）

| 状態 | 色 | 形状 |
|-----|---|------|
| オンライン | `#007A5A` | 塗りつぶし円 |
| 離席中 | `#ECB22E` | 塗りつぶし円 |
| 取り込み中 | `#E01E5A` | 塗りつぶし円 |
| オフライン | `transparent` | 枠線のみ円（`border: 2px solid #8B8B8B`） |

```css
.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid #FFFFFF;  /* 背景色と同色のボーダーでくり抜き効果 */
  position: absolute;
  bottom: -1px;
  right: -1px;
}
.status-dot--online { background: #007A5A; }
.status-dot--away   { background: #ECB22E; }
.status-dot--busy   { background: #E01E5A; }
.status-dot--offline { background: transparent; border-color: #8B8B8B; }
```

---

### 4.5 その他のインタラクション

#### 日付区切り線
```
──────────────── 2026年4月17日 ────────────────
```
- `color: #8B8B8B`, `font-size: 13px`, `font-weight: 700`
- 左右に `flex: 1` の `<hr>` 要素

#### 未読区切り線
```
──────────────── 新着メッセージ ────────────────
```
- `color: #E01E5A`, `font-size: 13px`, 赤色

#### スクロールトゥボトムボタン
- 新着メッセージあり＆スクロール位置が下部でない場合に表示
- 右下コーナー浮動ボタン: `background: #FFFFFF`, `border-radius: 50%`, `box-shadow: 0 2px 8px rgba(0,0,0,0.2)`

---

## 5. CSSクラス命名規則 / スタイリング方針

### 5.1 スタイリング方針

**Tailwind CSS + CSS Modules のハイブリッド**を採用:
- レイアウト・スペーシング・基本スタイル: **Tailwind CSS**
- 複雑なコンポーネント・疑似要素・アニメーション: **CSS Modules**
- カスタムカラー・フォント: Tailwind設定ファイルで定義

**採用理由**:
- Tailwindで開発速度を向上
- CSS Modulesでスコープが必要な複雑スタイルを管理
- Slack固有のカラーはTailwindカスタムテーマで一元管理

---

### 5.2 BEM命名規則（CSS Modules使用時）

```
Block__Element--Modifier
```

例:
```css
/* sidebar.module.css */
.sidebar {}                        /* Block */
.sidebar__header {}               /* Element */
.sidebar__item {}
.sidebar__item--active {}         /* Modifier */
.sidebar__item--unread {}
.sidebar__item-name {}
.sidebar__item-badge {}

/* message.module.css */
.message {}
.message--highlighted {}          /* メンションハイライト */
.message__avatar {}
.message__body {}
.message__header {}
.message__author {}
.message__timestamp {}
.message__content {}
.message__reactions {}
.message__actions {}              /* hover時ツールバー */

/* messageInput.module.css */
.message-input {}
.message-input__toolbar {}
.message-input__textarea {}
.message-input__footer {}
.message-input--focused {}

/* threadPanel.module.css */
.thread-panel {}
.thread-panel--open {}
.thread-panel__header {}
.thread-panel__parent {}
.thread-panel__replies {}
.thread-panel__input {}
```

---

### 5.3 Tailwindユーティリティの使用方針

```jsx
// 良い例: レイアウト・スペーシングはTailwind
<div className="flex h-full overflow-hidden">
  <aside className="w-[220px] min-w-[180px] flex-shrink-0">

// 良い例: カスタムカラーはTailwindカスタムテーマ経由
<div className="bg-sidebar text-sidebar-text">

// CSS Modulesを使う例: 複雑な状態・アニメーション
<div className={styles['message__actions']}>
```

---

## 6. Tailwind CSS設定

### tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Sidebar
        sidebar: {
          DEFAULT: '#3F0E40',
          dark:    '#350D36',
          active:  '#1164A3',
          text:    '#CFC3CF',
          'text-active': '#FFFFFF',
          icon:    '#E8D5E8',
          hover:   'rgba(255,255,255,0.1)',
        },
        // Main area
        main: {
          DEFAULT: '#FFFFFF',
          hover:   '#F8F8F8',
        },
        // Accent
        accent: {
          blue:   '#1D9BD1',
          green:  '#007A5A',
          red:    '#E01E5A',
          yellow: '#ECB22E',
        },
        // Text
        text: {
          primary:   '#1D1C1D',
          secondary: '#616061',
          muted:     '#8B8B8B',
        },
        // UI elements
        border: {
          DEFAULT: '#E8E8E8',
          dark:    '#DDDDDD',
          input:   '#C6C6C6',
        },
        // Mention
        mention: {
          bg:     '#FFF8C5',
          border: '#E8D44D',
          text:   '#1164A3',
        },
        // Status
        status: {
          online:  '#007A5A',
          away:    '#ECB22E',
          busy:    '#E01E5A',
          offline: '#8B8B8B',
        },
      },

      fontFamily: {
        sans: ['Lato', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['Monaco', 'Menlo', 'Courier New', 'Courier', 'monospace'],
      },

      fontSize: {
        'xs':   ['11px', { lineHeight: '1.4' }],
        'sm':   ['13px', { lineHeight: '1.5' }],
        'base': ['15px', { lineHeight: '1.46668' }],
        'lg':   ['18px', { lineHeight: '1.4' }],
        'xl':   ['22px', { lineHeight: '1.3' }],
      },

      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        // Component-specific
        'sidebar': '220px',
        'sidebar-min': '180px',
        'sidebar-max': '320px',
        'thread': '400px',
        'thread-min': '300px',
        'header': '56px',
        'avatar-sm': '16px',
        'avatar-md': '36px',
        'avatar-lg': '48px',
      },

      borderRadius: {
        'sm': '3px',
        DEFAULT: '4px',
        'lg': '8px',
        'xl': '12px',
      },

      boxShadow: {
        'sm':      '0 1px 3px rgba(0,0,0,0.08)',
        'md':      '0 4px 12px rgba(0,0,0,0.15)',
        'lg':      '0 8px 24px rgba(0,0,0,0.20)',
        'toolbar': '0 0 0 1px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.12)',
        'input-focus': '0 0 0 3px rgba(29,155,209,0.2)',
      },

      keyframes: {
        'slide-in-right': {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'badge-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%':      { transform: 'scale(1.1)' },
        },
      },

      animation: {
        'slide-in-right': 'slide-in-right 200ms ease',
        'fade-in':        'fade-in 100ms ease',
        'badge-pulse':    'badge-pulse 300ms ease',
      },

      transitionDuration: {
        'fast': '100ms',
        'base': '200ms',
      },
    },
  },
  plugins: [
    // スクロールバースタイル
    require('@tailwindcss/typography'),
  ],
};
```

---

### 6.1 グローバルCSS（index.css / global.css）

```css
/* カスタムスクロールバー（Slackスタイル） */
.scrollbar-slack::-webkit-scrollbar {
  width: 8px;
}
.scrollbar-slack::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-slack::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
.scrollbar-slack::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.35);
  border: 2px solid transparent;
  background-clip: padding-box;
}

/* サイドバースクロールバー（明色） */
.scrollbar-sidebar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}
.scrollbar-sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.35);
}

/* Lato フォントのインポート */
@import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap');

/* ベースリセット */
*, *::before, *::after {
  box-sizing: border-box;
}

body {
  font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 15px;
  color: #1D1C1D;
  background: #FFFFFF;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## 7. コンポーネントディレクトリ構造（推奨）

```
src/
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx        # 3カラムグリッド
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── WorkspaceName.tsx
│   │   │   ├── ChannelList.tsx
│   │   │   ├── ChannelItem.tsx
│   │   │   ├── DMList.tsx
│   │   │   └── sidebar.module.css
│   │   ├── ChannelHeader/
│   │   │   ├── ChannelHeader.tsx
│   │   │   └── channelHeader.module.css
│   │   └── ThreadPanel/
│   │       ├── ThreadPanel.tsx
│   │       └── threadPanel.module.css
│   ├── message/
│   │   ├── MessageList.tsx
│   │   ├── Message.tsx
│   │   ├── MessageActions.tsx   # hoverツールバー
│   │   ├── Reaction.tsx
│   │   ├── DateDivider.tsx
│   │   └── message.module.css
│   ├── input/
│   │   ├── MessageInput.tsx
│   │   ├── MentionSuggest.tsx
│   │   └── messageInput.module.css
│   └── common/
│       ├── Avatar.tsx
│       ├── StatusDot.tsx
│       ├── Badge.tsx
│       └── Tooltip.tsx
├── styles/
│   ├── global.css
│   └── variables.css
└── tailwind.config.js
```

---

## 8. アクセシビリティ方針

- `aria-label` をすべてのアイコンボタンに付与
- キーボードナビゲーション対応（Tab, Enter, Escape, 矢印キー）
- フォーカスリング: `outline: 2px solid #1D9BD1`, `outline-offset: 2px`
- カラーコントラスト比: WCAG AA準拠（通常テキスト 4.5:1以上）
- スクリーンリーダー向け `aria-live="polite"` を新着メッセージエリアに設定
- `role="complementary"` をスレッドパネルに設定

---

*このデザイン仕様はPhase 4 Buildフェーズでの実装の基準として使用してください。*
