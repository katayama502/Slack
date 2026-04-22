import { useState, useMemo } from 'react';

const EMOJI_CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: 'よく使う',
    icon: '⏱️',
    emojis: ['👍', '❤️', '😂', '🎉', '🔥', '👀', '✅', '🙏', '😊', '🤔', '👋', '💯'],
  },
  {
    label: '顔文字',
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
    ],
  },
  {
    label: 'ジェスチャー',
    icon: '👋',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
      '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍',
      '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
      '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃',
    ],
  },
  {
    label: '動物',
    icon: '🐶',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
      '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧',
      '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄',
      '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂',
    ],
  },
  {
    label: '食べ物',
    icon: '🍎',
    emojis: [
      '🍎', '🍊', '🍋', '🍇', '🍓', '🫐', '🍈', '🍑', '🍒', '🥭',
      '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️',
      '🫑', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🧀',
      '🍕', '🍔', '🍟', '🌭', '🌮', '🌯', '🫔', '🥗', '🍜', '🍣',
      '🍱', '🍛', '🍚', '🍙', '🍘', '🍥', '🥮', '🍡', '🧁', '🍰',
      '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '☕', '🍵',
    ],
  },
  {
    label: '活動',
    icon: '⚽',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
      '🏓', '🏸', '🏒', '🥍', '🏑', '🏏', '🥊', '🥋', '🎽', '🛹',
      '🛷', '⛸️', '🏂', '⛷️', '🎿', '🏋️', '🤸', '⛹️', '🤺', '🏊',
      '🚴', '🧘', '🏌️', '🏇', '🧗', '🤾', '⛳', '🎣', '🎮', '🎲',
    ],
  },
  {
    label: 'オブジェクト',
    icon: '💡',
    emojis: [
      '💡', '🔦', '🕯️', '💰', '💳', '📱', '💻', '🖥️', '🖨️', '⌨️',
      '🖱️', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟',
      '📠', '📺', '📻', '🧭', '⏱️', '⏰', '🕰️', '📡', '🔋', '🪫',
      '🔌', '💡', '🔦', '🕯️', '🗑️', '💊', '🩺', '🩹', '🧬', '🔬',
      '🔭', '📚', '📖', '📝', '✏️', '🖊️', '🖋️', '📌', '📍', '✂️',
    ],
  },
  {
    label: 'シンボル',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
      '✝️', '☯️', '♾️', '✅', '❎', '⭕', '❌', '❓', '❗', '💯',
      '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔶',
      '🔷', '🔸', '🔹', '🔺', '🔻', '💠', '🔘', '🔲', '🔳', '▪️',
    ],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
  style?: React.CSSProperties;
}

export default function EmojiPicker({ onSelect, onClose, style }: EmojiPickerProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((e) =>
      e.includes(q)
    );
  }, [search]);

  const displayEmojis = filtered ?? EMOJI_CATEGORIES[activeCategory].emojis;

  return (
    <div
      className="flex flex-col rounded-lg overflow-hidden"
      style={{
        width: 320,
        maxHeight: 380,
        background: '#FFFFFF',
        border: '1px solid #DDDDDD',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        ...style,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid #EEEEEE' }}>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ background: '#F8F8F8', border: '1px solid #EEEEEE' }}>
          <svg className="w-4 h-4 text-[#616061] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="絵文字を検索..."
            className="flex-1 text-[13px] bg-transparent focus:outline-none"
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-[#616061] hover:text-[#1D1C1D]">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="flex overflow-x-auto px-1 py-1" style={{ borderBottom: '1px solid #EEEEEE', scrollbarWidth: 'none' }}>
          {EMOJI_CATEGORIES.map((cat, i) => (
            <button
              key={cat.label}
              onClick={() => setActiveCategory(i)}
              title={cat.label}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded text-[16px] transition-colors"
              style={{
                background: activeCategory === i ? '#E8F5FA' : 'transparent',
                border: activeCategory === i ? '1px solid #1264A3' : '1px solid transparent',
              }}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Category label */}
      {!search && (
        <div className="px-3 py-1">
          <p className="text-[11px] font-semibold text-[#616061] uppercase tracking-wide">
            {EMOJI_CATEGORIES[activeCategory].label}
          </p>
        </div>
      )}

      {/* Emoji grid */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {filtered && filtered.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-[13px] text-[#616061]">
            絵文字が見つかりません
          </div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}>
            {displayEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { onSelect(emoji); onClose?.(); }}
                className="w-9 h-9 flex items-center justify-center rounded text-[20px] hover:bg-[#F8F8F8] transition-colors"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
