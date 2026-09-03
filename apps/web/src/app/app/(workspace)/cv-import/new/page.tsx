'use client';

import { ImportWizard } from '@/components/imports/ImportWizard';

export default function CvImportPage() {
  return (
    <ImportWizard
      importType="cv"
      copy={{
        pageId: '04.11',
        title: 'CV Import',
        subtitle: 'Import CVs and let Gigvora extract and structure profile data for you.',
        entityLabelSingular: 'profile',
        entityLabelPlural: 'profiles',
        whatHappensNext: [
          "We'll extract key information from each CV",
          "You'll review and map the data to Gigvora fields",
          "You'll confirm and import profiles in bulk",
        ],
        aiTip: 'Gigvora AI will help match similar profiles and suggest deduplications to keep your database clean.',
      }}
    />
  );
}
