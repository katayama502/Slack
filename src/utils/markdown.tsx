import React from 'react';

/**
 * シンプルなインラインMarkdownをReactノードに変換する
 * 対応: *bold* | _italic_ | ~strikethrough~ | @[name](uid) メンション
 */
export function renderMarkdown(text: string): React.ReactNode[] {
  // まず @メンション・太字・斜体・打消しをトークン分割
  const pattern = /(@\[[^\]]+\]\([^)]+\))|\*([^*]+)\*|_([^_]+)_|~([^~]+)~/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // マッチ前のプレーンテキスト
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // @メンション
      const nameMatch = match[1].match(/^@\[([^\]]+)\]/);
      const name = nameMatch ? nameMatch[1] : match[1];
      nodes.push(
        <span
          key={match.index}
          className="font-medium cursor-pointer hover:underline"
          style={{ color: '#1264A3', background: '#E8F5FA', borderRadius: '3px', padding: '0 2px' }}
        >
          @{name}
        </span>
      );
    } else if (match[2]) {
      // *bold*
      nodes.push(<strong key={match.index} className="font-bold">{match[2]}</strong>);
    } else if (match[3]) {
      // _italic_
      nodes.push(<em key={match.index} className="italic">{match[3]}</em>);
    } else if (match[4]) {
      // ~strikethrough~
      nodes.push(<s key={match.index} className="line-through">{match[4]}</s>);
    }

    lastIndex = pattern.lastIndex;
  }

  // 末尾のプレーンテキスト
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}
