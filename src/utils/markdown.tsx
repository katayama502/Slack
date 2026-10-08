import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

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

export interface RenderMarkdownOptions {
  /** 自分の uid。自分宛メンションを黄色チップで表示するのに使う */
  currentUid?: string;
}

const MONO = '"SFMono-Regular", Monaco, Menlo, Consolas, "Liberation Mono", "Courier New", monospace';

function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

const linkHoverOn = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.textDecoration = 'underline'; };
const linkHoverOff = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.textDecoration = 'none'; };

function SafeLink({ href, children }: { href: string; children: React.ReactNode }) {
  if (!isSafeUrl(href)) return <span>{children}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: 'var(--sk-link)', textDecoration: 'none', wordBreak: 'break-all' }}
      onMouseEnter={linkHoverOn}
      onMouseLeave={linkHoverOff}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </a>
  );
}

/** メンションチップ（他人: 青 / 自分・@channel 等: 黄） */
function MentionChip({ label, self }: { label: string; self: boolean }) {
  const bg = self ? 'var(--sk-mention-me-bg)' : 'var(--sk-mention-bg)';
  return (
    <span
      style={{
        color: self ? 'var(--sk-text)' : 'var(--sk-link)',
        background: bg,
        borderRadius: '3px',
        padding: '0 2px',
        cursor: 'pointer',
        transition: 'filter 80ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.94)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
    >
      @{label}
    </span>
  );
}

/** #チャンネル名 → 実在すれば移動できるリンク */
function ChannelChip({ name, channelId }: { name: string; channelId: string }) {
  return (
    <span
      role="link"
      tabIndex={0}
      style={{
        color: 'var(--sk-link)',
        background: 'var(--sk-mention-bg)',
        borderRadius: '3px',
        padding: '0 2px',
        cursor: 'pointer',
        textDecoration: 'none',
      }}
      onMouseEnter={linkHoverOn}
      onMouseLeave={linkHoverOff}
      onClick={(e) => {
        e.stopPropagation();
        const st = useAppStore.getState();
        if (st.channels.some((c) => c.id === channelId)) st.setActiveChannel(channelId);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          useAppStore.getState().setActiveChannel(channelId);
        }
      }}
    >
      #{name}
    </span>
  );
}

function renderInline(text: string, opts: RenderMarkdownOptions = {}): React.ReactNode[] {
  const pattern =
    /(@\[.+?\]\([A-Za-z0-9_-]+\))|(@(?:channel|here|everyone))|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s<>"]+[^\s<>".,;!?()'\]])|(?<!\w)\*([^\s*](?:[^*\n]*[^\s*])?)\*(?!\w)|(?<!\w)_([^\s_](?:[^_\n]*[^\s_])?)_(?!\w)|(?<!\w)~([^\s~](?:[^~\n]*[^\s~])?)~(?!\w)|`([^`\n]+)`|(?<![\w#])#(\p{L}[\p{L}\p{N}_-]*)/gu;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  // #channel 判定用（存在するチャンネルのみリンク化。それ以外はプレーンテキスト）
  const channels = useAppStore.getState().channels;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const key = match.index;

    if (match[1]) {
      // @[name](uid) personal mention
      const m = match[1].match(/^@\[(.+)\]\(([A-Za-z0-9_-]+)\)$/);
      const name = m ? m[1] : match[1];
      const uid = m ? m[2] : '';
      nodes.push(<MentionChip key={key} label={name} self={!!opts.currentUid && uid === opts.currentUid} />);
    } else if (match[2]) {
      // @channel / @here / @everyone は全員宛 → 自分宛扱い（黄）
      nodes.push(<MentionChip key={key} label={match[2].slice(1)} self />);
    } else if (match[3]) {
      nodes.push(<SafeLink key={key} href={match[5]}>{match[4]}</SafeLink>);
    } else if (match[6]) {
      nodes.push(<SafeLink key={key} href={match[6]}>{match[6]}</SafeLink>);
    } else if (match[7] !== undefined) {
      nodes.push(<strong key={key} style={{ fontWeight: 700 }}>{match[7]}</strong>);
    } else if (match[8] !== undefined) {
      nodes.push(<em key={key} style={{ fontStyle: 'italic' }}>{match[8]}</em>);
    } else if (match[9] !== undefined) {
      nodes.push(<s key={key}>{match[9]}</s>);
    } else if (match[10] !== undefined) {
      nodes.push(
        <code
          key={key}
          style={{
            fontFamily: MONO,
            fontSize: '12px',
            lineHeight: '18px',
            background: 'rgba(29,28,29,0.04)',
            border: '1px solid var(--sk-border)',
            borderRadius: '3px',
            padding: '2px 3px',
            color: 'var(--sk-red)',
            wordBreak: 'break-word',
          }}
        >
          {match[10]}
        </code>
      );
    } else if (match[11] !== undefined) {
      const name = match[11];
      const ch = channels.find((c) => c.name === name && !c.name.startsWith('__dm__'));
      nodes.push(ch ? <ChannelChip key={key} name={name} channelId={ch.id} /> : `#${name}`);
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
    <div key={index} className="relative group/code" style={{ margin: '4px 0', maxWidth: '100%' }}>
      <pre
        style={{
          fontFamily: MONO,
          fontSize: '12px',
          lineHeight: 1.5,
          background: 'rgba(29,28,29,0.04)',
          border: '1px solid var(--sk-border)',
          borderRadius: '4px',
          padding: '8px',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: 'var(--sk-text)',
          maxWidth: '100%',
        }}
      >
        {lang && (
          <span
            style={{
              display: 'block',
              fontSize: '11px',
              color: 'var(--sk-text-3)',
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
          background: copied ? 'var(--sk-green)' : '#FFFFFF',
          color: copied ? '#FFFFFF' : 'var(--sk-text-2)',
          border: `1px solid ${copied ? 'var(--sk-green)' : 'var(--sk-border)'}`,
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

function renderBlock(block: BlockNode, index: number, opts: RenderMarkdownOptions = {}): React.ReactNode {
  switch (block.type) {

    case 'code':
      return <CodeBlock key={index} index={index} lang={block.lang} lines={block.lines} />;

    case 'quote':
      return (
        <blockquote
          key={index}
          style={{
            borderLeft: '4px solid #DDDDDD',
            paddingLeft: '12px',
            margin: '4px 0',
            color: 'var(--sk-text)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {block.lines.map((line, j) => (
            <React.Fragment key={j}>
              {j > 0 && '\n'}
              {renderInline(line, opts)}
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
              {renderInline(item, opts)}
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
              {renderInline(item, opts)}
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
          {renderInline(block.text, opts)}
        </p>
      );
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Slack 風 mrkdwn を React ノードに変換する（生 HTML は一切挿入しない）。
 * 既存呼び出し `renderMarkdown(text)` との互換を保ちつつ、`opts.currentUid` で自分宛メンションを判別する。
 */
export function renderMarkdown(text: string, opts: RenderMarkdownOptions = {}): React.ReactNode {
  if (!text) return null;

  const blocks = parseBlocks(text);
  if (blocks.length === 0) return null;

  if (blocks.length === 1 && blocks[0].type === 'para') {
    return (
      <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {renderInline(blocks[0].text, opts)}
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {blocks.map((block, i) => renderBlock(block, i, opts))}
    </div>
  );
}
