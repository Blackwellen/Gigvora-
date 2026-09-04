'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { useEndorsements } from '@/hooks/trust/useTrust';
import { PageHeader, PageContainer, TwoColumnLayout, LoadingBlock, EmptyState } from '@/components/trust/shared';

export default function EndorsementsPage() {
  const { data: skills, isLoading } = useEndorsements();

  const totalEndorsements = (skills || []).reduce((sum, s) => sum + s.endorsementCount, 0);
  const uniqueEndorsers = new Set((skills || []).flatMap((s) => s.endorserIds)).size;
  const verifiedTotal = (skills || []).reduce((sum, s) => sum + s.verifiedCount, 0);

  return (
    <PageContainer>
      <PageHeader title="Endorsements" subtitle="Structured professional skill endorsements from your network." />

      <TwoColumnLayout
        main={
          <>
            <KpiGrid className="lg:grid-cols-3">
              <KpiCard label="Total endorsements" value={totalEndorsements} />
              <KpiCard label="Unique endorsers" value={uniqueEndorsers} />
              <KpiCard label="Verified relationships" value={verifiedTotal} />
            </KpiGrid>

            <Card>
              {isLoading && <div className="p-5"><LoadingBlock /></div>}
              {!isLoading && (!skills || skills.length === 0) && (
                <div className="p-5"><EmptyState title="No endorsements yet" body="Endorsements for your skills from colleagues and collaborators will appear here." /></div>
              )}
              <div className="divide-y divide-ink-100 dark:divide-ink-800">
                {(skills || []).map((s) => (
                  <div key={s.skillId} className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-semibold text-ink-900 dark:text-white">{s.skillName}</p>
                      <p className="text-xs text-ink-400 dark:text-ink-500">{s.endorsementCount} endorsements</p>
                    </div>
                    {s.verifiedCount > 0 && (
                      <Badge tone="success">{s.verifiedCount} from verified colleagues</Badge>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </>
        }
        rail={
          <Card className="p-4">
            <p className="font-display text-sm font-bold text-ink-900 dark:text-white">About endorsements</p>
            <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
              Endorsements reference canonical skills. A count alone never determines candidate ranking — verified colleague
              endorsements carry more weight than unverified ones.
            </p>
          </Card>
        }
      />
    </PageContainer>
  );
}
