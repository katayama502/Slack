import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  getDocs,
  setDoc,
  arrayUnion,
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
import type { Channel, Message, Thread, Notification, User } from '../types';

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
  // localhost はポップアップ、本番はリダイレクト（ポップアップブロック対策）
  if (location.hostname === 'localhost') {
    await signInWithPopup(auth, provider);
  } else {
    await signInWithRedirect(auth, provider);
  }
}

export async function handleGoogleRedirectResult(): Promise<void> {
  await getRedirectResult(auth);
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

export function subscribeToMessages(
  channelId: string,
  callback: (messages: Message[]) => void
) {
  const q = query(
    collection(db, 'channels', channelId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Message, 'id'>),
    }));
    callback(messages);
  });
}

export async function sendMessage(
  channelId: string,
  text: string,
  user: User,
  mentions: string[] = []
): Promise<void> {
  const msgRef = await addDoc(collection(db, 'channels', channelId, 'messages'), {
    text,
    uid: user.uid,
    displayName: user.displayName,
    photoURL: user.photoURL,
    createdAt: serverTimestamp(),
    mentions,
    threadCount: 0,
  });

  // Send notifications to mentioned users
  for (const uid of mentions) {
    if (uid !== user.uid) {
      await addDoc(collection(db, 'notifications', uid, 'items'), {
        channelId,
        messageId: msgRef.id,
        fromUser: user.uid,
        fromDisplayName: user.displayName,
        text: text.slice(0, 100),
        read: false,
        createdAt: serverTimestamp(),
      });
    }
  }
}

export async function updateMessage(
  channelId: string,
  messageId: string,
  text: string
): Promise<void> {
  await updateDoc(doc(db, 'channels', channelId, 'messages', messageId), {
    text,
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
      text,
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: serverTimestamp(),
    }
  );
  // Increment threadCount on parent message
  const msgRef = doc(db, 'channels', channelId, 'messages', messageId);
  const snap = await getDocs(
    query(
      collection(db, 'channels', channelId, 'messages', messageId, 'threads')
    )
  );
  await updateDoc(msgRef, { threadCount: snap.size });
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
  await updateDoc(ref, {
    [`reactions.${emoji}`]: arrayUnion(uid),
  });
}
