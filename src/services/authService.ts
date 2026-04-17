import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import { User } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Google ポップアップでサインイン
// ─────────────────────────────────────────────────────────────────────────────
export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider()
  const { user } = await signInWithPopup(auth, provider)
  return upsertUserDocument(user)
}

// ─────────────────────────────────────────────────────────────────────────────
// メール / パスワードでサインイン
// ─────────────────────────────────────────────────────────────────────────────
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  return upsertUserDocument(user)
}

// ─────────────────────────────────────────────────────────────────────────────
// 新規登録 + users ドキュメント作成
// ─────────────────────────────────────────────────────────────────────────────
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<User> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(user, { displayName })
  return upsertUserDocument(user, displayName)
}

// ─────────────────────────────────────────────────────────────────────────────
// サインアウト + オフライン状態に更新
// ─────────────────────────────────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  const uid = auth.currentUser?.uid
  if (uid) {
    await updateDoc(doc(db, 'users', uid), {
      online: false,
      lastSeen: serverTimestamp(),
    })
  }
  await firebaseSignOut(auth)
}

// ─────────────────────────────────────────────────────────────────────────────
// 認証状態の変化を監視し、users ドキュメントを自動作成/更新する
// ─────────────────────────────────────────────────────────────────────────────
export function onAuthStateChange(
  callback: (user: User | null) => void,
): () => void {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      callback(null)
      return
    }
    try {
      const appUser = await upsertUserDocument(firebaseUser)
      callback(appUser)
    } catch (error) {
      console.error('[authService] onAuthStateChange error:', error)
      callback(null)
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 内部ヘルパー: Firebase ユーザーを users/{uid} に upsert して User を返す
// ─────────────────────────────────────────────────────────────────────────────
async function upsertUserDocument(
  firebaseUser: FirebaseUser,
  overrideDisplayName?: string,
): Promise<User> {
  const uid = firebaseUser.uid
  const userRef = doc(db, 'users', uid)
  const snapshot = await getDoc(userRef)

  const displayName =
    overrideDisplayName ??
    firebaseUser.displayName ??
    firebaseUser.email?.split('@')[0] ??
    'Anonymous'

  const photoURL = firebaseUser.photoURL ?? ''
  const email = firebaseUser.email ?? ''

  if (!snapshot.exists()) {
    // 初回: ドキュメントを新規作成
    const newUser: Omit<User, 'id'> = {
      uid,
      displayName,
      photoURL,
      email,
      online: true,
      lastSeen: serverTimestamp() as any,
    }
    await setDoc(userRef, newUser)
  } else {
    // 既存: オンライン状態と lastSeen だけ更新
    await updateDoc(userRef, {
      online: true,
      lastSeen: serverTimestamp(),
    })
  }

  const updated = await getDoc(userRef)
  return { id: uid, ...updated.data() } as unknown as User
}
