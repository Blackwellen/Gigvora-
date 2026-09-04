'use client';

import { VerificationWizard, type VerificationWizardConfig } from '@/components/trust/VerificationWizard';
import { PageContainer } from '@/components/trust/shared';

const config: VerificationWizardConfig = {
  verificationType: 'professional',
  title: 'Professional verification',
  intro: 'Validate the professional claims on your profile — work identity, employment, credentials and professional registration.',
  centreHref: '/app/verification-centre',
  steps: [
    {
      title: 'Work identity',
      description: 'Verify a work email address linked to your current employer.',
      fields: [{ key: 'workEmail', label: 'Work email', type: 'text', placeholder: 'you@company.com', required: true }],
    },
    {
      title: 'Professional registration',
      description: 'If applicable, add your professional body registration.',
      fields: [
        { key: 'professionalBody', label: 'Professional body', type: 'text', placeholder: 'e.g. Chartered Institute of...' },
        { key: 'registrationNumber', label: 'Registration number', type: 'text' },
        { key: 'jurisdiction', label: 'Jurisdiction', type: 'text' },
      ],
    },
  ],
};

export default function ProfessionalVerificationNewPage() {
  return (
    <PageContainer>
      <VerificationWizard config={config} />
    </PageContainer>
  );
}
