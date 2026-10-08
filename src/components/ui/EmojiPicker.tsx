import { useState, useMemo, useRef, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Slack 風 絵文字ピッカー
// - 上部: 「絵文字を検索」入力
// - カテゴリタブ行（クリックで該当セクションへスクロール、スクロール位置に追従）
// - 9 列 × 32px セルのグリッド（セクション見出しは sticky）
// - フッター: ホバー中の絵文字の大きなプレビュー + :shortcode:
// props / default export の API は従来どおり（onSelect / onClose / style）
// ─────────────────────────────────────────────────────────────────────────────

const EMOJI_CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: 'よく使う',
    icon: '🕘',
    emojis: ['👍', '❤️', '😂', '🎉', '🔥', '👀', '✅', '🙏', '😊', '🤔', '👋', '💯', '🙌', '👏', '🙇'],
  },
  {
    label: '顔文字＆人',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
      '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
      '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
      '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
      '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
      '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
      '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
      '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
      '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎',
      '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏',
      '✍️', '💪', '🙇', '🙆', '🙅', '🤷', '🤦', '💁', '🙋', '👀',
    ],
  },
  {
    label: '動物＆自然',
    icon: '🐶',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
      '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧',
      '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄',
      '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🌸', '🌷', '🌹', '🌻',
      '🌲', '🌳', '🌴', '🌵', '🍀', '🍁', '🌈', '☀️', '⭐', '🌙',
    ],
  },
  {
    label: '食べ物＆飲み物',
    icon: '🍎',
    emojis: [
      '🍎', '🍊', '🍋', '🍇', '🍓', '🫐', '🍈', '🍑', '🍒', '🥭',
      '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️',
      '🫑', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🧀',
      '🍕', '🍔', '🍟', '🌭', '🌮', '🌯', '🥗', '🍜', '🍣', '🍱',
      '🍛', '🍚', '🍙', '🍘', '🍥', '🍡', '🧁', '🍰', '🎂', '🍮',
      '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '☕', '🍵', '🍺', '🍻',
    ],
  },
  {
    label: 'アクティビティ',
    icon: '⚽',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
      '🏓', '🏸', '🏒', '🥍', '🏑', '🏏', '🥊', '🥋', '🎽', '🛹',
      '⛸️', '🏂', '⛷️', '🎿', '🏋️', '🤸', '⛹️', '🤺', '🏊', '🚴',
      '🧘', '🏌️', '🏇', '🧗', '🤾', '⛳', '🎣', '🎮', '🎲', '🎉',
      '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '🎯', '🎨', '🎵',
    ],
  },
  {
    label: 'オブジェクト',
    icon: '💡',
    emojis: [
      '💡', '🔦', '🕯️', '💰', '💳', '📱', '💻', '🖥️', '🖨️', '⌨️',
      '🖱️', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟',
      '📠', '📺', '📻', '🧭', '⏱️', '⏰', '🕰️', '📡', '🔋', '🔌',
      '🗑️', '💊', '🩺', '🩹', '🧬', '🔬', '🔭', '📚', '📖', '📝',
      '✏️', '🖊️', '🖋️', '📌', '📍', '✂️', '📎', '📅', '📈', '📊',
    ],
  },
  {
    label: '記号',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
      '✝️', '☯️', '♾️', '✅', '❎', '⭕', '❌', '❓', '❗', '💯',
      '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔶',
      '🔷', '🔸', '🔹', '🔺', '🔻', '💠', '🔘', '🔲', '🔳', '▪️',
      '⚠️', '🚫', '⛔', '🆗', '🆕', '🆙', '🔜', '➡️', '⬅️', '🔁',
    ],
  },
];

