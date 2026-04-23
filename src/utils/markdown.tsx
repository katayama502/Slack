import React from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

type BlockNode =
  | { type: 'para'; text: string }
  | { type: 'code'; lang: string; lines: string[] }
  | { type: 'quote'; lines: string[] }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] };

// ─── Block parser ────────────────────────────────────────────────────────────

function parseBlocks(text: string): BlockNode[] {
  const rawLines = text.split('\n');
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];

    // ── Code fence ────────────────────────────────────────────────
    if (line.trimStart().startsWith('```')) {
      const lang = line.trimStart().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < rawLines.length) {
        if (rawLines[i].trimStart().startsWith('```')) { i++; break; }
        codeLines.push(rawLines[i]);
        i++;
      }
      while (codeLines.length > 0 && codeLines[0].trim() === '') codeLines.shift();
      while (codeLines.length > 0 && codeLines[codeLines.length - 1].trim() === '') codeLines.pop();
      blocks.push({ type: 'code', lang, lines: codeLines });
      continue;
    }

    // ── Blockquote ────────────────────────────────────────────────
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < rawLines.length && rawLines[i].startsWith('>')) {
        quoteLines.push(rawLines[i].slice(1).trimStart());
        i++;
      }
      blocks.push({ type: 'quote', lines: quoteLines });
      continue;
    }

    // ── Unordered list: -, *, • ────────────────────────────────────
    if (/^(\s*[-*•]\s)/.test(line)) {
      const items: string[] = [];
      while (i < rawLines.length && /^(\s*[-*•]\s)/.test(rawLines[i])) {
        items.push(rawLines[i].replace(/^\s*[-*•]\s/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // ── Ordered list: 1. 2. 3. ────────────────────────────────────
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < rawLines.length && /^\d+\.\s/.test(rawLines[i])) {
        items.push(rawLines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // ── Paragraph ─────────────────────────────────────────────────
    const paraLines: string[] = [];
    while (i < rawLines.length) {
      const l = rawLines[i];
      if (
        l.trimStart().startsWith('```') ||
        l.startsWith('>') ||
        /^(\s*[-*•]\s)/.test(l) ||
        /^\d+\.\s/.test(l)
      ) break;
      paraLines.push(l);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'para', text: paraLines.join('\n') });
    }
  }

  return blocks;
}

// ─── Inline renderer ─────────────────────────────────────────────────────────

function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

function renderInline(text: string): React.ReactNode[] {
  const pattern =
    /(@\[[^\]]+\]\([^)]+\))|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s<>"]+[^\s<>".,;!?()'\]])|(?<!\w)\*([^\s*](?:[^*\n]*[^\s*])?)\*(?!\w)|(?<!\w)_([^\s_](?:[^_\n]*[^\s_])?)_(?!\w)|(?<!\w)~([^\s~](?:[^~\n]*[^\s~])?)~(?!\w)|`([^`\n]+)`|(?<!\w)#([a-z][a-zA-Z0-9_-]*)(?!\w)/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
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
            background: 'rgba(18,100,163,0.1)',
            borderRadius: '3px',
            padding: '0 3px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          @{name}
        </span>
      );
    } else if (match[2]) {
      const linkText = match[3];
      const linkUrl = match[4];
      nodes.push(
        isSafeUrl(linkUrl) ? (
          <a
            key={key}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1264A3', textDecoration: 'none' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'; }}
            onClick={(e) => e.stopPropagation()}
          >
            {linkText}
          </a>
        ) : (
          <span key={key}>{linkText}</span>
        )
      );
    } else if (match[5]) {
      const rawUrl = match[5];
      nodes.push(
        <a
          key={key}
          href={rawUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#1264A3', textDecoration: 'none' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'; }}
          onClick={(e) => e.stopPropagation()}
        >
          {rawUrl}
        </a>
      );
    } else if (match[6] !== undefined) {
      nodes.push(<strong key={key} style={{ fontWeight: 700 }}>{match[6]}</strong>);
    } else if (match[7] !== undefined) {
      nodes.push(<em key={key} style={{ fontStyle: 'italic' }}>{match[7]}</em>);
    } else if (match[8] !== undefined) {
      nodes.push(<s key={key}>{match[8]}</s>);
    } else if (match[9] !== undefined) {
      nodes.push(
        <code
          key={key}
          style={{
            fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
            fontSize: '12.5px',
            background: 'rgba(29,28,29,0.06)',
            border: '1px solid rgba(29,28,29,0.13)',
            borderRadius: '3px',
            padding: '2px 5px',
            color: '#E01E5A',
            lineHeight: 1.4,
          }}
        >
          {match[9]}
        </code>
      );
    } else if (match[10] !== undefined) {
      // #channel-name mention
      nodes.push(
        <span
          key={key}
          style={{
            color: '#1264A3',
            background: 'rgba(18,100,163,0.1)',
            borderRadius: '3px',
            padding: '0 3px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          #{match[10]}
        </span>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

// ─── Block renderer ──────────────────────────────────────────────────────────

function renderBlock(block: BlockNode, index: number): React.ReactNode {
  switch (block.type) {

    case 'code':
      return (
        <pre
          key={index}
          style={{
            fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
            fontSize: '12.5px',
            lineHeight: 1.55,
            background: 'rgba(29,28,29,0.04)',
            border: '1px solid rgba(29,28,29,0.13)',
            borderRadius: '4px',
            padding: '8px 12px',
            margin: '4px 0',
            overflowX: 'auto',
            whiteSpace: 'pre',
            wordBreak: 'normal',
            color: '#1D1C1D',
            maxWidth: '100%',
          }}
        >
          {block.lang && (
            <span
              style={{
                display: 'block',
                fontSize: '11px',
                color: '#9E9EA6',
                marginBottom: '6px',
                fontFamily: 'inherit',
                letterSpacing: '0.3px',
              }}
            >
              {block.lang}
            </span>
          )}
          <code style={{ fontFamily: 'inherit', color: 'inherit', background: 'none', border: 'none', padding: 0, fontSize: 'inherit', borderRadius: 0 }}>
            {block.lines.join('\n')}
          </code>
        </pre>
      );

    case 'quote':
      return (
        <blockquote
          key={index}
          style={{
            borderLeft: '3px solid #DDDDDD',
            paddingLeft: '10px',
            margin: '3px 0',
            color: '#616061',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {block.lines.map((line, j) => (
            <React.Fragment key={j}>
              {j > 0 && '\n'}
              {renderInline(line)}
            </React.Fragment>
          ))}
        </blockquote>
      );

    case 'ul':
      return (
        <ul
          key={index}
          style={{
            margin: '2px 0',
            paddingLeft: '20px',
            listStyleType: 'disc',
          }}
        >
          {block.items.map((item, j) => (
            <li key={j} style={{ margin: '1px 0', wordBreak: 'break-word' }}>
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );

    case 'ol':
      return (
        <ol
          key={index}
          style={{
            margin: '2px 0',
            paddingLeft: '20px',
            listStyleType: 'decimal',
          }}
        >
          {block.items.map((item, j) => (
            <li key={j} style={{ margin: '1px 0', wordBreak: 'break-word' }}>
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );

    case 'para':
    default:
      return block.text ? (
        <p
          key={index}
          style={{
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {renderInline(block.text)}
        </p>
      ) : null;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  const blocks = parseBlocks(text);
  if (blocks.length === 0) return null;

  if (blocks.length === 1 && blocks[0].type === 'para') {
    return (
      <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {renderInline(blocks[0].text)}
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}
