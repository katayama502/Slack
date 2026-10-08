// ─────────────────────────────────────────────────────────────────────────────
// Slack 風「メッセージを削除する」確認モーダル
//   <DeleteConfirmModal message={msg} onCancel={...} onConfirm={async () => ...} />
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import type { Message } from '../../types';
import { formatMessageTime, formatFullDateTime } from '../../utils/formatDate';
import { renderMarkdown } from '../../utils/markdown';
import Avatar from '../ui/Avatar';
import { ModalShell, SkButton } from './overlays';

export interface DeleteConfirmModalProps {
  message: { text: string; displayName: string; photoURL: string | null; createdAt: Message['createdAt'] };
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
  currentUid?: string;
}

export default function DeleteConfirmModal({ message, onCancel, onConfirm, currentUid }: DeleteConfirmModalProps) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title="メッセージを削除する"
      onClose={onCancel}
      footer={
        <div className="flex items-center gap-3 ml-auto">
          <SkButton onClick={onCancel}>キャンセル</SkButton>
          <SkButton variant="danger" disabled={busy} onClick={confirm}>削除する</SkButton>
        </div>
      }
    >
      <p className="text-[15px]" style={{ color: 'var(--sk-text)', lineHeight: '22px' }}>
        このメッセージを削除してもよろしいですか？この操作は元に戻せません。
      </p>
      <div
        className="mt-4 mb-1 flex gap-2"
        style={{ border: '1px solid var(--sk-border)', borderRadius: 8, padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <Avatar name={message.displayName} photoURL={message.photoURL} size={36} radius={8} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-black" style={{ color: 'var(--sk-text)' }}>{message.displayName}</span>
            <span className="text-[12px]" style={{ color: 'var(--sk-text-2)' }} title={formatFullDateTime(message.createdAt)}>
              {formatMessageTime(message.createdAt)}
            </span>
          </div>
          <div className="text-[15px] overflow-hidden" style={{ color: 'var(--sk-text)', lineHeight: '22px', maxHeight: 22 * 8 }}>
            {renderMarkdown(message.text, { currentUid })}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
