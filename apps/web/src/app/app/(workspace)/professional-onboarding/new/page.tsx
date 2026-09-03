'use client';

import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

export default function ProfessionalOnboardingPage() {
  return (
    <OnboardingWizard
      track="professional"
      copy={{
        pageId: '04.01',
        breadcrumb: 'Professional Onboarding',
        title: 'Professional Onboarding',
        subtitle: 'Tell us about your experience so we can tailor Gigvora to your career.',
        importAffordance: [
          { label: 'Import from CV', href: '/app/cv-import/new' },
          { label: 'Import profile', href: '/app/profile-import/new' },
        ],
        showOpportunityMatches: true,
        importedDataTypes: [
          { importType: 'cv', label: 'CV import', reviewHref: '/app/cv-import/new' },
          { importType: 'profile', label: 'Profile import', reviewHref: '/app/profile-import/new' },
        ],
      }}
    />
  );
}
