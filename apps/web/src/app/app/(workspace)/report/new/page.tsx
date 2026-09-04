'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoadingBlock, PageContainer } from '@/components/trust/shared';

/** Canonical alias for /app/report-content--user/new (§28.12) — preserves query params. */
function ReportAliasRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    router.replace(`/app/report-content--user/new?${params.toString()}`);
  }, [router, params]);
  return <LoadingBlock />;
}

export default function ReportAliasPage() {
  return (
    <PageContainer>
      <Suspense fallback={<LoadingBlock />}>
        <ReportAliasRedirect />
      </Suspense>
    </PageContainer>
  );
}
