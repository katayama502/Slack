import {
  collection,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import { User } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// プロフィール（displayName / photoURL）を更新する
// ─────────────────────────────────────────────────────────────────────────────
export async function updateProfile(
  uid: string,
  data: Partial<Pick<User, 'displayName' | 'photoURL'>>,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// オンライン状態と lastSeen を更新する
// ─────────────────────────────────────────────────────────────────────────────
export async function setOnlineStatus(
  uid: string,
  online: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    online,
    lastSeen: serverTimestamp(),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 全ユーザーをリアルタイムで取得する
// ─────────────────────────────────────────────────────────────────────────────
export function getUsers(
  callback: (users: User[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'users'), orderBy('displayName', 'asc'))
  return onSnapshot(q, (snapshot) => {
    const users: User[] = snapshot.docs.map((d) => ({
      ...(d.data() as User),
      uid: d.id,
    }))
    callback(users)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 単一ユーザーを uid で取得する
// ─────────────────────────────────────────────────────────────────────────────
export async function getUserById(uid: string): Promise<User | null> {
  const snapshot = await getDoc(doc(db, 'users', uid))
  if (!snapshot.exists()) return null
  return { ...(snapshot.data() as User), uid: snapshot.id }
}
