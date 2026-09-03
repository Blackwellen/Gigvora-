import { safeFetch } from './net/safeFetch.js';
import { AppError } from './errors/AppError.js';

const TIMEOUT_MS = 4000;

function extractMeta(html, names) {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["']`,
      'i'
    );
    const match = html.match(re);
    if (match) return (match[1] || match[2] || '').trim();
  }
  return null;
}

function extractTitleTag(html) {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : null;
}

/**
 * Minimal, SSRF-safe link preview: fetches the target page through
 * safeFetch (DNS-resolved + private/loopback/link-local blocked, http/https
 * only, redirects re-validated, response size capped) and pulls
 * og:title/og:description/og:image out of the raw HTML with a lightweight
 * regex scan rather than pulling in a full HTML parser dependency. Returns
 * null (never throws to the caller) if the target can't be safely fetched
 * or isn't HTML — the composer just omits the preview in that case.
 */
export async function fetchLinkPreview(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(url.protocol)) return null;

  let response;
  try {
    response = await safeFetch(url.toString(), {
      method: 'GET',
      headers: { 'User-Agent': 'GigvoraLinkPreview/1.0', Accept: 'text/html' },
      timeoutMs: TIMEOUT_MS,
    });
  } catch (err) {
    if (err instanceof AppError) return null; // blocked/invalid/oversized target — no preview, not a hard failure
    return null;
  }

  const contentType = response.headers.get?.('content-type') || '';
  if (contentType && !contentType.includes('text/html')) return null;

  const html = response.buffer.toString('utf8').slice(0, 300_000);

  const title = extractMeta(html, ['og:title', 'twitter:title']) || extractTitleTag(html);
  const description = extractMeta(html, ['og:description', 'twitter:description', 'description']);
  let image = extractMeta(html, ['og:image', 'twitter:image']);
  if (image) {
    try {
      image = new URL(image, url).toString();
    } catch {
      image = null;
    }
  }

  if (!title && !description && !image) return null;

  return { url: url.toString(), title, description, imageUrl: image };
}
