import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../services';
import { useAppStore } from '../store/useAppStore';

function getAuthErrorMessage(err: unknown): string {
  const code = (err as any)?.code as string | undefined;
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'ポップアップが閉じられました。もう一度お試しください。';
    case 'auth/popup-blocked':
      return 'ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。';
    case 'auth/unauthorized-domain':
      return 'このドメインはFirebaseに認証されていません。管理者にお問い合わせください。';
    case 'auth/user-disabled':
      return 'このアカウントは無効化されています。';
    case 'auth/account-exists-with-different-credential':
      return 'このメールアドレスは別の方法で登録されています。';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'メールアドレスまたはパスワードが正しくありません。';
    case 'auth/email-already-in-use':
      return 'このメールアドレスはすでに使用されています。';
    case 'auth/weak-password':
      return 'パスワードは6文字以上で入力してください。';
    case 'auth/invalid-email':
      return 'メールアドレスの形式が正しくありません。';
    case 'auth/network-request-failed':
      return 'ネットワークエラーが発生しました。接続を確認してください。';
    case 'auth/too-many-requests':
      return 'しばらく時間をおいてから再度お試しください。';
    default:
      return err instanceof Error ? err.message : 'ログインに失敗しました。';
  }
}

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
      // リダイレクト方式の場合はページが遷移するためここには到達しない
      // ポップアップ成功時はonAuthStateChangedがApp.tsxでuserをセットし自動でworkspaceへ
      navigate('/workspace');
    } catch (err) {
      const msg = getAuthErrorMessage(err);
      setError(msg);
      setAuthError(msg);
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
      const msg = getAuthErrorMessage(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #3F0E40 0%, #1164A3 100%)' }}
    >
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div
            className="w-12 h-12 flex items-center justify-center text-white font-bold text-xl"
            style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '14px', border: '1.5px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)' }}
          >
            Cr
          </div>
          <span className="text-white text-[32px] font-bold tracking-tight">Creatte</span>
        </div>
        <p className="text-white/60 text-[14px]">チームのコミュニケーションを一箇所に</p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-[400px] p-8"
        style={{ background: '#FFFFFF', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
      >
        <h1 className="text-[22px] font-bold text-[#1D1C1D] text-center mb-1">
          {isSignUp && showEmailForm ? 'アカウントを作成' : 'ワークスペースにサインイン'}
        </h1>
        <p className="text-[#616061] text-[13px] text-center mb-7">
          {isSignUp && showEmailForm ? '情報を入力してください' : 'アカウントを選択してください'}
        </p>

        {error && (
          <div
            className="mb-5 px-4 py-3 text-[13px]"
            style={{ background: '#FFF0F0', border: '1px solid #F5A5A5', borderRadius: '8px', color: '#C0392B' }}
          >
            {error}
          </div>
        )}

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 font-semibold text-[14px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            border: '1.5px solid #DDDDDD',
            borderRadius: '8px',
            padding: '11px 16px',
            color: '#1D1C1D',
            background: '#FFFFFF',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#F8F8F8'; e.currentTarget.style.borderColor = '#BBBBBB'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#DDDDDD'; }}
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Googleでサインイン
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <hr className="flex-1" style={{ borderColor: '#EEEEEE' }} />
          <span className="text-[#9E9EA6] text-[12px] font-medium">または</span>
          <hr className="flex-1" style={{ borderColor: '#EEEEEE' }} />
        </div>

        {/* Email section */}
        {!showEmailForm ? (
          <button
            onClick={() => setShowEmailForm(true)}
            className="w-full text-center text-[14px] font-semibold py-2 transition-colors"
            style={{ color: '#1164A3' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#0D4F8A')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#1164A3')}
          >
            メールアドレスでサインイン
          </button>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-[13px] font-semibold text-[#1D1C1D] mb-1.5">表示名</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required={isSignUp}
                  placeholder="山田 太郎"
                  className="w-full text-[14px] text-[#1D1C1D] focus:outline-none transition-all"
                  style={{ border: '1.5px solid #DDDDDD', borderRadius: '8px', padding: '9px 12px' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#1164A3'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(17,100,163,0.15)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#DDDDDD'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            )}
            <div>
              <label className="block text-[13px] font-semibold text-[#1D1C1D] mb-1.5">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full text-[14px] text-[#1D1C1D] focus:outline-none transition-all"
                style={{ border: '1.5px solid #DDDDDD', borderRadius: '8px', padding: '9px 12px' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#1164A3'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(17,100,163,0.15)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#DDDDDD'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1D1C1D] mb-1.5">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full text-[14px] text-[#1D1C1D] focus:outline-none transition-all"
                style={{ border: '1.5px solid #DDDDDD', borderRadius: '8px', padding: '9px 12px' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#1164A3'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(17,100,163,0.15)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#DDDDDD'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full font-bold text-[14px] text-white py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#007A5A', borderRadius: '8px' }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#006048'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#007A5A'; }}
            >
              {loading ? '処理中...' : isSignUp ? 'アカウントを作成' : 'サインイン'}
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-center text-[13px] transition-colors"
              style={{ color: '#1164A3' }}
            >
              {isSignUp ? 'すでにアカウントをお持ちの方はこちら' : 'アカウントを作成する'}
            </button>
          </form>
        )}
      </div>

      <p className="text-white/40 text-[12px] mt-6 text-center max-w-sm leading-relaxed">
        サインインすることで<a href="#" className="underline opacity-70 hover:opacity-100">利用規約</a>および<a href="#" className="underline opacity-70 hover:opacity-100">プライバシーポリシー</a>に同意したものとみなします
      </p>
    </div>
  );
}
