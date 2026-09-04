import { ScoringOverview } from '@/components/admin/ScoringOverview';

export default function OpportunityScoringPage() {
  return (
    <ScoringOverview
      endpoint="/intelligence/opportunity-scoring"
      recordsKey="recentPredictions"
      title="Opportunity scoring"
      description="Close-likelihood and stall-risk models for CRM forecasting — advisory only, the human-entered CRM stage/probability remains authoritative."
    />
  );
}
