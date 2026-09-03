'use client';

import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

export default function RecruiterOnboardingPage() {
  return (
    <OnboardingWizard
      track="recruiter"
      copy={{
        pageId: '04.05',
        breadcrumb: 'Recruiter Onboarding',
        title: 'Recruiter Onboarding',
        subtitle: 'Tell us how you hire so Gigvora can surface the right candidates.',
        importAffordance: [{ label: 'Import contacts', href: '/app/contacts-import/new' }],
      }}
    />
  );
}
