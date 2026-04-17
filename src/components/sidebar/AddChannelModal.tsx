import { useState, FormEvent, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { createChannel } from '../../services';

interface Props {
  onClose: () => void;
}

export default function AddChannelModal({ onClose }: Props) {
  const { user } = useAppStore((s) => s.auth);
  const addChannel = useAppStore((s) => s.addChannel);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const channelName = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (!channelName) {
      setError('チャンネル名を入力してください');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const channel = await createChannel(channelName, description.trim(), user.uid);
      addChannel(channel);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'チャンネルの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={handleBackdrop}
    >
      <div
        className="w-full max-w-md p-6"
        style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-bold" style={{ color: '#1D1C1D' }}>チャンネルを作成</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded transition-colors"
            style={{ color: '#616061' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F8F8F8'; e.currentTarget.style.color = '#1D1C1D'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#616061'; }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-[13px] mb-5" style={{ color: '#616061' }}>
          チャンネルは特定のトピックに関する会話をまとめる場所です。
        </p>

        {error && (
          <div
            className="mb-4 px-4 py-3 text-[13px]"
            style={{ background: '#FFF0F0', border: '1px solid #F5A5A5', borderRadius: '8px', color: '#C0392B' }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold mb-1.5" style={{ color: '#1D1C1D' }}>
              チャンネル名
            </label>
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[15px]"
                style={{ color: '#616061' }}
              >
                #
              </span>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: プロジェクト-アルファ"
                maxLength={80}
                className="w-full text-[14px] focus:outline-none transition-all"
                style={{ border: '1.5px solid #DDDDDD', borderRadius: '8px', padding: '9px 12px 9px 28px', color: '#1D1C1D' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#1164A3'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(17,100,163,0.15)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#DDDDDD'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
            <p className="text-[12px] mt-1" style={{ color: '#9E9EA6' }}>
              小文字・ハイフン・数字が使えます。スペースは自動でハイフンに変換されます。
            </p>
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-1.5" style={{ color: '#1D1C1D' }}>
              説明 <span className="font-normal" style={{ color: '#9E9EA6' }}>（任意）</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="このチャンネルの目的を説明してください"
              rows={3}
              className="w-full text-[14px] focus:outline-none transition-all resize-none leading-relaxed"
              style={{ border: '1.5px solid #DDDDDD', borderRadius: '8px', padding: '9px 12px', color: '#1D1C1D' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#1164A3'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(17,100,163,0.15)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#DDDDDD'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[14px] font-medium rounded-lg transition-colors"
              style={{ color: '#1D1C1D', border: '1.5px solid #DDDDDD' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F8F8F8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 text-[14px] font-bold text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#1164A3' }}
              onMouseEnter={(e) => { if (!loading && name.trim()) e.currentTarget.style.background = '#0D4F8A'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#1164A3'; }}
            >
              {loading ? '作成中...' : '作成する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
