'use client';

import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

export default function CreatorOnboardingPage() {
  return (
    <OnboardingWizard
      track="creator"
      copy={{
        pageId: '04.06',
        breadcrumb: 'Creator Onboarding',
        title: 'Creator Onboarding',
        subtitle: 'Tell us about your platforms and audience so brands can find you.',
      }}
    />
  );
}
