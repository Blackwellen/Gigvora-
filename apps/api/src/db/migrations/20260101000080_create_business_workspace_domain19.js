/**
 * Domain 19: Business Workspace, Hiring & Workforce Operations.
 *
 * Reuses existing tables where they already model the concept:
 *  - `companies` is the business workspace / organisation record.
 *  - `company_members` is the business membership + role table.
 *  - `jobs` / `applications` / `interviews` / `offers` (domain16) back the
 *    hiring command centre, applicants, interviews and offers screens.
 *  - `pm_projects` / `pm_project_budgets` / `pm_budget_lines` back the
 *    business project portfolio screen.
 *
 * This migration adds the remaining domain19-specific tables: teams,
 * departments, spend/budget tracking, hiring & workforce planning, saved
 * views, talent pools and business-scoped shortlists.
 */
export async function up(knex) {
  await knex.schema.createTable('departments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    t.uuid('parent_department_id').nullable().references('id').inTable('departments').onDelete('SET NULL');
    t.string('name').notNullable();
    t.string('cost_center_code').nullable();
    t.text('description').nullable();
    t.uuid('head_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.decimal('budget_annual', 14, 2).notNullable().defaultTo(0);
    t.string('currency', 8).notNullable().defaultTo('USD');
    t.integer('headcount_target').notNullable().defaultTo(0);
    t.enu('status', ['active', 'archived']).notNullable().defaultTo('active');
    t.timestamps(true, true);
    t.index(['company_id', 'status'], 'departments_company_status_idx');
  });

  await knex.schema.createTable('department_members', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('department_id').notNullable().references('id').inTable('departments').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('title').nullable();
    t.enu('status', ['active', 'invited', 'removed']).notNullable().defaultTo('active');
    t.timestamps(true, true);
    t.unique(['department_id', 'user_id']);
  });

  await knex.schema.createTable('teams', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    t.uuid('department_id').nullable().references('id').inTable('departments').onDelete('SET NULL');
    t.string('name').notNullable();
    t.string('function').nullable();
    t.text('description').nullable();
    t.uuid('lead_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.integer('capacity_hours_per_week').notNullable().defaultTo(0);
    t.decimal('utilisation_pct', 5, 2).notNullable().defaultTo(0);
    t.string('color', 16).notNullable().defaultTo('blue');
    t.enu('status', ['active', 'archived']).notNullable().defaultTo('active');
    t.timestamps(true, true);
    t.index(['company_id', 'status'], 'teams_company_status_idx');
  });

  await knex.schema.createTable('team_members', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('role').notNullable().defaultTo('member');
    t.decimal('allocation_pct', 5, 2).notNullable().defaultTo(100);
    t.enu('status', ['active', 'invited', 'removed']).notNullable().defaultTo('active');
    t.timestamp('joined_at').nullable();
    t.timestamps(true, true);
    t.unique(['team_id', 'user_id']);
  });

  await knex.schema.createTable('business_roles', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    t.string('name').notNullable();
    t.text('description').nullable();
    t.boolean('is_system').notNullable().defaultTo(false);
    t.jsonb('permissions').notNullable().defaultTo('[]');
    t.integer('member_count').notNullable().defaultTo(0);
    t.timestamps(true, true);
    t.unique(['company_id', 'name']);
  });

  await knex.schema.createTable('business_spend', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    t.uuid('department_id').nullable().references('id').inTable('departments').onDelete('SET NULL');
    t.uuid('team_id').nullable().references('id').inTable('teams').onDelete('SET NULL');
    t.enu('category', ['salaries', 'contractors', 'tools_and_software', 'recruiting', 'training', 'travel', 'facilities', 'other']).notNullable().defaultTo('other');
    t.string('vendor').nullable();
    t.string('description').notNullable();
    t.decimal('amount', 12, 2).notNullable();
    t.string('currency', 8).notNullable().defaultTo('USD');
    t.date('spend_date').notNullable();
    t.enu('status', ['recorded', 'pending_approval', 'approved', 'flagged']).notNullable().defaultTo('recorded');
    t.boolean('is_anomaly').notNullable().defaultTo(false);
    t.text('anomaly_reason').nullable();
    t.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
    t.index(['company_id', 'spend_date'], 'business_spend_company_date_idx');
    t.index(['company_id', 'category'], 'business_spend_company_category_idx');
  });

  await knex.schema.createTable('business_budgets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    t.uuid('department_id').nullable().references('id').inTable('departments').onDelete('SET NULL');
    t.uuid('team_id').nullable().references('id').inTable('teams').onDelete('SET NULL');
    t.string('period').notNullable();
    t.enu('category', ['salaries', 'contractors', 'tools_and_software', 'recruiting', 'training', 'travel', 'facilities', 'other']).notNullable().defaultTo('other');
    t.decimal('allocated_amount', 14, 2).notNullable().defaultTo(0);
    t.decimal('spent_amount', 14, 2).notNullable().defaultTo(0);
    t.string('currency', 8).notNullable().defaultTo('USD');
    t.enu('status', ['active', 'closed']).notNullable().defaultTo('active');
    t.timestamps(true, true);
    t.index(['company_id', 'period'], 'business_budgets_company_period_idx');
  });

  await knex.schema.createTable('hiring_plans', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    t.uuid('department_id').nullable().references('id').inTable('departments').onDelete('SET NULL');
    t.uuid('team_id').nullable().references('id').inTable('teams').onDelete('SET NULL');
    t.uuid('job_id').nullable().references('id').inTable('jobs').onDelete('SET NULL');
    t.string('role_title').notNullable();
    t.integer('target_hires').notNullable().defaultTo(1);
    t.integer('filled_hires').notNullable().defaultTo(0);
    t.enu('priority', ['low', 'medium', 'high', 'critical']).notNullable().defaultTo('medium');
    t.date('target_date').nullable();
    t.enu('status', ['planned', 'active', 'on_hold', 'completed', 'cancelled']).notNullable().defaultTo('planned');
    t.uuid('owner_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.text('notes').nullable();
    t.timestamps(true, true);
    t.index(['company_id', 'status'], 'hiring_plans_company_status_idx');
  });

  await knex.schema.createTable('workforce_plans', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    t.uuid('department_id').nullable().references('id').inTable('departments').onDelete('SET NULL');
    t.string('name').notNullable();
    t.string('planning_period').notNullable();
    t.integer('current_headcount').notNullable().defaultTo(0);
    t.integer('target_headcount').notNullable().defaultTo(0);
    t.enu('status', ['draft', 'active', 'archived']).notNullable().defaultTo('draft');
    t.text('ai_forecast_summary').nullable();
    t.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
    t.index(['company_id', 'status'], 'workforce_plans_company_status_idx');
  });

  await knex.schema.createTable('workforce_scenarios', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('workforce_plan_id').notNullable().references('id').inTable('workforce_plans').onDelete('CASCADE');
    t.string('name').notNullable();
    t.enu('scenario_type', ['baseline', 'growth', 'attrition', 'hiring_freeze', 'custom']).notNullable().defaultTo('baseline');
    t.integer('headcount_delta').notNullable().defaultTo(0);
    t.decimal('cost_delta', 14, 2).notNullable().defaultTo(0);
    t.jsonb('assumptions').notNullable().defaultTo('[]');
    t.date('projected_month').nullable();
    t.boolean('is_selected').notNullable().defaultTo(false);
    t.timestamps(true, true);
    t.index(['workforce_plan_id'], 'workforce_scenarios_plan_idx');
  });

  await knex.schema.createTable('business_saved_views', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('surface').notNullable();
    t.string('name').notNullable();
    t.jsonb('filters').notNullable().defaultTo('{}');
    t.boolean('is_default').notNullable().defaultTo(false);
    t.timestamps(true, true);
    t.unique(['company_id', 'user_id', 'surface', 'name']);
  });

  await knex.schema.createTable('talent_pools', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    t.string('name').notNullable();
    t.text('description').nullable();
    t.enu('pool_type', ['sourced', 'silver_medalist', 'alumni', 'referral', 'custom']).notNullable().defaultTo('custom');
    t.uuid('owner_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.integer('member_count').notNullable().defaultTo(0);
    t.enu('status', ['active', 'archived']).notNullable().defaultTo('active');
    t.jsonb('tags').notNullable().defaultTo('[]');
    t.timestamps(true, true);
    t.index(['company_id', 'status'], 'talent_pools_company_status_idx');
  });

  await knex.schema.createTable('talent_pool_members', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('talent_pool_id').notNullable().references('id').inTable('talent_pools').onDelete('CASCADE');
    t.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('candidate_name').notNullable();
    t.string('candidate_email').nullable();
    t.string('source').nullable();
    t.decimal('match_score', 5, 2).nullable();
    t.uuid('added_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.text('notes').nullable();
    t.timestamp('added_at').notNullable().defaultTo(knex.fn.now());
    t.timestamps(true, true);
    t.index(['talent_pool_id'], 'talent_pool_members_pool_idx');
  });

  await knex.schema.createTable('shortlists', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    t.uuid('job_id').nullable().references('id').inTable('jobs').onDelete('SET NULL');
    t.string('name').notNullable();
    t.text('description').nullable();
    t.uuid('owner_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.enu('status', ['active', 'archived']).notNullable().defaultTo('active');
    t.timestamps(true, true);
    t.index(['company_id', 'status'], 'shortlists_company_status_idx');
  });

  await knex.schema.createTable('shortlist_members', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('shortlist_id').notNullable().references('id').inTable('shortlists').onDelete('CASCADE');
    t.uuid('application_id').nullable().references('id').inTable('applications').onDelete('SET NULL');
    t.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('candidate_name').notNullable();
    t.integer('rank').nullable();
    t.text('notes').nullable();
    t.uuid('added_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('added_at').notNullable().defaultTo(knex.fn.now());
    t.timestamps(true, true);
    t.index(['shortlist_id'], 'shortlist_members_shortlist_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('shortlist_members');
  await knex.schema.dropTableIfExists('shortlists');
  await knex.schema.dropTableIfExists('talent_pool_members');
  await knex.schema.dropTableIfExists('talent_pools');
  await knex.schema.dropTableIfExists('business_saved_views');
  await knex.schema.dropTableIfExists('workforce_scenarios');
  await knex.schema.dropTableIfExists('workforce_plans');
  await knex.schema.dropTableIfExists('hiring_plans');
  await knex.schema.dropTableIfExists('business_budgets');
  await knex.schema.dropTableIfExists('business_spend');
  await knex.schema.dropTableIfExists('business_roles');
  await knex.schema.dropTableIfExists('team_members');
  await knex.schema.dropTableIfExists('teams');
  await knex.schema.dropTableIfExists('department_members');
  await knex.schema.dropTableIfExists('departments');
}
