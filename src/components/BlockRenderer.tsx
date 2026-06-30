import { marked } from 'marked';
import type { Block } from '../content/schema';
import ClickableImage from './ClickableImage';
import Video from './Video';

/**
 * Renders an ordered list of content blocks. This is the single place that
 * turns structured JSON content into UI — shared by every block-based page
 * (news posts and the constitution web version). The local CMS edits the
 * blocks; this component owns how they look.
 *
 * Media `src` values are expected to be already resolved to public URLs by the
 * content loader (see src/data/news.ts), so blocks here are render-ready.
 */

// Inline markdown (**bold**, *italic*, [links]) is rendered to HTML at render
// time. Content is single-author and trusted, so dangerouslySetInnerHTML is
// acceptable here — the CMS never lets an untrusted party author blocks.
const inline = (text: string): { __html: string } => ({
  __html: marked.parseInline(text) as string,
});

const HEADING_CLASS: Record<1 | 2 | 3, string> = {
  1: 'font-display text-4xl font-light text-ink mt-14 mb-6 tracking-tight',
  2: 'font-display text-3xl font-light text-ink mt-12 mb-5 tracking-tight',
  3: 'font-display text-2xl font-light text-ink mt-10 mb-4 tracking-tight',
};

const CALLOUT_CLASS: Record<NonNullable<Extract<Block, { type: 'callout' }>['variant']>, string> = {
  info: 'border-sky-800/60 bg-sky-950/30 text-sky-100',
  note: 'border-line/15 bg-surface text-ink',
  success: 'border-emerald-800/60 bg-emerald-950/30 text-emerald-100',
  warning: 'border-amber-800/60 bg-amber-950/30 text-amber-100',
};

function renderBlock(block: Block) {
  switch (block.type) {
    case 'heading': {
      const Tag = (`h${block.level}` as 'h1' | 'h2' | 'h3');
      return <Tag key={block.id} className={HEADING_CLASS[block.level]} dangerouslySetInnerHTML={inline(block.text)} />;
    }

    case 'paragraph':
      return (
        <p
          key={block.id}
          className="text-ink-soft leading-relaxed font-light mb-6 text-[17px]"
          dangerouslySetInnerHTML={inline(block.text)}
        />
      );

    case 'image':
      return (
        <div key={block.id} className="my-12 flex flex-col items-center">
          <ClickableImage
            src={block.src}
            alt={block.alt || ''}
            className="max-w-md w-full h-auto border border-line/10 mx-auto"
          />
          {(block.caption || block.alt) && (
            <p className="text-ink-faint text-sm font-light mt-3 text-center max-w-md">
              {block.caption || block.alt}
            </p>
          )}
        </div>
      );

    case 'video':
      return (
        <div key={block.id} className="my-12 flex justify-center">
          <Video
            src={block.src}
            caption={block.caption}
            autoplay={block.autoplay}
            loop={block.loop}
            muted={block.muted}
            controls={block.controls}
            className="max-w-md w-full h-auto"
          />
        </div>
      );

    case 'list': {
      const ListTag = block.ordered ? 'ol' : 'ul';
      return (
        <ListTag
          key={block.id}
          className={`mb-6 space-y-2 text-ink-soft font-light text-[17px] ${
            block.ordered ? 'list-decimal' : 'list-disc'
          } list-outside pl-6 marker:text-ink-faint`}
        >
          {block.items.map((item, i) => (
            <li key={i} className="leading-relaxed" dangerouslySetInnerHTML={inline(item)} />
          ))}
        </ListTag>
      );
    }

    case 'code':
      return (
        <pre
          key={block.id}
          className="my-8 overflow-x-auto border border-line/10 bg-well p-4"
        >
          {block.language && (
            <div className="mb-2 text-xs uppercase tracking-[0.15em] text-ink-faint">{block.language}</div>
          )}
          <code className="font-mono text-sm text-ink">{block.code}</code>
        </pre>
      );

    case 'quote':
      return (
        <blockquote
          key={block.id}
          className="my-8 border-l-2 border-line/20 pl-6 italic text-ink-soft font-light text-[17px]"
          dangerouslySetInnerHTML={inline(block.text)}
        />
      );

    case 'divider':
      return <hr key={block.id} className="my-12 border-line/10" />;

    case 'callout':
      return (
        <div
          key={block.id}
          className={`my-8 border p-4 font-light leading-relaxed ${CALLOUT_CLASS[block.variant]}`}
          dangerouslySetInnerHTML={inline(block.text)}
        />
      );

    default:
      return null;
  }
}

const BlockRenderer = ({ blocks }: { blocks: Block[] }) => <>{blocks.map(renderBlock)}</>;

export default BlockRenderer;
