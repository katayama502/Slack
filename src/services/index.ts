import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
  getDocs,
  setDoc,
  arrayUnion,
  arrayRemove,
  increment,
  limit,
} from 'firebase/firestore';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
} from 'firebase/auth';
import { db, auth } from './firebase';
import type { Channel, Message, Thread, Notification, User, Pin, SavedMessage, UserStatus } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      callback(null);
      return;
    }
    const user: User = {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName ?? 'Anonymous',
      photoURL: firebaseUser.photoURL,
      email: firebaseUser.email ?? '',
      online: true,
      lastSeen: null,
    };
    // コールバックを先に呼び出してUIを即座に更新（Firestoreの完了を待たない）
    callback(user);
    // Firestoreのオンライン状態更新は非同期で行う
    setDoc(
      doc(db, 'users', firebaseUser.uid),
      { ...user, online: true, lastSeen: serverTimestamp() },
      { merge: true }
    ).catch(() => {});
  });
}

export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (err: any) {
    // ポップアップがブロックされた場合・サードパーティCookie制限環境（Safari等）では
    // リダイレクト方式にフォールバックする
    const code = err?.code as string | undefined;
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/internal-error' ||
      code === 'auth/cancelled-popup-request'
    ) {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw err;
  }
}

export async function handleGoogleRedirectResult(): Promise<void> {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return;
    // リダイレクト後のユーザー情報はonAuthStateChangedが自動で検知するため
    // ここでは追加処理不要
  } catch (err) {
    console.error('[handleGoogleRedirectResult]', err);
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<void> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
}

export async function signOut(): Promise<void> {
  const user = auth.currentUser;
  if (user) {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        online: false,
        lastSeen: serverTimestamp(),
      });
    } catch {
      // ignore
    }
  }
  await firebaseSignOut(auth);
}

// ─────────────────────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────────────────────

export function subscribeToUsers(callback: (users: User[]) => void) {
  const q = query(collection(db, 'users'));
  return onSnapshot(q, (snapshot) => {
    const users: User[] = snapshot.docs.map((d) => ({
      uid: d.id,
      ...(d.data() as Omit<User, 'uid'>),
    }));
    callback(users);
  });
}

/**
 * オンラインプレゼンスのハートビート設定
 * - visibilitychange で online/offline を更新
 * - 5分ごとに lastSeen を更新してスタールな「オンライン」表示を防ぐ
 */
export function setupOnlinePresence(uid: string): () => void {
  const userRef = doc(db, 'users', uid);

  const setOnline = () => {
    updateDoc(userRef, { online: true, lastSeen: serverTimestamp() }).catch(() => {});
  };
  const setOffline = () => {
    updateDoc(userRef, { online: false, lastSeen: serverTimestamp() }).catch(() => {});
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      setOnline();
    } else {
      setOffline();
    }
  };

  // ハートビート: 5分ごとに lastSeen を更新
  const heartbeatId = setInterval(setOnline, 5 * 60 * 1000);

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // beforeunload でオフラインに設定
  const handleUnload = () => setOffline();
  window.addEventListener('beforeunload', handleUnload);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', handleUnload);
    clearInterval(heartbeatId);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Direct Messages
// ─────────────────────────────────────────────────────────────────────────────

/** DM チャンネル名 (UID 2つをソートして結合) */
export function getDMChannelName(uid1: string, uid2: string): string {
  return `__dm__${[uid1, uid2].sort().join('__')}`;
}

/** DM チャンネルを取得または作成して channelId を返す */
export async function getOrCreateDMChannel(
  currentUid: string,
  otherUid: string
): Promise<string> {
  const dmName = getDMChannelName(currentUid, otherUid);
  const q = query(collection(db, 'channels'), where('name', '==', dmName));
  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].id;
  const ref = await addDoc(collection(db, 'channels'), {
    name: dmName,
    description: '',
    createdBy: currentUid,
    createdAt: serverTimestamp(),
    members: [currentUid, otherUid],
    isDM: true,
  });
  return ref.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Channels
// ─────────────────────────────────────────────────────────────────────────────

export function subscribeToChannels(callback: (channels: Channel[]) => void) {
  const q = query(collection(db, 'channels'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const channels: Channel[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Channel, 'id'>),
    }));
    callback(channels);
  });
}

/** メンバーでなければチャンネルに自動参加する */
export async function joinChannelIfNeeded(channelId: string, uid: string): Promise<void> {
  const snap = await getDoc(doc(db, 'channels', channelId));
  if (!snap.exists()) return;
  const members: string[] = snap.data().members ?? [];
  if (members.includes(uid)) return;
  await updateDoc(doc(db, 'channels', channelId), {
    members: arrayUnion(uid),
  });
}

