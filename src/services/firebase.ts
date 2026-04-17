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
  apiKey:            "AIzaSyDbekfSWP6gVnGIxZp2Cr26PsRz2qveXAY",
  authDomain:        "grobes-app.firebaseapp.com",
  projectId:         "grobes-app",
  storageBucket:     "grobes-app.firebasestorage.app",
  messagingSenderId: "980585133032",
  appId:             "1:980585133032:web:72a770dda1f33358f1aa5d",
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
