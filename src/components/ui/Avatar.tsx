// ─────────────────────────────────────────────────────────────────────────────
// Slack 風アバター（角丸スクエア + 任意のプレゼンスドット）
// ─────────────────────────────────────────────────────────────────────────────

// 名前から安定した背景色を選ぶ（写真なしユーザー用）
const PALETTE = ['#1164A3', '#2BAC76', '#E01E5A', '#ECB22E', '#4A154B', '#36C5F0', '#E8912D', '#0B4C8C'];
function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export interface AvatarProps {
  name: string;
  photoURL?: string | null;
  /** px。Slack の標準: メッセージ 36 / サイドバー 20 / DM 一覧 36 / プロフィール 72+ */
  size?: number;
  /** 角丸。省略時は size に応じて自動（Slack 新UIは約 22%） */
  radius?: number;
  /** undefined ならドット非表示 */
  online?: boolean;
  /** ドットの縁取り色（背景に合わせる）。サイドバー上なら 'transparent' 推奨 */
  ringColor?: string;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  title?: string;
}

export default function Avatar({
  name,
  photoURL,
  size = 36,
  radius,
  online,
  ringColor = '#FFFFFF',
  className = '',
  onClick,
  title,
}: AvatarProps) {
  const r = radius ?? Math.max(4, Math.round(size * 0.22));
  // 先頭の記号（[ 【 ( など）を飛ばして最初の文字を頭文字にする
  const initial = (Array.from((name || '').replace(/^[^\p{L}\p{N}]+/u, ''))[0] ?? '?').toUpperCase();
  const dot = Math.max(8, Math.round(size * 0.3));

  return (
    <span
      className={`relative inline-flex flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      title={title}
    >
      {photoURL ? (
        <img
          src={photoURL}
          alt={name}
          className="w-full h-full object-cover block"
          style={{ borderRadius: r }}
          referrerPolicy="no-referrer"
          draggable={false}
        />
      ) : (
        <span
          className="w-full h-full flex items-center justify-center text-white font-bold select-none"
          style={{ borderRadius: r, background: colorFor(name || '?'), fontSize: Math.max(9, Math.round(size * 0.42)) }}
        >
          {initial}
        </span>
      )}
      {online !== undefined && (
        <span
          className="absolute rounded-full"
          style={{
            width: dot,
            height: dot,
            right: -Math.round(dot * 0.3),
            bottom: -Math.round(dot * 0.3),
            background: online ? 'var(--sk-online)' : 'transparent',
            border: online ? `2px solid ${ringColor}` : `2px solid ${ringColor === 'transparent' ? 'rgba(255,255,255,0.6)' : '#9E9E9E'}`,
            boxShadow: online ? 'none' : `inset 0 0 0 ${Math.max(1, Math.round(dot * 0.15))}px ${ringColor === 'transparent' ? 'transparent' : ringColor}`,
          }}
        />
      )}
    </span>
  );
}
