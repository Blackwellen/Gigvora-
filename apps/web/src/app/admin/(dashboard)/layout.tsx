'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, clearSession } from '@/lib/api';
import { AdminContextProvider, useAdminContext } from '@/lib/admin/AdminContext';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

type Viewer = { name: string };

function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data, isLoading, isError } = useAdminContext();
  const [viewer, setViewer] = useState<Viewer | null>(null);

  useEffect(() => {
    if (isError) {
      // No session, or logged in but not a platform-staff role — either way this shell isn't
      // reachable, send them back to the dedicated admin login rather than the consumer app.
      clearSession();
      router.replace('/admin/login');
    }
  }, [isError, router]);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    api
      .get<{ data: { first_name: string; last_name: string } }>('/users/me')
      .then((res) => {
        if (!cancelled) setViewer({ name: `${res.data.data.first_name} ${res.data.data.last_name}`.trim() });
      })
      .catch(() => {
        if (!cancelled) setViewer({ name: 'Admin' });
      });
    return () => {
      cancelled = true;
    };
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (isError) return null;

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8fa]">
      <AdminTopBar name={viewer?.name || 'Admin'} role={data.role} />
      <div className="flex flex-1">
        <AdminSidebar sections={data.sections} />
        <main className="flex-1 px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminContextProvider>
      <DashboardShell>{children}</DashboardShell>
    </AdminContextProvider>
  );
}
