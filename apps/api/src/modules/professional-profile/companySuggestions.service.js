import { db } from '../../db/connection.js';

/**
 * Company autocomplete for the Experience form's "Company" field, so users
 * link to a real Company record (logo, employee count, location shown in
 * the picker) instead of typing free text that never resolves to anything
 * (see experiences.service.js#resolveCompany, which already links by exact
 * name match on submit — this is what lets the user *find* that name).
 *
 * Deliberately restricted to `owner_id IS NOT NULL` — "companies that have
 * pages/accounts" per spec, i.e. a real registered organisation on the
 * platform, not a bare row created only as a side effect of a job/gig post
 * with no one behind it. Free text (no match) still falls through to
 * `org_name` on save, same as today.
 *
 * Ranking is a deterministic relevance score, not a trained model: exact
 * prefix match ranks above mid-string match, then larger, more-staffed
 * companies rank above smaller ones as a popularity tie-breaker. No ML
 * inference is actually run — labelled "suggestions" rather than a model
 * name for that reason.
 */
export async function searchCompanies(query, limit = 8) {
  const q = (query || '').trim();
  if (q.length < 2) return [];

  const rows = await db('companies')
    .whereNotNull('owner_id')
    .andWhere('name', 'ilike', `%${q}%`)
    .select('id', 'name', 'slug', 'logo_url', 'location', 'country_code', 'industry', 'employee_count')
    .limit(50);

  const lowerQ = q.toLowerCase();
  const scored = rows.map((r) => {
    const lowerName = r.name.toLowerCase();
    let score = 0;
    if (lowerName === lowerQ) score += 100;
    else if (lowerName.startsWith(lowerQ)) score += 60;
    else score += 20;
    score += Math.min(20, Math.log10((r.employee_count || 0) + 1) * 8);
    return { ...r, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ score, ...r }) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    logoUrl: r.logo_url,
    location: r.location,
    countryCode: r.country_code,
    industry: r.industry,
    employeeCount: r.employee_count,
  }));
}
