'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

/** Logo click destination depends on auth state: public home when signed out, the
 * authenticated live feed when signed in. Starts at "/" (safe default for SSR/logged-out)
 * and swaps client-side once mounted if a session is present. */
export function BrandLogoLink({
  className = 'h-8 w-auto',
  linkClassName,
  width = 140,
  height = 47,
}: {
  className?: string;
  linkClassName?: string;
  width?: number;
  height?: number;
}) {
  const [href, setHref] = useState('/');

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('accessToken')) {
      setHref('/app/live-feed');
    }
  }, []);

  return (
    <Link href={href} aria-label="Gigvora home" className={linkClassName}>
      <Image src="/logo.png" alt="Gigvora" width={width} height={height} priority className={className} />
    </Link>
  );
}
