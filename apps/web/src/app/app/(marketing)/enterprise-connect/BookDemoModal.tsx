'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function BookDemoModal({
  product,
  triggerLabel,
  triggerVariant = 'primary',
  triggerClassName,
}: {
  product: string;
  triggerLabel: string;
  triggerVariant?: 'primary' | 'outline';
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', company: '', jobTitle: '', message: '', consentGiven: false });

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  function reset() {
    setStatus('idle');
    setError('');
    setForm({ name: '', email: '', company: '', jobTitle: '', message: '', consentGiven: false });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.consentGiven) {
      setError('Please accept the Privacy Policy and Terms of Service.');
      return;
    }
    setStatus('submitting');
    setError('');
    try {
      await api.post('/public/demo-request', {
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim() || undefined,
        jobTitle: form.jobTitle.trim() || undefined,
        message: form.message.trim() || undefined,
        consentGiven: true,
        source: 'product_page',
        product,
      });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(getApiErrorMessage(err, 'Could not send your request right now. Please try again.'));
    }
  }

  return (
    <>
      <Button type="button" variant={triggerVariant} size="lg" className={triggerClassName} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-ink-900/50"
            onClick={() => {
              setOpen(false);
              reset();
            }}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-floating">
            <button
              type="button"
              aria-label="Close dialog"
              onClick={() => {
                setOpen(false);
                reset();
              }}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-700"
            >
              <X className="h-4 w-4" />
            </button>

            {status === 'success' ? (
              <div className="py-4 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-ink-900">Request received</h3>
                <p className="mt-1 text-sm text-ink-500">
                  Thanks, {form.name.split(' ')[0] || 'there'} — our enterprise team will reach out shortly.
                </p>
                <Button
                  type="button"
                  className="mt-5 w-full justify-center"
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                >
                  Done
                </Button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-ink-900">Contact sales</h3>
                <p className="mt-1 text-sm text-ink-500">Tell us about your organization and we&rsquo;ll be in touch.</p>

                <form onSubmit={handleSubmit} className="mt-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Full name" required value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
                    <Field
                      label="Work email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Company" value={form.company} onChange={(v) => setForm((f) => ({ ...f, company: v }))} />
                    <Field label="Job title" value={form.jobTitle} onChange={(v) => setForm((f) => ({ ...f, jobTitle: v }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-ink-700">How large is your organization?</label>
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                      rows={3}
                      className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-400"
                      placeholder="Optional"
                    />
                  </div>
                  <label className="flex items-start gap-2 text-xs text-ink-500">
                    <input
                      type="checkbox"
                      checked={form.consentGiven}
                      onChange={(e) => setForm((f) => ({ ...f, consentGiven: e.target.checked }))}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-ink-300"
                    />
                    I agree to the Privacy Policy and Terms of Service.
                  </label>

                  {status === 'error' && <p className="text-xs text-red-600">{error}</p>}

                  <Button type="submit" loading={status === 'submitting'} className="w-full justify-center">
                    Send request
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-ink-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn('w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-400')}
      />
    </div>
  );
}
