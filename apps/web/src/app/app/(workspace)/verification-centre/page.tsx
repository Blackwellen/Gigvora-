'use client';

import Link from 'next/link';
import { BadgeCheck, Briefcase, GraduationCap, Building2, Mail, Phone, ShieldCheck, Info } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useVerificationOverviewMe } from '@/hooks/trust/useTrust';
import { PageHeader, PageContainer, TwoColumnLayout, LoadingBlock, StatusPill } from '@/components/trust/shared';
import type { VerificationType } from '@/hooks/trust/types';

const VERIFICATION_CARDS: Array<{ type: VerificationType; label: string; icon: React.ElementType; benefit: string; href: string }> = [
  { type: 'identity', label: 'Identity verification', icon: ShieldCheck, benefit: 'Confirms who you are to businesses and recruiters.', href: '/app/identity-verification/new' },
  { type: 'professional', label: 'Professional verification', icon: Briefcase, benefit: 'Validates professional profile assertions.', href: '/app/professional-verification/new' },
  { type: 'business', label: 'Business verification', icon: Building2, benefit: 'Required to represent an organisation on Gigvora.', href: '/app/business-verification/new' },
  { type: 'qualification', label: 'Qualification verification', icon: GraduationCap, benefit: 'Confirms academic/professional credentials.', href: '/app/qualification-verification/new' },
  { type: 'employment', label: 'Employment verification', icon: Briefcase, benefit: 'Confirms your work history claims.', href: '/app/employment-verification/new' },
  { type: 'email', label: 'Email verification', icon: Mail, benefit: 'Basic account contact verification.', href: '/app/verification-centre' },
  { type: 'phone', label: 'Phone verification', icon: Phone, benefit: 'Adds a second contact verification signal.', href: '/app/verification-centre' },
];

export default function VerificationCentrePage() {
  const { data: verifications, isLoading } = useVerificationOverviewMe();
  const byType = new Map((verifications || []).map((v) => [v.verificationType, v]));
  const verifiedCount = (verifications || []).filter((v) => v.status === 'verified').length;
  const level = verifiedCount >= 5 ? 'Strong' : verifiedCount >= 2 ? 'Partially verified' : 'Getting started';

  return (
    <PageContainer>
      <PageHeader
        title="Verification Centre"
        subtitle="Strengthen your profile and unlock trusted professional and marketplace experiences."
      />

      {isLoading ? (
        <LoadingBlock />
      ) : (
        <TwoColumnLayout
          main={
            <>
              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Verification level</p>
                <p className="mt-1 font-display text-2xl font-bold text-ink-900 dark:text-white">{level}</p>
                <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{verifiedCount} of {VERIFICATION_CARDS.length} verification types complete</p>
              </Card>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {VERIFICATION_CARDS.map((card) => {
                  const v = byType.get(card.type);
                  const status = v?.status || 'not_started';
                  const Icon = card.icon;
                  return (
                    <Card key={card.type} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-brand-50 p-2 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-ink-900 dark:text-white">{card.label}</p>
                            <StatusPill status={status} />
                          </div>
                          <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">{card.benefit}</p>
                          {v?.verifiedAt && <p className="mt-1 text-[11px] text-ink-400 dark:text-ink-500">Verified {new Date(v.verifiedAt).toLocaleDateString()}</p>}
                          {v?.expiresAt && <p className="text-[11px] text-ink-400 dark:text-ink-500">Expires {new Date(v.expiresAt).toLocaleDateString()}</p>}
                          {(status === 'not_started' || status === 'action_required' || status === 'rejected' || status === 'expired') && (
                            <Link href={card.href}>
                              <Button size="sm" variant="outline" className="mt-3">
                                {status === 'not_started' ? 'Start verification' : 'Continue'}
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          }
          rail={
            <Card className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-brand-500" />
                <p className="font-display text-sm font-bold text-ink-900 dark:text-white">Verification Benefits</p>
              </div>
              <ul className="space-y-2 text-sm text-ink-600 dark:text-ink-300">
                <li>Improve profile credibility</li>
                <li>Support marketplace trust</li>
                <li>Help recruiters verify profile claims</li>
                <li>Qualify for selected seller/business features</li>
              </ul>
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-ink-50 p-2.5 text-xs text-ink-500 dark:bg-ink-800 dark:text-ink-400">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>Verification confirms specified evidence and claims — it does not guarantee conduct.</p>
              </div>
            </Card>
          }
        />
      )}
    </PageContainer>
  );
}
