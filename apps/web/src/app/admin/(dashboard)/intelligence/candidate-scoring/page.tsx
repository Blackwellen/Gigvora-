import { ScoringOverview } from '@/components/admin/ScoringOverview';

export default function CandidateScoringPage() {
  return (
    <ScoringOverview
      endpoint="/intelligence/candidate-scoring"
      recordsKey="recentScores"
      title="Candidate scoring"
      description="Candidate ↔ role fit models feeding Recruiter Pro. Scores are assistive — see candidate_match_scores.human_reviewed / human_override for the human-in-the-loop review this domain requires for high-consequence employment decisions."
    />
  );
}
