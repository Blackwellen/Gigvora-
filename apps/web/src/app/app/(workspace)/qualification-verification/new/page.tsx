'use client';

import { VerificationWizard, type VerificationWizardConfig } from '@/components/trust/VerificationWizard';
import { PageContainer } from '@/components/trust/shared';

const config: VerificationWizardConfig = {
  verificationType: 'qualification',
  title: 'Qualification verification',
  intro: 'Verify an academic or professional qualification shown on your Gigvora profile.',
  centreHref: '/app/verification-centre',
  steps: [
    {
      title: 'Institution',
      fields: [
        { key: 'institution', label: 'Institution', type: 'text', required: true },
        { key: 'country', label: 'Country', type: 'text' },
      ],
    },
    {
      title: 'Qualification details',
      fields: [
        { key: 'award', label: 'Award', type: 'text', required: true },
        { key: 'subject', label: 'Subject', type: 'text' },
        { key: 'level', label: 'Qualification level', type: 'select', options: ['Undergraduate', 'Postgraduate', 'Doctorate', 'Professional certification', 'Other'] },
        { key: 'awardDate', label: 'Award date', type: 'date' },
      ],
    },
    {
      title: 'Verification method',
      description: 'How should we verify this qualification?',
      fields: [{ key: 'method', label: 'Method', type: 'select', options: ['Digital credential', 'Institution email', 'Manual evidence review'], required: true }],
    },
  ],
};

export default function QualificationVerificationNewPage() {
  return (
    <PageContainer>
      <VerificationWizard config={config} />
    </PageContainer>
  );
}
