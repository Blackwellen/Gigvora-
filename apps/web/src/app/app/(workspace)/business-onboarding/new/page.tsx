'use client';

import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

export default function BusinessOnboardingPage() {
  return (
    <OnboardingWizard
      track="business"
      copy={{
        pageId: '04.02',
        breadcrumb: 'Business Onboarding',
        title: 'Business Onboarding',
        subtitle: 'Set up your company workspace so your team can start hiring on Gigvora.',
        importAffordance: [{ label: 'Import company data', href: '/app/company-import/new' }],
        importedDataTypes: [{ importType: 'company', label: 'Company import', reviewHref: '/app/company-import/new' }],
      }}
    />
  );
}