// ─── Shortcode / 日本語キーワード（検索とフッタープレビュー・リアクションのツールチップで使用） ──
const EMOJI_NAMES: Record<string, string> = {
  '👍': '+1|thumbsup|いいね', '👎': '-1|thumbsdown|よくない', '❤️': 'heart|ハート|好き', '😂': 'joy|笑|泣き笑い',
  '🎉': 'tada|おめでとう|祝', '🔥': 'fire|炎|火', '👀': 'eyes|目|見てます', '✅': 'white_check_mark|チェック|完了|済',
  '🙏': 'pray|お願い|感謝|ありがとう', '😊': 'blush|笑顔|にこ', '🤔': 'thinking_face|考え|うーん', '👋': 'wave|手を振る|こんにちは|バイバイ',
  '💯': '100|満点', '🙌': 'raised_hands|やった|ばんざい', '👏': 'clap|拍手', '🙇': 'bow|お辞儀|すみません|ありがとう',
  '😀': 'grinning|にっこり', '😃': 'smiley|笑顔', '😄': 'smile|笑顔', '😁': 'grin|にやり', '😆': 'laughing|笑',
  '😅': 'sweat_smile|苦笑|汗', '🤣': 'rolling_on_the_floor_laughing|爆笑', '😇': 'innocent|天使', '🙂': 'slightly_smiling_face|微笑',
  '🙃': 'upside_down_face|逆さ', '😉': 'wink|ウインク', '😌': 'relieved|ほっ|安心', '😍': 'heart_eyes|ハート目|好き',
  '🥰': 'smiling_face_with_3_hearts|大好き', '😘': 'kissing_heart|キス', '😋': 'yum|おいしい', '😛': 'stuck_out_tongue|べー',
  '😜': 'stuck_out_tongue_winking_eye|ふざけ', '🤪': 'zany_face|ふざけ', '🤓': 'nerd_face|オタク', '😎': 'sunglasses|サングラス|かっこいい',
  '🤩': 'star-struck|キラキラ', '🥳': 'partying_face|パーティー', '😏': 'smirk|にやり', '😒': 'unamused|不満',
  '😞': 'disappointed|がっかり', '😔': 'pensive|しょんぼり', '😟': 'worried|心配', '😕': 'confused|困惑',
  '😣': 'persevere|がまん', '😫': 'tired_face|疲れ', '😩': 'weary|疲れ', '🥺': 'pleading_face|うるうる|お願い',
  '😢': 'cry|泣', '😭': 'sob|号泣', '😤': 'triumph|ふんっ', '😠': 'angry|怒', '😡': 'rage|激怒', '🤯': 'exploding_head|衝撃',
  '😳': 'flushed|赤面', '😱': 'scream|叫び|驚き', '😨': 'fearful|恐怖', '😰': 'cold_sweat|冷や汗', '😥': 'disappointed_relieved|残念',
  '😓': 'sweat|汗', '🤗': 'hugging_face|ハグ', '🤭': 'face_with_hand_over_mouth|くすくす', '🤫': 'shushing_face|しー|内緒',
  '😶': 'no_mouth|無言', '😐': 'neutral_face|無表情', '😑': 'expressionless|無表情', '😬': 'grimacing|気まずい',
  '🙄': 'face_with_rolling_eyes|呆れ', '😮': 'open_mouth|驚き', '😲': 'astonished|びっくり', '🥱': 'yawning_face|あくび|眠い',
  '😴': 'sleeping|寝|眠い', '😪': 'sleepy|眠い', '😵': 'dizzy_face|目が回る', '🤐': 'zipper_mouth_face|黙る',
  '👌': 'ok_hand|オッケー|ok', '✌️': 'v|ピース', '🤞': 'crossed_fingers|幸運', '👉': 'point_right|右', '👈': 'point_left|左',
  '👆': 'point_up_2|上', '👇': 'point_down|下', '☝️': 'point_up|上', '✊': 'fist|グー', '👊': 'facepunch|パンチ',
  '🤝': 'handshake|握手', '💪': 'muscle|力こぶ|がんばる', '✍️': 'writing_hand|書く', '🙆': 'ok_woman|オッケー|まる',
  '🙅': 'no_good|だめ|ばつ', '🤷': 'shrug|さあ', '🤦': 'face_palm|あちゃー', '🙋': 'raising_hand|はい|挙手', '💁': 'information_desk_person|案内',
  '🐶': 'dog|犬', '🐱': 'cat|猫', '🐼': 'panda_face|パンダ', '🐸': 'frog|カエル', '🐵': 'monkey_face|猿', '🙈': 'see_no_evil|見ざる',
  '🙉': 'hear_no_evil|聞かざる', '🙊': 'speak_no_evil|言わざる', '🦄': 'unicorn_face|ユニコーン', '🐝': 'bee|蜂',
  '🌸': 'cherry_blossom|桜', '🌹': 'rose|バラ', '🌻': 'sunflower|ひまわり', '🍀': 'four_leaf_clover|クローバー|幸運',
  '🌈': 'rainbow|虹', '☀️': 'sunny|晴れ|太陽', '⭐': 'star|星', '🌙': 'crescent_moon|月',
  '🍎': 'apple|りんご', '🍕': 'pizza|ピザ', '🍔': 'hamburger|ハンバーガー', '🍣': 'sushi|寿司', '🍜': 'ramen|ラーメン',
  '🍙': 'rice_ball|おにぎり', '🍰': 'cake|ケーキ', '🎂': 'birthday|誕生日', '🍩': 'doughnut|ドーナツ', '🍪': 'cookie|クッキー',
  '☕': 'coffee|コーヒー', '🍵': 'tea|お茶', '🍺': 'beer|ビール', '🍻': 'beers|乾杯',
  '⚽': 'soccer|サッカー', '🏀': 'basketball|バスケ', '⚾': 'baseball|野球', '🎮': 'video_game|ゲーム', '🎲': 'game_die|サイコロ',
  '🎊': 'confetti_ball|くす玉', '🎈': 'balloon|風船', '🎁': 'gift|プレゼント', '🏆': 'trophy|トロフィー|優勝', '🥇': 'first_place_medal|金メダル',
  '🎯': 'dart|的', '🎨': 'art|アート', '🎵': 'musical_note|音楽',
  '💡': 'bulb|アイデア|電球', '💰': 'moneybag|お金', '📱': 'iphone|スマホ', '💻': 'computer|パソコン', '📷': 'camera|カメラ',
  '📞': 'telephone_receiver|電話', '⏰': 'alarm_clock|時計|アラーム', '📚': 'books|本', '📝': 'memo|メモ', '✏️': 'pencil2|鉛筆',
  '📌': 'pushpin|ピン', '📍': 'round_pushpin|ピン', '✂️': 'scissors|はさみ', '📎': 'paperclip|クリップ', '📅': 'date|カレンダー',
  '📈': 'chart_with_upwards_trend|グラフ|上昇', '📊': 'bar_chart|グラフ', '🗑️': 'wastebasket|ゴミ箱',
  '🧡': 'orange_heart|ハート', '💛': 'yellow_heart|ハート', '💚': 'green_heart|ハート', '💙': 'blue_heart|ハート', '💜': 'purple_heart|ハート',
  '🖤': 'black_heart|ハート', '🤍': 'white_heart|ハート', '💔': 'broken_heart|失恋', '💕': 'two_hearts|ハート', '💖': 'sparkling_heart|ハート',
  '❎': 'negative_squared_cross_mark|ばつ', '⭕': 'o|まる', '❌': 'x|ばつ', '❓': 'question|質問|はてな', '❗': 'exclamation|注意|びっくり',
  '🔴': 'red_circle|赤', '🟢': 'large_green_circle|緑', '🔵': 'large_blue_circle|青', '⚠️': 'warning|警告|注意', '🚫': 'no_entry_sign|禁止',
  '🆗': 'ok|オッケー', '🆕': 'new|新しい', '➡️': 'arrow_right|右', '⬅️': 'arrow_left|左', '🔁': 'repeat|繰り返し',
};

