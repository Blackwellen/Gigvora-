import Link from 'next/link';

export function CtaBanner({
  heading,
  subheading,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: {
  heading: string;
  subheading: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-brand-600 px-6 py-8 sm:px-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full border-[24px] border-brand-500/40"
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{heading}</h2>
          <p className="mt-1 text-sm text-brand-100">{subheading}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link
            href={primaryHref}
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow-sm hover:bg-brand-50"
          >
            {primaryLabel}
          </Link>
          <Link
            href={secondaryHref}
            className="rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
