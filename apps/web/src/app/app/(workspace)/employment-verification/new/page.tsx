'use client';

import { VerificationWizard, type VerificationWizardConfig } from '@/components/trust/VerificationWizard';
import { PageContainer } from '@/components/trust/shared';

const config: VerificationWizardConfig = {
  verificationType: 'employment',
  title: 'Employment verification',
  intro: 'Verify a role in your employment history.',
  centreHref: '/app/verification-centre',
  redactionNotice: 'Please redact salary, bank details, tax identifiers, home address and employee number before uploading any supporting document — only the role, company and dates need to be visible.',
  steps: [
    {
      title: 'Company & role',
      fields: [
        { key: 'company', label: 'Company', type: 'text', required: true },
        { key: 'title', label: 'Job title', type: 'text', required: true },
      ],
    },
    {
      title: 'Dates',
      fields: [
        { key: 'startDate', label: 'Start date', type: 'date', required: true },
        { key: 'endDate', label: 'End date (leave blank if current)', type: 'date' },
      ],
    },
    {
      title: 'Verification method',
      fields: [{ key: 'method', label: 'Method', type: 'select', options: ['Work email', 'Company administrator confirmation', 'Supporting documentation', 'Manual review'], required: true }],
    },
  ],
};

export default function EmploymentVerificationNewPage() {
  return (
    <PageContainer>
      <VerificationWizard config={config} />
    </PageContainer>
  );
}
