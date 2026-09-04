// Domain 26 (Machine Learning, Matching, Ranking & Intelligence) — the shared ML control-plane
// service. Internal/platform-admin only (gated in intelligence.routes.js). Reads/writes the
// model_registry + ml_* tables added in migrations 20260101000114-121, and deliberately reuses
// existing per-domain tables (candidate_match_scores, crm_ml_predictions, pm_ml_predictions,
// skills, ml_inference_log) rather than re-implementing scoring logic that already runs
// elsewhere — this module is an operational view + governance layer over that, not a rival
// scoring engine.
import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

function paginationParams({ limit, offset } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const off = Math.max(Number(offset) || 0, 0);
  return { limit: lim, offset: off };
}

// ---------------------------------------------------------------------------
// Overview (26.01)
// ---------------------------------------------------------------------------

export async function getOverview() {
  const [{ count: activeModels }] = await db('model_registry').where({ status: 'active' }).count({ count: '*' });

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const [{ count: predictionsToday }] = await db('ml_inference_log').where('occurred_at', '>=', since).count({ count: '*' });

  const latencyRows = await db('ml_inference_log')
    .where('occurred_at', '>=', db.raw("now() - interval '24 hours'"))
    .whereNotNull('latency_ms')
    .pluck('latency_ms');
  const p95Latency = percentile(latencyRows, 0.95);

  const [{ count: errorCount }] = await db('ml_deployment_events').where({ event_type: 'rolled_back' }).count({ count: '*' });
  const [{ count: openAlertsCount }] = await db('ml_alerts').where({ status: 'open' }).count({ count: '*' });

  const modelHealth = await db('model_registry as mr')
    .leftJoin('ml_model_versions as v', 'v.id', 'mr.champion_version_id')
    .select(
      'mr.id',
      'mr.model_name',
      'mr.capability',
      'mr.domain',
      'mr.status',
      'mr.risk_classification',
      'v.version',
      'v.stage',
      'v.primary_metric_name',
      'v.primary_metric_value'
    )
    .orderBy('mr.domain');

  const modelHealthWithTraffic = await Promise.all(
    modelHealth.map(async (m) => {
      const stats = await db('ml_inference_log')
        .where('model_name', m.model_name)
        .where('occurred_at', '>=', db.raw("now() - interval '24 hours'"))
        .select(
          db.raw('count(*)::int as requests'),
          db.raw('avg(latency_ms)::int as avg_latency_ms'),
          db.raw("count(*) filter (where fallback_used) as fallback_count")
        )
        .first();
      return {
        id: m.id,
        modelName: m.model_name,
        capability: m.capability,
        domain: m.domain,
        status: m.status,
        riskClassification: m.risk_classification,
        productionVersion: m.version,
        stage: m.stage,
        primaryMetric: m.primary_metric_name ? { name: m.primary_metric_name, value: m.primary_metric_value } : null,
        requests24h: Number(stats?.requests || 0),
        avgLatencyMs: stats?.avg_latency_ms != null ? Number(stats.avg_latency_ms) : null,
        fallbackRate: stats?.requests > 0 ? Number(stats.fallback_count) / Number(stats.requests) : 0,
      };
    })
  );

  const recentActivity = await db('ml_deployment_events as e')
    .join('model_registry as mr', 'mr.id', 'e.model_registry_id')
    .select('e.id', 'e.event_type', 'e.traffic_percent', 'e.reason', 'e.environment', 'e.created_at', 'mr.model_name')
    .orderBy('e.created_at', 'desc')
    .limit(15);

  const alerts = await db('ml_alerts').where({ status: 'open' }).orderBy('detected_at', 'desc').limit(10);

  const featureCounts = await db('ml_feature_definitions')
    .select('status')
    .count({ count: '*' })
    .groupBy('status');

  return {
    kpis: {
      activeModels: Number(activeModels),
      predictionsToday: Number(predictionsToday),
      p95LatencyMs: p95Latency,
      alertsOpen: Number(openAlertsCount),
      rollbacksTotal: Number(errorCount),
    },
    modelHealth: modelHealthWithTraffic,
    recentActivity,
    alerts,
    featureFreshness: featureCounts.reduce((acc, row) => ({ ...acc, [row.status]: Number(row.count) }), {}),
  };
}

