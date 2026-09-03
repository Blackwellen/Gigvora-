import Link from 'next/link';
import { contentTypeLabel, type ResourceSummary } from './lib';
import { getPlaceholderAvatarUrl } from '@/lib/placeholderAvatar';

const GRADIENTS = [
  'from-sky-100 to-brand-100',
  'from-emerald-100 to-sky-100',
  'from-violet-100 to-brand-100',
  'from-amber-100 to-rose-100',
];

export function ArticleCard({ article, index = 0 }: { article: ResourceSummary; index?: number }) {
  return (
    <Link
      href={`/app/blog--resources/${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 shadow-surface hover:border-brand-200"
    >
      <div className={`relative aspect-[16/9] w-full bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]}`}>
        {article.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-ink-700 shadow-sm">
          {contentTypeLabel(article.contentType)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs text-ink-400">{article.readMinutes}</p>
        <p className="mt-1 text-sm font-bold text-ink-900 group-hover:text-brand-700">{article.title}</p>
        <p className="mt-1 line-clamp-2 flex-1 text-xs text-ink-500">{article.summary}</p>
        <div className="mt-3 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getPlaceholderAvatarUrl(article.author.name)}
            alt=""
            aria-hidden
            className="h-6 w-6 rounded-full object-cover ring-1 ring-black/5"
          />
          <span className="text-xs font-medium text-ink-700">{article.author.name}</span>
        </div>
      </div>
    </Link>
  );
}