/** 絵文字の Slack 風ショートネーム（例: "👍" → ":+1:"）。未登録ならそのまま返す */
export function emojiName(emoji: string): string {
  const entry = EMOJI_NAMES[emoji];
  if (!entry) return emoji;
  return `:${entry.split('|')[0]}:`;
}

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
  style?: React.CSSProperties;
}

const COLS = 9;
const CELL = 32;

export default function EmojiPicker({ onSelect, onClose, style }: EmojiPickerProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const seen = new Set<string>();
    const out: string[] = [];
    EMOJI_CATEGORIES.flatMap((c) => c.emojis).forEach((e) => {
      if (seen.has(e)) return;
      const names = (EMOJI_NAMES[e] ?? '').toLowerCase();
      if (e.includes(q) || names.includes(q)) {
        seen.add(e);
        out.push(e);
      }
    });
    return out;
  }, [search]);

  // Esc で閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const jumpTo = (i: number) => {
    setActiveCategory(i);
    if (search) setSearch('');
    requestAnimationFrame(() => {
      const el = sectionRefs.current[i];
      const sc = scrollRef.current;
      if (el && sc) sc.scrollTop = el.offsetTop; // sc は position:relative なので offsetParent
    });
  };

  const handleScroll = () => {
    const sc = scrollRef.current;
    if (!sc || filtered) return;
    const top = sc.scrollTop + 4;
    let idx = 0;
    sectionRefs.current.forEach((el, i) => { if (el && el.offsetTop <= top) idx = i; });
    if (idx !== activeCategory) setActiveCategory(idx);
  };

  const pick = (emoji: string) => { onSelect(emoji); onClose?.(); };

  const renderCell = (emoji: string, key: string) => (
    <button
      key={key}
      type="button"
      onClick={() => pick(emoji)}
      onMouseEnter={(e) => { setHovered(emoji); e.currentTarget.style.background = 'var(--sk-subtle)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      onFocus={() => setHovered(emoji)}
      aria-label={emojiName(emoji)}
      className="flex items-center justify-center"
      style={{ width: CELL, height: CELL, borderRadius: 6, fontSize: 22, lineHeight: 1 }}
    >
      {emoji}
    </button>
  );

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        width: COLS * CELL + 2 * 12 + 2,
        height: 420,
        background: '#FFFFFF',
        border: '1px solid var(--sk-border)',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.02)',
        ...style,
      }}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label="絵文字ピッカー"
    >
      {/* Search */}
      <div style={{ padding: '12px 12px 8px' }}>
        <div
          className="flex items-center gap-2"
          style={{
            height: 32,
            padding: '0 8px',
            borderRadius: 8,
            border: `1px solid ${focused ? 'var(--sk-blue)' : 'var(--sk-border-strong)'}`,
            boxShadow: focused ? '0 0 0 3px rgba(29,155,209,0.3)' : 'none',
            transition: 'box-shadow 120ms, border-color 120ms',
          }}
        >
          <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--sk-text-2)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <circle cx="11" cy="11" r="6.25" /><path d="m20 20-4.5-4.5" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="絵文字を検索"
            className="flex-1 min-w-0 text-[14px] bg-transparent focus:outline-none"
            style={{ color: 'var(--sk-text)' }}
            autoFocus
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="検索をクリア" style={{ color: 'var(--sk-text-2)' }}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex items-center" style={{ padding: '0 8px', borderBottom: '1px solid var(--sk-border)' }}>
        {EMOJI_CATEGORIES.map((cat, i) => {
          const active = !filtered && activeCategory === i;
          return (
            <button
              key={cat.label}
              type="button"
              onClick={() => jumpTo(i)}
              title={cat.label}
              aria-label={cat.label}
              className="flex-1 flex items-center justify-center"
              style={{
                height: 32,
                fontSize: 16,
                filter: active ? 'none' : 'grayscale(1)',
                opacity: active ? 1 : 0.6,
                boxShadow: active ? 'inset 0 -2px 0 var(--sk-link)' : 'none',
                transition: 'opacity 100ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.opacity = '0.6'; }}
            >
              {cat.icon}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto relative" style={{ padding: '0 12px 8px', scrollbarColor: 'rgba(0,0,0,0.2) transparent' }}>
        {filtered ? (
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-[13px]" style={{ color: 'var(--sk-text-2)' }}>
              <span style={{ fontSize: 28 }}>🔍</span>
              <span className="mt-2">「{search}」に一致する絵文字は見つかりませんでした</span>
            </div>
          ) : (
            <>
              <SectionLabel label="検索結果" />
              <div className="grid" style={{ gridTemplateColumns: `repeat(${COLS}, ${CELL}px)` }}>
                {filtered.map((e, i) => renderCell(e, `s-${i}`))}
              </div>
            </>
          )
        ) : (
          EMOJI_CATEGORIES.map((cat, ci) => (
            <div key={cat.label} ref={(el) => { sectionRefs.current[ci] = el; }}>
              <SectionLabel label={cat.label} />
              <div className="grid" style={{ gridTemplateColumns: `repeat(${COLS}, ${CELL}px)` }}>
                {cat.emojis.map((e, i) => renderCell(e, `${ci}-${i}`))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer preview */}
      <div
        className="flex items-center gap-2 flex-shrink-0"
        style={{ height: 48, padding: '0 12px', borderTop: '1px solid var(--sk-border)', background: '#FFFFFF' }}
      >
        {hovered ? (
          <>
            <span style={{ fontSize: 28, lineHeight: 1 }}>{hovered}</span>
            <span className="text-[15px] font-bold truncate" style={{ color: 'var(--sk-text)' }}>{emojiName(hovered)}</span>
          </>
        ) : (
          <span className="text-[13px]" style={{ color: 'var(--sk-text-2)' }}>絵文字を選んでください</span>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div
      className="sticky top-0 z-10 text-[13px] font-bold"
      style={{ background: 'rgba(255,255,255,0.97)', color: 'var(--sk-text)', padding: '8px 2px 4px' }}
    >
      {label}
    </div>
  );
}
