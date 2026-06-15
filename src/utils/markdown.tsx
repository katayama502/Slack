import React, { useState } from 'react';

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

// ─── Code block with copy button ─────────────────────────────────────────────

function CodeBlock({ lang, lines, index }: { lang: string; lines: string[]; index: number }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div key={index} className="relative group/code" style={{ margin: '4px 0' }}>
      <pre
        style={{
          fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
          fontSize: '12.5px',
          lineHeight: 1.55,
          background: 'rgba(29,28,29,0.04)',
          border: '1px solid rgba(29,28,29,0.13)',
          borderRadius: '4px',
          padding: '8px 12px',
          paddingRight: '64px',
          overflowX: 'auto',
          whiteSpace: 'pre',
          wordBreak: 'normal',
          color: '#1D1C1D',
          maxWidth: '100%',
        }}
      >
        {lang && (
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
            {lang}
          </span>
        )}
        <code style={{ fontFamily: 'inherit', color: 'inherit', background: 'none', border: 'none', padding: 0, fontSize: 'inherit', borderRadius: 0 }}>
          {lines.join('\n')}
        </code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 flex items-center gap-1 px-2 py-0.5 text-[11px] rounded font-medium"
        style={{
          background: copied ? '#007A5A' : '#FFFFFF',
          color: copied ? '#FFFFFF' : '#616061',
          border: `1px solid ${copied ? '#007A5A' : '#DDDDDD'}`,
          boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
          transition: 'background 150ms, color 150ms, border-color 150ms, opacity 200ms',
        }}
      >
        {copied ? (
          <>
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            コピー済み
          </>
        ) : (
          <>
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
            </svg>
            コピー
          </>
        )}
      </button>
    </div>
  );
}

// ─── Inline image detector ────────────────────────────────────────────────────

function isImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return /\.(jpe?g|png|gif|webp|svg|bmp)(\?.*)?$/i.test(u.pathname);
  } catch {
    return false;
  }
}

// ─── Block renderer ──────────────────────────────────────────────────────────

function renderBlock(block: BlockNode, index: number): React.ReactNode {
  switch (block.type) {

    case 'code':
      return <CodeBlock key={index} index={index} lang={block.lang} lines={block.lines} />;

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
    default: {
      if (!block.text) return null;
      const trimmed = block.text.trim();
      // Standalone image URL → show inline preview
      if (/^https?:\/\/\S+$/.test(trimmed) && isImageUrl(trimmed)) {
        return (
          <a key={index} href={trimmed} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            <img
              src={trimmed}
              alt=""
              style={{
                maxWidth: '360px',
                maxHeight: '240px',
                borderRadius: '6px',
                display: 'block',
                margin: '4px 0',
                border: '1px solid rgba(29,28,29,0.1)',
                objectFit: 'contain',
                background: '#F8F8F8',
              }}
              loading="lazy"
            />
          </a>
        );
      }
      return (
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
      );
    }
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
