'use client';

import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

export default function AgencyOnboardingPage() {
  return (
    <OnboardingWizard
      track="agency"
      copy={{
        pageId: '04.03',
        breadcrumb: 'Agency Onboarding',
        title: 'Agency Onboarding',
        subtitle: 'Set up your agency profile so clients and candidates know what you offer.',
        importAffordance: [{ label: 'Import company data', href: '/app/company-import/new' }],
        importedDataTypes: [{ importType: 'company', label: 'Company import', reviewHref: '/app/company-import/new' }],
      }}
    />
  );
}
