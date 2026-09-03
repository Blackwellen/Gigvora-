import type { ContentBlock } from '@/hooks/useArticles';

const HEADING_CLASSES: Record<number, string> = {
  2: 'text-xl font-bold mt-6 mb-2',
  3: 'text-lg font-bold mt-5 mb-2',
  4: 'text-base font-bold mt-4 mb-1.5',
};

/**
 * Renders content_json's typed blocks as plain React elements — never
 * dangerouslySetInnerHTML. Every string in a block is rendered as text
 * content (React escapes it automatically), so this is safe by construction
 * even though the server-side sanitizer already allowlists block shapes.
 */
export function ContentBlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-ink-800 dark:text-ink-100">
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          const Tag = (`h${block.level}` as unknown) as 'h2' | 'h3' | 'h4';
          return (
            <Tag key={idx} id={headingId(block.text)} className={`font-display tracking-[-0.01em] text-ink-900 dark:text-white ${HEADING_CLASSES[block.level] || HEADING_CLASSES[2]}`}>
              {block.text}
            </Tag>
          );
        }
        if (block.type === 'paragraph') {
          return (
            <p key={idx} className="whitespace-pre-wrap">
              {block.text}
            </p>
          );
        }
        if (block.type === 'quote') {
          return (
            <blockquote key={idx} className="border-l-4 border-brand-300 dark:border-brand-600 bg-brand-50/50 dark:bg-brand-500/10 px-4 py-3 italic text-ink-700 dark:text-ink-200">
              {block.text}
            </blockquote>
          );
        }
        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul';
          return (
            <ListTag key={idx} className={block.ordered ? 'list-decimal space-y-1 pl-5' : 'list-disc space-y-1 pl-5'}>
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx}>{item}</li>
              ))}
            </ListTag>
          );
        }
        if (block.type === 'image') {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={idx} src={block.url} alt={block.alt || ''} className="w-full rounded-xl border border-ink-100 dark:border-ink-800 object-cover" />
          );
        }
        return null;
      })}
    </div>
  );
}

export function headingId(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Real table of contents — built from the article's own heading blocks, never fabricated. */
export function extractHeadings(blocks: ContentBlock[]) {
  return blocks
    .filter((b): b is Extract<ContentBlock, { type: 'heading' }> => b.type === 'heading')
    .map((b) => ({ id: headingId(b.text), text: b.text, level: b.level }));
}
