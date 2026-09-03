// Shared types + server fetchers for the Legal Index pages.
import { fetchPublicObject } from '@/components/public/detail/fetchPublicObject';

export type LegalDocSummary = {
  document_type: string;
  slug: string;
  title: string;
  summary: string;
  version: number;
  effective_at: string;
  published_at: string;
};

export type LegalDocDetail = {
  documentType: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  version: number;
  effectiveAt: string;
  publishedAt: string;
  history: Array<{ version: number; effective_at: string; published_at: string; superseded_at: string | null }>;
};

export async function getLegalDocs(): Promise<LegalDocSummary[]> {
  return (await fetchPublicObject<LegalDocSummary[]>('/public/legal')) ?? [];
}

export async function getLegalDoc(slug: string): Promise<LegalDocDetail | null> {
  return fetchPublicObject<LegalDocDetail>(`/public/legal/${encodeURIComponent(slug)}`);
}
