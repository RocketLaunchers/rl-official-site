import { marked } from 'marked';
import type { Block } from '@portfolio/content-schema';
import { mediaUrl } from '../api';

/**
 * A website-faithful preview of a post's blocks. Mirrors the site's
 * BlockRenderer markup + look (dark theme, same inline-markdown via marked,
 * images/videos loaded through the Tauri asset protocol) so you can see roughly
 * how a post will render before publishing. Styling lives in styles.css (.preview).
 */

const inline = (text: string): { __html: string } => ({ __html: marked.parseInline(text) as string });

const CALLOUT_BORDER: Record<string, string> = {
  info: '#1d4ed8',
  note: '#4b5563',
  success: '#15803d',
  warning: '#a16207',
};

export default function Preview({ blocks, root, baseDir }: { blocks: Block[]; root: string; baseDir: string }) {
  return (
    <div className="preview">
      <div className="pv-wrap">
        {blocks.length === 0 && <div className="pv-empty">Nothing to preview yet.</div>}
        {blocks.map((block) => {
          switch (block.type) {
            case 'heading': {
              const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3';
              return <Tag key={block.id} dangerouslySetInnerHTML={inline(block.text)} />;
            }
            case 'paragraph':
              return <p key={block.id} dangerouslySetInnerHTML={inline(block.text)} />;
            case 'quote':
              return <blockquote key={block.id} dangerouslySetInnerHTML={inline(block.text)} />;
            case 'list': {
              const Tag = block.ordered ? 'ol' : 'ul';
              return (
                <Tag key={block.id}>
                  {block.items.map((it, i) => <li key={i} dangerouslySetInnerHTML={inline(it)} />)}
                </Tag>
              );
            }
            case 'code':
              return <pre key={block.id}><code>{block.code}</code></pre>;
            case 'divider':
              return <hr key={block.id} />;
            case 'callout':
              return (
                <div
                  key={block.id}
                  className="pv-callout"
                  style={{ borderColor: CALLOUT_BORDER[block.variant], background: `${CALLOUT_BORDER[block.variant]}22` }}
                  dangerouslySetInnerHTML={inline(block.text)}
                />
              );
            case 'image': {
              const url = mediaUrl(root, block.src, baseDir);
              return (
                <figure key={block.id}>
                  {url && <img src={url} alt={block.alt || ''} />}
                  {(block.caption || block.alt) && <figcaption className="pv-caption">{block.caption || block.alt}</figcaption>}
                </figure>
              );
            }
            case 'video': {
              const url = mediaUrl(root, block.src, baseDir);
              return (
                <figure key={block.id}>
                  {url && <video src={url} controls muted />}
                  {block.caption && <figcaption className="pv-caption">{block.caption}</figcaption>}
                </figure>
              );
            }
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
