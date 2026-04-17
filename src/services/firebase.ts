import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  persistentLocalCache,
  persistentSingleTabManager,
  CACHE_SIZE_UNLIMITED,
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// ─────────────────────────────────────────────────────────────────────────────
// Firebase 設定 (環境変数 VITE_FIREBASE_* から読み込み)
// ─────────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// ─────────────────────────────────────────────────────────────────────────────
// 二重初期化防止: すでに初期化済みなら既存のインスタンスを使用する
// ─────────────────────────────────────────────────────────────────────────────
const app: FirebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

// ─────────────────────────────────────────────────────────────────────────────
// Firebase サービスの初期化
// ─────────────────────────────────────────────────────────────────────────────
export const auth: Auth = getAuth(app);

// ─────────────────────────────────────────────────────────────────────────────
// Firestore オフラインキャッシュ (IndexedDB) の有効化
// Firebase v10 では initializeFirestore + persistentLocalCache を使用する
// SSR / テスト環境ではスキップする
// ─────────────────────────────────────────────────────────────────────────────
export const db: Firestore = typeof window !== 'undefined' && getApps().length <= 1
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager({ forceOwnership: false }),
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      }),
    })
  : getFirestore(app);

export const storage: FirebaseStorage = getStorage(app);

export default app;
