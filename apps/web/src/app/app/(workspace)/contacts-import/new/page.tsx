'use client';

import { ImportWizard } from '@/components/imports/ImportWizard';

export default function ContactsImportPage() {
  return (
    <ImportWizard
      importType="contacts"
      copy={{
        pageId: '04.13',
        title: 'Contacts Import',
        subtitle: 'Upload your contacts to connect with your network. We never message or invite anyone automatically.',
        entityLabelSingular: 'contact',
        entityLabelPlural: 'contacts',
        whatHappensNext: [
          "We'll parse every row from your file",
          "You'll review and map columns to Gigvora fields",
          "You'll confirm — no invites or messages are ever sent automatically",
        ],
        aiTip: 'Gigvora AI flags likely duplicate contacts against your existing network so you can merge, link, or skip them.',
        templateDownload: { filename: 'gigvora-contacts-import-template.csv' },
      }}
    />
  );
}
