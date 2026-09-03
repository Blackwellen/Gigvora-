import type { Testimonial } from '@/lib/publicContent';
import { getPlaceholderAvatarUrl } from '@/lib/placeholderAvatar';

export function TestimonialsGrid({ heading, testimonials }: { heading?: string; testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;
  return (
    <section className="py-10">
      {heading && <h2 className="mb-6 text-lg font-bold text-ink-900">{heading}</h2>}
      <div className="grid gap-4 sm:grid-cols-3">
        {testimonials.map((t) => (
          <blockquote key={t.name} className="rounded-2xl border border-ink-100 p-5 shadow-surface">
            <p className="text-sm text-ink-700">&ldquo;{t.quote}&rdquo;</p>
            <footer className="mt-4 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPlaceholderAvatarUrl(t.name)}
                alt=""
                aria-hidden
                className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5"
              />
              <div>
                <p className="text-sm font-semibold text-ink-900">{t.name}</p>
                <p className="text-xs text-ink-500">{t.title}</p>
              </div>
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
