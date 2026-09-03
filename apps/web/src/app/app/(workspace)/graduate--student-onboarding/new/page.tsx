'use client';

import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

export default function GraduateStudentOnboardingPage() {
  return (
    <OnboardingWizard
      track="graduate_student"
      copy={{
        pageId: '04.07',
        breadcrumb: 'Graduate / Student Onboarding',
        title: 'Graduate / Student Onboarding',
        subtitle: 'Tell us about your studies and goals so we can match you with the right opportunities.',
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
