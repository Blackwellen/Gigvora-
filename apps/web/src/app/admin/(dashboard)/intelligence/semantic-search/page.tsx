'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';

type IndexRow = {
  id: string;
  name: string;
  entity_type: string;
  embedding_model: string | null;
  dimension: number | null;
  distance_metric: string | null;
  record_count: number;
  status: string;
  last_indexed_at: string | null;
  avg_query_latency_ms: number | null;
};

type SearchResult = {
  query: string;
  entityType: string;
  latencyMs: number;
  semanticAvailable: boolean;
  note: string | null;
  results: { id: string; title: string; snippet: string; lexicalScore: number; semanticScore: number | null; hybridScore: number }[];
};

const STATUS_TONE: Record<string, 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  healthy: 'success',
  degraded: 'warning',
  unhealthy: 'danger',
  disabled: 'neutral',
  deploying: 'brand',
  not_built: 'neutral',
};

/**
 * 26.05 — embedding index registry + a real hybrid-search test console. Semantic scoring is
 * honestly gated on `semanticAvailable`: this codebase has no vector store wired up yet, so
 * results are lexical-only (ILIKE against jobs.title/description) until an embedding backend
 * lands — the API says so explicitly rather than faking a semantic score.
 */
export default function SemanticSearchPage() {
  const [indexes, setIndexes] = useState<IndexRow[] | null>(null);
  const [query, setQuery] = useState('senior product manager fintech remote');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadIndexes = useCallback(async () => {
    try {
      const res = await api.get<{ data: IndexRow[] }>('/intelligence/embeddings');
      setIndexes(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load embedding indexes.'));
    }
  }, []);

  useEffect(() => {
    loadIndexes();
  }, [loadIndexes]);

  async function runSearch() {
    setSearching(true);
    setError(null);
    try {
      const res = await api.get<{ data: SearchResult }>('/intelligence/embeddings/search-test', { params: { q: query, entityType: 'job' } });
      setResult(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Search test failed.'));
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold text-ink-900">Embedding &amp; semantic search</h2>
        <p className="text-sm text-ink-500">Vector indexes and a hybrid retrieval test console for authorised technical users.</p>
      </div>

      {error && <div className="rounded-panel border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-panel border border-ink-100 bg-white shadow-surface">
        <div className="border-b border-ink-100 px-4 py-3">
          <h3 className="font-display text-sm font-bold text-ink-900">Indexes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                <th className="px-4 py-2 font-semibold">Index</th>
                <th className="px-4 py-2 font-semibold">Entity</th>
                <th className="px-4 py-2 font-semibold">Model</th>
                <th className="px-4 py-2 font-semibold">Dimensions</th>
                <th className="px-4 py-2 font-semibold">Records</th>
                <th className="px-4 py-2 font-semibold">p95</th>
                <th className="px-4 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {(indexes || []).map((idx) => (
                <tr key={idx.id} className="border-b border-ink-50 last:border-0">
                  <td className="px-4 py-2.5 font-semibold text-ink-800">{idx.name}</td>
                  <td className="px-4 py-2.5 text-ink-600">{idx.entity_type}</td>
                  <td className="px-4 py-2.5 text-ink-600">{idx.embedding_model || '—'}</td>
                  <td className="px-4 py-2.5 text-ink-600">{idx.dimension ?? '—'}</td>
                  <td className="px-4 py-2.5 text-ink-600">{idx.record_count.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-ink-600">{idx.avg_query_latency_ms != null ? `${idx.avg_query_latency_ms}ms` : '—'}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={STATUS_TONE[idx.status] || 'neutral'}>{idx.status.replaceAll('_', ' ')}</Badge>
                  </td>
                </tr>
              ))}
              {indexes && indexes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-400">
                    No embedding indexes registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-panel border border-ink-100 bg-white p-4 shadow-surface">
        <h3 className="mb-3 font-display text-sm font-bold text-ink-900">Query test console</h3>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try a natural-language search query…"
            className="flex-1 rounded-control border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <button
            type="button"
            onClick={runSearch}
            disabled={searching || !query.trim()}
            className="flex items-center gap-1.5 rounded-control bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Run
          </button>
        </div>

        {result && (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-3 text-xs text-ink-500">
              <span>Latency: {result.latencyMs}ms</span>
              <Badge tone={result.semanticAvailable ? 'success' : 'neutral'}>{result.semanticAvailable ? 'Hybrid' : 'Lexical only'}</Badge>
            </div>
            {result.note && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{result.note}</p>}
            <ul className="space-y-2">
              {result.results.map((r) => (
                <li key={r.id} className="rounded-lg border border-ink-100 px-3 py-2">
                  <p className="text-sm font-semibold text-ink-800">{r.title}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{r.snippet}</p>
                  <div className="mt-1 flex gap-3 text-[11px] text-ink-400">
                    <span>lexical {r.lexicalScore}</span>
                    <span>semantic {r.semanticScore ?? '—'}</span>
                    <span>hybrid {r.hybridScore}</span>
                  </div>
                </li>
              ))}
              {result.results.length === 0 && <li className="py-6 text-center text-sm text-ink-400">No results for this query.</li>}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
