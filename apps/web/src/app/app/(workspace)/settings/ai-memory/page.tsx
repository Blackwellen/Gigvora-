'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BrainCircuit,
  Trash2,
  Plus,
  Download,
  RotateCcw,
  ShieldCheck,
  Database,
  Sparkles,
  AlertTriangle,
  Lock,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { getApiErrorMessage } from '@/lib/api';
import {
  useAiMemories,
  useCreateAiMemory,
  useDeleteAiMemory,
  useResetAiMemories,
  useExportAiMemories,
  type MemoryType,
  type AiMemory,
} from '@/hooks/useAiMemory';
import { useModelPreferences } from '@/hooks/useModelPreferences';

const MEMORY_TYPE_LABELS: Record<MemoryType, string> = {
  preference: 'Preferences',
  fact: 'Facts',
  entity: 'Entities',
};

const MEMORY_TYPE_OPTIONS: Array<{ value: MemoryType; label: string }> = [
  { value: 'preference', label: 'Preference' },
  { value: 'fact', label: 'Fact' },
  { value: 'entity', label: 'Entity' },
];

function StatTile({
  icon: Icon,
  label,
  value,
  caption,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-ink-400">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1.5 text-lg font-bold text-ink-900 dark:text-white">{value}</p>
      {caption && <p className="mt-0.5 text-[11px] text-ink-400 dark:text-ink-500">{caption}</p>}
    </Card>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  description,
  badge,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('p-4', className)}>
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
      {children}
    </Card>
  );
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function AiMemoryPage() {
  const { data: memories = [], isLoading } = useAiMemories();
  const createMemory = useCreateAiMemory();
  const deleteMemory = useDeleteAiMemory();
  const resetMemories = useResetAiMemories();
  const exportMemories = useExportAiMemories();
  const { data: modelPrefs } = useModelPreferences();

  const [memoryType, setMemoryType] = useState<MemoryType>('preference');
  const [memoryKey, setMemoryKey] = useState('');
  const [value, setValue] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetResult, setResetResult] = useState<number | null>(null);

  const grouped = useMemo(() => {
    const counts: Record<MemoryType, number> = { preference: 0, fact: 0, entity: 0 };
    memories.forEach((m) => {
      if (m.memoryType in counts) counts[m.memoryType] += 1;
    });
    return counts;
  }, [memories]);

  const recentCount = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return memories.filter((m) => new Date(m.createdAt).getTime() >= cutoff).length;
  }, [memories]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!value.trim()) {
      setFormError('Enter what you want Copilot to remember.');
      return;
    }
    try {
      await createMemory.mutateAsync({
        memoryType,
        memoryKey: memoryKey.trim() || undefined,
        value: value.trim(),
      });
      setMemoryKey('');
      setValue('');
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Could not save this memory.'));
    }
  }

  async function handleReset() {
    const result = await resetMemories.mutateAsync();
    setResetResult(result.deleted);
    setResetOpen(false);
  }

  async function handleExport() {
    const payload = await exportMemories.mutateAsync();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gigvora-ai-memory-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const hasMemories = memories.length > 0;

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
          <h1 className="font-display text-2xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">AI Memory</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            What Copilot remembers about you. Memories are only ever added explicitly — Gigvora does not automatically save
            things you say in conversation. Approved memories are included in Copilot&apos;s context on every generation.
          </p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={BrainCircuit}
          label="Memory status"
          value={hasMemories ? 'Active' : 'No memories yet'}
          caption={hasMemories ? `${memories.length} saved` : 'Add your first memory below'}
        />
        <StatTile icon={Database} label="Total memories" value={String(memories.length)} />
        <StatTile
          icon={Sparkles}
          label="Added this week"
          value={String(recentCount)}
          caption="Explicit saves only — never automatic"
        />
        <StatTile icon={Lock} label="Personal memory only" value="Private to you" caption="Workspace/org memory not available yet" />
      </div>

      {resetResult !== null && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
          <span>Deleted {resetResult} {resetResult === 1 ? 'memory' : 'memories'}.</span>
          <button type="button" onClick={() => setResetResult(null)} className="text-emerald-700/70 hover:text-emerald-700 dark:text-emerald-400/70">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <SettingsCard icon={Plus} title="Add a memory" description="Explicitly tell Copilot something to remember.">
              <form onSubmit={handleCreate} className="space-y-2">
                <div className="flex gap-2">
                  <select
                    aria-label="Memory type"
                    value={memoryType}
                    onChange={(e) => setMemoryType(e.target.value as MemoryType)}
                    className="h-9 rounded-lg border border-ink-200 bg-white px-2 text-xs font-medium text-ink-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
                  >
                    {MEMORY_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    aria-label="Memory key (optional)"
                    placeholder="Key (optional, e.g. tone)"
                    value={memoryKey}
                    onChange={(e) => setMemoryKey(e.target.value)}
                    className="h-9 flex-1 text-xs"
                  />
                </div>
                <textarea
                  aria-label="Memory value"
                  placeholder="e.g. I prefer concise, bulleted answers."
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  rows={3}
                  className="w-full rounded-control border border-ink-200 bg-white px-3 py-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:placeholder:text-ink-500"
                />
                {formError && (
                  <p className="flex items-start gap-1.5 text-[11px] font-medium text-red-600 dark:text-red-400">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    {formError}
                  </p>
                )}
                <Button type="submit" size="sm" loading={createMemory.isPending}>
                  <Plus className="h-3.5 w-3.5" />
                  Save memory
                </Button>
              </form>
            </SettingsCard>

            <SettingsCard icon={BrainCircuit} title="Remembered entities" description="Your saved memories, grouped by type.">
              <div className="space-y-1.5">
                {(Object.keys(MEMORY_TYPE_LABELS) as MemoryType[]).map((type) => (
                  <div key={type} className="flex items-center justify-between py-1">
                    <span className="text-xs text-ink-600 dark:text-ink-300">{MEMORY_TYPE_LABELS[type]}</span>
                    <Badge tone="neutral">{grouped[type]}</Badge>
                  </div>
                ))}
              </div>
              <p className="mt-2 border-t border-ink-100 pt-2 text-[11px] leading-snug text-ink-400 dark:border-ink-800 dark:text-ink-500">
                Grouped by the real memory types Gigvora stores. There are no separate Companies/People/Products categories.
              </p>
            </SettingsCard>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <SettingsCard icon={ShieldCheck} title="Memory sources & exclusions" description="What can be remembered, and what's automatically blocked.">
              <p className="text-xs text-ink-600 dark:text-ink-300">
                Only memory you explicitly ask Copilot to save is stored — nothing is captured automatically from
                conversations.
              </p>
              <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-600 dark:text-ink-300">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                Content that looks like a password, SSN, card number, or API key is rejected automatically and never saved.
              </p>
              <p className="mt-2 border-t border-ink-100 pt-2 text-[11px] leading-snug text-ink-400 dark:border-ink-800 dark:text-ink-500">
                Allowed-source filtering, workspace data access, and per-item approval settings aren&apos;t configurable yet —
                every memory here is personal and self-approved by the act of creating it.
              </p>
            </SettingsCard>

            <SettingsCard icon={RotateCcw} title="Privacy, retention & export" description="Reset or download everything Copilot remembers about you.">
              <div className="space-y-2">
                <Button variant="outline" size="sm" onClick={handleExport} loading={exportMemories.isPending} className="w-full justify-center">
                  <Download className="h-3.5 w-3.5" />
                  Export memories (JSON)
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setResetOpen(true)}
                  disabled={!hasMemories}
                  className="w-full justify-center"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Reset all memories
                </Button>
              </div>
              <p className="mt-2 border-t border-ink-100 pt-2 text-[11px] leading-snug text-ink-400 dark:border-ink-800 dark:text-ink-500">
                Resetting permanently deletes every memory below. This cannot be undone.
              </p>
            </SettingsCard>
          </div>

          <SettingsCard icon={Database} title="Your memories" description={`${memories.length} saved`}>
            {isLoading ? (
              <p className="py-6 text-center text-xs text-ink-400">Loading…</p>
            ) : memories.length === 0 ? (
              <p className="py-6 text-center text-xs text-ink-400">
                Nothing remembered yet. Add a memory above to personalize Copilot&apos;s answers.
              </p>
            ) : (
              <div className="divide-y divide-ink-100 dark:divide-ink-800">
                {memories.map((m) => (
                  <MemoryRow key={m.id} memory={m} onDelete={() => deleteMemory.mutate(m.id)} deleting={deleteMemory.isPending && deleteMemory.variables === m.id} />
                ))}
              </div>
            )}
          </SettingsCard>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-bold text-ink-900 dark:text-white">Model, tools & safety</h3>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between py-0.5">
                <span className="text-xs text-ink-600 dark:text-ink-300">Default model</span>
                <span className="text-xs font-medium text-ink-900 dark:text-white">{modelPrefs?.defaultModel || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="text-xs text-ink-600 dark:text-ink-300">Fallback model</span>
                <span className="text-xs font-medium text-ink-900 dark:text-white">{modelPrefs?.fallbackModel || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="text-xs text-ink-600 dark:text-ink-300">PII redaction</span>
                <Badge tone={modelPrefs?.safetyConfig?.piiRedaction ? 'success' : 'neutral'}>
                  {modelPrefs?.safetyConfig?.piiRedaction ? 'On' : 'Off'}
                </Badge>
              </div>
            </div>
            <Link
              href="/app/settings/model-preferences"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400"
            >
              Manage model & tool settings
              <ExternalLink className="h-3 w-3" />
            </Link>
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

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} labelledBy="reset-memory-title" className="max-w-md">
        <ModalHeader title="Reset all memories?" onClose={() => setResetOpen(false)} />
        <div className="px-5 py-4">
          <p className="text-sm text-ink-600 dark:text-ink-300">
            This permanently deletes all {memories.length} {memories.length === 1 ? 'memory' : 'memories'} Copilot has saved
            about you. This cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-ink-100 px-5 py-4 dark:border-ink-800">
          <Button variant="outline" size="sm" onClick={() => setResetOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={handleReset} loading={resetMemories.isPending}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete all memories
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function MemoryRow({ memory, onDelete, deleting }: { memory: AiMemory; onDelete: () => void; deleting: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Badge tone="neutral">{MEMORY_TYPE_LABELS[memory.memoryType] || memory.memoryType}</Badge>
          {memory.memoryKey && <span className="text-[11px] font-semibold text-ink-500 dark:text-ink-400">{memory.memoryKey}</span>}
          <span className="text-[11px] text-ink-400">{formatDate(memory.createdAt)}</span>
        </div>
        <p className="mt-1 truncate text-xs text-ink-700 dark:text-ink-200">{formatValue(memory.value)}</p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        aria-label="Delete memory"
        className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-500/10 dark:hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
