'use client';

import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

export default function CareerChangerOnboardingPage() {
  return (
    <OnboardingWizard
      track="career_changer"
      copy={{
        pageId: '04.08',
        breadcrumb: 'Career Changer Onboarding',
        title: 'Career Changer Onboarding',
        subtitle: 'Tell us where you’re coming from and where you want to go next.',
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
