import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../services';
import { useAppStore } from '../store/useAppStore';

export default function LoginPage() {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuthError = useAppStore((s) => s.setAuthError);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate('/workspace');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ログインに失敗しました';
      setError(msg);
      setAuthError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
      navigate('/workspace');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ログインに失敗しました';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sidebar-bg to-purple-900 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <span className="text-sidebar-bg font-bold text-xl">#</span>
          </div>
          <span className="text-white text-3xl font-bold tracking-tight">
            Slack Clone
          </span>
        </div>
        <p className="text-sidebar-text text-sm mt-1">
          チームのコミュニケーションを一箇所に
        </p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-modal w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          ワークスペースにサインイン
        </h1>
        <p className="text-gray-500 text-sm text-center mb-8">
          アカウントを使ってサインインしてください
        </p>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-lg px-4 py-3 text-gray-700 font-semibold text-base hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Googleでサインイン
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <hr className="flex-1 border-gray-200" />
          <span className="text-gray-400 text-xs font-medium">または</span>
          <hr className="flex-1 border-gray-200" />
        </div>

        {/* Email toggle */}
        {!showEmailForm ? (
          <button
            onClick={() => setShowEmailForm(true)}
            className="w-full text-center text-accent hover:underline text-sm font-medium py-2"
          >
            メールアドレスでサインイン
          </button>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  表示名
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required={isSignUp}
                  placeholder="山田 太郎"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '処理中...' : isSignUp ? 'アカウント作成' : 'サインイン'}
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-center text-accent hover:underline text-sm"
            >
              {isSignUp
                ? 'すでにアカウントをお持ちの方はこちら'
                : 'アカウントを作成する'}
            </button>
          </form>
        )}
      </div>

      <p className="text-sidebar-text text-xs mt-6 text-center max-w-sm">
        サインインすることで、
        <a href="#" className="underline">利用規約</a> および
        <a href="#" className="underline">プライバシーポリシー</a>
        に同意したものとみなします。
      </p>
    </div>
  );
}
