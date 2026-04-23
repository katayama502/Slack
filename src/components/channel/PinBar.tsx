import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import { subscribeToPins, addPin, deletePin, updatePin } from '../../services';
import type { Pin } from '../../types';

// ─── Folder icon ─────────────────────────────────────────────────────────────
function FolderIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v8.25" />
    </svg>
  );
}

// ─── Add pin form (inline) ────────────────────────────────────────────────────
function AddPinForm({
  onSave,
  onCancel,
}: {
  onSave: (name: string, url: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimName = name.trim();
    const trimUrl = url.trim();
    if (!trimName || !trimUrl) return;
    const normalized = /^https?:\/\//i.test(trimUrl) ? trimUrl : `https://${trimUrl}`;
    onSave(trimName, normalized);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-1.5 px-3 py-1.5 flex-shrink-0"
      style={{
        background: '#FFFFFF',
        border: '1px solid #DDDDDD',
        borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        minWidth: '320px',
      }}
    >
      <input
        ref={nameRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="名前"
        className="flex-shrink-0 text-[13px] text-[#1D1C1D] focus:outline-none"
        style={{
          width: '100px',
          border: '1px solid #DDDDDD',
          borderRadius: '4px',
          padding: '3px 8px',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#1D9BD1'; e.currentTarget.style.boxShadow = '0 0 0 1px #1D9BD1'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = '#DDDDDD'; e.currentTarget.style.boxShadow = 'none'; }}
      />
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="URL (https://...)"
        className="flex-1 text-[13px] text-[#1D1C1D] focus:outline-none"
        style={{
          minWidth: '140px',
          border: '1px solid #DDDDDD',
          borderRadius: '4px',
          padding: '3px 8px',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#1D9BD1'; e.currentTarget.style.boxShadow = '0 0 0 1px #1D9BD1'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = '#DDDDDD'; e.currentTarget.style.boxShadow = 'none'; }}
      />
      <button
        type="submit"
        disabled={!name.trim() || !url.trim()}
        className="px-3 py-1 rounded text-[13px] font-medium text-white transition-colors flex-shrink-0"
        style={{
          background: name.trim() && url.trim() ? '#007A5A' : '#DDDDDD',
          color: name.trim() && url.trim() ? '#FFFFFF' : '#999999',
          cursor: name.trim() && url.trim() ? 'pointer' : 'not-allowed',
        }}
      >
        保存
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-2 py-1 rounded text-[13px] text-[#616061] flex-shrink-0"
        onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F0F0'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        ×
      </button>
    </form>
  );
}

// ─── Edit pin form (inline) ───────────────────────────────────────────────────
function EditPinForm({
  pin,
  onSave,
  onCancel,
}: {
  pin: Pin;
  onSave: (name: string, url: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(pin.name);
  const [url, setUrl] = useState(pin.url);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    nameRef.current?.select();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimName = name.trim();
    const trimUrl = url.trim();
    if (!trimName || !trimUrl) return;
    const normalized = /^https?:\/\//i.test(trimUrl) ? trimUrl : `https://${trimUrl}`;
    onSave(trimName, normalized);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-1.5 px-3 py-1.5 flex-shrink-0"
      style={{
        background: '#FFFFFF',
        border: '1px solid #1D9BD1',
        borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        minWidth: '300px',
      }}
    >
      <input
        ref={nameRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="名前"
        className="flex-shrink-0 text-[13px] text-[#1D1C1D] focus:outline-none"
        style={{ width: '100px', border: '1px solid #DDDDDD', borderRadius: '4px', padding: '3px 8px' }}
      />
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="URL"
        className="flex-1 text-[13px] text-[#1D1C1D] focus:outline-none"
        style={{ minWidth: '120px', border: '1px solid #DDDDDD', borderRadius: '4px', padding: '3px 8px' }}
      />
      <button type="submit" className="px-3 py-1 rounded text-[13px] font-medium text-white flex-shrink-0" style={{ background: '#007A5A' }}>保存</button>
      <button
        type="button"
        onClick={onCancel}
        className="px-2 py-1 rounded text-[13px] text-[#616061] flex-shrink-0"
        onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F0F0'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >×</button>
    </form>
  );
}

// ─── Delete confirm portal ────────────────────────────────────────────────────
// Rendered into document.body to escape any overflow:hidden ancestors
function DeleteConfirmPortal({
  pinName,
  anchorRect,
  onConfirm,
  onCancel,
}: {
  pinName: string;
  anchorRect: DOMRect;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const top = anchorRect.bottom + 4;
  const left = anchorRect.left;

  return ReactDOM.createPortal(
    <>
      {/* Backdrop — click outside to cancel */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 9998 }}
        onClick={onCancel}
      />
      {/* Confirm popover */}
      <div
        className="fixed px-3 py-2.5 flex flex-col gap-2"
        style={{
          top,
          left,
          zIndex: 9999,
          background: '#FFFFFF',
          border: '1px solid #DDDDDD',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          minWidth: '180px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[13px] text-[#1D1C1D] font-medium leading-snug">
          「{pinName}」を削除しますか？
        </p>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            className="flex-1 py-1.5 rounded text-[13px] font-semibold text-white transition-colors"
            style={{ background: '#E01E5A' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#C0195A'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#E01E5A'; }}
          >
            削除
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-1.5 rounded text-[13px] text-[#1D1C1D] transition-colors"
            style={{ border: '1px solid #DDDDDD' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F8F8F8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            キャンセル
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PinBar() {
  const activeChannelId = useAppStore((s) => s.activeChannelId);
  const { user } = useAppStore((s) => s.auth);

  const [pins, setPins] = useState<Pin[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteAnchorRect, setDeleteAnchorRect] = useState<DOMRect | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeChannelId) return;
    setPins([]);
    setShowAddForm(false);
    setEditingPinId(null);
    setDeleteConfirmId(null);
    setDeleteAnchorRect(null);
    setAddError(null);
    const unsub = subscribeToPins(
      activeChannelId,
      setPins,
      (err) => console.error('Pin load error:', err)
    );
    return () => unsub();
  }, [activeChannelId]);

  const handleAddPin = async (name: string, url: string) => {
    if (!activeChannelId || !user) return;
    setShowAddForm(false);
    setAddError(null);
    try {
      await addPin(activeChannelId, name, url, user.uid, pins.length);
    } catch (err) {
      console.error('Add pin error:', err);
      setAddError('ピンの追加に失敗しました');
      setTimeout(() => setAddError(null), 3000);
    }
  };

  const handleDeletePin = async (pinId: string) => {
    if (!activeChannelId) return;
    setDeleteConfirmId(null);
    setDeleteAnchorRect(null);
    try {
      await deletePin(activeChannelId, pinId);
    } catch (err) {
      console.error('Delete pin error:', err);
    }
  };

  const handleEditPin = async (pinId: string, name: string, url: string) => {
    if (!activeChannelId) return;
    setEditingPinId(null);
    try {
      await updatePin(activeChannelId, pinId, { name, url });
    } catch (err) {
      console.error('Update pin error:', err);
    }
  };

  const openDeleteConfirm = (e: React.MouseEvent, pinId: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDeleteConfirmId(pinId);
    setDeleteAnchorRect(rect);
  };

  if (!activeChannelId) return null;

  const confirmPin = deleteConfirmId ? pins.find((p) => p.id === deleteConfirmId) : null;

  return (
    <div
      className="flex-shrink-0 flex items-center"
      style={{
        borderBottom: '1px solid #E8E8E8',
        background: '#FFFFFF',
        minHeight: '38px',
      }}
    >
      {/* Scrollable pin list */}
      <div
        ref={scrollRef}
        className="flex items-center gap-0.5 px-2 overflow-x-auto flex-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', minHeight: '38px' }}
      >
        {/* Static "メッセージ" tab */}
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium flex-shrink-0 transition-colors"
          style={{ color: '#1D1C1D', background: 'rgba(29,28,29,0.08)' }}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: '#1D1C1D' }}
          />
          メッセージ
        </button>

        {/* User-defined pins */}
        {pins.map((pin) => {
          const isOwner = user?.uid === pin.createdBy;
          const isEditing = editingPinId === pin.id;
          const isDeleteConfirm = deleteConfirmId === pin.id;

          if (isEditing) {
            return (
              <EditPinForm
                key={pin.id}
                pin={pin}
                onSave={(name, url) => handleEditPin(pin.id, name, url)}
                onCancel={() => setEditingPinId(null)}
              />
            );
          }

          const isHovered = hoveredPinId === pin.id;

          return (
            <div
              key={pin.id}
              className="relative flex-shrink-0"
              onMouseEnter={() => setHoveredPinId(pin.id)}
              onMouseLeave={() => setHoveredPinId(null)}
            >
              <div
                className="flex items-center rounded-md transition-colors"
                style={{
                  background: isHovered || isDeleteConfirm ? '#F0F0F0' : 'transparent',
                }}
              >
                {/* Main link */}
                <button
                  onClick={() => window.open(pin.url, '_blank', 'noopener,noreferrer')}
                  title={pin.url}
                  className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 text-[13px] flex-shrink-0"
                  style={{ color: isHovered || isDeleteConfirm ? '#1D1C1D' : '#616061' }}
                >
                  <FolderIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="max-w-[120px] truncate">{pin.name}</span>
                </button>

                {/* Edit / Delete — visible on hover (owner only) */}
                {isOwner && isHovered && !isDeleteConfirm && (
                  <div className="flex items-center gap-0.5 pr-1.5">
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => { e.stopPropagation(); setEditingPinId(pin.id); }}
                      title="編集"
                      className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                      style={{ color: '#616061' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#DDDDDD'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                      </svg>
                    </button>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => openDeleteConfirm(e, pin.id)}
                      title="削除"
                      className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                      style={{ color: '#E01E5A' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#FEE2E2'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Add form inline */}
        {showAddForm && (
          <AddPinForm
            onSave={handleAddPin}
            onCancel={() => setShowAddForm(false)}
          />
        )}
      </div>

      {/* Error toast */}
      {addError && (
        <span className="flex-shrink-0 text-[12px] px-2" style={{ color: '#E01E5A' }}>
          {addError}
        </span>
      )}

      {/* + button (always visible on right) */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          title="ピンを追加"
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center transition-colors mr-1"
          style={{ color: '#616061', borderLeft: '1px solid #E8E8E8' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#F8F8F8'; e.currentTarget.style.color = '#1D1C1D'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#616061'; }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Delete confirm — rendered via portal to escape overflow:hidden ancestors */}
      {confirmPin && deleteAnchorRect && (
        <DeleteConfirmPortal
          pinName={confirmPin.name}
          anchorRect={deleteAnchorRect}
          onConfirm={() => handleDeletePin(confirmPin.id)}
          onCancel={() => { setDeleteConfirmId(null); setDeleteAnchorRect(null); }}
        />
      )}
    </div>
  );
}
