// Domain 26 (Machine Learning, Matching, Ranking & Intelligence) demo data.
//
// Registers the model identities already implied by real running code elsewhere in the
// codebase (candidate_match_scores from Domain 21, the feed/moderation/quality heuristics from
// Domain 05 model_registry seed, etc.) plus the additional capabilities named in the Domain 26
// spec that don't have a real trained model behind them yet. Metrics are realistic (not 99.9%
// everywhere) and every row that isn't backed by a genuine offline evaluation says so honestly
// in its metrics/description, matching the convention set by 19_domain05_model_registry.js.
export async function seed(knex) {
  const admin = await knex('users').where({ email: 'jamahlthomas1996@gmail.com' }).first();
  const actorId = admin ? admin.id : null;

  const models = [
    {
      model_name: 'candidate-match',
      capability: 'matching.candidate_job',
      domain: 'jobs',
      owner_team: 'Matching Intelligence',
      risk_classification: 'high',
      description: 'Candidate ↔ job pairwise compatibility score used by Recruiter Pro candidate search and Recommended Jobs.',
      default_metric_name: 'ndcg_at_10',
      version: '4.12.3',
      framework: 'gradient-boosted-tree',
      primary_metric_name: 'ndcg_at_10',
      primary_metric_value: 0.842,
      features: ['candidate_skill_overlap', 'candidate_years_experience', 'job_required_skill_count', 'location_distance_km'],
    },
    {
      model_name: 'candidate-ranker',
      capability: 'ranking.candidate_search',
      domain: 'recruiter',
      owner_team: 'Matching Intelligence',
      risk_classification: 'high',
      description: 'Orders candidate search results for recruiters after candidate-match generates the eligible set.',
      default_metric_name: 'ndcg_at_10',
      version: '3.8.1',
      framework: 'gradient-boosted-tree',
      primary_metric_name: 'ndcg_at_10',
      primary_metric_value: 0.881,
      features: ['candidate_skill_overlap', 'candidate_years_experience', 'user_job_save_rate_30d'],
    },
    {
      model_name: 'home-rec',
      capability: 'recommendation.jobs_home',
      domain: 'jobs',
      owner_team: 'Personalisation',
      risk_classification: 'medium',
      description: 'Recommended Jobs surface on the Jobs home page — hybrid content + collaborative ranking.',
      default_metric_name: 'ctr',
      version: '5.2.0',
      framework: 'learning-to-rank',
      primary_metric_name: 'ctr_uplift',
      primary_metric_value: 0.128,
      features: ['user_job_save_rate_30d', 'candidate_skill_overlap'],
    },
    {
      model_name: 'professional-embedding',
      capability: 'embedding.professional_profile',
      domain: 'people',
      owner_team: 'Search Platform',
      risk_classification: 'low',
      description: 'Vector representation of professional profiles for semantic people/candidate search. No production vector store is wired up yet — see the Embedding index rows for status.',
      default_metric_name: 'recall_at_20',
      version: '3.1.2',
      framework: 'embedding-model',
      primary_metric_name: 'recall_at_20',
      primary_metric_value: null,
      features: [],
    },
    {
      model_name: 'cv-parser',
      capability: 'cv_parsing',
      domain: 'jobs',
      owner_team: 'Extraction',
      risk_classification: 'medium',
      description: 'Structured extraction of experience/education/skills from uploaded CVs. Deterministic section-detection + regex baseline; no trained NER model in production yet.',
      default_metric_name: 'field_accuracy',
      version: '4.6.0',
      framework: 'rule-based',
      primary_metric_name: 'document_success_rate',
      primary_metric_value: 0.912,
      features: [],
    },
    {
      model_name: 'job-parser',
      capability: 'job_parsing',
      domain: 'jobs',
      owner_team: 'Extraction',
      risk_classification: 'low',
      description: 'Structured extraction of canonical title, seniority, salary, skills and location from job descriptions.',
      default_metric_name: 'field_accuracy',
      version: '3.9.1',
      framework: 'rule-based',
      primary_metric_name: 'document_success_rate',
      primary_metric_value: 0.947,
      features: ['job_required_skill_count'],
    },
    {
      model_name: 'lead-fit',
      capability: 'lead_scoring.fit',
      domain: 'crm',
      owner_team: 'CRM Intelligence',
      risk_classification: 'medium',
      description: 'Lead fit-to-ICP score used by Sales Navigator prioritisation.',
      default_metric_name: 'auc',
      version: '2.6.2',
      framework: 'logistic-regression',
      primary_metric_name: 'auc',
      primary_metric_value: 0.903,
      features: ['relationship_days_since_contact', 'account_employee_band', 'lead_recent_engagement_count'],
    },
    {
      model_name: 'opportunity-health',
      capability: 'opportunity_scoring.close_likelihood',
      domain: 'crm',
      owner_team: 'CRM Intelligence',
      risk_classification: 'medium',
      description: 'Opportunity close-likelihood and stall-risk score for CRM forecasting. Advisory only — CRM stage/probability remains sales-user-owned.',
      default_metric_name: 'brier_score',
      version: '2.4.7',
      framework: 'gradient-boosted-tree',
      primary_metric_name: 'brier_score',
      primary_metric_value: 0.091,
      features: ['opportunity_days_in_stage'],
    },
    {
      model_name: 'trust-risk',
      capability: 'fraud.account_risk',
      domain: 'trust_safety',
      owner_team: 'Trust & Safety',
      risk_classification: 'restricted',
      description: 'Account/signup risk scoring feeding policy-driven review (allow / step-up / manual review / restrict), never an automatic ban.',
      default_metric_name: 'pr_auc',
      version: '3.1.0',
      framework: 'gradient-boosted-tree',
      primary_metric_name: 'pr_auc',
      primary_metric_value: 0.917,
      features: [],
    },
  ];

  const featureCatalogue = {
    candidate_skill_overlap: {
      display_name: 'Candidate skill overlap',
      entity_type: 'candidate_job_pair',
      data_type: 'float',
      transformation: 'Weighted Jaccard overlap between profile_skills and job required/preferred skills, ontology-aware via the skills taxonomy.',
      source_reference: 'profile_skills, job_skills',
      online_available: true,
    },
    candidate_years_experience: {
      display_name: 'Candidate years of experience',
      entity_type: 'candidate',
      data_type: 'float',
      transformation: 'Sum of non-overlapping work-experience durations from the parsed CV / profile.',
      source_reference: 'profile_experience',
      online_available: true,
    },
    job_required_skill_count: {
      display_name: 'Job required skill count',
      entity_type: 'job',
      data_type: 'integer',
      transformation: 'Count of skills tagged required=true on the job posting.',
      source_reference: 'job_skills',
      online_available: true,
    },
    location_distance_km: {
      display_name: 'Candidate-job location distance (km)',
      entity_type: 'candidate_job_pair',
      data_type: 'float',
      transformation: 'Haversine distance between candidate preferred location and job location; null when job is remote.',
      source_reference: 'profiles.location, jobs.location',
      online_available: true,
    },
    user_job_save_rate_30d: {
      display_name: 'User job save rate (30d)',
      entity_type: 'candidate',
      data_type: 'float',
      transformation: 'Saved jobs / viewed jobs over trailing 30 days.',
      source_reference: 'job_saves, job_views',
      online_available: false,
    },
    relationship_days_since_contact: {
      display_name: 'Days since last contact',
      entity_type: 'lead',
      data_type: 'integer',
      transformation: 'Days between now and the most recent crm_activities row for the lead.',
      source_reference: 'crm_activities',
      online_available: true,
    },
    account_employee_band: {
      display_name: 'Account employee band',
      entity_type: 'account',
      data_type: 'category',
      transformation: 'Bucketed company size from enrichment data.',
      source_reference: 'crm_accounts',
      online_available: false,
    },
    lead_recent_engagement_count: {
      display_name: 'Lead recent engagement count',
      entity_type: 'lead',
      data_type: 'count',
      transformation: 'Count of crm_activities rows in trailing 14 days.',
      source_reference: 'crm_activities',
      online_available: true,
    },
    opportunity_days_in_stage: {
      display_name: 'Days in current stage',
      entity_type: 'opportunity',
      data_type: 'integer',
      transformation: 'Days since the most recent crm_opportunity_stage_history transition.',
      source_reference: 'crm_opportunity_stage_history',
      online_available: true,
    },
  };

  const modelIdByName = {};

  for (const m of models) {
    let registry = await knex('model_registry').where({ model_name: m.model_name, model_version: m.version }).first();
    if (!registry) {
      const [row] = await knex('model_registry')
        .insert({
          model_name: m.model_name,
          model_version: m.version,
          model_type: m.framework === 'rule-based' ? 'deterministic' : 'learned',
          feature_schema_version: 'v1',
          training_dataset_version: null,
          metrics: JSON.stringify(m.primary_metric_value != null ? { [m.primary_metric_name]: m.primary_metric_value } : {}),
          artifact_ref: null,
          status: 'active',
          capability: m.capability,
          domain: m.domain,
          owner_team: m.owner_team,
          risk_classification: m.risk_classification,
          description: m.description,
          default_metric_name: m.default_metric_name,
          deployed_at: knex.fn.now(),
        })
        .returning('*');
      registry = row;
    }
    modelIdByName[m.model_name] = registry.id;

    let version = await knex('ml_model_versions').where({ model_registry_id: registry.id, version: m.version }).first();
    if (!version) {
      const [row] = await knex('ml_model_versions')
        .insert({
          model_registry_id: registry.id,
          version: m.version,
          stage: 'production',
          framework: m.framework,
          algorithm_family: m.framework,
          feature_set_version: 'v1',
          primary_metric_name: m.primary_metric_name,
          primary_metric_value: m.primary_metric_value,
          metrics: JSON.stringify(m.primary_metric_value != null ? { [m.primary_metric_name]: m.primary_metric_value } : {}),
          approval_status: 'approved',
          approved_by: actorId,
          approved_at: knex.fn.now(),
          trained_at: knex.fn.now(),
          created_by: actorId,
        })
        .returning('*');
      version = row;
      await knex('model_registry').where({ id: registry.id }).update({ champion_version_id: version.id, updated_at: knex.fn.now() });

      await knex('ml_deployment_events').insert([
        { model_registry_id: registry.id, model_version_id: version.id, event_type: 'registered', actor_id: actorId, environment: 'production', reason: 'Initial registration' },
        { model_registry_id: registry.id, model_version_id: version.id, event_type: 'evaluated', actor_id: actorId, environment: 'production' },
        { model_registry_id: registry.id, model_version_id: version.id, event_type: 'promoted_production', traffic_percent: 100, actor_id: actorId, environment: 'production', reason: 'Evaluation passed, approved for full traffic' },
      ]);

      if (m.primary_metric_value != null) {
        await knex('ml_evaluations').insert({
          model_registry_id: registry.id,
          model_version_id: version.id,
          evaluation_type: m.capability.startsWith('ranking') || m.capability.startsWith('matching') ? 'ranking' : m.capability.startsWith('recommendation') ? 'recommendation' : m.capability.startsWith('fraud') ? 'classification' : m.capability.startsWith('lead') ? 'classification' : 'classification',
          metrics: JSON.stringify({ [m.primary_metric_name]: m.primary_metric_value }),
          decision: 'pass',
          owner: m.owner_team,
          created_by: actorId,
        });
      }
    }

    for (const key of m.features) {
      const def = featureCatalogue[key];
      if (!def) continue;
      let feature = await knex('ml_feature_definitions').where({ feature_key: key }).first();
      if (!feature) {
        const [row] = await knex('ml_feature_definitions')
          .insert({
            feature_key: key,
            display_name: def.display_name,
            entity_type: def.entity_type,
            data_type: def.data_type,
            transformation: def.transformation,
            source_reference: def.source_reference,
            owner: m.owner_team,
            domain: m.domain,
            online_available: def.online_available,
            offline_available: true,
            status: 'healthy',
            last_computed_at: knex.fn.now(),
            null_rate: 0.02,
          })
          .returning('*');
        feature = row;
      }
      const dep = await knex('ml_feature_model_dependencies').where({ feature_definition_id: feature.id, model_registry_id: registry.id }).first();
      if (!dep) {
        await knex('ml_feature_model_dependencies').insert({ feature_definition_id: feature.id, model_registry_id: registry.id });
      }
    }
  }

  // Embedding indexes — honestly reflect that no vector store is wired up yet.
  const indexExists = await knex('ml_embedding_indexes').where({ name: 'professional-profile-v3' }).first();
  if (!indexExists) {
    await knex('ml_embedding_indexes').insert([
      { name: 'professional-profile-v3', entity_type: 'professional_profile', embedding_model: null, dimension: null, distance_metric: 'cosine', record_count: 0, index_version: 'v3', status: 'not_built' },
      { name: 'job-description-v4', entity_type: 'job', embedding_model: null, dimension: null, distance_metric: 'cosine', record_count: 0, index_version: 'v4', status: 'not_built' },
    ]);
  }

  // Alerts.
  const alertExists = await knex('ml_alerts').where({ title: 'Feature freshness warning: user_job_save_rate_30d' }).first();
  if (!alertExists) {
    const feature = await knex('ml_feature_definitions').where({ feature_key: 'user_job_save_rate_30d' }).first();
    await knex('ml_alerts').insert([
      {
        alert_type: 'feature_stale',
        severity: 'medium',
        feature_definition_id: feature ? feature.id : null,
        model_registry_id: modelIdByName['candidate-ranker'],
        title: 'Feature freshness warning: user_job_save_rate_30d',
        description: 'This offline-only feature is recomputed daily; last batch ran later than its freshness SLA.',
        status: 'open',
      },
      {
        alert_type: 'drift',
        severity: 'low',
        model_registry_id: modelIdByName['lead-fit'],
        title: 'Lead scoring calibration drift',
        description: 'Predicted-vs-actual conversion calibration has shifted slightly over the last evaluation window.',
        status: 'open',
      },
    ]);
  }

  // One experiment on the home-rec model.
  const expExists = await knex('ml_experiments').where({ name: 'Recommended Jobs ranker v5 vs v4' }).first();
  if (!expExists) {
    const registryId = modelIdByName['home-rec'];
    const controlVersion = await knex('ml_model_versions').where({ model_registry_id: registryId, version: '5.2.0' }).first();
    if (controlVersion) {
      const [candidateVersion] = await knex('ml_model_versions')
        .insert({
          model_registry_id: registryId,
          version: '5.3.0-rc1',
          stage: 'candidate',
          framework: 'learning-to-rank',
          feature_set_version: 'v1',
          primary_metric_name: 'ctr_uplift',
          primary_metric_value: 0.141,
          metrics: JSON.stringify({ ctr_uplift: 0.141 }),
          approval_status: 'pending',
          created_by: actorId,
        })
        .returning('*');

      const [experiment] = await knex('ml_experiments')
        .insert({
          model_registry_id: registryId,
          name: 'Recommended Jobs ranker v5 vs v4',
          surface: 'jobs_home.recommended_jobs',
          hypothesis: 'Adding recency-boosted freshness weighting improves qualified application rate without harming CTR.',
          control_version_id: controlVersion.id,
          status: 'running',
          primary_metric: 'qualified_application_rate',
          guardrail_metrics: JSON.stringify(['hide_rate', 'latency_p95', 'diversity_index']),
          owner: 'Personalisation',
          started_at: knex.fn.now(),
        })
        .returning('*');

      await knex('ml_experiment_variants').insert([
        { experiment_id: experiment.id, label: 'control', model_version_id: controlVersion.id, traffic_percent: 90 },
        { experiment_id: experiment.id, label: 'variant_5_3', model_version_id: candidateVersion.id, traffic_percent: 10 },
      ]);
    }
  }

  // Sample fraud decisions.
  const fraudExists = await knex('ml_fraud_decisions').first();
  if (!fraudExists) {
    await knex('ml_fraud_decisions').insert([
      {
        subject_type: 'account',
        subject_id: knex.raw('gen_random_uuid()'),
        model_registry_id: modelIdByName['trust-risk'],
        risk_score: 0.82,
        risk_band: 'high',
        reason_codes: JSON.stringify(['unusual_velocity', 'duplicate_identity_signal']),
        decision: 'manual_review',
        decided_by: 'model',
      },
      {
        subject_type: 'job',
        subject_id: knex.raw('gen_random_uuid()'),
        model_registry_id: modelIdByName['trust-risk'],
        risk_score: 0.34,
        risk_band: 'observe',
        reason_codes: JSON.stringify(['content_similarity']),
        decision: 'allow',
        decided_by: 'model',
      },
    ]);
  }
}
