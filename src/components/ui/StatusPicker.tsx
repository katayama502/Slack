import { useState } from 'react';
import ReactDOM from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import { setUserStatus } from '../../services';
import { toast } from './Toast';
import type { UserStatus } from '../../types';

const PRESETS: { emoji: string; text: string }[] = [
  { emoji: '🎯', text: '集中中' },
  { emoji: '🏠', text: 'リモートワーク中' },
  { emoji: '🚌', text: '移動中' },
  { emoji: '🤒', text: '体調不良のためお休みします' },
  { emoji: '🌴', text: '休暇中' },
  { emoji: '📵', text: '通知オフ' },
  { emoji: '📅', text: '会議中' },
  { emoji: '🍱', text: '昼食中' },
];

export function StatusPicker({
  anchor,
  onClose,
  currentStatus,
}: {
  anchor: DOMRect;
  onClose: () => void;
  currentStatus?: UserStatus | null;
}) {
  const { user } = useAppStore((s) => s.auth);
  const users = useAppStore((s) => s.users);
  const setUsers = useAppStore((s) => s.setUsers);

  const [emoji, setEmoji] = useState(currentStatus?.emoji ?? '');
  const [text, setText] = useState(currentStatus?.text ?? '');
  const [saving, setSaving] = useState(false);

  const left = Math.min(anchor.left, window.innerWidth - 300);
  const top = anchor.bottom + 8;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const status: UserStatus | null = text.trim() ? { emoji: emoji || '💬', text: text.trim() } : null;
      await setUserStatus(user.uid, status);
      // Update local store
      setUsers(users.map((u) => u.uid === user.uid ? { ...u, status: status ?? undefined } : u));
      toast.success(status ? 'ステータスを設定しました' : 'ステータスをクリアしました');
      onClose();
    } catch {
      toast.error('ステータスの設定に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handlePreset = (preset: { emoji: string; text: string }) => {
    setEmoji(preset.emoji);
    setText(preset.text);
  };

  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 z-[64]" onClick={onClose} />
      <div
        className="fixed z-[65] rounded-lg overflow-hidden"
        style={{
          top: Math.min(top, window.innerHeight - 400),
          left,
          width: 300,
          background: '#FFFFFF',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12), 0 18px 48px rgba(0,0,0,0.12)',
          border: '1px solid var(--sk-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--sk-border)' }}>
          <p className="text-[18px] text-[var(--sk-text)]" style={{ fontWeight: 900 }}>ステータスを設定する</p>
        </div>

        {/* Custom input */}
        <div className="px-3 py-3">
          <div
            className="flex items-center gap-2 px-2 py-2 rounded"
            style={{ border: '1px solid var(--sk-border-strong)', borderRadius: 8 }}
          >
            <button
              className="text-[20px] w-8 h-8 flex items-center justify-center rounded flex-shrink-0"
              title="絵文字"
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F0F0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {emoji || '😊'}
            </button>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="ステータスを入力..."
              className="flex-1 text-[13px] focus:outline-none"
              maxLength={100}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
          </div>
        </div>

        {/* Presets */}
        <div className="px-3 pb-2">
          <p className="text-[13px] font-bold text-[var(--sk-text-2)] mb-1.5">おすすめ</p>
          <div className="flex flex-col gap-0.5">
            {PRESETS.map((p) => (
              <button
                key={p.text}
                onClick={() => handlePreset(p)}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded text-left"
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(29,28,29,0.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span className="text-[16px]">{p.emoji}</span>
                <span className="text-[15px] text-[var(--sk-text)]">{p.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex items-center justify-between px-3 py-2.5"
          style={{ borderTop: '1px solid var(--sk-border)' }}
        >
          {currentStatus && (
            <button
              onClick={async () => {
                if (!user) return;
                await setUserStatus(user.uid, null);
                setUsers(users.map((u) => u.uid === user.uid ? { ...u, status: undefined } : u));
                toast.success('ステータスをクリアしました');
                onClose();
              }}
              className="text-[12px] text-[var(--sk-red)] hover:underline"
            >
              クリア
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-[13px] text-[var(--sk-text)] rounded border border-[#DDDDDD]"
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F0F0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-[13px] text-white rounded font-medium"
              style={{ background: 'var(--sk-green)' }}
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
