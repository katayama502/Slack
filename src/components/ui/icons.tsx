// ─────────────────────────────────────────────────────────────────────────────
// Slack 風アイコンセット（共通）
// すべて 24x24 viewBox・currentColor。サイズは className（例: "w-4 h-4"）で指定する。
// filled=true で「アクティブ時の塗りつぶし版」を表示するアイコンもある。
// ─────────────────────────────────────────────────────────────────────────────
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { filled?: boolean };

function Stroke({ children, filled: _f, strokeWidth = 1.7, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

function Fill({ children, filled: _f, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

// ── Navigation rail ──────────────────────────────────────────────────────────
export const HomeIcon = ({ filled, ...p }: IconProps) =>
  filled ? (
    <Fill {...p}><path d="M11.3 2.6a1 1 0 0 1 1.4 0l8.5 8.2c.3.3.5.7.5 1.1V20a2 2 0 0 1-2 2h-4.2a1 1 0 0 1-1-1v-4.6a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1V21a1 1 0 0 1-1 1H4.3a2 2 0 0 1-2-2v-8.1c0-.4.2-.8.5-1.1l8.5-8.2Z" /></Fill>
  ) : (
    <Stroke {...p}><path d="M3 11.6 12 3l9 8.6V20a1 1 0 0 1-1 1h-4.6v-5.4a1 1 0 0 0-1-1h-2.8a1 1 0 0 0-1 1V21H4a1 1 0 0 1-1-1v-8.4Z" /></Stroke>
  );

export const DMIcon = ({ filled, ...p }: IconProps) =>
  filled ? (
    <Fill {...p}><path d="M3 6.5A3.5 3.5 0 0 1 6.5 3h7A3.5 3.5 0 0 1 17 6.5v4a3.5 3.5 0 0 1-3.5 3.5H9.6l-3.4 2.6A.75.75 0 0 1 5 16v-2.3A3.5 3.5 0 0 1 3 10.5v-4Z" /><path d="M18.5 8.2A3.5 3.5 0 0 1 21 11.5v4a3.5 3.5 0 0 1-2 3.2V21a.75.75 0 0 1-1.2.6L14.4 19h-2.9a3.5 3.5 0 0 1-3-1.7h5A5.5 5.5 0 0 0 18.5 11.8V8.2Z" opacity=".75" /></Fill>
  ) : (
    <Stroke {...p}><path d="M6.5 3.75h7a2.75 2.75 0 0 1 2.75 2.75v4a2.75 2.75 0 0 1-2.75 2.75H9.4L5.75 16v-2.9A2.75 2.75 0 0 1 3.75 10.5v-4A2.75 2.75 0 0 1 6.5 3.75Z" /><path d="M18.75 8.6a2.75 2.75 0 0 1 1.5 2.4v4.5a2.75 2.75 0 0 1-2 2.65V20.5l-3.4-2.25H11.5a2.75 2.75 0 0 1-2.3-1.25" /></Stroke>
  );

export const BellIcon = ({ filled, ...p }: IconProps) =>
  filled ? (
    <Fill {...p}><path d="M12 2.5a6.5 6.5 0 0 0-6.5 6.5v3.4L3.9 15.6A1 1 0 0 0 4.8 17h14.4a1 1 0 0 0 .9-1.4l-1.6-3.2V9A6.5 6.5 0 0 0 12 2.5ZM9.2 18.5a2.9 2.9 0 0 0 5.6 0H9.2Z" /></Fill>
  ) : (
    <Stroke {...p}><path d="M6.25 9a5.75 5.75 0 1 1 11.5 0v3.6l1.6 3.4H4.65l1.6-3.4V9Z" /><path d="M9.75 19a2.3 2.3 0 0 0 4.5 0" /></Stroke>
  );

export const FilesIcon = ({ filled, ...p }: IconProps) =>
  filled ? (
    <Fill {...p}><path d="M8 2.5h6.6c.4 0 .8.2 1.1.4l3.4 3.4c.3.3.4.7.4 1.1V17a2.5 2.5 0 0 1-2.5 2.5H8A2.5 2.5 0 0 1 5.5 17V5A2.5 2.5 0 0 1 8 2.5Z" /><path d="M3.5 7.5v11A3 3 0 0 0 6.5 21.5H15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></Fill>
  ) : (
    <Stroke {...p}><path d="M8 3.25h6.4l4.35 4.35V17A1.75 1.75 0 0 1 17 18.75H8A1.75 1.75 0 0 1 6.25 17V5A1.75 1.75 0 0 1 8 3.25Z" /><path d="M14.25 3.5V7.75h4.25" /><path d="M3.75 7.5v11a2.25 2.25 0 0 0 2.25 2.25h9" /></Stroke>
  );

export const BookmarkIcon = ({ filled, ...p }: IconProps) =>
  filled ? (
    <Fill {...p}><path d="M6.5 2.75h11A1.75 1.75 0 0 1 19.25 4.5v16.1a.75.75 0 0 1-1.2.6L12 16.9l-6.05 4.3a.75.75 0 0 1-1.2-.6V4.5A1.75 1.75 0 0 1 6.5 2.75Z" /></Fill>
  ) : (
    <Stroke {...p}><path d="M6.5 3.25h11a1.25 1.25 0 0 1 1.25 1.25V20.5L12 15.75 5.25 20.5V4.5A1.25 1.25 0 0 1 6.5 3.25Z" /></Stroke>
  );

export const MoreHorizontalIcon = (p: IconProps) => (
  <Fill {...p}><circle cx="5.5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="18.5" cy="12" r="1.7" /></Fill>
);
export const MoreVerticalIcon = (p: IconProps) => (
  <Fill {...p}><circle cx="12" cy="5.5" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="18.5" r="1.7" /></Fill>
);

export const SlackbotIcon = (p: IconProps) => (
  <Stroke {...p}><rect x="4" y="7" width="16" height="12" rx="4" /><path d="M12 7V4.5" /><circle cx="12" cy="3.6" r="1" /><circle cx="9" cy="12.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="15" cy="12.5" r="1.1" fill="currentColor" stroke="none" /><path d="M9.5 15.75c1.5.9 3.5.9 5 0" /></Stroke>
);

export const PlusIcon = (p: IconProps) => <Stroke strokeWidth={2} {...p}><path d="M12 5v14M5 12h14" /></Stroke>;
export const MoonIcon = (p: IconProps) => (
  <Stroke {...p}><path d="M20 14.6A8.25 8.25 0 0 1 9.4 4a8.25 8.25 0 1 0 10.6 10.6Z" /></Stroke>
);

// ── Top bar ──────────────────────────────────────────────────────────────────
export const ArrowLeftIcon = (p: IconProps) => <Stroke strokeWidth={2} {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></Stroke>;
export const ArrowRightIcon = (p: IconProps) => <Stroke strokeWidth={2} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Stroke>;
export const ClockIcon = (p: IconProps) => <Stroke {...p}><circle cx="12" cy="12" r="8.25" /><path d="M12 7.5V12l3 2" /></Stroke>;
export const SearchIcon = (p: IconProps) => <Stroke strokeWidth={2} {...p}><circle cx="11" cy="11" r="6.25" /><path d="m20 20-4.5-4.5" /></Stroke>;
export const HelpIcon = (p: IconProps) => <Stroke {...p}><circle cx="12" cy="12" r="8.75" /><path d="M9.6 9.4a2.5 2.5 0 0 1 4.85.85c0 1.7-2.45 2.1-2.45 3.6" /><circle cx="12" cy="16.9" r=".9" fill="currentColor" stroke="none" /></Stroke>;
export const SidebarToggleIcon = (p: IconProps) => <Stroke {...p}><rect x="3.25" y="4.25" width="17.5" height="15.5" rx="2.5" /><path d="M9 4.5v15" /><path d="M5.5 8h1.5M5.5 11h1.5" /></Stroke>;

// ── Sidebar ──────────────────────────────────────────────────────────────────
export const ThreadsIcon = (p: IconProps) => <Stroke {...p}><path d="M12 3.75c4.6 0 8.25 3.2 8.25 7.25S16.6 18.25 12 18.25c-.9 0-1.8-.1-2.6-.35L5 20l.9-3.6C4.6 15 3.75 13.1 3.75 11 3.75 6.95 7.4 3.75 12 3.75Z" /><path d="M8.5 9.5h7M8.5 12.5h4.5" /></Stroke>;
export const HeadphonesIcon = (p: IconProps) => <Stroke {...p}><path d="M4.25 15v-3a7.75 7.75 0 0 1 15.5 0v3" /><rect x="3.75" y="13.75" width="4" height="6.5" rx="1.75" /><rect x="16.25" y="13.75" width="4" height="6.5" rx="1.75" /></Stroke>;
export const SendIcon = (p: IconProps) => <Stroke {...p}><path d="M4.5 4.5 20 12 4.5 19.5 7 12 4.5 4.5Z" /><path d="M7 12h6" /></Stroke>;
export const SendFilledIcon = (p: IconProps) => <Fill {...p}><path d="M3.9 3.6a.9.9 0 0 1 1-.1l15.6 7.7a.9.9 0 0 1 0 1.6L4.9 20.5a.9.9 0 0 1-1.3-1.1L6.2 12 3.6 4.6a.9.9 0 0 1 .3-1Zm3.9 9.2-1.8 5.1 11.7-5.9-11.7-5.9 1.8 5.1H13a.8.8 0 0 1 0 1.6H7.8Z" /></Fill>;
export const DirectoryIcon = (p: IconProps) => <Stroke {...p}><rect x="4.25" y="3.25" width="14.5" height="17.5" rx="2" /><circle cx="11.5" cy="10" r="2.25" /><path d="M7.75 16.25c.6-1.7 2-2.6 3.75-2.6s3.15.9 3.75 2.6" /><path d="M18.75 7h1.5M18.75 11h1.5M18.75 15h1.5" /></Stroke>;
export const StarIcon = ({ filled, ...p }: IconProps) =>
  filled ? (
    <Fill {...p}><path d="M12 2.9a.9.9 0 0 1 .8.5l2.3 4.7 5.2.8a.9.9 0 0 1 .5 1.5l-3.8 3.7.9 5.2a.9.9 0 0 1-1.3.9L12 17.8l-4.6 2.4a.9.9 0 0 1-1.3-.9l.9-5.2-3.8-3.7a.9.9 0 0 1 .5-1.5l5.2-.8 2.3-4.7a.9.9 0 0 1 .8-.5Z" /></Fill>
  ) : (
    <Stroke {...p}><path d="m12 3.75 2.5 5.05 5.55.8-4 3.9.95 5.55L12 16.45 7 19.05l.95-5.55-4-3.9 5.55-.8L12 3.75Z" /></Stroke>
  );
export const HashIcon = (p: IconProps) => <Stroke strokeWidth={1.8} {...p}><path d="M5 9h15M4 15h15M10.5 4 8.5 20M15.5 4l-2 16" /></Stroke>;
export const LockIcon = (p: IconProps) => <Stroke strokeWidth={1.8} {...p}><rect x="5.25" y="10.75" width="13.5" height="9.5" rx="2" /><path d="M8.25 10.75V8a3.75 3.75 0 0 1 7.5 0v2.75" /></Stroke>;
export const CaretDownIcon = (p: IconProps) => <Fill {...p}><path d="M7.4 9.4a.9.9 0 0 1 1.3 0L12 12.7l3.3-3.3a.9.9 0 1 1 1.3 1.3l-4 4a.9.9 0 0 1-1.3 0l-4-4a.9.9 0 0 1 0-1.3Z" /></Fill>;
export const CaretRightIcon = (p: IconProps) => <Fill {...p}><path d="M9.4 7.4a.9.9 0 0 1 1.3 0l4 4a.9.9 0 0 1 0 1.3l-4 4a.9.9 0 1 1-1.3-1.3l3.3-3.3-3.3-3.3a.9.9 0 0 1 0-1.3Z" /></Fill>;
export const ChevronDownIcon = (p: IconProps) => <Stroke strokeWidth={2} {...p}><path d="m6.5 9.5 5.5 5.5 5.5-5.5" /></Stroke>;
export const ComposeIcon = (p: IconProps) => <Stroke {...p}><path d="M19.5 13.5V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18V6.75A2.25 2.25 0 0 1 6 4.5h4.5" /><path d="M17.3 3.7a1.9 1.9 0 0 1 2.7 2.7L12.25 14.15 9 15l.85-3.25L17.3 3.7Z" /></Stroke>;
export const SettingsIcon = (p: IconProps) => <Stroke {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.5-2.35.95a7.5 7.5 0 0 0-2.6-1.5L14 2.5h-4l-.45 2.45a7.5 7.5 0 0 0-2.6 1.5L4.6 5.5l-2 3.5 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.5 2.35-.95a7.5 7.5 0 0 0 2.6 1.5L10 21.5h4l.45-2.45a7.5 7.5 0 0 0 2.6-1.5l2.35.95 2-3.5-2-1.5Z" /></Stroke>;
export const PencilIcon = (p: IconProps) => <Stroke {...p}><path d="M15.6 4.6a2 2 0 0 1 2.8 2.8L8 17.8 4.5 18.9l1.1-3.5L15.6 4.6Z" /></Stroke>;
export const FilterIcon = (p: IconProps) => <Stroke {...p}><path d="M4 6.5h16M7 12h10M10 17.5h4" /></Stroke>;
export const UserIcon = (p: IconProps) => <Stroke {...p}><circle cx="12" cy="8.5" r="3.75" /><path d="M4.75 20c.9-3.4 3.7-5.25 7.25-5.25S18.35 16.6 19.25 20" /></Stroke>;
export const UsersIcon = (p: IconProps) => <Stroke {...p}><circle cx="9.5" cy="8.5" r="3.25" /><path d="M3.75 19.5c.75-3 3-4.75 5.75-4.75s5 1.75 5.75 4.75" /><path d="M15.5 5.6a3.25 3.25 0 0 1 0 5.8M17.25 14.9c1.6.6 2.6 2 3 4.1" /></Stroke>;
export const ArrowDownIcon = (p: IconProps) => <Stroke strokeWidth={2} {...p}><path d="M12 5v14M6 13l6 6 6-6" /></Stroke>;
export const ArrowUpIcon = (p: IconProps) => <Stroke strokeWidth={2} {...p}><path d="M12 19V5M6 11l6-6 6 6" /></Stroke>;
export const CloseIcon = (p: IconProps) => <Stroke strokeWidth={2} {...p}><path d="M6 6l12 12M18 6 6 18" /></Stroke>;
export const CheckIcon = (p: IconProps) => <Stroke strokeWidth={2.2} {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Stroke>;
export const CheckCircleIcon = (p: IconProps) => <Stroke {...p}><circle cx="12" cy="12" r="8.75" /><path d="m8.25 12.25 2.5 2.5 5-5.25" /></Stroke>;
export const ArchiveIcon = (p: IconProps) => <Stroke {...p}><rect x="3.25" y="4.25" width="17.5" height="4.5" rx="1.25" /><path d="M5 8.75v9.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-9.5M10 12.5h4" /></Stroke>;

// ── Channel header / tabs ────────────────────────────────────────────────────
export const MessageTabIcon = ({ filled, ...p }: IconProps) =>
  filled ? (
    <Fill {...p}><path d="M12 3c4.97 0 9 3.58 9 8s-4.03 8-9 8c-1 0-1.96-.14-2.86-.4L4.6 20.4a.8.8 0 0 1-1.05-.95l.95-3.7A7.5 7.5 0 0 1 3 11c0-4.42 4.03-8 9-8Z" /></Fill>
  ) : (
    <Stroke {...p}><path d="M12 3.75c4.6 0 8.25 3.25 8.25 7.25S16.6 18.25 12 18.25c-.95 0-1.85-.13-2.7-.38L4.5 19.75l.95-3.65A6.8 6.8 0 0 1 3.75 11c0-4 3.65-7.25 8.25-7.25Z" /></Stroke>
  );
export const PinIcon = ({ filled, ...p }: IconProps) =>
  filled ? (
    <Fill {...p}><path d="M14.7 2.8a1 1 0 0 1 1.4 0l5.1 5.1a1 1 0 0 1 0 1.4l-1.6 1.6a1 1 0 0 1-1 .25l-3.3 3.3.4 3.6a1 1 0 0 1-.3.8l-1 1a1 1 0 0 1-1.4 0l-3.25-3.25L4.7 21.6a.9.9 0 1 1-1.3-1.3l5-5.05L5.15 12a1 1 0 0 1 0-1.4l1-1a1 1 0 0 1 .8-.3l3.6.4 3.3-3.3a1 1 0 0 1 .25-1l.6-1.6Z" /></Fill>
  ) : (
    <Stroke {...p}><path d="m15.4 3.4 5.2 5.2-1.9 1.9-.9-.3-3.6 3.6.4 3.9-1.3 1.3-7.4-7.4 1.3-1.3 3.9.4 3.6-3.6-.3-.9 1-1.8ZM8.5 15.5 3.75 20.25" /></Stroke>
  );
export const LinkIcon = (p: IconProps) => <Stroke {...p}><path d="M10.5 13.5a3.75 3.75 0 0 0 5.3 0l3-3a3.75 3.75 0 0 0-5.3-5.3l-1 1" /><path d="M13.5 10.5a3.75 3.75 0 0 0-5.3 0l-3 3a3.75 3.75 0 0 0 5.3 5.3l1-1" /></Stroke>;
export const CanvasIcon = (p: IconProps) => <Stroke {...p}><rect x="4.25" y="3.25" width="15.5" height="17.5" rx="2.5" /><path d="M8 8h8M8 12h8M8 16h4.5" /></Stroke>;

// ── Message actions ──────────────────────────────────────────────────────────
export const EmojiAddIcon = (p: IconProps) => <Stroke {...p}><path d="M20.6 11a8.75 8.75 0 1 1-7.6-7.7" /><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" /><circle cx="9" cy="10" r=".9" fill="currentColor" stroke="none" /><circle cx="15" cy="10" r=".9" fill="currentColor" stroke="none" /><path d="M18.5 2.5v5M16 5h5" /></Stroke>;
export const EmojiIcon = (p: IconProps) => <Stroke {...p}><circle cx="12" cy="12" r="8.75" /><path d="M8.5 14.25a4.5 4.5 0 0 0 7 0" /><circle cx="9" cy="10" r=".9" fill="currentColor" stroke="none" /><circle cx="15" cy="10" r=".9" fill="currentColor" stroke="none" /></Stroke>;
export const ReplyThreadIcon = (p: IconProps) => <Stroke {...p}><path d="M12 3.75c4.6 0 8.25 3.2 8.25 7.25S16.6 18.25 12 18.25c-.9 0-1.8-.1-2.6-.35L5 20l.9-3.6C4.6 15 3.75 13.1 3.75 11 3.75 6.95 7.4 3.75 12 3.75Z" /></Stroke>;
export const ForwardIcon = (p: IconProps) => <Stroke {...p}><path d="M14 5.5 20 11l-6 5.5" /><path d="M20 11H11a6.5 6.5 0 0 0-6.5 6.5V19" /></Stroke>;
export const CopyIcon = (p: IconProps) => <Stroke {...p}><rect x="8.25" y="8.25" width="11.5" height="11.5" rx="2" /><path d="M15.75 8.25V6A1.75 1.75 0 0 0 14 4.25H6A1.75 1.75 0 0 0 4.25 6v8A1.75 1.75 0 0 0 6 15.75h2.25" /></Stroke>;
export const TrashIcon = (p: IconProps) => <Stroke {...p}><path d="M4.5 6.75h15M9.75 6.75V4.75h4.5v2M6.5 6.75l.85 12.1a1.5 1.5 0 0 0 1.5 1.4h6.3a1.5 1.5 0 0 0 1.5-1.4l.85-12.1" /></Stroke>;
export const MarkUnreadIcon = (p: IconProps) => <Stroke {...p}><path d="M20.25 12.5v4.75a2 2 0 0 1-2 2H5.75a2 2 0 0 1-2-2V8.75a2 2 0 0 1 2-2h8" /><path d="m3.75 8.5 8.25 5.5 4-2.65" /><circle cx="19" cy="6" r="2.5" fill="currentColor" stroke="none" /></Stroke>;

// ── Composer ─────────────────────────────────────────────────────────────────
export const BoldIcon = (p: IconProps) => <Stroke strokeWidth={2.4} {...p}><path d="M7.5 4.75h5.25a3.6 3.6 0 0 1 0 7.25H7.5V4.75ZM7.5 12h6.25a3.6 3.6 0 0 1 0 7.25H7.5V12Z" /></Stroke>;
export const ItalicIcon = (p: IconProps) => <Stroke strokeWidth={2} {...p}><path d="M10.5 4.75h7M6.5 19.25h7M14 4.75l-4 14.5" /></Stroke>;
export const UnderlineIcon = (p: IconProps) => <Stroke strokeWidth={2} {...p}><path d="M7 4.25v7a5 5 0 0 0 10 0v-7M5.5 20h13" /></Stroke>;
export const StrikeIcon = (p: IconProps) => <Stroke strokeWidth={2} {...p}><path d="M4.5 12h15M16.5 7.25c-.6-1.6-2.3-2.75-4.5-2.75-2.6 0-4.5 1.4-4.5 3.4 0 1.2.6 2 1.7 2.6M8 16.8c.6 1.6 2.3 2.75 4.2 2.75 2.7 0 4.6-1.4 4.6-3.45 0-.7-.2-1.3-.6-1.85" /></Stroke>;
export const OrderedListIcon = (p: IconProps) => <Stroke {...p}><path d="M10 6.5h10M10 12h10M10 17.5h10" /><path d="M4 5.2 5.4 4.5V9M4 9h2.8M3.9 14.7c.2-.6.8-1 1.4-1 .8 0 1.4.5 1.4 1.2 0 .9-1.4 1.6-2.8 3.1h2.9" /></Stroke>;
export const BulletListIcon = (p: IconProps) => <Stroke {...p}><path d="M9.5 6.5h10.5M9.5 12h10.5M9.5 17.5h10.5" /><circle cx="5" cy="6.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="5" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="5" cy="17.5" r="1.1" fill="currentColor" stroke="none" /></Stroke>;
export const QuoteIcon = (p: IconProps) => <Stroke strokeWidth={1.9} {...p}><path d="M5 4.5v15M9.5 7h10M9.5 12h10M9.5 17h6" /></Stroke>;
export const CodeIcon = (p: IconProps) => <Stroke strokeWidth={1.9} {...p}><path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5" /></Stroke>;
export const CodeBlockIcon = (p: IconProps) => <Stroke {...p}><rect x="3.25" y="4.25" width="17.5" height="15.5" rx="2.5" /><path d="m9.5 9.5-2.5 2.5 2.5 2.5M14.5 9.5l2.5 2.5-2.5 2.5" /></Stroke>;
export const FormatAaIcon = (p: IconProps) => <Stroke strokeWidth={1.8} {...p}><path d="m3.5 17 4.25-11 4.25 11M5 13.25h5.5" /><path d="M18.5 11.5v5.5M18.5 13.25c0-1-1-1.75-2.25-1.75s-2.25.8-2.25 2.75 1 2.75 2.25 2.75 2.25-.75 2.25-1.75" /><path d="M3 20.25h18" /></Stroke>;
export const AtIcon = (p: IconProps) => <Stroke strokeWidth={1.8} {...p}><circle cx="12" cy="12" r="3.75" /><path d="M15.75 12v1.4a2.35 2.35 0 0 0 4.7 0V12A8.45 8.45 0 1 0 17 18.8" /></Stroke>;
export const VideoIcon = (p: IconProps) => <Stroke {...p}><rect x="3.25" y="6.25" width="12.5" height="11.5" rx="2.25" /><path d="m15.75 10.5 5-3v9l-5-3" /></Stroke>;
export const MicIcon = (p: IconProps) => <Stroke {...p}><rect x="9" y="3.25" width="6" height="11" rx="3" /><path d="M5.75 11.25a6.25 6.25 0 0 0 12.5 0M12 17.5v3.25" /></Stroke>;
export const SlashBoxIcon = (p: IconProps) => <Stroke {...p}><rect x="4.25" y="4.25" width="15.5" height="15.5" rx="2.5" /><path d="m14 8-4 8" /></Stroke>;
export const PaperclipIcon = (p: IconProps) => <Stroke {...p}><path d="m19 11.5-7.1 7.1a4.75 4.75 0 0 1-6.7-6.7l7.6-7.6a3.15 3.15 0 0 1 4.45 4.45l-7.3 7.3a1.6 1.6 0 0 1-2.25-2.25L14.25 7.3" /></Stroke>;
export const CalendarClockIcon = (p: IconProps) => <Stroke {...p}><rect x="3.75" y="5.25" width="14" height="13" rx="2" /><path d="M3.75 9.25h14M7.75 3.25v4M13.75 3.25v4" /><circle cx="17.5" cy="17.5" r="3.75" fill="#fff" /><path d="M17.5 15.75v1.9l1.2.8" /></Stroke>;
