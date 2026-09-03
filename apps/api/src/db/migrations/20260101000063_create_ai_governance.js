// Domain 25 governance layer: actions/approvals, durable AI tasks, memory,
// personalisation, model preferences, usage accounting, audit log, and the
// prompt/action library. User-scoped (no workspace_id), consistent with the
// rest of this codebase.
export async function up(knex) {
  await knex.schema.createTable('ai_actions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('thread_id').references('id').inTable('ai_threads').onDelete('SET NULL');
    t.uuid('message_id').references('id').inTable('ai_messages').onDelete('SET NULL');
    t.uuid('requested_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('action_type').notNullable(); // e.g. 'send_message_reply'
    t.string('tool_id');
    t.string('target_type'); // e.g. 'conversation'
    t.uuid('target_id');
    t.string('status').notNullable().defaultTo('pending'); // pending|approved|rejected|executed|failed|cancelled
    t.decimal('risk_score', 5, 4).notNullable().defaultTo(0);
    t.string('approval_requirement').notNullable().defaultTo('none'); // none|required
    t.jsonb('payload_json').notNullable().defaultTo('{}');
    t.jsonb('result_json');
    t.string('idempotency_key');
    t.timestamps(true, true);
    t.unique(['requested_by', 'idempotency_key']);
    t.index(['status']);
  });

  await knex.schema.createTable('ai_approvals', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('action_id').notNullable().references('id').inTable('ai_actions').onDelete('CASCADE');
    t.string('approval_policy_id');
    t.uuid('approver_user_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('decision').notNullable().defaultTo('pending'); // pending|approved|rejected
    t.text('decision_reason');
    t.timestamp('decided_at');
    t.timestamps(true, true);
    t.index(['action_id']);
  });

  await knex.schema.createTable('ai_tasks', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('requested_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('task_type').notNullable();
    t.string('status').notNullable().defaultTo('queued'); // queued|running|waiting_for_approval|completed|failed|cancelled
    t.string('priority').notNullable().defaultTo('normal');
    t.integer('progress').notNullable().defaultTo(0);
    t.decimal('cost_estimate', 10, 4);
    t.integer('credits_used').notNullable().defaultTo(0);
    t.jsonb('input_ref').notNullable().defaultTo('{}');
    t.jsonb('output_ref');
    t.timestamp('started_at');
    t.timestamp('completed_at');
    t.timestamp('failed_at');
    t.timestamps(true, true);
    t.index(['requested_by', 'status']);
  });

  await knex.schema.createTable('ai_task_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('task_id').notNullable().references('id').inTable('ai_tasks').onDelete('CASCADE');
    t.string('event_type').notNullable();
    t.jsonb('metadata').notNullable().defaultTo('{}');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['task_id']);
  });

  await knex.schema.createTable('ai_memories', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('owner_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('memory_type').notNullable(); // 'preference' | 'fact' | 'entity'
    t.string('memory_key');
    t.jsonb('value_json').notNullable();
    t.string('source_type').notNullable().defaultTo('user_explicit'); // 'user_explicit' | 'thread_extraction'
    t.string('source_id');
    t.string('classification').notNullable().defaultTo('general'); // 'general' | 'sensitive'
    t.string('approval_state').notNullable().defaultTo('approved'); // 'pending' | 'approved' | 'rejected'
    t.decimal('confidence', 5, 4);
    t.timestamp('expires_at');
    t.timestamps(true, true);
    t.index(['owner_user_id']);
  });

  await knex.schema.createTable('ai_personalisation_profiles', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('owner_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.jsonb('config_json').notNullable().defaultTo('{}');
    t.integer('version').notNullable().defaultTo(1);
    t.timestamps(true, true);
    t.unique(['owner_user_id']);
  });

  await knex.schema.createTable('ai_model_preferences', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('default_model');
    t.string('fallback_model');
    t.string('routing_strategy').notNullable().defaultTo('balanced'); // balanced|quality|speed|cost
    t.string('reasoning_mode').notNullable().defaultTo('auto');
    t.jsonb('retrieval_config').notNullable().defaultTo('{}');
    t.jsonb('tool_config').notNullable().defaultTo('{}');
    t.jsonb('safety_config').notNullable().defaultTo('{}');
    t.jsonb('budget_config').notNullable().defaultTo('{}');
    t.timestamps(true, true);
    t.unique(['user_id']);
  });

  await knex.schema.createTable('ai_usage', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('thread_id').references('id').inTable('ai_threads').onDelete('SET NULL');
    t.uuid('task_id').references('id').inTable('ai_tasks').onDelete('SET NULL');
    t.string('model').notNullable();
    t.string('provider').notNullable().defaultTo('azure-openai');
    t.integer('input_tokens').notNullable().defaultTo(0);
    t.integer('output_tokens').notNullable().defaultTo(0);
    t.integer('cached_tokens').notNullable().defaultTo(0);
    t.integer('tool_calls').notNullable().defaultTo(0);
    t.integer('latency_ms');
    t.decimal('cost_estimate', 10, 6);
    t.boolean('success').notNullable().defaultTo(true);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['user_id', 'created_at']);
    t.index(['model']);
  });

  await knex.schema.createTable('ai_audit_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('actor_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('event_type').notNullable();
    t.uuid('thread_id');
    t.uuid('message_id');
    t.uuid('action_id');
    t.uuid('task_id');
    t.string('model');
    t.string('model_version');
    t.jsonb('tools_json').notNullable().defaultTo('[]');
    t.decimal('risk_score', 5, 4);
    t.string('policy_decision').notNullable().defaultTo('allow'); // allow|require_approval|block|escalate
    t.jsonb('grounding_json').notNullable().defaultTo('{}');
    t.string('immutable_hash').notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['actor_id', 'created_at']);
    t.index(['event_type']);
  });

  await knex.schema.createTable('ai_prompts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('owner_user_id').references('id').inTable('users').onDelete('CASCADE'); // null = system/global prompt
    t.string('title').notNullable();
    t.text('description');
    t.string('category').notNullable().defaultTo('general');
    t.text('prompt_template').notNullable();
    t.string('action_type'); // if set, "Run" executes a real registered action instead of just inserting the template into the composer
    t.jsonb('tags').notNullable().defaultTo('[]');
    t.integer('usage_count').notNullable().defaultTo(0);
    t.decimal('rating_avg', 3, 2);
    t.boolean('is_public').notNullable().defaultTo(true);
    t.timestamps(true, true);
    t.index(['category']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('ai_prompts');
  await knex.schema.dropTableIfExists('ai_audit_events');
  await knex.schema.dropTableIfExists('ai_usage');
  await knex.schema.dropTableIfExists('ai_model_preferences');
  await knex.schema.dropTableIfExists('ai_personalisation_profiles');
  await knex.schema.dropTableIfExists('ai_memories');
  await knex.schema.dropTableIfExists('ai_task_events');
  await knex.schema.dropTableIfExists('ai_tasks');
  await knex.schema.dropTableIfExists('ai_approvals');
  await knex.schema.dropTableIfExists('ai_actions');
}
