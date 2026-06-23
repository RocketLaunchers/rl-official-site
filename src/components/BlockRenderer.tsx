import { marked } from 'marked';
import type { Block } from '../content/schema';
import ClickableImage from './ClickableImage';
import Video from './Video';

/**
 * Renders an ordered list of content blocks. This is the single place that
 * turns structured JSON content into UI — shared by every block-based page
 * (blog posts today; projects/other docs later). The local CMS edits the
 * blocks; this component owns how they look.
 *
 * Media `src` values are expected to be already resolved to public URLs by the
 * content loader (see src/data/blogPosts.ts), so blocks here are render-ready.
 */

// Inline markdown (**bold**, *italic*, [links]) is rendered to HTML at render
// time. Content is single-author and trusted, so dangerouslySetInnerHTML is
// acceptable here — the CMS never lets an untrusted party author blocks.
const inline = (text: string): { __html: string } => ({
  __html: marked.parseInline(text) as string,
});

const HEADING_CLASS: Record<1 | 2 | 3, string> = {
  1: 'text-4xl font-light text-white mt-12 mb-6',
  2: 'text-3xl font-light text-white mt-12 mb-6',
  3: 'text-2xl font-light text-white mt-10 mb-4',
};

const CALLOUT_CLASS: Record<NonNullable<Extract<Block, { type: 'callout' }>['variant']>, string> = {
  info: 'border-blue-700 bg-blue-950/40 text-blue-100',
  note: 'border-gray-700 bg-gray-800/40 text-gray-200',
  success: 'border-green-700 bg-green-950/40 text-green-100',
  warning: 'border-yellow-700 bg-yellow-950/40 text-yellow-100',
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
          className="text-gray-300 leading-relaxed font-light mb-6 text-lg"
          dangerouslySetInnerHTML={inline(block.text)}
        />
      );

    case 'image':
      return (
        <div key={block.id} className="my-12 flex flex-col items-center">
          <ClickableImage
            src={block.src}
            alt={block.alt || ''}
            className="max-w-xs w-full h-auto border border-gray-700 rounded-lg mx-auto"
          />
          {(block.caption || block.alt) && (
            <p className="text-gray-500 text-sm font-light mt-2 text-center max-w-xs">
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
            className="max-w-xs w-full h-auto"
          />
        </div>
      );

    case 'list': {
      const ListTag = block.ordered ? 'ol' : 'ul';
      return (
        <ListTag
          key={block.id}
          className={`mb-6 space-y-2 text-gray-300 font-light text-lg ${
            block.ordered ? 'list-decimal' : 'list-disc'
          } list-outside pl-6`}
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
          className="my-8 overflow-x-auto rounded-lg border border-gray-800 bg-gray-900 p-4"
        >
          {block.language && (
            <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">{block.language}</div>
          )}
          <code className="font-mono text-sm text-gray-200">{block.code}</code>
        </pre>
      );

    case 'quote':
      return (
        <blockquote
          key={block.id}
          className="my-8 border-l-4 border-gray-600 pl-6 italic text-gray-300 font-light text-lg"
          dangerouslySetInnerHTML={inline(block.text)}
        />
      );

    case 'divider':
      return <hr key={block.id} className="my-12 border-gray-800" />;

    case 'callout':
      return (
        <div
          key={block.id}
          className={`my-8 rounded-lg border p-4 font-light leading-relaxed ${CALLOUT_CLASS[block.variant]}`}
          dangerouslySetInnerHTML={inline(block.text)}
        />
      );

    default:
      return null;
  }
}

const BlockRenderer = ({ blocks }: { blocks: Block[] }) => <>{blocks.map(renderBlock)}</>;

export default BlockRenderer;
