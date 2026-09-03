'use client';

import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

export default function EnterpriseOnboardingPage() {
  return (
    <OnboardingWizard
      track="enterprise"
      copy={{
        pageId: '04.04',
        breadcrumb: 'Enterprise Onboarding',
        title: 'Enterprise Onboarding',
        subtitle: 'Configure your enterprise workspace, structure, and hiring setup.',
        importAffordance: [{ label: 'Import company data', href: '/app/company-import/new' }],
      }}
    />
  );
}
