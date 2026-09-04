'use client';

import Link from 'next/link';
import { BadgeCheck, Briefcase, GraduationCap, Building2, Mail, Phone, ShieldCheck, Star, ThumbsUp, Users, FileWarning, Sparkles } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { useTrustOverviewMe } from '@/hooks/trust/useTrust';
import { PageHeader, PageContainer, TwoColumnLayout, LoadingBlock, StatusPill } from '@/components/trust/shared';
import type { VerificationType } from '@/hooks/trust/types';

const VERIFICATION_META: Record<VerificationType, { label: string; icon: React.ElementType; benefit: string }> = {
  identity: { label: 'Identity', icon: ShieldCheck, benefit: 'Confirms who you are to businesses and recruiters.' },
  professional: { label: 'Professional', icon: Briefcase, benefit: 'Strengthens credibility for recruiter searches.' },
  business: { label: 'Business', icon: Building2, benefit: 'Required to represent an organisation on Gigvora.' },
  qualification: { label: 'Qualifications', icon: GraduationCap, benefit: 'Shows your credentials were independently checked.' },
  employment: { label: 'Employment', icon: Briefcase, benefit: 'Confirms your work history claims.' },
  email: { label: 'Email', icon: Mail, benefit: 'Basic account contact verification.' },
  phone: { label: 'Phone', icon: Phone, benefit: 'Adds a second contact verification signal.' },
};

export default function TrustCentrePage() {
  const { data: overview, isLoading } = useTrustOverviewMe();

  const verifiedCount = overview?.verifications.filter((v) => v.status === 'verified').length ?? 0;
  const totalTypes = overview?.verifications.length ?? 7;
  const completionPct = totalTypes ? Math.round((verifiedCount / totalTypes) * 100) : 0;

  return (
    <PageContainer>
      <PageHeader
        title="Trust Centre"
        subtitle="Manage your verification, reputation, reviews and account trust signals across Gigvora."
        action={
          <Link href="/app/verification-centre">
            <Button size="sm">Complete verification</Button>
          </Link>
        }
      />

      {isLoading || !overview ? (
        <LoadingBlock />
      ) : (
        <TwoColumnLayout
          main={
            <>
              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Verification completion</p>
                    <p className="mt-1 font-display text-3xl font-bold text-ink-900 dark:text-white">{completionPct}%</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Marketplace reputation</p>
                    <p className="mt-1 flex items-center gap-1 font-display text-3xl font-bold text-ink-900 dark:text-white">
                      {overview.reputation.ratingAverage != null ? overview.reputation.ratingAverage.toFixed(1) : '—'}
                      <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Completed transactions</p>
                    <p className="mt-1 font-display text-3xl font-bold text-ink-900 dark:text-white">{overview.reputation.completedTransactionCount}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Account safety</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {overview.safety.openCases === 0 ? 'No current issues' : `${overview.safety.openCases} open case(s)`}
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader title="Verification status" />
                <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
                  {overview.verifications.map((v) => {
                    const meta = VERIFICATION_META[v.verificationType];
                    const Icon = meta.icon;
                    return (
                      <div key={v.verificationType} className="flex items-start gap-3 rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                        <div className="rounded-lg bg-brand-50 p-2 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-ink-900 dark:text-white">{meta.label}</p>
                            <StatusPill status={v.status} />
                          </div>
                          <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">
                            {v.verifiedAt ? `Verified ${new Date(v.verifiedAt).toLocaleDateString()}` : meta.benefit}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card>
                <CardHeader title="Reputation overview" />
                <div className="p-5">
                  <KpiGrid className="lg:grid-cols-5">
                    <KpiCard label="Reviews" value={overview.reputation.reviewCount} icon={Star} />
                    <KpiCard label="Recommendations" value={overview.reputation.recommendationCount} icon={ThumbsUp} />
                    <KpiCard label="Endorsements" value={overview.reputation.endorsementCount} icon={BadgeCheck} />
                    <KpiCard label="Completed contracts" value={overview.reputation.completedTransactionCount} icon={Users} />
                    <KpiCard
                      label="Dispute rate"
                      value={overview.reputation.disputeRate != null ? `${overview.reputation.disputeRate}%` : '—'}
                      icon={FileWarning}
                      tone={overview.reputation.disputeRate && overview.reputation.disputeRate > 5 ? 'warning' : 'success'}
                    />
                  </KpiGrid>
                </div>
              </Card>

              <Card>
                <CardHeader title="Safety" />
                <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
                  <div className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                    <p className="text-xs text-ink-400 dark:text-ink-500">Open safety cases</p>
                    <p className="mt-1 text-lg font-bold text-ink-900 dark:text-white">{overview.safety.openCases}</p>
                  </div>
                  <div className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                    <p className="text-xs text-ink-400 dark:text-ink-500">Reports submitted</p>
                    <p className="mt-1 text-lg font-bold text-ink-900 dark:text-white">{overview.safety.reportsSubmitted}</p>
                  </div>
                  <div className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                    <p className="text-xs text-ink-400 dark:text-ink-500">Blocked accounts</p>
                    <p className="mt-1 text-lg font-bold text-ink-900 dark:text-white">{overview.safety.blockedAccounts}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 px-5 pb-5">
                  <Link href="/app/report/new"><Button variant="outline" size="sm">Report content or a user</Button></Link>
                  <Link href="/app/appeals"><Button variant="outline" size="sm">View appeals</Button></Link>
                </div>
              </Card>
            </>
          }
          rail={
            <>
              <Card className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand-500" />
                  <p className="font-display text-sm font-bold text-ink-900 dark:text-white">Trust Insights</p>
                </div>
                <ul className="space-y-2 text-sm text-ink-600 dark:text-ink-300">
                  {completionPct < 100 && <li>Completing your remaining verifications strengthens credibility for recruiter searches.</li>}
                  {overview.reputation.disputeRate != null && overview.reputation.disputeRate < 2 && (
                    <li>{100 - overview.reputation.disputeRate}% of your completed orders were delivered without dispute.</li>
                  )}
                  {overview.reputation.reviewCount === 0 && <li>You don&apos;t have any reviews yet — completing transactions builds reputation over time.</li>}
                </ul>
              </Card>
              <Card className="p-4">
                <p className="font-display text-sm font-bold text-ink-900 dark:text-white">Quick links</p>
                <div className="mt-3 flex flex-col gap-2">
                  <Link href="/app/reviews" className="text-sm font-semibold text-brand-600 hover:underline">Reviews</Link>
                  <Link href="/app/recommendations" className="text-sm font-semibold text-brand-600 hover:underline">Recommendations</Link>
                  <Link href="/app/endorsements" className="text-sm font-semibold text-brand-600 hover:underline">Endorsements</Link>
                  <Link href="/app/verification-centre" className="text-sm font-semibold text-brand-600 hover:underline">Verification Centre</Link>
                  <Link href="/app/reputation-analytics" className="text-sm font-semibold text-brand-600 hover:underline">Reputation Analytics</Link>
                </div>
              </Card>
            </>
          }
        />
      )}
    </PageContainer>
  );
}
