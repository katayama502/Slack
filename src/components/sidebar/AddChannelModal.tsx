import { useState, FormEvent, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import { createChannel } from '../../services';
import { HashIcon, LockIcon, CloseIcon } from '../ui/icons';

interface Props {
  onClose: () => void;
}

const MAX_LEN = 80;

/** Slack と同じ正規化: 小文字化・空白→ハイフン・使用不可記号を除去 */
function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[.,/\\#!$%^&*;:{}=`~()'"?<>[\]|@+]/g, '')
    .slice(0, MAX_LEN);
}

export default function AddChannelModal({ onClose }: Props) {
  const { user } = useAppStore((s) => s.auth);
  const channels = useAppStore((s) => s.channels);
  const addChannel = useAppStore((s) => s.addChannel);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const channelName = normalizeName(name.trim());
  const remaining = MAX_LEN - channelName.length;
  const duplicate = channels.some((c) => c.name === channelName);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!channelName) {
      setError('チャンネル名を入力してください');
      return;
    }
    if (duplicate) {
      setError('この名前のチャンネルはすでに存在します');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const channel = await createChannel(channelName, description.trim().slice(0, 250), user.uid, isPrivate);
      addChannel(channel);
      setActiveChannel(channel.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'チャンネルの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || !channelName || duplicate;
  const Icon = isPrivate ? LockIcon : HashIcon;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-channel-title"
        className="w-full max-w-[520px] rounded-lg overflow-hidden"
        style={{ background: '#FFFFFF', boxShadow: '0 18px 48px rgba(0,0,0,0.3)', animation: 'popIn 150ms ease' }}
      >
        <div className="flex items-center justify-between px-7 pt-6 pb-2">
          <h2 id="add-channel-title" className="text-[22px] text-[var(--sk-text)]" style={{ fontWeight: 900 }}>チャンネルを作成する</h2>
          <button type="button" onClick={onClose} aria-label="閉じる" className="w-9 h-9 -mr-2 flex items-center justify-center rounded-md text-[var(--sk-text-2)] hover:bg-[var(--sk-subtle)]">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-7 pb-6">
          {error && (
            <div role="alert" className="mb-4 px-3 py-2 text-[14px] rounded-md" style={{ background: 'rgba(224,30,90,0.08)', color: 'var(--sk-red)', border: '1px solid rgba(224,30,90,0.3)' }}>
              {error}
            </div>
          )}

          <label htmlFor="channel-name" className="block text-[15px] font-bold text-[var(--sk-text)] mb-2">名前</label>
          <div
            className="flex items-center gap-2 px-3 rounded-lg focus-within:shadow-[0_0_0_1px_var(--sk-blue),0_0_0_5px_rgba(29,155,209,0.3)]"
            style={{ height: 44, border: '1px solid var(--sk-border-strong)' }}
          >
            <Icon className="w-4 h-4 text-[var(--sk-text-2)] flex-shrink-0" />
            <input
              id="channel-name"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              placeholder="例: プラン-予算"
              maxLength={MAX_LEN + 20}
              className="flex-1 min-w-0 text-[15px] text-[var(--sk-text)] focus:outline-none"
              aria-describedby="channel-name-help"
            />
            <span className="text-[13px] text-[var(--sk-text-3)] flex-shrink-0">{remaining}</span>
          </div>
          <p id="channel-name-help" className="text-[13px] mt-1.5 text-[var(--sk-text-2)]">
            {channelName
              ? <>作成されるチャンネル: <span className="font-bold text-[var(--sk-text)]">{isPrivate ? '🔒' : '#'}{channelName}</span>{duplicate && <span className="text-[var(--sk-red)]">（使用済み）</span>}</>
              : 'チャンネル名は小文字で入力し、スペースや句読点の代わりにハイフンを使ってください。'}
          </p>

          <label htmlFor="channel-desc" className="block text-[15px] font-bold text-[var(--sk-text)] mt-5 mb-2">
            説明 <span className="font-normal text-[var(--sk-text-2)]">（任意）</span>
          </label>
          <textarea
            id="channel-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="このチャンネルのトピック"
            rows={2}
            maxLength={250}
            className="w-full px-3 py-2 text-[15px] text-[var(--sk-text)] rounded-lg resize-none focus:outline-none focus:shadow-[0_0_0_1px_var(--sk-blue),0_0_0_5px_rgba(29,155,209,0.3)]"
            style={{ border: '1px solid var(--sk-border-strong)' }}
          />

          <fieldset className="mt-5">
            <legend className="text-[15px] font-bold text-[var(--sk-text)] mb-2">公開範囲</legend>
            <label className="flex items-start gap-2.5 py-1.5 cursor-pointer">
              <input type="radio" name="visibility" checked={!isPrivate} onChange={() => setIsPrivate(false)} className="mt-1 accent-[#1264A3]" />
              <span className="text-[15px] text-[var(--sk-text)]">
                パブリック <span className="text-[var(--sk-text-2)]">— Creatte の誰でも</span>
              </span>
            </label>
            <label className="flex items-start gap-2.5 py-1.5 cursor-pointer">
              <input type="radio" name="visibility" checked={isPrivate} onChange={() => setIsPrivate(true)} className="mt-1 accent-[#1264A3]" />
              <span className="text-[15px] text-[var(--sk-text)]">
                プライベート <span className="text-[var(--sk-text-2)]">— 特定のメンバーのみ</span>
              </span>
            </label>
          </fieldset>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 rounded-lg text-[15px] font-bold text-[var(--sk-text)] hover:bg-[var(--sk-hover)]"
              style={{ height: 36, border: '1px solid var(--sk-border-strong)' }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={disabled}
              className="px-4 rounded-lg text-[15px] font-bold transition-colors disabled:cursor-not-allowed"
              style={{
                height: 36,
                background: disabled ? 'var(--sk-subtle)' : 'var(--sk-green)',
                color: disabled ? 'var(--sk-text-3)' : '#FFFFFF',
              }}
            >
              {loading ? '作成中...' : '作成する'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
