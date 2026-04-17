import {
  collection,
  doc,
  addDoc,
  updateDoc,
  increment,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import { Thread, User } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// スレッド返信を送信し、親メッセージの threadCount をインクリメントする
// ─────────────────────────────────────────────────────────────────────────────
export async function sendThread(
  channelId: string,
  messageId: string,
  text: string,
  user: User,
): Promise<Thread> {
  const threadsRef = collection(
    db,
    'channels',
    channelId,
    'messages',
    messageId,
    'threads',
  )

  const data = {
    text,
    uid: user.uid,
    displayName: user.displayName,
    photoURL: user.photoURL ?? '',
    createdAt: serverTimestamp(),
  }

  const docRef = await addDoc(threadsRef, data)

  // 親メッセージの threadCount をインクリメント
  await updateDoc(doc(db, 'channels', channelId, 'messages', messageId), {
    threadCount: increment(1),
  })

  return { id: docRef.id, ...data } as unknown as Thread
}

// ─────────────────────────────────────────────────────────────────────────────
// スレッド一覧をリアルタイムで取得する
// ─────────────────────────────────────────────────────────────────────────────
export function getThreads(
  channelId: string,
  messageId: string,
  callback: (threads: Thread[]) => void,
): Unsubscribe {
  const q = query(
    collection(
      db,
      'channels',
      channelId,
      'messages',
      messageId,
      'threads',
    ),
    orderBy('createdAt', 'asc'),
  )
  return onSnapshot(q, (snapshot) => {
    const threads: Thread[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Thread, 'id'>),
    }))
    callback(threads)
  })
}
