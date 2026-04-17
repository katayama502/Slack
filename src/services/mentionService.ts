import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  updateDoc,
  writeBatch,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import { Notification, User } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// メンションパターン @[displayName](uid) を解析して uid[] を返す
// ─────────────────────────────────────────────────────────────────────────────
export function parseMentions(text: string): string[] {
  const pattern = /@\[([^\]]+)\]\(([^)]+)\)/g
  const uids: string[] = []
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    const uid = match[2]
    if (uid && !uids.includes(uid)) {
      uids.push(uid)
    }
  }
  return uids
}

// ─────────────────────────────────────────────────────────────────────────────
// writeBatch でメンション通知を一括書き込む
// パス: notifications/{targetUid}/items/{auto-id}
// ─────────────────────────────────────────────────────────────────────────────
export async function writeMentionNotifications(
  channelId: string,
  messageId: string,
  mentions: string[],   // 通知先 uid[]
  fromUser: User,
  text: string,
): Promise<void> {
  if (mentions.length === 0) return

  const batch = writeBatch(db)

  for (const targetUid of mentions) {
    // 自分自身へのメンションは通知しない
    if (targetUid === fromUser.uid) continue

    const notifRef = doc(collection(db, 'notifications', targetUid, 'items'))
    const notif: Omit<Notification, 'id'> = {
      messageId,
      channelId,
      fromUser: fromUser.uid,
      fromDisplayName: fromUser.displayName,
      text,
      read: false,
      createdAt: serverTimestamp() as any,
    }
    batch.set(notifRef, notif)
  }

  await batch.commit()
}

// ─────────────────────────────────────────────────────────────────────────────
// 指定ユーザーの未読通知をリアルタイムで取得する
// ─────────────────────────────────────────────────────────────────────────────
export function getNotifications(
  uid: string,
  callback: (notifications: Notification[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'notifications', uid, 'items'),
    where('read', '==', false),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(q, (snapshot) => {
    const notifications: Notification[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Notification, 'id'>),
    }))
    callback(notifications)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 通知を既読にする
// ─────────────────────────────────────────────────────────────────────────────
export async function markNotificationRead(
  uid: string,
  notifId: string,
): Promise<void> {
  await updateDoc(doc(db, 'notifications', uid, 'items', notifId), {
    read: true,
    readAt: serverTimestamp(),
  })
}
