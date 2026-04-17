# Linter Report — Slack Clone

**Date:** 2026-04-17
**Agent:** Linter (Phase 5 Quality)

---

## 発見したエラー・警告一覧

### TypeScript コンパイルエラー（修正済み）

| # | ファイル | 行 | エラーコード | 内容 |
|---|----------|----|-------------|------|
| 1 | `src/services/firebase.ts` | 15–20 | TS2339 | `Property 'env' does not exist on type 'ImportMeta'` — `vite/client` の型が tsconfig に含まれていなかった |
| 2 | `src/services/firebase.ts` | 44 | TS2353 | `Object literal may only specify known properties, and 'cacheSizeBytes' does not exist in type 'PersistenceSettings'` — Firebase v10 の `enableIndexedDbPersistence` は `cacheSizeBytes` を受け付けない |

### ビルド警告（非クリティカル）

| # | 内容 |
|---|------|
| 1 | `firebase-*.js` チャンクが 554 kB（minified）— Firebase SDK の bundle size は許容範囲。動的 import による code-split を将来的に検討可 |

---

## 実施した修正内容

### 修正 1: `tsconfig.json` — `vite/client` 型の追加

`import.meta.env` を TypeScript に認識させるため、`compilerOptions.types` に `"vite/client"` を追加した。

```diff
// tsconfig.json
 "lib": ["ESNext", "DOM", "DOM.Iterable"],
+"types": ["vite/client"],
```

### 修正 2: `src/services/firebase.ts` — Firebase v10 対応の Persistence API に移行

Firebase v10 では `enableIndexedDbPersistence()` は非推奨となり、`PersistenceSettings` から `cacheSizeBytes` が削除されている。
代わりに `initializeFirestore()` + `persistentLocalCache()` を使用する新 API に全面移行した。

**変更前:**
```ts
import { getFirestore, Firestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';

export const db: Firestore = getFirestore(app);

if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db, { cacheSizeBytes: CACHE_SIZE_UNLIMITED }).catch(...);
}
```

**変更後:**
```ts
import {
  initializeFirestore, getFirestore, Firestore,
  persistentLocalCache, persistentSingleTabManager, CACHE_SIZE_UNLIMITED,
} from 'firebase/firestore';

export const db: Firestore = typeof window !== 'undefined' && getApps().length <= 1
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager({ forceOwnership: false }),
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      }),
    })
  : getFirestore(app);
```

この変更により:
- 非推奨 API の使用をなくした
- `cacheSizeBytes: CACHE_SIZE_UNLIMITED` によるキャッシュ上限なし設定を維持
- `persistentSingleTabManager` によるシングルタブでの IndexedDB 永続化を維持
- SSR/テスト環境での二重初期化を防止

---

## 最終ビルド結果

```
✓ tsc — エラー 0、警告 0
✓ vite build — 成功

dist/index.html                         0.77 kB │ gzip:   0.39 kB
dist/assets/index-*.css                17.66 kB │ gzip:   4.29 kB
dist/assets/vendor-*.js                40.93 kB │ gzip:  12.32 kB
dist/assets/index-*.js                 44.38 kB │ gzip:  13.53 kB
dist/assets/react-vendor-*.js         160.03 kB │ gzip:  52.25 kB
dist/assets/firebase-*.js             554.75 kB │ gzip: 130.65 kB
```

**結果: ビルド成功 (exit 0)**

---

## 推奨事項（任意対応）

1. **Firebase bundle の code-split**: `vite.config.ts` の `build.rollupOptions.output.manualChunks` で Firebase を細分化するか、`firestore`/`auth`/`storage` を動的 import することで初期ロード時間を改善できる。
2. **ESLint の導入**: 現プロジェクトに ESLint 設定が存在しないため、`eslint-plugin-react-hooks` を追加して useEffect 依存配列の自動チェックを導入することを推奨する。
