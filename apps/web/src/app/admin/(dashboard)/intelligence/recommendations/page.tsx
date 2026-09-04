import { ModelFamilyView } from '@/components/admin/ModelFamilyView';

export default function RecommendationModelsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold text-ink-900">Recommendation models</h2>
        <p className="text-sm text-ink-500">
          Personalised and contextual recommendation engines — recommended jobs, gigs, people, companies, leads and content —
          each with their own cold-start and diversity policy on the shared recommendation platform.
        </p>
      </div>
      <ModelFamilyView
        capabilityPrefix="recommendation"
        emptyHint="Register a recommendation model to power a personalised surface such as Recommended Jobs or Suggested Connections."
      />
    </div>
  );
}
