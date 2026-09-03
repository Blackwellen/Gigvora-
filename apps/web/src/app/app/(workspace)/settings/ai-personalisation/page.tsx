'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  UserCog,
  MessageSquareText,
  ListTree,
  Tags,
  Globe2,
  Sparkles,
  Briefcase,
  Target,
  BellRing,
  Languages,
  BookOpen,
  Lock,
  Eye,
  X,
  Plus,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  useAiPersonalisation,
  useUpdateAiPersonalisation,
  DEFAULT_AI_PERSONALISATION,
  type AiPersonalisation,
  type CommunicationStyle,
  type PersonalisationTone,
  type ResponseFormat,
} from '@/hooks/useAiPersonalisation';

type Option<T extends string> = { value: T; label: string };

function Select<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<Option<T>>;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-8 max-w-[160px] rounded-lg border border-ink-200 bg-white px-2 text-xs font-medium text-ink-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs text-ink-600 dark:text-ink-300">{label}</span>
      {children}
    </div>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  description,
  badge,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
          <div>
            <h3 className="text-sm font-bold text-ink-900 dark:text-white">{title}</h3>
            <p className="text-[11px] text-ink-400 dark:text-ink-500">{description}</p>
          </div>
        </div>
        {badge}
      </div>
      <div className="space-y-0.5">{children}</div>
    </Card>
  );
}

function ComingSoonCard({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return (
    <Card className="p-4 opacity-60">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
          <div>
            <h3 className="text-sm font-bold text-ink-900 dark:text-white">{title}</h3>
            <p className="text-[11px] text-ink-400 dark:text-ink-500">{description}</p>
          </div>
        </div>
        <Badge tone="neutral">Not yet configurable</Badge>
      </div>
      <div className="pointer-events-none space-y-2 opacity-50">
        <div className="h-2 w-3/4 rounded bg-ink-200 dark:bg-ink-700" />
        <div className="h-2 w-1/2 rounded bg-ink-200 dark:bg-ink-700" />
      </div>
    </Card>
  );
}

const COMMUNICATION_STYLE_OPTIONS: Array<Option<CommunicationStyle>> = [
  { value: 'concise', label: 'Concise' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'detailed', label: 'Detailed' },
];

const TONE_OPTIONS: Array<Option<PersonalisationTone>> = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'direct', label: 'Direct' },
];

const RESPONSE_FORMAT_OPTIONS: Array<Option<ResponseFormat>> = [
  { value: 'auto', label: 'Auto' },
  { value: 'bullet_points', label: 'Bullet points' },
  { value: 'prose', label: 'Prose' },
];

const LANGUAGE_OPTIONS: Array<Option<string>> = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
];

const COMING_SOON_CARDS = [
  { icon: Briefcase, title: 'Personal profile & work style', description: 'Role, seniority, and working style context.' },
  { icon: Target, title: 'Industry & role context', description: 'Industry-specific terminology and framing.' },
  { icon: BookOpen, title: 'Goals & priorities', description: 'Long-running goals Copilot should keep in mind.' },
  { icon: Sparkles, title: 'Suggestion tuning', description: 'Fine-tune how proactive suggestions are generated.' },
  { icon: BellRing, title: 'Proactive recommendations', description: 'Copilot surfacing ideas before you ask.' },
  { icon: MessageSquareText, title: 'Meeting, writing & research prefs', description: 'Per-context style overrides.' },
];

function buildPreviewSummary(p: AiPersonalisation): string {
  if (p.version === 0) {
    return 'You haven’t customized personalisation yet, so Copilot uses balanced, professional defaults.';
  }
  const parts: string[] = [];
  if (p.communicationStyle === 'concise') parts.push('keep replies brief');
  if (p.communicationStyle === 'detailed') parts.push('go into more detail');
  if (p.tone === 'friendly') parts.push('use a warm, friendly tone');
  if (p.tone === 'direct') parts.push('be direct with minimal pleasantries');
  if (p.responseFormat === 'bullet_points') parts.push('prefer bullet points');
  if (p.focusAreas.length) parts.push(`weigh these focus areas: ${p.focusAreas.join(', ')}`);
  if (!parts.length) return 'With these settings, Copilot behaves like the default profile.';
  return `With these settings, Copilot will ${parts.join('; ')}.`;
}

