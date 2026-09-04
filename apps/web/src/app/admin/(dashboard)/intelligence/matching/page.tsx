import { ModelFamilyView } from '@/components/admin/ModelFamilyView';

export default function MatchingModelsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold text-ink-900">Matching models</h2>
        <p className="text-sm text-ink-500">
          Pairwise compatibility models — candidate ↔ job, professional ↔ gig, lead ↔ account and other registered pairings, all
          served by the same shared matching platform with per-capability feature sets and constraints.
        </p>
      </div>
      <ModelFamilyView
        capabilityPrefix="matching"
        emptyHint="Register a matching model to power candidate ↔ job, gig ↔ buyer or other pairwise compatibility scoring."
      />
    </div>
  );
}
