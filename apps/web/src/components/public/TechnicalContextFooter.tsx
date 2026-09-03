import { PUBLIC_PAGE_REGISTRY, type PublicPageId } from '@/lib/publicPageRegistry';

// Design/QA-only panel reproducing the technical-context strip shown in the
// Domain 02 reference designs. Gated behind TECHNICAL_REVIEW_MODE so ordinary
// production visitors never see internal architecture details.
const TECHNICAL_REVIEW_MODE = process.env.NEXT_PUBLIC_TECHNICAL_REVIEW_MODE === 'true';

export function TechnicalContextFooter({ pageId }: { pageId: PublicPageId }) {
  if (!TECHNICAL_REVIEW_MODE) return null;
  const meta = PUBLIC_PAGE_REGISTRY[pageId];
  if (!meta) return null;

  const fields: Array<[string, string]> = [
    ['Page ID', meta.id],
    ['Page Name', meta.name],
    ['Type', meta.type],
    ['Route', meta.route],
    ['Core components', meta.coreComponents],
    ['Primary data', meta.primaryData],
    ['Realtime', meta.realtime],
    ['AI/ML', meta.aiMl],
  ];

  return (
    <div className="border-t border-ink-100 bg-ink-50">
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-x-8 gap-y-4 px-6 py-5 text-xs text-ink-500 sm:grid-cols-4 lg:grid-cols-8 lg:px-10">
        {fields.map(([label, value]) => (
          <div key={label}>
            <p className="font-semibold text-ink-800">{label}</p>
            <p className="mt-1 leading-snug">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
