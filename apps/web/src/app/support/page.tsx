import Link from 'next/link';
import { BrandLogoLink } from '@/components/common/BrandLogoLink';

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="flex h-16 items-center justify-between border-b border-gray-100 px-6 lg:px-10">
        <BrandLogoLink />
        <Link href="/sign-in" className="text-sm font-semibold text-brand-600 hover:underline">Sign in</Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 lg:px-10">
        <h1 className="text-3xl font-extrabold text-gray-900">Help &amp; Support</h1>
        <p className="mt-3 text-gray-500">
          Our support team is ready to help with account access, security concerns, and anything else you run into on Gigvora.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <SupportCard title="Account & sign-in" desc="Trouble verifying your email, resetting your password, or completing sign-in." href="/forgot-password" cta="Reset your password" />
          <SupportCard title="Account recovery" desc="Locked out with no access to your usual sign-in methods?" href="/account-recovery/new" cta="Start account recovery" />
          <SupportCard title="Security concerns" desc="Notice unfamiliar activity on your account? Review your sessions and alerts." href="/security-alerts" cta="View security alerts" />
          <SupportCard title="Sessions & devices" desc="Manage where you're signed in and which devices you trust." href="/session-and-devices" cta="Manage sessions" />
        </div>

        <div className="mt-10 rounded-2xl border border-gray-100 bg-gray-50 p-6 text-sm text-gray-600">
          <p className="font-semibold text-gray-900">Still need help?</p>
          <p className="mt-1">Email us at <a href="mailto:support@gigvora.com" className="font-semibold text-brand-600 hover:underline">support@gigvora.com</a> and we&apos;ll get back to you as soon as possible.</p>
        </div>
      </main>
    </div>
  );
}

function SupportCard({ title, desc, href, cta }: { title: string; desc: string; href: string; cta: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-5">
      <p className="font-bold text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{desc}</p>
      <Link href={href} className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline">{cta} →</Link>
    </div>
  );
}
