// Domain 18 — Projects, Workspaces, Tasks & Delivery (Phase A: foundation + core PM).
//
// The existing `projects` table (see 20260101000048_create_projects.js) is a
// marketplace *listing* ("mini gig/job posting"), explicitly documented there
// as deferring task/milestone/file/approval management to a separate future
// domain. The existing `tasks` table (20260101000046) is a personal to-do
// widget with no project scoping. Neither can be reused as the PM entity, so
// this migration introduces a `pm_`-prefixed table family instead of
// colliding with either. `pm_projects.source_marketplace_project_id` lets a
// PM project optionally originate from a posted marketplace `projects` row.
export async function up(knex) {
  await knex.schema.createTable('pm_projects', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.enu('workspace_type', ['personal', 'organization']).notNullable().defaultTo('personal');
    t.uuid('company_id').nullable().references('id').inTable('companies').onDelete('SET NULL');
    t.uuid('owner_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.string('name').notNullable();
    t.string('slug').notNullable().unique();
    t.text('description').nullable();
    t.enu('status', ['draft', 'active', 'on_hold', 'completed', 'archived']).notNullable().defaultTo('draft');
    t.enu('project_type', ['internal', 'client', 'marketplace', 'freelance']).notNullable().defaultTo('internal');
    t.string('client_name').nullable();
    t.uuid('source_marketplace_project_id').nullable().references('id').inTable('projects').onDelete('SET NULL');
    t.date('start_date').nullable();
    t.date('target_end_date').nullable();
    t.date('actual_end_date').nullable();
    t.integer('progress_pct').notNullable().defaultTo(0);
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.uuid('updated_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.integer('version').notNullable().defaultTo(1);
    t.timestamps(true, true);
  });
  await knex.schema.alterTable('pm_projects', (t) => {
    t.index(['owner_id', 'status'], 'pm_projects_owner_status_idx');
    t.index(['company_id', 'status', 'updated_at'], 'pm_projects_company_status_updated_idx');
  });

  await knex.schema.createTable('pm_project_members', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id').notNullable().references('id').inTable('pm_projects').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('role', ['owner', 'manager', 'client', 'professional', 'reviewer', 'finance', 'guest', 'custom']).notNullable().defaultTo('professional');
    t.string('custom_role_label').nullable();
    t.uuid('invited_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.enu('invitation_status', ['pending', 'accepted', 'declined']).notNullable().defaultTo('accepted');
    t.timestamp('joined_at').nullable();
    t.timestamps(true, true);
    t.unique(['project_id', 'user_id']);
  });

  await knex.schema.createTable('pm_milestones', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id').notNullable().references('id').inTable('pm_projects').onDelete('CASCADE');
    t.string('name').notNullable();
    t.text('description').nullable();
    t.enu('status', ['draft', 'planned', 'active', 'submitted', 'in_review', 'approved', 'rejected', 'completed', 'cancelled']).notNullable().defaultTo('planned');
    t.date('target_date').nullable();
    t.decimal('amount', 12, 2).nullable();
    t.integer('completion_pct').notNullable().defaultTo(0);
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.timestamps(true, true);
    t.index(['project_id', 'target_date'], 'pm_milestones_project_target_idx');
  });

  await knex.schema.createTable('pm_deliverables', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id').notNullable().references('id').inTable('pm_projects').onDelete('CASCADE');
    t.uuid('milestone_id').nullable().references('id').inTable('pm_milestones').onDelete('SET NULL');
    t.string('title').notNullable();
    t.text('description').nullable();
    t.enu('status', ['pending', 'submitted', 'in_review', 'accepted', 'rejected']).notNullable().defaultTo('pending');
    t.uuid('owner_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.date('due_date').nullable();
    t.timestamp('submitted_at').nullable();
    t.timestamps(true, true);
    t.index(['project_id', 'status'], 'pm_deliverables_project_status_idx');
  });

  await knex.schema.createTable('pm_tasks', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id').notNullable().references('id').inTable('pm_projects').onDelete('CASCADE');
    t.uuid('parent_task_id').nullable().references('id').inTable('pm_tasks').onDelete('CASCADE');
    t.uuid('milestone_id').nullable().references('id').inTable('pm_milestones').onDelete('SET NULL');
    t.uuid('deliverable_id').nullable().references('id').inTable('pm_deliverables').onDelete('SET NULL');
    t.string('title').notNullable();
    t.text('description').nullable();
    t.enu('status', ['todo', 'in_progress', 'in_review', 'blocked', 'done']).notNullable().defaultTo('todo');
    t.enu('priority', ['low', 'medium', 'high', 'urgent']).notNullable().defaultTo('medium');
    t.uuid('assignee_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.uuid('reporter_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.date('due_date').nullable();
    t.date('start_date').nullable();
    t.decimal('estimate_hours', 6, 2).nullable();
    t.string('board_column').notNullable().defaultTo('todo');
    t.integer('board_order').notNullable().defaultTo(0);
    t.jsonb('labels').notNullable().defaultTo('[]');
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.integer('version').notNullable().defaultTo(1);
    t.timestamps(true, true);
  });
  await knex.schema.alterTable('pm_tasks', (t) => {
    t.index(['project_id', 'status', 'due_date'], 'pm_tasks_project_status_due_idx');
    t.index(['assignee_id', 'status', 'due_date'], 'pm_tasks_assignee_status_due_idx');
  });
  // Board queries only ever scan not-done tasks ordered within a column —
  // a partial index keeps that scan small as a project's done-task history grows.
  await knex.raw(`
    CREATE INDEX pm_tasks_board_partial_idx
    ON pm_tasks (project_id, board_column, board_order)
    WHERE status <> 'done'
  `);

  await knex.schema.createTable('pm_task_dependencies', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('task_id').notNullable().references('id').inTable('pm_tasks').onDelete('CASCADE');
    t.uuid('depends_on_task_id').notNullable().references('id').inTable('pm_tasks').onDelete('CASCADE');
    t.enu('dependency_type', ['finish_to_start', 'start_to_start', 'finish_to_finish']).notNullable().defaultTo('finish_to_start');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['task_id', 'depends_on_task_id']);
  });

  await knex.schema.createTable('pm_time_entries', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id').notNullable().references('id').inTable('pm_projects').onDelete('CASCADE');
    t.uuid('task_id').nullable().references('id').inTable('pm_tasks').onDelete('SET NULL');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.date('occurred_on').notNullable();
    t.integer('minutes').notNullable();
    t.text('notes').nullable();
    t.boolean('billable').notNullable().defaultTo(true);
    t.enu('source', ['manual', 'timer']).notNullable().defaultTo('manual');
    t.timestamps(true, true);
    t.index(['project_id', 'user_id', 'occurred_on'], 'pm_time_entries_project_user_date_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('pm_time_entries');
  await knex.schema.dropTableIfExists('pm_task_dependencies');
  await knex.schema.dropTableIfExists('pm_tasks');
  await knex.schema.dropTableIfExists('pm_deliverables');
  await knex.schema.dropTableIfExists('pm_milestones');
  await knex.schema.dropTableIfExists('pm_project_members');
  await knex.schema.dropTableIfExists('pm_projects');
}
