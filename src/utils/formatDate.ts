import { Timestamp } from 'firebase/firestore';
import { format, isToday, isYesterday } from 'date-fns';
import { ja } from 'date-fns/locale';

function toDate(timestamp: Timestamp | null | undefined): Date {
  if (!timestamp) return new Date();
  return timestamp.toDate();
}

/**
 * メッセージの時刻を HH:mm 形式で返す
 */
export function formatMessageTime(timestamp: Timestamp | null | undefined): string {
  const date = toDate(timestamp);
  return format(date, 'HH:mm');
}

/**
 * ホバー時に表示するフル日時
 */
export function formatFullDateTime(timestamp: Timestamp | null | undefined): string {
  const date = toDate(timestamp);
  return format(date, 'yyyy年M月d日（E） HH:mm', { locale: ja });
}

/**
 * 日付区切りラベルを返す
 * - 今日 → "今日"
 * - 昨日 → "昨日"
 * - それ以前 → "4月15日（火）"
 */
export function formatDateDivider(timestamp: Timestamp | null | undefined): string {
  const date = toDate(timestamp);
  if (isToday(date)) return '今日';
  if (isYesterday(date)) return '昨日';
  return format(date, 'M月d日（E）', { locale: ja });
}

/**
 * 同じ日付かどうかを判定する
 */
export function isSameDay(
  a: Timestamp | null | undefined,
  b: Timestamp | null | undefined
): boolean {
  const da = toDate(a);
  const db = toDate(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/**
 * 2つのメッセージが連続投稿（同一ユーザー・5分以内）かどうかを判定する
 */
export function isCompactMessage(
  prevTimestamp: Timestamp | null | undefined,
  currTimestamp: Timestamp | null | undefined,
  prevUid: string,
  currUid: string
): boolean {
  if (prevUid !== currUid) return false;
  const prev = toDate(prevTimestamp);
  const curr = toDate(currTimestamp);
  return Math.abs(curr.getTime() - prev.getTime()) < 5 * 60 * 1000;
}