export default function AiPersonalisationPage() {
  const { data: personalisation } = useAiPersonalisation();
  const update = useUpdateAiPersonalisation();
  const [tagInput, setTagInput] = useState('');

  const p = personalisation ?? DEFAULT_AI_PERSONALISATION;

  function patch(fields: Partial<AiPersonalisation>) {
    update.mutate(fields);
  }

  function addFocusArea(e: React.FormEvent) {
    e.preventDefault();
    const tag = tagInput.trim();
    if (!tag || p.focusAreas.includes(tag)) {
      setTagInput('');
      return;
    }
    patch({ focusAreas: [...p.focusAreas, tag] });
    setTagInput('');
  }

  function removeFocusArea(tag: string) {
    patch({ focusAreas: p.focusAreas.filter((t) => t !== tag) });
  }

  const customizedCount = useMemo(() => {
    let count = 0;
    if (p.communicationStyle !== DEFAULT_AI_PERSONALISATION.communicationStyle) count += 1;
    if (p.tone !== DEFAULT_AI_PERSONALISATION.tone) count += 1;
    if (p.responseFormat !== DEFAULT_AI_PERSONALISATION.responseFormat) count += 1;
    if (p.focusAreas.length > 0) count += 1;
    if (p.language !== DEFAULT_AI_PERSONALISATION.language) count += 1;
    return count;
  }, [p]);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/app/copilot-workspace"
            className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-400 hover:text-brand-600 dark:text-ink-500 dark:hover:text-brand-400"
          >
            <ExternalLink className="h-3 w-3" /> Back to Copilot
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">AI Personalisation</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Tune how Copilot communicates with you. These preferences are appended to Copilot&apos;s instructions on every
            generation, so they genuinely change its answers.
          </p>
        </div>
        <span className="text-[11px] text-ink-400 dark:text-ink-500">{update.isPending ? 'Saving…' : 'All changes are autosaved'}</span>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">Real, configurable preferences</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <SettingsCard icon={MessageSquareText} title="Communication preferences" description="How much detail Copilot gives you.">
                <Row label="Communication style">
                  <Select label="Communication style" value={p.communicationStyle} onChange={(v) => patch({ communicationStyle: v })} options={COMMUNICATION_STYLE_OPTIONS} />
                </Row>
                <Row label="Tone">
                  <Select label="Tone" value={p.tone} onChange={(v) => patch({ tone: v })} options={TONE_OPTIONS} />
                </Row>
              </SettingsCard>

              <SettingsCard icon={ListTree} title="Preferred outputs" description="How Copilot formats its responses.">
                <Row label="Response format">
                  <Select label="Response format" value={p.responseFormat} onChange={(v) => patch({ responseFormat: v })} options={RESPONSE_FORMAT_OPTIONS} />
                </Row>
              </SettingsCard>

              <SettingsCard icon={Languages} title="Language" description="The language Copilot should reply in.">
                <Row label="Language">
                  <Select label="Language" value={p.language} onChange={(v) => patch({ language: v })} options={LANGUAGE_OPTIONS} />
                </Row>
              </SettingsCard>

              <SettingsCard icon={Tags} title="Focus areas" description="Topics Copilot should weigh as especially relevant.">
                <form onSubmit={addFocusArea} className="mb-2 flex gap-1.5">
                  <Input
                    aria-label="Add focus area"
                    placeholder="e.g. hiring, sales ops"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    className="h-8 flex-1 text-xs"
                  />
                  <Button type="submit" size="sm" variant="outline" disabled={!tagInput.trim()}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </form>
                {p.focusAreas.length === 0 ? (
                  <p className="text-[11px] text-ink-400">No focus areas added yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {p.focusAreas.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-400"
                      >
                        {tag}
                        <button type="button" onClick={() => removeFocusArea(tag)} aria-label={`Remove ${tag}`}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </SettingsCard>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">Coming soon</h2>
              <span className="text-[11px] text-ink-400 dark:text-ink-500">— not yet configurable on this backend</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {COMING_SOON_CARDS.map((c) => (
                <ComingSoonCard key={c.title} {...c} />
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-bold text-ink-900 dark:text-white">Personalisation summary</h3>
            <p className="mt-2 text-2xl font-bold text-ink-900 dark:text-white">
              {customizedCount} <span className="text-sm font-medium text-ink-400">of 5 customized</span>
            </p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-ink-100 dark:bg-ink-800">
              <div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${(customizedCount / 5) * 100}%` }} />
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <UserCog className="h-4 w-4 text-ink-400" />
              <h3 className="text-sm font-bold text-ink-900 dark:text-white">Applied profile</h3>
            </div>
            <Badge tone="brand">Personal</Badge>
            <p className="mt-2 text-[11px] text-ink-400 dark:text-ink-500">
              There&apos;s no separate workspace or enterprise personalisation profile yet — this always reflects your own
              personal preferences.
            </p>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Eye className="h-4 w-4 text-ink-400" />
              <h3 className="text-sm font-bold text-ink-900 dark:text-white">Preview of assistant behavior</h3>
            </div>
            <p className="text-xs text-ink-600 dark:text-ink-300">{buildPreviewSummary(p)}</p>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Lock className="h-4 w-4 text-ink-400" />
              <h3 className="text-sm font-bold text-ink-900 dark:text-white">Privacy boundaries</h3>
            </div>
            <p className="text-[11px] text-ink-400 dark:text-ink-500">
              These preferences are private to your account and are only used to shape Copilot&apos;s responses to you.
            </p>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-ink-400" />
              <h3 className="text-sm font-bold text-ink-900 dark:text-white">More AI controls</h3>
            </div>
            <div className="space-y-1.5">
              <Link
                href="/app/settings/ai-memory"
                className="flex items-center justify-between text-xs text-ink-600 hover:text-brand-600 dark:text-ink-300 dark:hover:text-brand-400"
              >
                AI Memory
                <ExternalLink className="h-3 w-3" />
              </Link>
              <Link
                href="/app/settings/model-preferences"
                className="flex items-center justify-between text-xs text-ink-600 hover:text-brand-600 dark:text-ink-300 dark:hover:text-brand-400"
              >
                Model Preferences
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-bold text-ink-900 dark:text-white">Need help?</h3>
            <Link
              href="/help-centre"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Visit Help Center
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
