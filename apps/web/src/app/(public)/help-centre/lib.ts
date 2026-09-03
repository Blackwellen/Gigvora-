// Shared types + server fetchers for the Help Centre pages.
import { fetchPublicObject } from '@/components/public/detail/fetchPublicObject';

export type HelpCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_key: string;
  order_index: number;
};

export type HelpArticleSummary = {
  slug: string;
  title: string;
  summary: string;
  viewCount: number;
};

export type HelpArticleDetail = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  viewCount: number;
  publishedAt: string;
  category: { slug: string; name: string };
};

export async function getHelpCategories(): Promise<HelpCategory[]> {
  return (await fetchPublicObject<HelpCategory[]>('/public/help-centre/categories')) ?? [];
}

export async function getPopularArticles(limit = 5): Promise<HelpArticleSummary[]> {
  return (await fetchPublicObject<HelpArticleSummary[]>(`/public/help-centre/articles/popular?limit=${limit}`)) ?? [];
}

export async function searchHelpArticles(q: string, limit = 20): Promise<HelpArticleSummary[]> {
  return (await fetchPublicObject<HelpArticleSummary[]>(`/public/help-centre/search?q=${encodeURIComponent(q)}&limit=${limit}`)) ?? [];
}

export async function getHelpCategoryDetail(slug: string): Promise<{ category: HelpCategory; articles: HelpArticleSummary[] } | null> {
  return fetchPublicObject<{ category: HelpCategory; articles: HelpArticleSummary[] }>(
    `/public/help-centre/categories/${encodeURIComponent(slug)}`
  );
}

export async function getHelpArticle(slug: string): Promise<HelpArticleDetail | null> {
  // The GET increments the article's view count server-side, so this is
  // intentionally always live (fetchPublicObject uses cache: 'no-store').
  return fetchPublicObject<HelpArticleDetail>(`/public/help-centre/articles/${encodeURIComponent(slug)}`);
}
