import React from 'react';

/**
 * Slack-style inline markdown renderer
 * *bold*  _italic_  ~strikethrough~  `code`  @[name](uid)
 *
 * Rules (matching Slack behaviour):
 *  - Opening delimiter must NOT be preceded by a word character
 *  - Opening delimiter must NOT be immediately followed by whitespace
 *  - Closing delimiter must NOT be immediately preceded by whitespace
 *  - Closing delimiter must NOT be followed by a word character
 *  - Content may not contain the delimiter itself
 */
export function renderMarkdown(text: string): React.ReactNode[] {
  // Pattern groups:
  // 1 — @mention  @[name](uid)
  // 2 — *bold*
  // 3 — _italic_
  // 4 — ~strike~
  // 5 — `code`
  const pattern =
    /(@\[[^\]]+\]\([^)]+\))|(?<!\w)\*([^\s*](?:[^*\n]*[^\s*])?)\*(?!\w)|(?<!\w)_([^\s_](?:[^_\n]*[^\s_])?)_(?!\w)|(?<!\w)~([^\s~](?:[^~\n]*[^\s~])?)~(?!\w)|`([^`\n]+)`/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Plain text before this match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const key = match.index;

    if (match[1]) {
      // @mention
      const nameMatch = match[1].match(/^@\[([^\]]+)\]/);
      const name = nameMatch ? nameMatch[1] : match[1];
      nodes.push(
        <span
          key={key}
          style={{
            color: '#1264A3',
            background: '#E8F5FA',
            borderRadius: '3px',
            padding: '0 3px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          @{name}
        </span>
      );
    } else if (match[2] !== undefined) {
      // *bold*
      nodes.push(
        <strong key={key} style={{ fontWeight: 700 }}>
          {match[2]}
        </strong>
      );
    } else if (match[3] !== undefined) {
      // _italic_
      nodes.push(
        <em key={key} style={{ fontStyle: 'italic' }}>
          {match[3]}
        </em>
      );
    } else if (match[4] !== undefined) {
      // ~strikethrough~
      nodes.push(
        <s key={key} style={{ textDecoration: 'line-through' }}>
          {match[4]}
        </s>
      );
    } else if (match[5] !== undefined) {
      // `code`
      nodes.push(
        <code
          key={key}
          style={{
            fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
            fontSize: '13px',
            background: '#F0F0F0',
            border: '1px solid #E0E0E0',
            borderRadius: '3px',
            padding: '1px 5px',
            color: '#C0392B',
          }}
        >
          {match[5]}
        </code>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  // Remaining plain text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}
