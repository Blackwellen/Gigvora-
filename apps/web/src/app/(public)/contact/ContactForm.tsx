'use client';

import { useState, cloneElement, isValidElement, type ReactElement } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api, getApiErrorMessage } from '@/lib/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// UI labels map to the backend's accepted lead_type values
// (demo|sales|enterprise|recruiter|sales_navigator|partnership|general_contact).
const TOPIC_OPTIONS: { value: string; label: string }[] = [
  { value: 'sales', label: 'Sales — pricing & plans' },
  { value: 'general_contact', label: 'Support — help with my account' },
  { value: 'partnership', label: 'Partnership — integrations & collaborations' },
  { value: 'general_contact', label: 'Press & Media' },
  { value: 'general_contact', label: 'Community — feedback & ideas' },
  { value: 'enterprise', label: 'Enterprise — security & compliance' },
  { value: 'recruiter', label: 'Recruiter product' },
  { value: 'sales_navigator', label: 'Sales Navigator product' },
];

const HEARD_ABOUT_OPTIONS = ['Search engine', 'Social media', 'Referral', 'Press / news article', 'Event or conference', 'Other'];

const COMPANY_SIZE_OPTIONS = ['1–10 employees', '11–50 employees', '51–200 employees', '201–1,000 employees', '1,000+ employees'];

type FormState = {
  name: string;
  email: string;
  company: string;
  jobTitle: string;
  phone: string;
  companySize: string;
  topicLabel: string;
  heardAbout: string;
  message: string;
  consentGiven: boolean;
};

const INITIAL_STATE: FormState = {
  name: '',
  email: '',
  company: '',
  jobTitle: '',
  phone: '',
  companySize: '',
  topicLabel: '',
  heardAbout: '',
  message: '',
  consentGiven: false,
};

