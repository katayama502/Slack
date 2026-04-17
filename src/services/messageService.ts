import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Unsubscribe,
  arrayUnion,
} from 'firebase/firestore'
import { db } from './firebase'
import { Message, User } from '../types'
import { parseMentions, writeMentionNotifications } from './mentionService'

// ─────────────────────────────────────────────────────────────────────────────
// メッセージを送信する（メンション検出 & 通知書き込みも行う）
// ─────────────────────────────────────────────────────────────────────────────
export async function sendMessage(
  channelId: string,
  text: string,
  user: User,
): Promise<Message> {
  const mentions = parseMentions(text)

  const messagesRef = collection(db, 'channels', channelId, 'messages')
  const data = {
    text,
    uid: user.uid,
    displayName: user.displayName,
    photoURL: user.photoURL ?? '',
    createdAt: serverTimestamp(),
    mentions,
    threadCount: 0,
    channelId,
  }

  const docRef = await addDoc(messagesRef, data)
  const message: Message = { id: docRef.id, ...data } as unknown as Message

  // メンション対象に通知を書き込む
  if (mentions.length > 0) {
    await writeMentionNotifications(channelId, docRef.id, mentions, user, text)
  }

  return message
}

// ─────────────────────────────────────────────────────────────────────────────
// チャンネルのメッセージをリアルタイムで取得する（最新 50 件）
// ─────────────────────────────────────────────────────────────────────────────
export function getMessages(
  channelId: string,
  callback: (messages: Message[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'channels', channelId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(50),
  )
  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Message, 'id'>),
    }))
    callback(messages)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// メッセージを編集する
// ─────────────────────────────────────────────────────────────────────────────
export async function editMessage(
  channelId: string,
  messageId: string,
  text: string,
): Promise<void> {
  const ref = doc(db, 'channels', channelId, 'messages', messageId)
  await updateDoc(ref, {
    text,
    editedAt: serverTimestamp(),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// メッセージを削除する
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteMessage(
  channelId: string,
  messageId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'channels', channelId, 'messages', messageId))
}

// ─────────────────────────────────────────────────────────────────────────────
// メッセージにリアクションを追加する
// reactions フィールドを { [emoji]: string[] (uid[]) } 形式で管理する
// ─────────────────────────────────────────────────────────────────────────────
export async function addReaction(
  channelId: string,
  messageId: string,
  emoji: string,
  uid: string,
): Promise<void> {
  const ref = doc(db, 'channels', channelId, 'messages', messageId)
  await updateDoc(ref, {
    [`reactions.${emoji}`]: arrayUnion(uid),
  })
}
