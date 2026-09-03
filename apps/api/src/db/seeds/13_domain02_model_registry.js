// Domain 02 ML capabilities, registered per spec §52/§59. All start as
// deterministic rule baselines (model_type='deterministic') — no learned
// model has been trained yet because there isn't enough clean labeled
// production data. Do not report these as having "trained" performance
// metrics; `metrics.note` documents the actual (rule-based) behavior.
export async function seed(knex) {
  const rows = [
    {
      model_name: 'landing_personalisation_ranker',
      model_version: 'v0-deterministic',
      model_type: 'deterministic',
      feature_schema_version: 'v1',
      metrics: {
        note: 'Rule baseline: explicit route/campaign/account-type intent selects an editor-approved landing_variants row; falls back to the page default variant. No learned ranking — insufficient clean exposure/conversion data to train one yet.',
      },
      status: 'active',
    },
    {
      model_name: 'lead_propensity_professional',
      model_version: 'v0-deterministic',
      model_type: 'deterministic',
      feature_schema_version: 'v1',
      metrics: {
        note: 'Rule baseline scoring 0-100 from declared lead fields (topic match, company/job title presence, utm_source/campaign presence). No trained classifier yet — no historical conversion-labeled dataset exists.',
      },
      status: 'active',
    },
    {
      model_name: 'lead_propensity_business',
      model_version: 'v0-deterministic',
      model_type: 'deterministic',
      feature_schema_version: 'v1',
      metrics: { note: 'Same deterministic rule baseline as lead_propensity_professional, tuned for business/demo/enterprise lead types.' },
      status: 'active',
    },
    {
      model_name: 'lead_propensity_recruiter',
      model_version: 'v0-deterministic',
      model_type: 'deterministic',
      feature_schema_version: 'v1',
      metrics: { note: 'Same deterministic rule baseline as lead_propensity_professional, tuned for recruiter/sales_navigator lead types.' },
      status: 'active',
    },
    {
      model_name: 'seo_topic_clusterer',
      model_version: 'v0-tfidf-kmeans',
      model_type: 'learned',
      feature_schema_version: 'v1',
      training_dataset_version: 'resource_articles+help_articles-2026-08-30',
      metrics: {
        note: 'Real unsupervised clustering (TF-IDF + KMeans, scikit-learn, via apps/ml-service) run over currently-published resource/help articles. Dataset is small (fewer than 20 documents) so cluster count and silhouette score are provisional and will be recalculated as content grows.',
      },
      status: 'active',
    },
  ];

  for (const row of rows) {
    const existing = await knex('model_registry').where({ model_name: row.model_name, model_version: row.model_version }).first();
    if (existing) continue;
    await knex('model_registry').insert({ ...row, metrics: JSON.stringify(row.metrics), deployed_at: knex.fn.now() });
  }
}
