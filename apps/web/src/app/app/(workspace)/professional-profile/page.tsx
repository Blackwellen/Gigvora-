'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// §2: the canonical Professional Profile landing always opens on Timeline —
// implemented as a redirect to the single source of truth at /app/timeline
// rather than duplicating the shell here.
export default function ProfessionalProfilePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/app/timeline');
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
    </div>
  );
}
