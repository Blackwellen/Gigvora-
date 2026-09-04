'use client';

import { VerificationWizard, type VerificationWizardConfig } from '@/components/trust/VerificationWizard';
import { PageContainer } from '@/components/trust/shared';

const config: VerificationWizardConfig = {
  verificationType: 'identity',
  title: 'Identity verification',
  intro: 'Verify your identity using a secure, provider-hosted flow. Gigvora never stores your raw document images or biometric data — only the verification result.',
  centreHref: '/app/verification-centre',
  steps: [
    {
      title: 'Country',
      description: 'Select the country that issued your ID document.',
      fields: [{ key: 'country', label: 'Country', type: 'select', options: ['United Kingdom', 'United States', 'Ireland', 'Canada', 'Australia'], required: true }],
    },
    {
      title: 'Document type',
      description: 'Choose the document you’ll verify with.',
      fields: [{ key: 'documentType', label: 'Document type', type: 'select', options: ['Passport', 'Driving licence', 'National ID', 'Residence permit'], required: true }],
    },
    {
      title: 'Secure verification handoff',
      description: 'You’ll be securely handed off to our identity verification provider to capture your document and a liveness check. Gigvora receives only the verification result — verified name fields, country, document type and a timestamp.',
      fields: [],
    },
  ],
  redactionNotice: undefined,
};

export default function IdentityVerificationNewPage() {
  return (
    <PageContainer>
      <VerificationWizard config={config} />
    </PageContainer>
  );
}
