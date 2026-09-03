// Domain 18 Phase B — the remaining schema for Timeline/Calendar (derived,
// no new tables), Files, Discussions, Project Chat (links to the existing
// `conversations` table — Domain 10 — rather than a second messaging
// engine), Time Tracking (pm_time_entries already exists from Phase A),
// Timesheets, Budget, Approvals, Change Requests, Bids/Proposals,
// Members & Pay Split, Risks & Issues, and payment-milestone release ledger.
export async function up(knex) {
  await knex.schema.alterTable('pm_projects', (t) => {
    t.uuid('conversation_id').nullable().references('id').inTable('conversations').onDelete('SET NULL');
  });

  // --- Files --------------------------------------------------------------
  await knex.schema.createTable('pm_project_files', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id').notNullable().references('id').inTable('pm_projects').onDelete('CASCADE');
    t.uuid('task_id').nullable().references('id').inTable('pm_tasks').onDelete('SET NULL');
    t.uuid('deliverable_id').nullable().references('id').inTable('pm_deliverables').onDelete('SET NULL');
    t.string('object_key').notNullable();
    t.string('filename').notNullable();
    t.string('mime_type').notNullable();
    t.bigInteger('size_bytes').notNullable();
    t.integer('version').notNullable().defaultTo(1);
    t.uuid('replaces_file_id').nullable().references('id').inTable('pm_project_files').onDelete('SET NULL');
    t.uuid('uploaded_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.timestamps(true, true);
    t.index(['project_id', 'created_at'], 'pm_project_files_project_created_idx');
  });

  // --- Discussions ----------------------------------------------------------
  await knex.schema.createTable('pm_project_discussions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id').notNullable().references('id').inTable('pm_projects').onDelete('CASCADE');
    t.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('title').notNullable();
    t.text('body').notNullable();
    t.uuid('linked_task_id').nullable().references('id').inTable('pm_tasks').onDelete('SET NULL');
    t.uuid('linked_milestone_id').nullable().references('id').inTable('pm_milestones').onDelete('SET NULL');
    t.boolean('pinned').notNullable().defaultTo(false);
    t.boolean('resolved').notNullable().defaultTo(false);
    t.timestamps(true, true);
    t.index(['project_id', 'created_at'], 'pm_discussions_project_created_idx');
  });

  await knex.schema.createTable('pm_discussion_replies', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('discussion_id').notNullable().references('id').inTable('pm_project_discussions').onDelete('CASCADE');
    t.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('body').notNullable();
    t.timestamps(true, true);
    t.index(['discussion_id', 'created_at'], 'pm_discussion_replies_discussion_created_idx');
  });

  // --- Timesheets (aggregates pm_time_entries into a weekly approval unit) ---
  await knex.schema.createTable('pm_timesheets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id').notNullable().references('id').inTable('pm_projects').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.date('week_start').notNullable();
    t.enu('status', ['open', 'submitted', 'approved', 'rejected']).notNullable().defaultTo('open');
    t.integer('total_minutes').notNullable().defaultTo(0);
    t.uuid('submitted_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('submitted_at').nullable();
    t.uuid('reviewed_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('reviewed_at').nullable();
    t.text('review_note').nullable();
    t.timestamps(true, true);
    t.unique(['project_id', 'user_id', 'week_start']);
  });

  // --- Budget ---------------------------------------------------------------
  await knex.schema.createTable('pm_project_budgets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id').notNullable().unique().references('id').inTable('pm_projects').onDelete('CASCADE');
    t.decimal('total_budget', 12, 2).notNullable().defaultTo(0);
    t.decimal('contingency_pct', 5, 2).notNullable().defaultTo(0);
    t.string('currency', 3).notNullable().defaultTo('USD');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('pm_budget_lines', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id').notNullable().references('id').inTable('pm_projects').onDelete('CASCADE');
    t.string('category').notNullable();
    t.enu('kind', ['labour', 'marketplace', 'internal', 'software', 'expense', 'contingency']).notNullable().defaultTo('expense');
    t.decimal('planned_amount', 12, 2).notNullable().defaultTo(0);
    t.uuid('milestone_id').nullable().references('id').inTable('pm_milestones').onDelete('SET NULL');
    t.timestamps(true, true);
    t.index(['project_id'], 'pm_budget_lines_project_idx');
  });

  await knex.schema.createTable('pm_expenses', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id').notNullable().references('id').inTable('pm_projects').onDelete('CASCADE');
    t.uuid('budget_line_id').nullable().references('id').inTable('pm_budget_lines').onDelete('SET NULL');
    t.string('description').notNullable();
    t.decimal('amount', 12, 2).notNullable();
    t.enu('status', ['pending', 'approved', 'paid', 'rejected']).notNullable().defaultTo('pending');
    t.uuid('submitted_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.date('incurred_on').notNullable();
    t.timestamps(true, true);
    t.index(['project_id', 'status'], 'pm_expenses_project_status_idx');
  });

  // --- Generic approvals ------------------------------------------------
  await knex.schema.createTable('pm_approvals', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id').notNullable().references('id').inTable('pm_projects').onDelete('CASCADE');
    t.enu('object_type', ['deliverable', 'milestone', 'file', 'change_request', 'payment_release', 'timesheet', 'project_completion']).notNullable();
    t.uuid('object_id').notNullable();
    t.enu('mode', ['single', 'sequential', 'parallel', 'quorum']).notNullable().defaultTo('single');
    t.integer('quorum_count').nullable();
    t.enu('status', ['pending', 'approved', 'rejected', 'cancelled']).notNullable().defaultTo('pending');
    t.uuid('requested_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.timestamps(true, true);
    t.index(['project_id', 'status'], 'pm_approvals_project_status_idx');
    t.index(['object_type', 'object_id'], 'pm_approvals_object_idx');
  });

  await knex.schema.createTable('pm_approval_steps', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('approval_id').notNullable().references('id').inTable('pm_approvals').onDelete('CASCADE');
    t.uuid('approver_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('step_order').notNullable().defaultTo(0);
    t.enu('decision', ['pending', 'approved', 'rejected']).notNullable().defaultTo('pending');
    t.text('comment').nullable();
    t.timestamp('decided_at').nullable();
    t.timestamps(true, true);
    t.index(['approval_id'], 'pm_approval_steps_approval_idx');
  });

  // --- Change requests --------------------------------------------------
  await knex.schema.createTable('pm_change_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id').notNullable().references('id').inTable('pm_projects').onDelete('CASCADE');
    t.string('title').notNullable();
    t.text('description').notNullable();
    t.text('reason').nullable();
    t.text('scope_impact').nullable();
    t.integer('date_impact_days').nullable();
    t.decimal('cost_impact', 12, 2).nullable();
    t.enu('status', ['draft', 'submitted', 'under_review', 'needs_information', 'approved', 'rejected', 'implemented', 'cancelled']).notNullable().defaultTo('draft');
    t.uuid('requested_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.timestamps(true, true);
    t.index(['project_id', 'status'], 'pm_change_requests_project_status_idx');
  });

  // --- Bids / proposals (marketplace sourcing) -------------------------
  await knex.schema.createTable('pm_project_bids', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id').notNullable().references('id').inTable('pm_projects').onDelete('CASCADE');
    t.uuid('professional_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('cover_letter').notNullable();
    t.enu('rate_type', ['fixed', 'hourly']).notNullable().defaultTo('fixed');
    t.decimal('proposed_amount', 12, 2).notNullable();
    t.integer('estimated_duration_days').nullable();
    t.date('available_from').nullable();
    t.enu('status', ['submitted', 'shortlisted', 'interviewing', 'changes_requested', 'accepted', 'declined']).notNullable().defaultTo('submitted');
    t.timestamps(true, true);
    t.unique(['project_id', 'professional_id']);
    t.index(['project_id', 'status', 'created_at'], 'pm_bids_project_status_created_idx');
  });

  // --- Pay splits (revenue/comp sharing among project members) ------------
  await knex.schema.createTable('pm_project_pay_splits', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id').notNullable().references('id').inTable('pm_projects').onDelete('CASCADE');
    t.uuid('member_id').notNullable().references('id').inTable('pm_project_members').onDelete('CASCADE');
    t.enu('allocation_type', ['percentage', 'fixed', 'milestone']).notNullable().defaultTo('percentage');
    t.decimal('percentage', 5, 2).nullable();
    t.decimal('fixed_amount', 12, 2).nullable();
    t.uuid('milestone_id').nullable().references('id').inTable('pm_milestones').onDelete('SET NULL');
    t.timestamps(true, true);
    t.index(['project_id'], 'pm_pay_splits_project_idx');
  });

  // --- Risks & Issues (one table, `kind` distinguishes semantics) --------
  await knex.schema.createTable('pm_risks', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id').notNullable().references('id').inTable('pm_projects').onDelete('CASCADE');
    t.enu('kind', ['risk', 'issue']).notNullable();
    t.string('title').notNullable();
    t.text('description').nullable();
    t.string('category').nullable();
    t.enu('probability', ['low', 'medium', 'high']).nullable();
    t.enu('impact', ['low', 'medium', 'high']).nullable();
    t.enu('severity', ['low', 'medium', 'high', 'critical']).notNullable().defaultTo('medium');
    t.uuid('owner_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.text('mitigation').nullable();
    t.enu('status', ['open', 'mitigating', 'resolved', 'accepted', 'escalated']).notNullable().defaultTo('open');
    t.date('due_date').nullable();
    t.decimal('financial_exposure', 12, 2).nullable();
    t.uuid('linked_task_id').nullable().references('id').inTable('pm_tasks').onDelete('SET NULL');
    t.uuid('linked_milestone_id').nullable().references('id').inTable('pm_milestones').onDelete('SET NULL');
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.timestamps(true, true);
    t.index(['project_id', 'status', 'severity'], 'pm_risks_project_status_severity_idx');
    t.index(['project_id', 'kind'], 'pm_risks_project_kind_idx');
  });

  // --- Payment milestones & release ledger -------------------------------
  // Mirrors pm_milestones 1:1 for projects that opt into marketplace payment
  // protection — kept as a separate table rather than overloading
  // pm_milestones with payment-provider fields, since most internal/client
  // projects will never populate it.
  await knex.schema.createTable('pm_payment_milestones', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id').notNullable().references('id').inTable('pm_projects').onDelete('CASCADE');
    t.uuid('milestone_id').notNullable().unique().references('id').inTable('pm_milestones').onDelete('CASCADE');
    t.uuid('payee_user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.decimal('amount', 12, 2).notNullable();
    t.string('currency', 3).notNullable().defaultTo('USD');
    t.enu('status', ['draft', 'funded', 'in_progress', 'submitted', 'accepted', 'release_pending', 'released', 'disputed', 'refunded']).notNullable().defaultTo('draft');
    t.string('provider').notNullable().defaultTo('stripe');
    t.string('provider_payment_intent_id').nullable();
    t.string('provider_transfer_id').nullable();
    t.string('idempotency_key').nullable().unique();
    t.integer('version').notNullable().defaultTo(1);
    t.timestamps(true, true);
    t.index(['project_id', 'status'], 'pm_payment_milestones_project_status_idx');
  });

  await knex.schema.createTable('pm_payment_ledger_entries', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('payment_milestone_id').notNullable().references('id').inTable('pm_payment_milestones').onDelete('CASCADE');
    t.enu('entry_type', ['secured', 'authorized', 'released', 'refunded', 'reversed', 'failed']).notNullable();
    t.decimal('amount', 12, 2).notNullable();
    t.string('provider_reference').nullable();
    t.jsonb('metadata').notNullable().defaultTo('{}');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['payment_milestone_id', 'created_at'], 'pm_payment_ledger_milestone_created_idx');
  });

  // --- Completion / handover ------------------------------------------
  await knex.schema.createTable('pm_project_completions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id').notNullable().unique().references('id').inTable('pm_projects').onDelete('CASCADE');
    t.enu('status', ['in_progress', 'completed']).notNullable().defaultTo('in_progress');
    t.jsonb('checklist_snapshot').notNullable().defaultTo('{}');
    t.uuid('completed_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('completed_at').nullable();
    t.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('pm_project_completions');
  await knex.schema.dropTableIfExists('pm_payment_ledger_entries');
  await knex.schema.dropTableIfExists('pm_payment_milestones');
  await knex.schema.dropTableIfExists('pm_risks');
  await knex.schema.dropTableIfExists('pm_project_pay_splits');
  await knex.schema.dropTableIfExists('pm_project_bids');
  await knex.schema.dropTableIfExists('pm_change_requests');
  await knex.schema.dropTableIfExists('pm_approval_steps');
  await knex.schema.dropTableIfExists('pm_approvals');
  await knex.schema.dropTableIfExists('pm_expenses');
  await knex.schema.dropTableIfExists('pm_budget_lines');
  await knex.schema.dropTableIfExists('pm_project_budgets');
  await knex.schema.dropTableIfExists('pm_timesheets');
  await knex.schema.dropTableIfExists('pm_discussion_replies');
  await knex.schema.dropTableIfExists('pm_project_discussions');
  await knex.schema.dropTableIfExists('pm_project_files');
  await knex.schema.alterTable('pm_projects', (t) => {
    t.dropColumn('conversation_id');
  });
}