function percentile(values, p) {
  if (!values || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[idx];
}

// ---------------------------------------------------------------------------
// Model Registry (26.15) + Matching/Ranking/Recommendation/Fraud model tables
// (26.02 / 26.03 / 26.04 / 26.12 are filtered views of the same registry)
// ---------------------------------------------------------------------------

export async function listModels(filters = {}) {
  const { limit, offset } = paginationParams(filters);
  const { capabilityPrefix, domain, status, search } = filters;

  const build = () => {
    const qb = db('model_registry as mr').leftJoin('ml_model_versions as v', 'v.id', 'mr.champion_version_id');
    if (capabilityPrefix) qb.andWhere('mr.capability', 'ilike', `${capabilityPrefix}%`);
    if (domain) qb.andWhere('mr.domain', domain);
    if (status) qb.andWhere('mr.status', status);
    if (search) {
      qb.andWhere((inner) => {
        inner.whereILike('mr.model_name', `%${search}%`).orWhereILike('mr.description', `%${search}%`);
      });
    }
    return qb;
  };

  const [{ count }] = await build().count({ count: 'mr.id' });
  const rows = await build()
    .select(
      'mr.id',
      'mr.model_name',
      'mr.capability',
      'mr.domain',
      'mr.owner_team',
      'mr.risk_classification',
      'mr.status',
      'mr.description',
      'mr.default_metric_name',
      'mr.updated_at',
      'v.id as champion_version_id',
      'v.version as champion_version',
      'v.stage as champion_stage',
      'v.primary_metric_value as champion_metric_value'
    )
    .orderBy('mr.model_name')
    .limit(limit)
    .offset(offset);

  return { data: rows, total: Number(count) };
}

export async function getModel(id) {
  const registry = await db('model_registry').where({ id }).first();
  if (!registry) throw new AppError('Model not found', 404);

  const versions = await db('ml_model_versions').where({ model_registry_id: id }).orderBy('created_at', 'desc');
  const features = await db('ml_feature_model_dependencies as d')
    .join('ml_feature_definitions as f', 'f.id', 'd.feature_definition_id')
    .where('d.model_registry_id', id)
    .select('f.id', 'f.feature_key', 'f.display_name', 'f.status', 'f.entity_type');
  const evaluations = await db('ml_evaluations').where({ model_registry_id: id }).orderBy('created_at', 'desc').limit(20);
  const deploymentHistory = await db('ml_deployment_events').where({ model_registry_id: id }).orderBy('created_at', 'desc').limit(30);
  const experiments = await db('ml_experiments').where({ model_registry_id: id }).orderBy('created_at', 'desc');
  const alerts = await db('ml_alerts').where({ model_registry_id: id, status: 'open' });

  return { ...registry, versions, features, evaluations, deploymentHistory, experiments, alerts };
}

export async function createModel(actorId, body) {
  const { modelName, capability, domain, ownerTeam, riskClassification = 'low', description, defaultMetricName } = body;
  if (!modelName || !capability) throw new AppError('modelName and capability are required', 422);

  const [row] = await db('model_registry')
    .insert({
      model_name: modelName,
      model_version: 'unversioned',
      model_type: 'learned',
      status: 'shadow',
      capability,
      domain: domain || null,
      owner_team: ownerTeam || null,
      risk_classification: riskClassification,
      description: description || null,
      default_metric_name: defaultMetricName || null,
    })
    .returning('*');

  await db('ml_deployment_events').insert({
    model_registry_id: row.id,
    event_type: 'registered',
    actor_id: actorId,
    environment: 'development',
    after: JSON.stringify(row),
  });

  return row;
}

export async function createVersion(actorId, modelId, body) {
  const registry = await db('model_registry').where({ id: modelId }).first();
  if (!registry) throw new AppError('Model not found', 404);

  const { version, framework, algorithmFamily, artifactUri, hyperparameters, datasetId, featureSetVersion } = body;
  if (!version) throw new AppError('version is required', 422);

  const [row] = await db('ml_model_versions')
    .insert({
      model_registry_id: modelId,
      version,
      stage: 'draft',
      framework: framework || null,
      algorithm_family: algorithmFamily || null,
      artifact_uri: artifactUri || null,
      training_dataset_id: datasetId || null,
      feature_set_version: featureSetVersion || 'v1',
      hyperparameters: JSON.stringify(hyperparameters || {}),
      created_by: actorId,
    })
    .returning('*');

  await db('ml_deployment_events').insert({
    model_registry_id: modelId,
    model_version_id: row.id,
    event_type: 'version_created',
    actor_id: actorId,
    environment: 'development',
    after: JSON.stringify(row),
  });

  return row;
}

const STAGE_ORDER = ['draft', 'training', 'evaluating', 'candidate', 'approved', 'staging', 'production'];

export async function promoteVersion(actorId, modelId, versionId, body) {
  const { targetStage, trafficPercent = 100, reason } = body;
  if (!targetStage) throw new AppError('targetStage is required', 422);

  const version = await db('ml_model_versions').where({ id: versionId, model_registry_id: modelId }).first();
  if (!version) throw new AppError('Model version not found', 404);

  if (targetStage === 'production') {
    if (!reason) throw new AppError('A reason is required to promote a version to production', 422);
    const passedEvaluation = await db('ml_evaluations')
      .where({ model_version_id: versionId, decision: 'pass' })
      .first();
    if (!passedEvaluation) {
      throw new AppError('Cannot promote to production without at least one passing evaluation for this version', 422);
    }
  }

  const before = { stage: version.stage };
  await db('ml_model_versions').where({ id: versionId }).update({ stage: targetStage, updated_at: db.fn.now() });

  if (targetStage === 'production') {
    const registryForPromotion = await db('model_registry').where({ id: modelId }).first();
    if (registryForPromotion.champion_version_id && registryForPromotion.champion_version_id !== versionId) {
      // The outgoing champion is no longer serving production traffic — keep `stage` truthful
      // rather than leaving two rows both reading "production" (only one is ever the champion).
      await db('ml_model_versions')
        .where({ id: registryForPromotion.champion_version_id, stage: 'production' })
        .update({ stage: 'deprecated', updated_at: db.fn.now() });
    }
    await db('model_registry').where({ id: modelId }).update({ champion_version_id: versionId, status: 'active', updated_at: db.fn.now() });
  }

  const eventType =
    targetStage === 'production'
      ? trafficPercent < 100
        ? 'canary_started'
        : 'promoted_production'
      : targetStage === 'approved'
        ? 'approved'
        : targetStage === 'candidate'
          ? 'candidate_ready'
          : 'version_created';

  const [event] = await db('ml_deployment_events')
    .insert({
      model_registry_id: modelId,
      model_version_id: versionId,
      event_type: eventType,
      traffic_percent: targetStage === 'production' ? trafficPercent : null,
      actor_id: actorId,
      reason: reason || null,
      environment: targetStage === 'production' ? 'production' : targetStage === 'staging' ? 'staging' : 'development',
      before: JSON.stringify(before),
      after: JSON.stringify({ stage: targetStage, trafficPercent }),
    })
    .returning('*');

  return { version: await db('ml_model_versions').where({ id: versionId }).first(), event };
}

export async function rollback(actorId, modelId, body) {
  const { targetVersionId, reason } = body;
  if (!targetVersionId || !reason) throw new AppError('targetVersionId and reason are required', 422);

  const registry = await db('model_registry').where({ id: modelId }).first();
  if (!registry) throw new AppError('Model not found', 404);

  const targetVersion = await db('ml_model_versions').where({ id: targetVersionId, model_registry_id: modelId }).first();
  if (!targetVersion) throw new AppError('Rollback target version not found', 404);

  const before = { championVersionId: registry.champion_version_id };
  if (registry.champion_version_id && registry.champion_version_id !== targetVersionId) {
    await db('ml_model_versions')
      .where({ id: registry.champion_version_id, stage: 'production' })
      .update({ stage: 'deprecated', updated_at: db.fn.now() });
  }
  await db('model_registry').where({ id: modelId }).update({ champion_version_id: targetVersionId, updated_at: db.fn.now() });
  await db('ml_model_versions').where({ id: targetVersionId }).update({ stage: 'production', updated_at: db.fn.now() });

  const [event] = await db('ml_deployment_events')
    .insert({
      model_registry_id: modelId,
      model_version_id: targetVersionId,
      event_type: 'rolled_back',
      traffic_percent: 100,
      actor_id: actorId,
      reason,
      environment: 'production',
      before: JSON.stringify(before),
      after: JSON.stringify({ championVersionId: targetVersionId }),
    })
    .returning('*');

  return event;
}

// ---------------------------------------------------------------------------
// Evaluation (26.13)
// ---------------------------------------------------------------------------

export async function listEvaluations(filters = {}) {
  const { limit, offset } = paginationParams(filters);
  const { modelId, decision } = filters;
  const build = () => {
    const qb = db('ml_evaluations as e')
      .join('model_registry as mr', 'mr.id', 'e.model_registry_id')
      .join('ml_model_versions as v', 'v.id', 'e.model_version_id');
    if (modelId) qb.andWhere('e.model_registry_id', modelId);
    if (decision) qb.andWhere('e.decision', decision);
    return qb;
  };
  const [{ count }] = await build().count({ count: 'e.id' });
  const rows = await build()
    .select('e.*', 'mr.model_name', 'v.version')
    .orderBy('e.created_at', 'desc')
    .limit(limit)
    .offset(offset);
  return { data: rows, total: Number(count) };
}

export async function createEvaluation(actorId, body) {
  const { modelVersionId, datasetId, evaluationType, metrics, decision, owner } = body;
  if (!modelVersionId || !evaluationType || !metrics || !decision) {
    throw new AppError('modelVersionId, evaluationType, metrics and decision are required', 422);
  }
  const version = await db('ml_model_versions').where({ id: modelVersionId }).first();
  if (!version) throw new AppError('Model version not found', 404);

  const [row] = await db('ml_evaluations')
    .insert({
      model_registry_id: version.model_registry_id,
      model_version_id: modelVersionId,
      dataset_id: datasetId || null,
      evaluation_type: evaluationType,
      metrics: JSON.stringify(metrics),
      decision,
      owner: owner || null,
      created_by: actorId,
    })
    .returning('*');

  await db('ml_deployment_events').insert({
    model_registry_id: version.model_registry_id,
    model_version_id: modelVersionId,
    event_type: 'evaluated',
    actor_id: actorId,
    environment: 'development',
    after: JSON.stringify({ decision, metrics }),
  });

  return row;
}

// ---------------------------------------------------------------------------
// Feature Store (26.14)
// ---------------------------------------------------------------------------

export async function listFeatures(filters = {}) {
  const { limit, offset } = paginationParams(filters);
  const { entityType, status, search } = filters;
  const build = () => {
    const qb = db('ml_feature_definitions');
    if (entityType) qb.andWhere({ entity_type: entityType });
    if (status) qb.andWhere({ status });
    if (search) qb.andWhere((inner) => inner.whereILike('feature_key', `%${search}%`).orWhereILike('display_name', `%${search}%`));
    return qb;
  };
  const [{ count }] = await build().clone().count({ count: '*' });
  const rows = await build().orderBy('feature_key').limit(limit).offset(offset);

  const withConsumers = await Promise.all(
    rows.map(async (f) => {
      const [{ count: consumerCount }] = await db('ml_feature_model_dependencies').where({ feature_definition_id: f.id }).count({ count: '*' });
      return { ...f, consumerCount: Number(consumerCount) };
    })
  );

  return { data: withConsumers, total: Number(count) };
}

export async function getFeature(id) {
  const feature = await db('ml_feature_definitions').where({ id }).first();
  if (!feature) throw new AppError('Feature not found', 404);
  const consumers = await db('ml_feature_model_dependencies as d')
    .join('model_registry as mr', 'mr.id', 'd.model_registry_id')
    .where('d.feature_definition_id', id)
    .select('mr.id', 'mr.model_name', 'mr.capability', 'mr.status');
  return { ...feature, consumers };
}

export async function deprecateFeature(id) {
  const feature = await db('ml_feature_definitions').where({ id }).first();
  if (!feature) throw new AppError('Feature not found', 404);
  const [{ count }] = await db('ml_feature_model_dependencies as d')
    .join('model_registry as mr', 'mr.id', 'd.model_registry_id')
    .where('d.feature_definition_id', id)
    .andWhere('mr.status', 'active')
    .count({ count: '*' });
  if (Number(count) > 0) {
    throw new AppError(`This feature is used by ${count} active production model(s) — migrate consumers before deprecating.`, 422);
  }
  await db('ml_feature_definitions').where({ id }).update({ lifecycle: 'deprecated', updated_at: db.fn.now() });
  return db('ml_feature_definitions').where({ id }).first();
}

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------

export async function listDatasets(filters = {}) {
  const { limit, offset } = paginationParams(filters);
  const rows = await db('ml_datasets').orderBy('created_at', 'desc').limit(limit).offset(offset);
  const [{ count }] = await db('ml_datasets').count({ count: '*' });
  return { data: rows, total: Number(count) };
}

export async function createDataset(actorId, body) {
  const { name, purpose, domain, version, storageReference, rowCount, labelSource, samplingMethod, piiClassification } = body;
  if (!name || !version) throw new AppError('name and version are required', 422);
  const [row] = await db('ml_datasets')
    .insert({
      name,
      purpose: purpose || null,
      domain: domain || null,
      version,
      storage_reference: storageReference || null,
      row_count: rowCount || null,
      label_source: labelSource || null,
      sampling_method: samplingMethod || null,
      pii_classification: piiClassification || 'internal',
      created_by: actorId,
    })
    .returning('*');
  return row;
}

// ---------------------------------------------------------------------------
// Embeddings / Semantic Search (26.05)
// ---------------------------------------------------------------------------

export async function listEmbeddingIndexes() {
  return db('ml_embedding_indexes').orderBy('name');
}

export async function searchTest(query) {
  const { q, entityType = 'job', limit = 10 } = query;
  if (!q || !q.trim()) throw new AppError('q is required', 422);

  const started = Date.now();
  let lexicalResults = [];
  if (entityType === 'job') {
    lexicalResults = await db('jobs')
      .whereILike('title', `%${q}%`)
      .orWhereILike('description', `%${q}%`)
      .select('id', 'title', db.raw("left(description, 200) as snippet"))
      .limit(Number(limit) || 10);
  }

  const index = await db('ml_embedding_indexes').where({ entity_type: entityType }).first();
  const semanticAvailable = !!(index && index.status === 'healthy');

  return {
    query: q,
    entityType,
    latencyMs: Date.now() - started,
    semanticAvailable,
    index: index ? { name: index.name, status: index.status, embeddingModel: index.embedding_model } : null,
    results: lexicalResults.map((r) => ({
      id: r.id,
      title: r.title,
      snippet: r.snippet,
      lexicalScore: 1,
      semanticScore: null,
      hybridScore: 1,
    })),
    note: semanticAvailable
      ? null
      : 'No embedding index is built for this entity type yet — results are lexical-only (ILIKE match against title/description).',
  };
}

// ---------------------------------------------------------------------------
// Skill Extraction (26.06) — reuses the existing `skills` taxonomy table.
// ---------------------------------------------------------------------------

export async function extractSkillsTest(text) {
  if (!text || !text.trim()) throw new AppError('text is required', 422);
  const skills = await db('skills').where({ status: 'active' }).select('id', 'canonical_name', 'slug', 'category');

  const lowerText = text.toLowerCase();
  const matches = [];
  for (const skill of skills) {
    const needle = skill.canonical_name.toLowerCase();
    const idx = lowerText.indexOf(needle);
    if (idx === -1) continue;
    matches.push({
      canonicalSkillId: skill.id,
      canonicalName: skill.canonical_name,
      slug: skill.slug,
      category: skill.category,
      confidence: 0.9,
      evidenceSpan: text.substr(idx, needle.length),
      method: 'taxonomy_substring_match',
    });
  }

  return {
    input: text,
    matches,
    note: 'Deterministic taxonomy substring matching only — no NER/LLM extraction model is deployed yet, so unmatched phrases are not returned as invented skills.',
  };
}

// ---------------------------------------------------------------------------
// CV / Job Parsing test consoles (26.07 / 26.08) — honest, minimal, regex-based
// baseline. No trained NLP parser exists in this codebase yet; this never
// fabricates fields it cannot find.
// ---------------------------------------------------------------------------

export async function parseCvTest(text) {
  if (!text || !text.trim()) throw new AppError('text is required', 422);
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const phoneMatch = text.match(/(\+?\d[\d\s().-]{7,}\d)/);
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  return {
    confidence: emailMatch || phoneMatch ? 0.55 : 0.3,
    personalInformation: {
      email: emailMatch ? { value: emailMatch[0], confidence: 0.9 } : null,
      phone: phoneMatch ? { value: phoneMatch[0].trim(), confidence: 0.8 } : null,
    },
    detectedSections: lines.filter((l) => /^(experience|education|skills|summary|certifications|projects)/i.test(l)),
    experience: [],
    education: [],
    skills: [],
    warnings: ['This is a deterministic regex baseline, not a trained document parser — structured experience/education extraction is not yet implemented.'],
    parserVersion: 'cv-parser-baseline-v0',
  };
}

const SALARY_RE = /(£|\$|€)\s?(\d{2,3})[k,]?\s?[-–to]{1,3}\s?(£|\$|€)?\s?(\d{2,3})k?/i;
const REMOTE_RE = /\b(remote|hybrid|on-?site)\b/i;

export async function parseJobTest(text) {
  if (!text || !text.trim()) throw new AppError('text is required', 422);
  const salaryMatch = text.match(SALARY_RE);
  const remoteMatch = text.match(REMOTE_RE);
  const titleLine = text.split(/\n+/)[0]?.trim() || null;

  const skills = await db('skills').where({ status: 'active' }).select('canonical_name');
  const lowerText = text.toLowerCase();
  const foundSkills = skills.filter((s) => lowerText.includes(s.canonical_name.toLowerCase())).map((s) => s.canonical_name);

  return {
    canonicalTitle: titleLine ? { value: titleLine, confidence: 0.4 } : null,
    remoteMode: remoteMatch ? { value: remoteMatch[0].toLowerCase(), confidence: 0.7 } : null,
    salary: salaryMatch
      ? {
          currency: salaryMatch[1],
          minimum: Number(salaryMatch[2]) * 1000,
          maximum: Number(salaryMatch[4]) * 1000,
          confidence: 0.6,
        }
      : null,
    requiredSkills: foundSkills.map((name) => ({ value: name, confidence: 0.85 })),
    warnings: salaryMatch ? [] : ['No salary pattern detected — field left null rather than inferred.'],
    parserVersion: 'job-parser-baseline-v0',
  };
}

// ---------------------------------------------------------------------------
// Lead / Candidate / Opportunity scoring — operational views onto scores
// already computed by their owning domains, not a rival scoring engine.
// ---------------------------------------------------------------------------

export async function getLeadScoringOverview() {
  const models = await db('model_registry').where('capability', 'ilike', 'lead_scoring%');
  const hasCrmTable = await db.schema.hasTable('crm_ml_predictions');
  let recent = [];
  if (hasCrmTable) {
    recent = await db('crm_ml_predictions').orderBy('created_at', 'desc').limit(20).catch(() => []);
  }
  return { models, recentPredictions: recent, source: 'crm_ml_predictions (Domain 22)' };
}

export async function getCandidateScoringOverview() {
  const models = await db('model_registry').where('capability', 'ilike', 'matching.candidate_job').orWhere('capability', 'ilike', 'ranking.candidate_search');
  const hasTable = await db.schema.hasTable('candidate_match_scores');
  let recent = [];
  if (hasTable) {
    recent = await db('candidate_match_scores').orderBy('created_at', 'desc').limit(20).catch(() => []);
  }
  return { models, recentScores: recent, source: 'candidate_match_scores (Domain 21)' };
}

export async function getOpportunityScoringOverview() {
  const models = await db('model_registry').where('capability', 'ilike', 'opportunity_scoring%');
  const hasTable = await db.schema.hasTable('pm_ml_predictions');
  let recent = [];
  if (hasTable) {
    recent = await db('pm_ml_predictions').orderBy('created_at', 'desc').limit(20).catch(() => []);
  }
  return { models, recentPredictions: recent, source: 'pm_ml_predictions' };
}

// ---------------------------------------------------------------------------
// Fraud (26.12)
// ---------------------------------------------------------------------------

export async function getFraudOverview(filters = {}) {
  const { limit, offset } = paginationParams(filters);
  const models = await db('model_registry').where('capability', 'ilike', 'fraud%');
  const decisions = await db('ml_fraud_decisions').orderBy('created_at', 'desc').limit(limit).offset(offset);
  const bandCounts = await db('ml_fraud_decisions').select('risk_band').count({ count: '*' }).groupBy('risk_band');
  return { models, decisions, bandCounts: bandCounts.reduce((acc, r) => ({ ...acc, [r.risk_band]: Number(r.count) }), {}) };
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export async function listAlerts(filters = {}) {
  const { status, severity } = filters;
  const qb = db('ml_alerts as a').leftJoin('model_registry as mr', 'mr.id', 'a.model_registry_id');
  if (status) qb.andWhere('a.status', status);
  if (severity) qb.andWhere('a.severity', severity);
  return qb.select('a.*', 'mr.model_name').orderBy('a.detected_at', 'desc');
}

export async function acknowledgeAlert(actorId, id) {
  const alert = await db('ml_alerts').where({ id }).first();
  if (!alert) throw new AppError('Alert not found', 404);
  await db('ml_alerts').where({ id }).update({ status: 'acknowledged', acknowledged_by: actorId, updated_at: db.fn.now() });
  return db('ml_alerts').where({ id }).first();
}

// ---------------------------------------------------------------------------
// Experiments
// ---------------------------------------------------------------------------

export async function listExperiments(filters = {}) {
  const { status } = filters;
  const qb = db('ml_experiments as e').join('model_registry as mr', 'mr.id', 'e.model_registry_id');
  if (status) qb.andWhere('e.status', status);
  const experiments = await qb.select('e.*', 'mr.model_name').orderBy('e.created_at', 'desc');
  return Promise.all(
    experiments.map(async (exp) => {
      const variants = await db('ml_experiment_variants as v')
        .join('ml_model_versions as mv', 'mv.id', 'v.model_version_id')
        .where('v.experiment_id', exp.id)
        .select('v.*', 'mv.version as model_version');
      return { ...exp, variants };
    })
  );
}

// ---------------------------------------------------------------------------
// Audit / deployment history
// ---------------------------------------------------------------------------

export async function listAudit(filters = {}) {
  const { limit, offset } = paginationParams(filters);
  const { modelId } = filters;
  const qb = db('ml_deployment_events as e')
    .join('model_registry as mr', 'mr.id', 'e.model_registry_id')
    .leftJoin('users as u', 'u.id', 'e.actor_id')
    .leftJoin('ml_model_versions as v', 'v.id', 'e.model_version_id');
  if (modelId) qb.andWhere('e.model_registry_id', modelId);
  const rows = await qb
    .select('e.*', 'mr.model_name', 'v.version', db.raw("concat(u.first_name, ' ', u.last_name) as actor_name"))
    .orderBy('e.created_at', 'desc')
    .limit(limit)
    .offset(offset);
  return rows;
}
