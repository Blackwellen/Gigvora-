'use client';

import { ImportWizard } from '@/components/imports/ImportWizard';

export default function ProfileImportPage() {
  return (
    <ImportWizard
      importType="profile"
      copy={{
        pageId: '04.10',
        title: 'Profile Import',
        subtitle: 'Import a resume, LinkedIn export, or document and Gigvora will build your profile from it.',
        entityLabelSingular: 'profile',
        entityLabelPlural: 'profiles',
        whatHappensNext: [
          "We'll extract your experience, skills, and education",
          "You'll review and map the data to your Gigvora profile",
          "You'll confirm before anything is saved to your profile",
        ],
        aiTip: 'Gigvora AI pre-fills your profile fields from the document — you always review before anything is saved.',
      }}
    />
  );
}
