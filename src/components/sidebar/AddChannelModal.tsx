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

  // Backdrop click to close
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
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-xl shadow-modal w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900">チャンネルを作成</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <p className="text-gray-500 text-sm mb-5">
          チャンネルは特定のトピックに関する会話をまとめる場所です。
        </p>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              チャンネル名
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                #
              </span>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: プロジェクト-アルファ"
                maxLength={80}
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              小文字・ハイフン・数字が使えます。スペースは自動でハイフンに変換されます。
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              説明{' '}
              <span className="text-gray-400 font-normal">（任意）</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="このチャンネルの目的を説明してください"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '作成中...' : '作成する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
