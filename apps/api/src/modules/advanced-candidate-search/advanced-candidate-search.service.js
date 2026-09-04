import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

/**
 * A structured boolean query group:
 *   { operator: 'AND' | 'OR',
 *     clauses: [{ field: 'keyword'|'skill'|'title'|'location', value: string, negate?: boolean }],
 *     groups: [<nested group>] }
 *
 * There is no real search index behind this, so matching is a pragmatic
 * ILIKE-style substring/word-overlap evaluation over the real candidate
 * pool (platform users + sourced pipeline candidates) — no fabricated
 * network calls, no fake "AI search" results.
 */

function collectClauses(group, out = []) {
  if (!group) return out;
  for (const c of group.clauses || []) out.push(c);
  for (const g of group.groups || []) collectClauses(g, out);
  return out;
}

function fieldValue(candidate, field) {
  switch (field) {
    case 'title':
      return (candidate.headline || '').toLowerCase();
    case 'location':
      return (candidate.location || '').toLowerCase();
    case 'skill':
      return (candidate.skills_text || '').toLowerCase();
    case 'keyword':
    default:
      return candidate.search_text;
  }
}

function matchesClause(candidate, clause, semantic) {
  const raw = String(clause.value || '').trim().toLowerCase();
  if (!raw) return true;
  const haystack = fieldValue(candidate, clause.field);
  let hit = haystack.includes(raw);
  if (!hit && semantic) {
    // Pragmatic "semantic" fallback: word-overlap rather than a real vector
    // index — any significant token from the query appearing in the field.
    const words = raw.split(/\s+/).filter((w) => w.length > 2);
    hit = words.some((w) => haystack.includes(w));
  }
  return clause.negate ? !hit : hit;
}

function evaluateGroup(candidate, group, semantic) {
  if (!group) return true;
  const operator = group.operator === 'OR' ? 'OR' : 'AND';
  const results = [
    ...(group.clauses || []).map((c) => matchesClause(candidate, c, semantic)),
    ...(group.groups || []).map((g) => evaluateGroup(candidate, g, semantic)),
  ];
  if (!results.length) return true;
  return operator === 'AND' ? results.every(Boolean) : results.some(Boolean);
}

function relevanceScore(candidate, group, semantic) {
  const clauses = collectClauses(group).filter((c) => !c.negate);
  if (!clauses.length) return 0;
  const hits = clauses.filter((c) => matchesClause(candidate, c, semantic)).length;
  return Number(((hits / clauses.length) * 100).toFixed(1));
}

async function loadCandidatePool() {
  const [platformRows, sourcedRows] = await Promise.all([
    db('users')
      .leftJoin('profiles', 'profiles.user_id', 'users.id')
      .where('users.account_type', 'individual')
      .select(
        'users.id as candidate_user_id',
        db.raw("(users.first_name || ' ' || users.last_name) as candidate_name"),
        'users.email as candidate_email',
        'users.headline as headline',
        'profiles.location as location',
        'profiles.skills as skills_json',
        'profiles.open_to_work as open_to_work'
      )
      .limit(500),
    db('pipeline_candidates')
      .select(
        'candidate_user_id',
        'candidate_name',
        'candidate_email',
        'candidate_headline as headline',
        db.raw('null::text as location'),
        db.raw('null::jsonb as skills_json'),
        'source',
        'match_score'
      )
      .limit(500),
  ]);

  const merged = new Map();
  const push = (row, sourceLabel) => {
    const skillsArr = Array.isArray(row.skills_json) ? row.skills_json : [];
    const skills_text = skillsArr.join(', ').toLowerCase();
    const key = (row.candidate_email || row.candidate_name || '').toLowerCase();
    if (!key) return;
    if (merged.has(key)) return; // platform rows take priority (inserted first)
    merged.set(key, {
      candidate_user_id: row.candidate_user_id || null,
      candidate_name: row.candidate_name,
      candidate_email: row.candidate_email || null,
      headline: row.headline || null,
      location: row.location || null,
      skills: skillsArr,
      skills_text,
      source_label: row.source || sourceLabel,
      match_score: row.match_score !== undefined ? row.match_score : null,
      pool: sourceLabel,
      search_text: [row.candidate_name, row.headline, row.location, skills_text, row.source].filter(Boolean).join(' ').toLowerCase(),
    });
  };
  platformRows.forEach((r) => push(r, 'platform'));
  sourcedRows.forEach((r) => push(r, 'sourced'));
  return Array.from(merged.values());
}

export async function runQuery({ query, semantic = false, limit = 50 } = {}) {
  if (!query || typeof query !== 'object') throw new AppError('query is required', 422);
  const pool = await loadCandidatePool();
  const cappedLimit = Math.min(Number(limit) || 50, 200);

  const results = pool
    .filter((c) => evaluateGroup(c, query, Boolean(semantic)))
    .map((c) => ({ ...c, relevance: relevanceScore(c, query, Boolean(semantic)) }))
    .sort((a, b) => b.relevance - a.relevance || Number(b.match_score || 0) - Number(a.match_score || 0))
    .slice(0, cappedLimit)
    .map(({ search_text, skills_text, ...rest }) => rest);

  return { items: results, total: results.length, semantic: Boolean(semantic) };
}

export async function listSavedQueries(userId) {
  return db('recruiter_saved_queries').where({ user_id: userId }).orderBy('updated_at', 'desc');
}

export async function createSavedQuery(userId, { name, query } = {}) {
  if (!name?.trim()) throw new AppError('name is required', 422);
  if (!query || typeof query !== 'object') throw new AppError('query is required', 422);
  const [row] = await db('recruiter_saved_queries')
    .insert({ user_id: userId, name: name.trim(), query_json: JSON.stringify(query) })
    .returning('*');
  return row;
}

export async function deleteSavedQuery(userId, id) {
  const count = await db('recruiter_saved_queries').where({ id, user_id: userId }).del();
  if (!count) throw new AppError('Saved query not found', 404);
}
