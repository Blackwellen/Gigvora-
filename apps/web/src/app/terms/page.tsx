import { BrandLogoLink } from '@/components/common/BrandLogoLink';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="flex h-16 items-center border-b border-gray-100 px-6 lg:px-10">
        <BrandLogoLink />
      </header>
      <main className="mx-auto max-w-2xl px-6 py-16 text-gray-600 lg:px-10">
        <h1 className="text-3xl font-extrabold text-gray-900">Terms of Service</h1>
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Placeholder content — this page has not yet been reviewed by legal counsel and should not be relied on as Gigvora&apos;s actual terms.
        </p>
        <p className="mt-6 text-sm">Contact <a href="mailto:legal@gigvora.com" className="font-semibold text-brand-600 hover:underline">legal@gigvora.com</a> with questions about your agreement with Gigvora.</p>
      </main>
    </div>
  );
}
