// メインビュー「Slackbot」: 紹介ページ（ヒントとショートカット）
import { useAppStore } from '../../store/useAppStore';
import ViewHeader from './ViewHeader';
import { SlackbotIcon } from '../ui/icons';

const TIPS: { title: string; body: string }[] = [
  { title: 'スレッドで会話を整理する', body: 'メッセージにカーソルを合わせて「スレッドで返信する」を選ぶと、チャンネルを散らかさずに話を続けられます。' },
  { title: '@メンションで相手に知らせる', body: '@ に続けて名前を入力するとメンバーに通知が届きます。@channel でチャンネル全員に知らせることもできます。' },
  { title: '「後で」に保存する', body: 'あとで対応したいメッセージはブックマークアイコンで保存し、左の「後で」タブから確認できます。' },
  { title: 'チャンネルにスターを付ける', body: 'よく使うチャンネルはサイドバーの「スター付き」にドラッグ＆ドロップすると上部に固定されます。' },
  { title: '下書きは自動保存', body: '入力途中のメッセージは自動的に保存され、「下書き＆送信済み」からいつでも再開できます。' },
];

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['⌘', 'K'], label: '会話にジャンプ' },
  { keys: ['⌘', '/'], label: 'キーボードショートカットを表示' },
  { keys: ['Alt', '↑ / ↓'], label: '前 / 次のチャンネル' },
  { keys: ['Esc'], label: 'パネルを閉じる' },
];

export default function SlackbotView() {
  const { user } = useAppStore((s) => s.auth);
  const setShortcutsOpen = useAppStore((s) => s.setShortcutsOpen);
  const name = user?.displayName ?? 'こんにちは';

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <ViewHeader title="Slackbot" icon={<SlackbotIcon className="w-5 h-5" />} />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[760px] mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-6">
            <span className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-white flex-shrink-0" style={{ background: 'var(--sk-window)' }}>
              <SlackbotIcon className="w-10 h-10" />
            </span>
            <div>
              <h2 className="text-[22px] text-[var(--sk-text)]" style={{ fontWeight: 900 }}>Slackbot</h2>
              <p className="text-[15px] text-[var(--sk-text-2)]">Creatte の使い方をご案内します</p>
            </div>
          </div>

          <p className="text-[15px] leading-[22px] text-[var(--sk-text)] mb-6">
            {name} さん、こんにちは！👋 ここでは Creatte をもっと便利に使うためのヒントを紹介します。
          </p>

          <h3 className="text-[15px] text-[var(--sk-text)] mb-3" style={{ fontWeight: 900 }}>使い方のヒント</h3>
          <ol className="flex flex-col gap-3 mb-8">
            {TIPS.map((t, i) => (
              <li key={t.title} className="flex gap-3 p-4 rounded-lg" style={{ border: '1px solid var(--sk-border)' }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0" style={{ background: 'var(--sk-accent)' }}>{i + 1}</span>
                <div>
                  <p className="text-[15px] font-bold text-[var(--sk-text)]">{t.title}</p>
                  <p className="text-[14px] leading-[20px] text-[var(--sk-text-2)] mt-0.5">{t.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <h3 className="text-[15px] text-[var(--sk-text)] mb-3" style={{ fontWeight: 900 }}>キーボードショートカット</h3>
          <ul className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid var(--sk-border)' }}>
            {SHORTCUTS.map((s, i) => (
              <li key={s.label} className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: i ? '1px solid var(--sk-border)' : undefined }}>
                <span className="text-[14px] text-[var(--sk-text)]">{s.label}</span>
                <span className="flex gap-1">
                  {s.keys.map((k) => (
                    <kbd key={k} className="px-1.5 min-w-[22px] text-center text-[12px] rounded" style={{ background: 'var(--sk-subtle)', border: '1px solid var(--sk-border)' }}>{k}</kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setShortcutsOpen(true)} className="text-[14px] text-[var(--sk-link)] hover:underline">
            すべてのショートカットを表示
          </button>
        </div>
      </div>
    </div>
  );
}
