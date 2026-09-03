'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, ChevronDown, Menu, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSession } from '@/lib/session/SessionContext';
import {
  PUBLIC_MEGA_MENUS,
  PUBLIC_HEADER_SIMPLE_LINKS,
  type PublicMegaMenu,
} from '@/lib/publicNav';
import { PublicIcon } from './PublicIcon';
import { PublicSearchOverlay } from './PublicSearchOverlay';

function joinUrl(basePath: string, params?: Record<string, string>) {
  if (!params) return basePath;
  const search = new URLSearchParams(params);
  return `${basePath}?${search.toString()}`;
}

export function PublicHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useSession();
  const [openMenu, setOpenMenu] = useState<PublicMegaMenu['key'] | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSubmenu, setMobileSubmenu] = useState<PublicMegaMenu['key'] | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (!openMenu) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpenMenu(null);
        headerRef.current?.querySelector<HTMLButtonElement>(`button[data-menu-key="${openMenu}"]`)?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [openMenu]);

  function joinHref(intent?: 'professional' | 'business') {
    const returnUrl = pathname || '/home';
    return joinUrl('/sign-up', { returnUrl, ...(intent ? { intent } : {}) });
  }

  return (
    <header ref={headerRef} className="sticky top-0 z-50 border-b border-ink-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-6 lg:px-10">
        <div className="flex items-center gap-8">
          <Link href="/home" className="flex shrink-0 items-center" aria-label="Gigvora home">
            <Image src="/logo.png" alt="Gigvora" width={140} height={47} priority className="h-7 w-auto" />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {PUBLIC_MEGA_MENUS.map((menu) => (
              <div key={menu.key} className="relative">
                <button
                  type="button"
                  data-menu-key={menu.key}
                  onClick={() => setOpenMenu((cur) => (cur === menu.key ? null : menu.key))}
                  aria-expanded={openMenu === menu.key}
                  aria-haspopup="true"
                  className={cn(
                    'flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 hover:text-ink-900',
                    openMenu === menu.key && 'bg-ink-50 text-ink-900'
                  )}
                >
                  {menu.label}
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', openMenu === menu.key && 'rotate-180')} />
                </button>
                {openMenu === menu.key && <MegaMenuPanel menu={menu} onNavigate={() => setOpenMenu(null)} />}
              </div>
            ))}
            {PUBLIC_HEADER_SIMPLE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 hover:text-ink-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Search Gigvora"
            onClick={() => setSearchOpen(true)}
            className="hidden h-9 w-9 items-center justify-center rounded-md text-ink-500 hover:bg-ink-50 hover:text-ink-800 lg:flex"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>

          {!isLoading && user ? (
            <Link
              href="/feed"
              className="hidden items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 lg:inline-flex"
            >
              Go to Gigvora
            </Link>
          ) : (
            <>
              <Link
                href={joinUrl('/sign-in', { returnUrl: pathname || '/home' })}
                className="hidden text-sm font-semibold text-ink-700 hover:text-ink-900 lg:inline-block"
              >
                Sign in
              </Link>
              <Link
                href={joinHref()}
                className="hidden items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 lg:inline-flex"
              >
                Join Gigvora
                <span aria-hidden>→</span>
              </Link>
            </>
          )}

          <button
            type="button"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-700 hover:bg-ink-50 lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 top-16 z-40 overflow-y-auto bg-white lg:hidden">
          <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-3">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-10 w-full items-center gap-2 rounded-lg border border-ink-200 px-3 text-sm text-ink-500"
            >
              <Search className="h-4 w-4" /> Search Gigvora
            </button>
          </div>
          <nav className="flex flex-col divide-y divide-ink-100 px-2" aria-label="Mobile primary">
            {PUBLIC_MEGA_MENUS.map((menu) => (
              <div key={menu.key}>
                <button
                  type="button"
                  aria-expanded={mobileSubmenu === menu.key}
                  className="flex w-full items-center justify-between px-3 py-3.5 text-left text-sm font-semibold text-ink-900"
                  onClick={() => setMobileSubmenu((cur) => (cur === menu.key ? null : menu.key))}
                >
                  {menu.label}
                  <ChevronDown className={cn('h-4 w-4 transition-transform', mobileSubmenu === menu.key && 'rotate-180')} />
                </button>
                {mobileSubmenu === menu.key && (
                  <div className="pb-3">
                    {menu.columns.flatMap((c) => c.links).map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-600 hover:bg-ink-50"
                        onClick={() => setMobileOpen(false)}
                      >
                        <PublicIcon name={link.icon} className="h-4 w-4 text-ink-400" />
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {PUBLIC_HEADER_SIMPLE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-3.5 text-sm font-semibold text-ink-900"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-2 border-t border-ink-100 p-4">
            {!isLoading && user ? (
              <Link href="/feed" className="rounded-lg bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white">
                Go to Gigvora
              </Link>
            ) : (
              <>
                <Link
                  href={joinUrl('/sign-in', { returnUrl: pathname || '/home' })}
                  className="rounded-lg border border-ink-200 px-4 py-3 text-center text-sm font-semibold text-ink-800"
                >
                  Sign in
                </Link>
                <Link href={joinHref()} className="rounded-lg bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white">
                  Join Gigvora
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      <PublicSearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSubmit={(query) => {
          setSearchOpen(false);
          router.push(joinUrl('/talent-directory', { q: query }));
        }}
      />
    </header>
  );
}

function MegaMenuPanel({ menu, onNavigate }: { menu: PublicMegaMenu; onNavigate: () => void }) {
  return (
    <div
      className="absolute left-1/2 top-full z-50 mt-2 w-[min(680px,90vw)] -translate-x-1/2 rounded-2xl border border-ink-100 bg-white p-6 shadow-floating animate-scale-in"
    >
      <div className={cn('grid gap-8', menu.columns.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
        {menu.columns.map((column) => (
          <div key={column.heading}>
            {column.heading && (
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">{column.heading}</p>
            )}
            <ul className="space-y-1">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={onNavigate}
                    className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-ink-50"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <PublicIcon name={link.icon} className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                        {link.label}
                        {link.badge && (
                          <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-700">
                            {link.badge}
                          </span>
                        )}
                      </span>
                      {link.description && <span className="text-xs text-ink-500">{link.description}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {menu.featured && (
        <div className="mt-4 border-t border-ink-100 pt-4">
          <Link href={menu.featured.href} onClick={onNavigate} className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            {menu.featured.label} →
          </Link>
        </div>
      )}
    </div>
  );
}
