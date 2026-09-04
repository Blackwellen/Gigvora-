import { config } from '../../config/index.js';
import { AppError } from '../../common/errors/AppError.js';

// Server-side Giphy proxy for the comment composer's GIF picker — the API
// key never reaches the client this way, and this is also where a future
// swap to a different provider (or an org's own registered key) happens in
// one place instead of every caller. `rating: 'pg-13'` matches Giphy's own
// "safe for a general audience" band; nothing here filters for "funny"
// specifically — that's just what Giphy's trending/search results skew
// toward already for a general social-feed context (no separate humor model).
const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';

function mapGif(g) {
  const fixed = g.images?.fixed_height;
  const original = g.images?.original;
  return {
    id: g.id,
    title: g.title || '',
    url: fixed?.url || original?.url,
    width: Number(fixed?.width || original?.width) || null,
    height: Number(fixed?.height || original?.height) || null,
    previewUrl: g.images?.fixed_height_small?.url || fixed?.url,
    provider: 'giphy',
  };
}

async function callGiphy(path, params) {
  const url = new URL(`${GIPHY_BASE}/${path}`);
  url.searchParams.set('api_key', config.giphy.apiKey);
  url.searchParams.set('rating', 'pg-13');
  url.searchParams.set('limit', '24');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new AppError('GIF search is temporarily unavailable', 502);
  const body = await res.json();
  return (body.data || []).map(mapGif);
}

export async function searchGifs(query) {
  if (!query || !query.trim()) return trendingGifs();
  return callGiphy('search', { q: query.trim() });
}

export async function trendingGifs() {
  // "all funny gifs too" — Giphy's dedicated funny/reactions trending
  // channel search term rather than the generic trending feed, so the
  // default/empty-query view leans toward reaction-gif humor.
  return callGiphy('search', { q: 'funny reaction' });
}