export async function createChannel(
  name: string,
  description: string,
  uid: string
): Promise<Channel> {
  const ref = await addDoc(collection(db, 'channels'), {
    name,
    description,
    createdBy: uid,
    createdAt: serverTimestamp(),
    members: [uid],
  });
  return {
    id: ref.id,
    name,
    description,
    createdBy: uid,
    createdAt: Timestamp.now(),
    members: [uid],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Messages
// ─────────────────────────────────────────────────────────────────────────────

/** チャンネルの最新メッセージ1件を購読（未読バッジ用） */
export function subscribeToLatestMessage(
  channelId: string,
  callback: (msg: Message | null) => void
): () => void {
  const q = query(
    collection(db, 'channels', channelId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  return onSnapshot(q, (snap) => {
    if (snap.empty) { callback(null); return; }
    callback({ id: snap.docs[0].id, ...snap.docs[0].data() } as Message);
  });
}

export function subscribeToMessages(
  channelId: string,
  callback: (messages: Message[]) => void
) {
  const q = query(
    collection(db, 'channels', channelId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const messages: Message[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Message, 'id'>),
      }));
      callback(messages);
    },
    (err) => {
      console.error(`[subscribeToMessages] channelId=${channelId}`, err);
    }
  );
}

export async function sendMessage(
  channelId: string,
  text: string,
  user: User,
  mentions: string[] = [],
  dmRecipientUid?: string
): Promise<void> {
  // 文字数上限（4000文字）
  const safeText = text.slice(0, 4000);
  const msgRef = await addDoc(collection(db, 'channels', channelId, 'messages'), {
    text: safeText,
    uid: user.uid,
    displayName: user.displayName,
    photoURL: user.photoURL,
    createdAt: serverTimestamp(),
    mentions,
    threadCount: 0,
  });

  // Notify mentioned users (ignore errors so message send doesn't fail)
  const notifTargets = new Set(mentions.filter((uid) => uid !== user.uid));
  // For DMs, also notify the recipient
  if (dmRecipientUid && dmRecipientUid !== user.uid) {
    notifTargets.add(dmRecipientUid);
  }
  await Promise.all(
    Array.from(notifTargets).map((uid) =>
      addDoc(collection(db, 'notifications', uid, 'items'), {
        channelId,
        messageId: msgRef.id,
        fromUser: user.uid,
        fromDisplayName: user.displayName,
        text: text.slice(0, 100),
        read: false,
        createdAt: serverTimestamp(),
      }).catch(() => {})
    )
  );
}

export async function updateMessage(
  channelId: string,
  messageId: string,
  text: string
): Promise<void> {
  await updateDoc(doc(db, 'channels', channelId, 'messages', messageId), {
    text: text.slice(0, 4000),
    editedAt: serverTimestamp(),
  });
}

export async function deleteMessage(
  channelId: string,
  messageId: string
): Promise<void> {
  await deleteDoc(doc(db, 'channels', channelId, 'messages', messageId));
}

// ─────────────────────────────────────────────────────────────────────────────
// Threads
// ─────────────────────────────────────────────────────────────────────────────

export function subscribeToThreads(
  channelId: string,
  messageId: string,
  callback: (threads: Thread[]) => void
) {
  const q = query(
    collection(db, 'channels', channelId, 'messages', messageId, 'threads'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    const threads: Thread[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Thread, 'id'>),
    }));
    callback(threads);
  });
}

export async function sendThreadReply(
  channelId: string,
  messageId: string,
  text: string,
  user: User
): Promise<void> {
  await addDoc(
    collection(db, 'channels', channelId, 'messages', messageId, 'threads'),
    {
      messageId,
      text: text.slice(0, 4000),
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: serverTimestamp(),
    }
  );
  // increment(1) でレースコンディションを防ぐ
  const msgRef = doc(db, 'channels', channelId, 'messages', messageId);
  await updateDoc(msgRef, { threadCount: increment(1) });
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────────────────────

export function subscribeToNotifications(
  uid: string,
  callback: (notifications: Notification[]) => void
) {
  const q = query(
    collection(db, 'notifications', uid, 'items'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const notifications: Notification[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Notification, 'id'>),
    }));
    callback(notifications);
  });
}

