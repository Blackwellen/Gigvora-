export async function seed(knex) {
  await knex('model_registry').del();

  await knex('model_registry').insert([
    {
      model_name: 'feed_ranker',
      model_version: 'v0-deterministic',
      model_type: 'deterministic',
      feature_schema_version: 'v1',
      metrics: JSON.stringify({ note: 'Weighted baseline (recency, relationship proximity, engagement velocity). No learned model yet — insufficient interaction data to train/validate one.' }),
      status: 'active',
      deployed_at: knex.fn.now(),
    },
    {
      model_name: 'navigation_ranker',
      model_version: 'v0-deterministic',
      model_type: 'deterministic',
      feature_schema_version: 'v1',
      metrics: JSON.stringify({ note: 'Recency/frequency weighted navigation personalisation; explicit pins always win.' }),
      status: 'active',
      deployed_at: knex.fn.now(),
    },
  ]);
}