export function ContactForm() {
  const searchParams = useSearchParams();
  const presetTopic = searchParams.get('topic');
  const presetOption = TOPIC_OPTIONS.find((o) => o.value === presetTopic);

  const [form, setForm] = useState<FormState>({ ...INITIAL_STATE, topicLabel: presetOption?.label ?? '' });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState('');

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = 'Full name is required.';
    if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid work email address.';
    if (!form.company.trim()) next.company = 'Company name is required.';
    if (!form.topicLabel) next.topicLabel = 'Please select a topic.';
    if (!form.message.trim()) next.message = 'Please tell us how we can help.';
    if (!form.consentGiven) next.consentGiven = 'Please accept the Privacy Policy and Terms of Service.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setStatus('submitting');
    setServerError('');
    const matched = TOPIC_OPTIONS.find((o) => o.label === form.topicLabel);
    try {
      await api.post('/public/contact', {
        email: form.email.trim(),
        name: form.name.trim(),
        company: form.company.trim(),
        jobTitle: form.jobTitle.trim() || undefined,
        phone: form.phone.trim() || undefined,
        companySize: form.companySize || undefined,
        topic: matched?.value || 'general_contact',
        message: form.heardAbout
          ? `${form.message.trim()}\n\n[How can I help — ${form.topicLabel}] [Heard about us via: ${form.heardAbout}]`
          : form.message.trim(),
        consentGiven: form.consentGiven,
        source: 'contact_page',
      });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setServerError(getApiErrorMessage(err, 'Could not send your message right now. Please try again.'));
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-ink-100 bg-white p-8 text-center shadow-floating">
        <CheckCircle2 className="h-12 w-12 text-brand-600" />
        <h2 className="mt-4 text-lg font-bold text-ink-900">Message sent</h2>
        <p className="mt-2 max-w-sm text-sm text-ink-500">
          Thanks, {form.name.split(' ')[0] || 'there'}. Our team has received your message and will get back to you
          shortly, usually within one business day.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => {
            setForm(INITIAL_STATE);
            setStatus('idle');
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-2xl border border-ink-100 bg-white p-6 shadow-floating">
      <h2 className="text-lg font-bold text-ink-900">Send us a message</h2>
      <p className="mt-1 text-sm text-ink-500">Fill out the form and the right person will get back to you.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required error={errors.name}>
          <Input
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Jane Smith"
            aria-invalid={Boolean(errors.name)}
          />
        </Field>
        <Field label="Work email" required error={errors.email}>
          <Input
            required
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="jane.smith@company.com"
            aria-invalid={Boolean(errors.email)}
          />
        </Field>
        <Field label="Company name" required error={errors.company}>
          <Input
            required
            value={form.company}
            onChange={(e) => update('company', e.target.value)}
            placeholder="Acme Corporation"
            aria-invalid={Boolean(errors.company)}
          />
        </Field>
        <Field label="Job title">
          <Input value={form.jobTitle} onChange={(e) => update('jobTitle', e.target.value)} placeholder="Product Manager" />
        </Field>
        <Field label="Phone number">
          <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+1 (555) 123-4567" />
        </Field>
        <Field label="Company size">
          <Select value={form.companySize} onChange={(v) => update('companySize', v)} placeholder="Select company size">
            {COMPANY_SIZE_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="What can I help you with?" required error={errors.topicLabel}>
          <Select value={form.topicLabel} onChange={(v) => update('topicLabel', v)} placeholder="Select a topic">
            {TOPIC_OPTIONS.map((o) => (
              <option key={o.label} value={o.label}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Where did you hear about us?">
          <Select value={form.heardAbout} onChange={(v) => update('heardAbout', v)} placeholder="Select an option">
            {HEARD_ABOUT_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Tell us more about your inquiry" required error={errors.message} id="contact-message">
          <textarea
            required
            rows={4}
            value={form.message}
            onChange={(e) => update('message', e.target.value)}
            placeholder="Share a few details about your goals or questions..."
            aria-invalid={Boolean(errors.message)}
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </Field>
      </div>

      <label className="mt-4 flex items-start gap-2 text-xs text-ink-600">
        <input
          type="checkbox"
          checked={form.consentGiven}
          onChange={(e) => update('consentGiven', e.target.checked)}
          aria-invalid={Boolean(errors.consentGiven)}
          aria-describedby={errors.consentGiven ? 'contact-consent-error' : undefined}
          className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500/40"
        />
        I agree to Gigvora&rsquo;s{' '}
        <a href="/legal-index?doc=privacy-policy" className="text-brand-600 hover:underline">
          Privacy Policy
        </a>{' '}
        and{' '}
        <a href="/legal-index?doc=terms-of-service" className="text-brand-600 hover:underline">
          Terms of Service
        </a>
        .
      </label>
      {errors.consentGiven && (
        <p id="contact-consent-error" role="alert" className="mt-1.5 text-xs text-red-600">
          {errors.consentGiven}
        </p>
      )}

      {status === 'error' && (
        <p role="alert" className="mt-3 text-xs text-red-600">
          {serverError}
        </p>
      )}

      <Button type="submit" loading={status === 'submitting'} className="mt-5 w-full justify-center" size="lg">
        Send message
      </Button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-ink-500">
        <ShieldCheck className="h-3.5 w-3.5" /> Your information is secure and will only be used to respond to your inquiry.
      </p>
    </form>
  );
}

function slugify(label: string) {
  return `contact-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
}

function Field({
  label,
  required,
  error,
  children,
  id,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  id?: string;
}) {
  const fieldId = id ?? slugify(label);
  const errorId = `${fieldId}-error`;
  const child = isValidElement(children)
    ? cloneElement(children as ReactElement<any>, {
        id: fieldId,
        'aria-describedby': error ? errorId : undefined,
      })
    : children;

  return (
    <div>
      <label htmlFor={fieldId} className="mb-1 block text-xs font-semibold text-ink-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {child}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  placeholder,
  children,
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  children: React.ReactNode;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'>) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      {...rest}
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  );
}