export async function markNotificationRead(
  uid: string,
  notifId: string
): Promise<void> {
  await updateDoc(doc(db, 'notifications', uid, 'items', notifId), {
    read: true,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Reactions
// ─────────────────────────────────────────────────────────────────────────────

export async function addReaction(
  channelId: string,
  messageId: string,
  emoji: string,
  uid: string,
): Promise<void> {
  const ref = doc(db, 'channels', channelId, 'messages', messageId);
  await updateDoc(ref, { [`reactions.${emoji}`]: arrayUnion(uid) });
}

export async function toggleReaction(
  channelId: string,
  messageId: string,
  emoji: string,
  uid: string,
  currentReactions: Record<string, string[]>,
): Promise<void> {
  const ref = doc(db, 'channels', channelId, 'messages', messageId);
  const hasReacted = (currentReactions[emoji] ?? []).includes(uid);
  await updateDoc(ref, {
    [`reactions.${emoji}`]: hasReacted ? arrayRemove(uid) : arrayUnion(uid),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Pins  (channels/{channelId}/pins)
// ─────────────────────────────────────────────────────────────────────────────

export function subscribeToPins(
  channelId: string,
  callback: (pins: Pin[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, 'channels', channelId, 'pins'),
    orderBy('order', 'asc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const pins: Pin[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Pin, 'id'>),
      }));
      callback(pins);
    },
    (err) => {
      console.error('subscribeToPins error:', err);
      onError?.(err);
    }
  );
}

export async function addPin(
  channelId: string,
  name: string,
  url: string,
  uid: string,
  currentCount: number
): Promise<void> {
  await addDoc(collection(db, 'channels', channelId, 'pins'), {
    name,
    url,
    createdBy: uid,
    createdAt: serverTimestamp(),
    order: currentCount,
  });
}

export async function deletePin(channelId: string, pinId: string): Promise<void> {
  await deleteDoc(doc(db, 'channels', channelId, 'pins', pinId));
}

export async function updatePin(
  channelId: string,
  pinId: string,
  data: { name?: string; url?: string }
): Promise<void> {
  await updateDoc(doc(db, 'channels', channelId, 'pins', pinId), data);
}

// ─────────────────────────────────────────────────────────────────────────────
// Saved Messages  (users/{uid}/saved/{messageId})
// ─────────────────────────────────────────────────────────────────────────────

export function subscribeSavedMessages(
  uid: string,
  callback: (messages: SavedMessage[]) => void
): () => void {
  const q = query(
    collection(db, 'users', uid, 'saved'),
    orderBy('savedAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const messages: SavedMessage[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<SavedMessage, 'id'>),
    }));
    callback(messages);
  });
}

export async function saveMessage(
  uid: string,
  message: Message,
  channelId: string
): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'saved', message.id), {
    messageId: message.id,
    channelId,
    text: message.text.slice(0, 500),
    fromUid: message.uid,
    fromDisplayName: message.displayName,
    fromPhotoURL: message.photoURL,
    savedAt: serverTimestamp(),
    originalCreatedAt: message.createdAt,
  });
}

export async function unsaveMessage(uid: string, messageId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'saved', messageId));
}

// ─────────────────────────────────────────────────────────────────────────────
// Typing Indicators  (channels/{channelId}/typing/{uid})
// ─────────────────────────────────────────────────────────────────────────────

export async function setTyping(
  channelId: string,
  uid: string,
  displayName: string,
  isTyping: boolean
): Promise<void> {
  const ref = doc(db, 'channels', channelId, 'typing', uid);
  if (isTyping) {
    await setDoc(ref, { uid, displayName, timestamp: serverTimestamp() });
  } else {
    await deleteDoc(ref).catch(() => {});
  }
}

export function subscribeToTyping(
  channelId: string,
  callback: (uids: { uid: string; displayName: string }[]) => void
): () => void {
  return onSnapshot(collection(db, 'channels', channelId, 'typing'), (snap) => {
    const now = Date.now();
    const typers = snap.docs
      .map((d) => d.data() as { uid: string; displayName: string; timestamp: { toMillis: () => number } })
      .filter((t) => {
        // Ignore entries older than 5 seconds
        const ms = t.timestamp?.toMillis?.() ?? 0;
        return now - ms < 5000;
      });
    callback(typers);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// User Status
// ─────────────────────────────────────────────────────────────────────────────

export async function setUserStatus(uid: string, status: UserStatus | null): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { status: status ?? null });
}

// ─────────────────────────────────────────────────────────────────────────────
// Channel Management
// ─────────────────────────────────────────────────────────────────────────────

export async function leaveChannel(channelId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'channels', channelId), {
    members: arrayRemove(uid),
  });
}

export async function updateChannelDescription(
  channelId: string,
  description: string
): Promise<void> {
  await updateDoc(doc(db, 'channels', channelId), { description });
}

// ─────────────────────────────────────────────────────────────────────────────
// Thread Edits & Deletes
// ─────────────────────────────────────────────────────────────────────────────

export async function updateThreadReply(
  channelId: string,
  messageId: string,
  threadId: string,
  text: string
): Promise<void> {
  await updateDoc(
    doc(db, 'channels', channelId, 'messages', messageId, 'threads', threadId),
    { text: text.slice(0, 4000), editedAt: serverTimestamp() }
  );
}

export async function deleteThreadReply(
  channelId: string,
  messageId: string,
  threadId: string
): Promise<void> {
  await deleteDoc(
    doc(db, 'channels', channelId, 'messages', messageId, 'threads', threadId)
  );
  const msgRef = doc(db, 'channels', channelId, 'messages', messageId);
  await updateDoc(msgRef, { threadCount: increment(-1) });
}

// ─────────────────────────────────────────────────────────────────────────────
// Thread Reactions
// ─────────────────────────────────────────────────────────────────────────────

export async function toggleThreadReaction(
  channelId: string,
  messageId: string,
  threadId: string,
  emoji: string,
  uid: string,
  currentReactions: Record<string, string[]>
): Promise<void> {
  const ref = doc(db, 'channels', channelId, 'messages', messageId, 'threads', threadId);
  const hasReacted = (currentReactions[emoji] ?? []).includes(uid);
  await updateDoc(ref, {
    [`reactions.${emoji}`]: hasReacted ? arrayRemove(uid) : arrayUnion(uid),
  });
}
