import { ModelFamilyView } from '@/components/admin/ModelFamilyView';

export default function RankingModelsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold text-ink-900">Ranking models</h2>
        <p className="text-sm text-ink-500">
          Orders the candidate set produced by matching/retrieval — job search, candidate search, people/company search and
          feed ranking each configure their own objective and features on the same ranking platform.
        </p>
      </div>
      <ModelFamilyView
        capabilityPrefix="ranking"
        emptyHint="Register a ranking model to order search results after eligibility filtering and candidate generation."
      />
    </div>
  );
}
