// Generic, cross-domain disputes system (spec follow-up: "disputes system
// with all stages, reusable for gigs too"). `object_type`/`object_id` are a
// deliberately loose polymorphic reference (no FK) rather than one table per
// domain, so a future gig-payment domain can raise disputes against this
// same table/service without a schema change here — only
// modules/disputes/registry.js needs a new entry teaching it how to resolve
// participants/resolvers for that object type. Only 'payment_milestone'
// (Domain 18) is wired to a real object type today; nothing else in the
// platform has a payment/escrow object yet, so nothing else is faked in.
export async function up(knex) {
  await knex.schema.createTable('disputes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('object_type').notNullable();
    t.uuid('object_id').notNullable();
    t.uuid('raised_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.uuid('against_user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.text('reason').notNullable();
    t.enu('stage', ['opened', 'evidence_submitted', 'under_review', 'resolved_client', 'resolved_professional', 'resolved_split', 'closed']).notNullable().defaultTo('opened');
    t.decimal('resolved_split_pct', 5, 2).nullable();
    t.text('resolution_note').nullable();
    t.uuid('resolved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('resolved_at').nullable();
    t.timestamps(true, true);
    t.index(['object_type', 'object_id'], 'disputes_object_idx');
    t.index(['stage'], 'disputes_stage_idx');
  });

  await knex.schema.createTable('dispute_evidence', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('dispute_id').notNullable().references('id').inTable('disputes').onDelete('CASCADE');
    t.uuid('submitted_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('description').notNullable();
    t.string('object_key').nullable();
    t.string('filename').nullable();
    t.string('mime_type').nullable();
    t.bigInteger('size_bytes').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['dispute_id', 'created_at'], 'dispute_evidence_dispute_created_idx');
  });

  await knex.schema.createTable('dispute_messages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('dispute_id').notNullable().references('id').inTable('disputes').onDelete('CASCADE');
    t.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('body').notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['dispute_id', 'created_at'], 'dispute_messages_dispute_created_idx');
  });

  // One active dispute per object at a time — a second dispute must wait for
  // the first to close, matching how a payment milestone can't be released
  // while disputed.
  await knex.raw(`
    CREATE UNIQUE INDEX disputes_one_active_per_object_idx
    ON disputes (object_type, object_id)
    WHERE stage NOT IN ('resolved_client', 'resolved_professional', 'resolved_split', 'closed')
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('dispute_messages');
  await knex.schema.dropTableIfExists('dispute_evidence');
  await knex.schema.dropTableIfExists('disputes');
}
