'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Cpu,
  Brain,
  Gauge,
  Shuffle,
  Search,
  Wrench,
  SlidersHorizontal,
  ShieldAlert,
  Coins,
  Layers,
  ExternalLink,
  HelpCircle,
  Code2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { useEntitlements } from '@/hooks/useEntitlements';
import {
  useAvailableModels,
  useModelPreferences,
  useUpdateModelPreferences,
  type ModelPreferences,
  type RoutingStrategy,
  type ReasoningMode,
  type SafetyLevel,
} from '@/hooks/useModelPreferences';

type Option<T extends string> = { value: T; label: string };

function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-40',
        checked ? 'bg-brand-600' : 'bg-ink-200 dark:bg-ink-700'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
  disabled,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<Option<T>>;
  disabled?: boolean;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-8 max-w-[170px] rounded-lg border border-ink-200 bg-white px-2 text-xs font-medium text-ink-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function NumberField({ value, onChange, label, suffix }: { value: number; onChange: (v: number) => void; label: string; suffix?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        aria-label={label}
        value={value}
        min={0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-8 w-24 rounded-lg border border-ink-200 bg-white px-2 text-right text-xs font-medium text-ink-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
      />
      {suffix && <span className="text-[11px] text-ink-400">{suffix}</span>}
    </div>
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

function LiveBadge() {
  return <Badge tone="success">Live</Badge>;
}

function SavedOnlyBadge() {
  return <Badge tone="neutral">Saved — not yet applied to generation</Badge>;
}

const ROUTING_OPTIONS: Array<Option<RoutingStrategy>> = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'quality', label: 'Quality' },
  { value: 'speed', label: 'Speed' },
  { value: 'cost', label: 'Cost' },
];

const REASONING_OPTIONS: Array<Option<ReasoningMode>> = [
  { value: 'auto', label: 'Auto' },
  { value: 'fast', label: 'Fast' },
  { value: 'thorough', label: 'Thorough' },
];

const SAFETY_LEVEL_OPTIONS: Array<Option<SafetyLevel>> = [
  { value: 'strict', label: 'Strict' },
  { value: 'standard', label: 'Standard' },
  { value: 'relaxed', label: 'Relaxed' },
];

export default function ModelPreferencesPage() {
  const { data: models = [] } = useAvailableModels();
  const { data: prefs, isLoading } = useModelPreferences();
  const update = useUpdateModelPreferences();
  const { data: entitlements } = useEntitlements();
  const [showJson, setShowJson] = useState(false);

  if (isLoading || !prefs) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-6">
        <p className="text-sm text-ink-400">Loading model preferences…</p>
      </div>
    );
  }

  function patch(fields: Partial<ModelPreferences>) {
    update.mutate(fields);
  }

  function patchRetrieval(fields: Partial<ModelPreferences['retrievalConfig']>) {
    patch({ retrievalConfig: { ...prefs!.retrievalConfig, ...fields } });
  }

  function patchTools(fields: Partial<ModelPreferences['toolConfig']>) {
    patch({ toolConfig: { ...prefs!.toolConfig, ...fields } });
  }

  function patchSafety(fields: Partial<ModelPreferences['safetyConfig']>) {
    patch({ safetyConfig: { ...prefs!.safetyConfig, ...fields } });
  }

  function patchBudget(fields: Partial<ModelPreferences['budgetConfig']>) {
    patch({ budgetConfig: { ...prefs!.budgetConfig, ...fields } });
  }

  const modelOptions: Array<Option<string>> = models.map((m) => ({ value: m.id, label: m.label }));
  const planLabel = entitlements?.planKey ? entitlements.planKey.replace(/_/g, ' ') : 'Free';

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
          <h1 className="font-display text-2xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">Model Preferences</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Choose which model Copilot uses and configure how it retrieves, tools, and stays safe. Default and fallback model
            selection is live; the other sections are saved to your account but not yet read by the generation pipeline.
          </p>
        </div>
        <span className="text-[11px] text-ink-400 dark:text-ink-500">{update.isPending ? 'Saving…' : 'All changes are autosaved'}</span>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">Model selection</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <SettingsCard icon={Cpu} title="1. Default model" description="The model Copilot uses by default." badge={<LiveBadge />}>
                <Row label="Model">
                  <Select label="Default model" value={prefs.defaultModel} onChange={(v) => patch({ defaultModel: v })} options={modelOptions} />
                </Row>
              </SettingsCard>

              <SettingsCard icon={Layers} title="2. Fallback model" description="Used automatically if the default model fails." badge={<LiveBadge />}>
                <Row label="Model">
                  <Select label="Fallback model" value={prefs.fallbackModel} onChange={(v) => patch({ fallbackModel: v })} options={modelOptions} />
                </Row>
              </SettingsCard>

              <SettingsCard icon={Shuffle} title="3. Routing strategy" description="How requests are routed across models." badge={<SavedOnlyBadge />}>
                <Row label="Strategy">
                  <Select label="Routing strategy" value={prefs.routingStrategy} onChange={(v) => patch({ routingStrategy: v })} options={ROUTING_OPTIONS} />
                </Row>
              </SettingsCard>

              <SettingsCard icon={Layers} title="4. Fallback behavior" description="See Fallback model above." badge={<LiveBadge />}>
                <p className="text-xs text-ink-500 dark:text-ink-400">
                  Copilot automatically retries once with your fallback model if the default model&apos;s generation fails.
                </p>
              </SettingsCard>

              <SettingsCard icon={Brain} title="5. Reasoning mode" description="How much the model deliberates before answering." badge={<SavedOnlyBadge />}>
                <Row label="Mode">
                  <Select label="Reasoning mode" value={prefs.reasoningMode} onChange={(v) => patch({ reasoningMode: v })} options={REASONING_OPTIONS} />
                </Row>
              </SettingsCard>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">Grounding, retrieval & tools</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <SettingsCard icon={Search} title="6. Grounding preferences" description="What data Copilot may ground responses in." badge={<SavedOnlyBadge />}>
                <Row label="Web grounding">
                  <Switch label="Web grounding" checked={prefs.retrievalConfig.webGrounding} onChange={(v) => patchRetrieval({ webGrounding: v })} />
                </Row>
                <Row label="Workspace files">
                  <Switch label="Workspace files" checked={prefs.retrievalConfig.workspaceFiles} onChange={(v) => patchRetrieval({ workspaceFiles: v })} />
                </Row>
                <Row label="Company data">
                  <Switch label="Company data" checked={prefs.retrievalConfig.companyData} onChange={(v) => patchRetrieval({ companyData: v })} />
                </Row>
              </SettingsCard>

              <SettingsCard icon={SlidersHorizontal} title="7. Retrieval controls" description="Same controls as grounding — Gigvora doesn't split these separately." badge={<SavedOnlyBadge />}>
                <p className="text-xs text-ink-500 dark:text-ink-400">
                  Retrieval and grounding share one config on this backend — adjust it in the Grounding preferences card.
                </p>
              </SettingsCard>

              <SettingsCard icon={Wrench} title="8. Tool permissions" description="Which tools Copilot may call." badge={<SavedOnlyBadge />}>
                <Row label="Web search">
                  <Switch label="Web search" checked={prefs.toolConfig.webSearch} onChange={(v) => patchTools({ webSearch: v })} />
                </Row>
                <Row label="Files">
                  <Switch label="Files" checked={prefs.toolConfig.files} onChange={(v) => patchTools({ files: v })} />
                </Row>
                <Row label="Calculator">
                  <Switch label="Calculator" checked={prefs.toolConfig.calculator} onChange={(v) => patchTools({ calculator: v })} />
                </Row>
              </SettingsCard>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">Safety & limits</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <SettingsCard icon={ShieldAlert} title="9. Safety & redaction" description="Content-safety level and PII handling." badge={<SavedOnlyBadge />}>
                <Row label="Safety level">
                  <Select label="Safety level" value={prefs.safetyConfig.level} onChange={(v) => patchSafety({ level: v })} options={SAFETY_LEVEL_OPTIONS} />
                </Row>
                <Row label="PII redaction">
                  <Switch label="PII redaction" checked={prefs.safetyConfig.piiRedaction} onChange={(v) => patchSafety({ piiRedaction: v })} />
                </Row>
              </SettingsCard>

              <SettingsCard icon={Gauge} title="10. Response controls" description="Same as reasoning mode & format — see above." badge={<SavedOnlyBadge />}>
                <p className="text-xs text-ink-500 dark:text-ink-400">
                  Response length/format is controlled from AI Personalisation, and reasoning depth from the Reasoning mode
                  card above.
                </p>
              </SettingsCard>

              <SettingsCard icon={Coins} title="11. Rate limits & budget" description="Caps on request volume and spend." badge={<SavedOnlyBadge />}>
                <Row label="Requests / minute">
                  <NumberField label="Requests per minute" value={prefs.budgetConfig.requestsPerMinute} onChange={(v) => patchBudget({ requestsPerMinute: v })} />
                </Row>
                <Row label="Tokens / minute">
                  <NumberField label="Tokens per minute" value={prefs.budgetConfig.tokensPerMinute} onChange={(v) => patchBudget({ tokensPerMinute: v })} />
                </Row>
                <Row label="Daily budget">
                  <NumberField label="Daily budget in USD" value={prefs.budgetConfig.dailyBudgetUsd} onChange={(v) => patchBudget({ dailyBudgetUsd: v })} suffix="USD" />
                </Row>
              </SettingsCard>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">Available models</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {models.map((m) => (
                <Card key={m.id} className="p-4">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-ink-900 dark:text-white">{m.label}</h3>
                    <Badge tone="neutral">{m.provider}</Badge>
                  </div>
                  <div className="space-y-1 text-xs text-ink-500 dark:text-ink-400">
                    <p>Context window: {m.contextWindow.toLocaleString()} tokens</p>
                    <p>Latency: {m.latencyClass}</p>
                    <p>Capabilities: {m.capabilities.join(', ')}</p>
                  </div>
                </Card>
              ))}
              {models.length === 0 && <p className="text-xs text-ink-400">No models available yet.</p>}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-900 dark:text-white">Current configuration</h3>
              <button
                type="button"
                onClick={() => setShowJson((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400"
              >
                <Code2 className="h-3 w-3" />
                {showJson ? 'Hide JSON' : 'View as JSON'}
              </button>
            </div>
            {showJson ? (
              <pre className="max-h-64 overflow-auto rounded-lg bg-ink-950 p-2.5 text-[10px] leading-relaxed text-emerald-300">
                {JSON.stringify(prefs, null, 2)}
              </pre>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-xs text-ink-600 dark:text-ink-300">Default model</span>
                  <span className="text-xs font-medium text-ink-900 dark:text-white">{prefs.defaultModel}</span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-xs text-ink-600 dark:text-ink-300">Fallback model</span>
                  <span className="text-xs font-medium text-ink-900 dark:text-white">{prefs.fallbackModel}</span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-xs text-ink-600 dark:text-ink-300">Routing</span>
                  <span className="text-xs font-medium text-ink-900 dark:text-white capitalize">{prefs.routingStrategy}</span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-xs text-ink-600 dark:text-ink-300">Using custom config</span>
                  <Badge tone={prefs.isDefault ? 'neutral' : 'brand'}>{prefs.isDefault ? 'No' : 'Yes'}</Badge>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="mb-2 text-sm font-bold text-ink-900 dark:text-white">Plan & limits</h3>
            <Badge tone="brand" className="capitalize">
              {planLabel} Plan
            </Badge>
            <p className="mt-2 text-[11px] text-ink-400 dark:text-ink-500">
              For request and token usage, see AI Usage.
            </p>
            <Link
              href="/app/ai-usage"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400"
            >
              View AI usage
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-bold text-ink-900 dark:text-white">More AI controls</h3>
            <div className="mt-2 space-y-1.5">
              <Link
                href="/app/settings/ai-memory"
                className="flex items-center justify-between text-xs text-ink-600 hover:text-brand-600 dark:text-ink-300 dark:hover:text-brand-400"
              >
                AI Memory
                <ExternalLink className="h-3 w-3" />
              </Link>
              <Link
                href="/app/settings/ai-personalisation"
                className="flex items-center justify-between text-xs text-ink-600 hover:text-brand-600 dark:text-ink-300 dark:hover:text-brand-400"
              >
                AI Personalisation
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
