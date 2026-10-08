// ─────────────────────────────────────────────────────────────────────────────
// Slack 風プロフィールカード（アバター / 名前クリックで表示するポップオーバー）
//   <UserProfileCard user={u} anchor={rect} onClose={...} onMessage={...} isSelf={...} />
// - 幅 300px・大きな写真・名前 18px/900・ステータス・在席状態・現地時間
// - 「メッセージ」「ハドル」ボタン（ハドルは未対応 toast）
// - アンカーの右（入らなければ左→下）に出し、ビューポート内にクランプ
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { format } from 'date-fns';
import type { User } from '../../types';
import Avatar from '../ui/Avatar';
import { DMIcon, HeadphonesIcon, ClockIcon } from '../ui/icons';
import { toast } from '../ui/Toast';

export interface UserProfileCardProps {
  user: User;
  anchor: DOMRect;
  onClose: () => void;
  /** 「メッセージ」ボタン押下（DM を開く）。省略時はボタン非表示 */
  onMessage?: () => void;
  /** 自分自身のカードか（名前の横に（自分）を付け、ボタンを出さない） */
  isSelf?: boolean;
}

const CARD_W = 300;

export default function UserProfileCard({ user, anchor, onClose, onMessage, isSelf }: UserProfileCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: -9999, top: -9999 });
  const [now, setNow] = useState(() => new Date());

  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 360;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = anchor.right + 8;
    let top = anchor.top;
    if (left + CARD_W > vw - 8) {
      // 右に入らない → 左、それも駄目なら下
      const leftSide = anchor.left - CARD_W - 8;
      if (leftSide >= 8) left = leftSide;
      else { left = Math.min(Math.max(8, anchor.left), vw - CARD_W - 8); top = anchor.bottom + 8; }
    }
    if (top + h > vh - 8) top = Math.max(8, vh - h - 8);
    setPos({ left, top });
  }, [anchor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => { window.removeEventListener('keydown', onKey); window.clearInterval(t); };
  }, [onClose]);

  const btnStyle: React.CSSProperties = {
    height: 32,
    borderRadius: 8,
    border: '1px solid var(--sk-border-strong)',
    background: '#FFFFFF',
    color: 'var(--sk-text)',
    fontSize: 14,
    fontWeight: 700,
  };

  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0" style={{ zIndex: 900 }} onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-label={`${user.displayName} のプロフィール`}
        className="fixed overflow-hidden"
        style={{
          ...pos,
          width: CARD_W,
          zIndex: 901,
          background: '#FFFFFF',
          border: '1px solid var(--sk-border)',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.02)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 大きな写真（正方形・全幅） */}
        <div style={{ width: CARD_W, height: 220, background: 'var(--sk-hover)' }} className="flex items-center justify-center overflow-hidden">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              draggable={false}
            />
          ) : (
            <Avatar name={user.displayName} size={120} radius={16} />
          )}
        </div>

        <div style={{ padding: '16px 16px 16px' }}>
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="text-[18px] font-black break-all" style={{ color: 'var(--sk-text)', lineHeight: '24px' }}>
              {user.displayName}
            </span>
            {isSelf && <span className="text-[15px]" style={{ color: 'var(--sk-text-2)' }}>（自分）</span>}
          </div>

          {user.status && (user.status.emoji || user.status.text) && (
            <div className="flex items-center gap-1.5 mt-1 text-[15px]" style={{ color: 'var(--sk-text)' }}>
              {user.status.emoji && <span style={{ fontSize: 16 }}>{user.status.emoji}</span>}
              <span className="truncate">{user.status.text}</span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2 text-[14px]" style={{ color: 'var(--sk-text)' }}>
            <span
              aria-hidden="true"
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: user.online ? 'var(--sk-online)' : 'transparent',
                boxShadow: user.online ? 'none' : 'inset 0 0 0 1.5px var(--sk-text-2)',
                flexShrink: 0,
              }}
            />
            {user.online ? 'アクティブ' : '離席中'}
          </div>

          <div className="flex items-center gap-2 mt-1 text-[14px]" style={{ color: 'var(--sk-text-2)' }}>
            <ClockIcon className="w-[14px] h-[14px] flex-shrink-0" />
            現地時間 {format(now, 'HH:mm')}
          </div>

          {!isSelf && (
            <div className="flex gap-2 mt-4">
              {onMessage && (
                <button
                  type="button"
                  className="flex-1 flex items-center justify-center gap-1.5"
                  style={btnStyle}
                  onClick={() => { onMessage(); }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sk-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                >
                  <DMIcon className="w-4 h-4" /> メッセージ
                </button>
              )}
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-1.5"
                style={btnStyle}
                onClick={() => toast.info('ハドルはこのバージョンでは未対応です')}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sk-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
              >
                <HeadphonesIcon className="w-4 h-4" /> ハドル
              </button>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
