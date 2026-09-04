import { ScoringOverview } from '@/components/admin/ScoringOverview';

export default function LeadScoringPage() {
  return (
    <ScoringOverview
      endpoint="/intelligence/lead-scoring"
      recordsKey="recentPredictions"
      title="Lead scoring"
      description="Fit, intent and engagement models powering CRM and Sales Navigator prioritisation. Scores are read from crm_ml_predictions — CRM stage/qualification always remains sales-user-owned."
    />
  );
}
