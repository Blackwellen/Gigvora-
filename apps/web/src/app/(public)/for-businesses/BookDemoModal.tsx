'use client';

import { useState } from 'react';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, getApiErrorMessage } from '@/lib/api';
import { CheckCircle2 } from 'lucide-react';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function BookDemoModal({
  open,
  onClose,
  product = 'general',
}: {
  open: boolean;
  onClose: () => void;
  product?: string;
}) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    jobTitle: '',
    phone: '',
    companySize: '',
    message: '',
    consentGiven: false,
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleClose() {
    onClose();
    if (status === 'success') {
      setStatus('idle');
      setForm({ name: '', email: '', company: '', jobTitle: '', phone: '', companySize: '', message: '', consentGiven: false });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.consentGiven) {
      setError('Please fill in your name, email, and accept the privacy consent.');
      return;
    }
    setStatus('submitting');
    setError('');
    try {
      await api.post('/public/demo-request', {
        email: form.email.trim(),
        name: form.name.trim(),
        company: form.company.trim() || undefined,
        jobTitle: form.jobTitle.trim() || undefined,
        phone: form.phone.trim() || undefined,
        companySize: form.companySize || undefined,
        message: form.message.trim() || undefined,
        consentGiven: form.consentGiven,
        source: 'for_businesses_page',
        product,
      });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(getApiErrorMessage(err, 'Could not submit your request right now. Please try again.'));
    }
  }

  return (
    <Modal open={open} onClose={handleClose} labelledBy="book-demo-title" className="max-w-lg">
      <ModalHeader title="Book a demo" onClose={handleClose} />
      <div className="px-5 py-5">
        {status === 'success' ? (
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-brand-600" />
            <p className="mt-4 text-base font-bold text-ink-900">Request received</p>
            <p className="mt-1 text-sm text-ink-500">
              Thanks, {form.name.split(' ')[0] || 'there'}. Our team will reach out within one business day to schedule your
              personalized walkthrough.
            </p>
            <Button className="mt-6" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">Full name *</label>
                <Input
                  data-autofocus
                  required
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">Work email *</label>
                <Input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="jane@company.com"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">Company name</label>
                <Input value={form.company} onChange={(e) => update('company', e.target.value)} placeholder="Acme Corporation" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">Job title</label>
                <Input value={form.jobTitle} onChange={(e) => update('jobTitle', e.target.value)} placeholder="Head of Talent" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">Phone number</label>
                <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+1 (555) 123-4567" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">Company size</label>
                <select
                  value={form.companySize}
                  onChange={(e) => update('companySize', e.target.value)}
                  className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">Select company size</option>
                  <option value="1-10">1–10 employees</option>
                  <option value="11-50">11–50 employees</option>
                  <option value="51-200">51–200 employees</option>
                  <option value="201-1000">201–1,000 employees</option>
                  <option value="1000+">1,000+ employees</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-700">What would you like to see?</label>
              <textarea
                rows={3}
                value={form.message}
                onChange={(e) => update('message', e.target.value)}
                placeholder="Tell us about your hiring or project goals..."
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <label className="flex items-start gap-2 text-xs text-ink-500">
              <input
                type="checkbox"
                checked={form.consentGiven}
                onChange={(e) => update('consentGiven', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500/40"
              />
              I agree to be contacted by Gigvora about this request, per the{' '}
              <a href="/legal-index?doc=privacy-policy" className="text-brand-600 hover:underline">
                Privacy Policy
              </a>
              .
            </label>
            {status === 'error' && <p className="text-xs text-red-600">{error}</p>}
            {status === 'idle' && error && <p className="text-xs text-red-600">{error}</p>}
            <Button type="submit" loading={status === 'submitting'} className="w-full justify-center">
              Request demo
            </Button>
          </form>
        )}
      </div>
    </Modal>
  );
}
