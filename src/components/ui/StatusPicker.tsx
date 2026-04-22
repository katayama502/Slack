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
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 rounded-lg overflow-hidden"
        style={{
          top: Math.min(top, window.innerHeight - 400),
          left,
          width: 300,
          background: '#FFFFFF',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          border: '1px solid #E8E8E8',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3" style={{ borderBottom: '1px solid #EEEEEE' }}>
          <p className="text-[14px] font-bold text-[#1D1C1D]">ステータスを設定</p>
        </div>

        {/* Custom input */}
        <div className="px-3 py-3">
          <div
            className="flex items-center gap-2 px-2 py-2 rounded"
            style={{ border: '1px solid #DDDDDD' }}
          >
            <button
              className="text-[20px] w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 flex-shrink-0"
              title="絵文字"
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
          <p className="text-[11px] font-semibold text-[#616061] mb-1.5 uppercase tracking-wide">よく使うステータス</p>
          <div className="flex flex-col gap-0.5">
            {PRESETS.map((p) => (
              <button
                key={p.text}
                onClick={() => handlePreset(p)}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-[#F8F8F8] transition-colors text-left"
              >
                <span className="text-[16px]">{p.emoji}</span>
                <span className="text-[13px] text-[#1D1C1D]">{p.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex items-center justify-between px-3 py-2.5"
          style={{ borderTop: '1px solid #EEEEEE' }}
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
              className="text-[12px] text-[#E01E5A] hover:underline"
            >
              クリア
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-[13px] text-[#1D1C1D] rounded border border-[#DDDDDD] hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-[13px] text-white rounded font-medium"
              style={{ background: '#007A5A' }}
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
