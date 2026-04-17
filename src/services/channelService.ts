import {
  collection,
  doc,
  addDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import { Channel } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// チャンネルを新規作成する
// ─────────────────────────────────────────────────────────────────────────────
export async function createChannel(
  name: string,
  description: string,
  uid: string,
): Promise<Channel> {
  const channelsRef = collection(db, 'channels')
  const data = {
    name: name.trim().toLowerCase().replace(/\s+/g, '-'),
    description: description.trim(),
    createdBy: uid,
    createdAt: serverTimestamp(),
    members: [uid],
  }
  const docRef = await addDoc(channelsRef, data)
  return { id: docRef.id, ...data } as unknown as Channel
}

// ─────────────────────────────────────────────────────────────────────────────
// 全チャンネルをリアルタイムで取得する
// ─────────────────────────────────────────────────────────────────────────────
export function getChannels(
  callback: (channels: Channel[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'channels'), orderBy('createdAt', 'asc'))
  return onSnapshot(q, (snapshot) => {
    const channels: Channel[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Channel, 'id'>),
    }))
    callback(channels)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// チャンネルに参加する（members 配列に uid を追加）
// ─────────────────────────────────────────────────────────────────────────────
export async function joinChannel(
  channelId: string,
  uid: string,
): Promise<void> {
  await updateDoc(doc(db, 'channels', channelId), {
    members: arrayUnion(uid),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// チャンネルから退出する（members 配列から uid を削除）
// ─────────────────────────────────────────────────────────────────────────────
export async function leaveChannel(
  channelId: string,
  uid: string,
): Promise<void> {
  await updateDoc(doc(db, 'channels', channelId), {
    members: arrayRemove(uid),
  })
}
