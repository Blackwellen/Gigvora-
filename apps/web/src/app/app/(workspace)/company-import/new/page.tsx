'use client';

import { ImportWizard } from '@/components/imports/ImportWizard';

export default function CompanyImportPage() {
  return (
    <ImportWizard
      importType="company"
      copy={{
        pageId: '04.12',
        title: 'Company Import',
        subtitle: 'Bulk import companies from a CSV or spreadsheet and let Gigvora structure the data for you.',
        entityLabelSingular: 'company',
        entityLabelPlural: 'companies',
        whatHappensNext: [
          "We'll parse every row from your file",
          "You'll review and map columns to Gigvora fields",
          "You'll confirm and import companies in bulk",
        ],
        aiTip: 'Gigvora AI matches columns to fields automatically and flags likely duplicate companies before you commit.',
        templateDownload: { filename: 'gigvora-company-import-template.csv' },
      }}
    />
  );
}
