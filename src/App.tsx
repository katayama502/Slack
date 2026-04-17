import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { subscribeToAuthState } from './services';
import LoginPage from './pages/LoginPage';
import WorkspacePage from './pages/WorkspacePage';

// ─────────────────────────────────────────────────────────────────────────────
// PrivateRoute: 認証済みユーザーのみアクセス可
// ─────────────────────────────────────────────────────────────────────────────
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAppStore((s) => s.auth);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-sidebar-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
          <span className="text-white text-sm">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const setUser = useAppStore((s) => s.setUser);
  const setAuthLoading = useAppStore((s) => s.setAuthLoading);
  const { user, loading } = useAppStore((s) => s.auth);

  useEffect(() => {
    setAuthLoading(true);
    const unsubscribe = subscribeToAuthState((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, [setUser, setAuthLoading]);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            loading ? (
              <div className="flex h-screen items-center justify-center bg-sidebar-bg">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
              </div>
            ) : user ? (
              <Navigate to="/workspace" replace />
            ) : (
              <LoginPage />
            )
          }
        />
        <Route
          path="/workspace"
          element={
            <PrivateRoute>
              <WorkspacePage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
