'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, storeSession, getApiErrorMessage } from '@/lib/api';
import { FormAlert } from '@/components/auth/FormAlert';
import { BrandLogoLink } from '@/components/common/BrandLogoLink';

export default function MfaChallengePage() {
  const router = useRouter();
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('pendingMfa');
    if (!raw) {
      router.replace('/sign-in');
      return;
    }
    setPendingToken(JSON.parse(raw).pendingToken);
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingToken) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/mfa/verify-signin', { pendingToken, code, useRecoveryCode });
      storeSession(data.tokens);
      sessionStorage.removeItem('pendingMfa');
      router.push('/app/live-feed');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Incorrect code.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <BrandLogoLink width={120} height={40} className="mx-auto h-7 w-auto" linkClassName="flex justify-center" />
        <h1 className="mt-8 text-center text-2xl font-extrabold text-gray-900">Verify it&apos;s you</h1>
        <p className="mt-2 text-center text-gray-500">
          {useRecoveryCode ? 'Enter one of your backup recovery codes.' : 'Enter the 6-digit code from your authenticator app.'}
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={useRecoveryCode ? 'XXXX-XXXX-XXXX' : '123456'}
            inputMode={useRecoveryCode ? 'text' : 'numeric'}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-lg tracking-widest focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          {error && <FormAlert title={error} />}
          <button
            type="submit"
            disabled={submitting || !code}
            className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Verifying…' : 'Verify & sign in'}
          </button>
          <button
            type="button"
            onClick={() => setUseRecoveryCode((v) => !v)}
            className="w-full text-center text-sm font-medium text-brand-600 hover:underline"
          >
            {useRecoveryCode ? 'Use authenticator code instead' : "Can't access your authenticator? Use a backup code"}
          </button>
        </form>
      </div>
    </div>
  );
}
