'use client';

import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

export default function InviteeOnboardingPage() {
  return (
    <OnboardingWizard
      track="invitee"
      copy={{
        pageId: '04.09',
        breadcrumb: 'Invitee Onboarding',
        title: 'Invitee Onboarding',
        subtitle: 'Finish setting up your account to join the workspace you were invited to.',
      }}
    />
  );
}
