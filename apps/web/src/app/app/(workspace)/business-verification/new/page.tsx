'use client';

import { VerificationWizard, type VerificationWizardConfig } from '@/components/trust/VerificationWizard';
import { PageContainer } from '@/components/trust/shared';

const config: VerificationWizardConfig = {
  verificationType: 'business',
  title: 'Business verification',
  intro: 'Validate the business or organisation you represent on Gigvora.',
  centreHref: '/app/verification-centre',
  steps: [
    {
      title: 'Organisation',
      fields: [
        { key: 'legalName', label: 'Legal name', type: 'text', required: true },
        { key: 'tradingName', label: 'Trading name', type: 'text' },
        { key: 'businessType', label: 'Business type', type: 'select', options: ['Limited company', 'Sole trader', 'Partnership', 'Non-profit', 'Other'] },
      ],
    },
    {
      title: 'Registration',
      fields: [
        { key: 'registrationNumber', label: 'Registration number', type: 'text', required: true },
        { key: 'jurisdiction', label: 'Country / jurisdiction', type: 'text', required: true },
        { key: 'registrationAuthority', label: 'Registration authority', type: 'text' },
      ],
    },
    {
      title: 'Domain & address',
      fields: [
        { key: 'website', label: 'Website', type: 'text', placeholder: 'https://' },
        { key: 'registeredAddress', label: 'Registered address', type: 'textarea' },
      ],
    },
    {
      title: 'Representative',
      fields: [
        { key: 'representativeName', label: 'Representative name', type: 'text', required: true },
        { key: 'representativeRole', label: 'Role', type: 'text' },
        { key: 'representativeWorkEmail', label: 'Work email', type: 'text', required: true },
      ],
    },
  ],
};

export default function BusinessVerificationNewPage() {
  return (
    <PageContainer>
      <VerificationWizard config={config} />
    </PageContainer>
  );
}
