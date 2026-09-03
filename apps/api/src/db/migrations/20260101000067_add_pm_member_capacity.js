// Domain 18 Phase B — Resource Planning (18.26) needs a real capacity figure
// per member to compute utilization against; without this column the page
// would have to invent a number, so it's added here rather than assumed.
export async function up(knex) {
  await knex.schema.alterTable('pm_project_members', (t) => {
    t.decimal('weekly_capacity_hours', 5, 2).notNullable().defaultTo(40);
  });
}

export async function down(knex) {
  await knex.schema.alterTable('pm_project_members', (t) => {
    t.dropColumn('weekly_capacity_hours');
  });
}
