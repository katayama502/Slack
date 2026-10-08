// メインビュー「ハドルミーティング」: 音声通話は未対応のため正直な空状態を表示
import ViewHeader, { EmptyState } from './ViewHeader';
import { HeadphonesIcon } from '../ui/icons';

export default function HuddlesView() {
  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <ViewHeader title="ハドルミーティング" />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <EmptyState
          icon={<HeadphonesIcon className="w-8 h-8" />}
          title="ハドルミーティングの履歴はありません"
          body="ハドルミーティングは、チャンネルや DM で気軽に音声通話を始められる機能です。"
        >
          <p className="mt-3 px-3 py-2 rounded-lg text-[13px] text-[var(--sk-text-2)]" style={{ background: 'var(--sk-subtle)' }}>
            このバージョンでは音声・ビデオ通話には対応していません。
          </p>
        </EmptyState>
      </div>
    </div>
  );
}
