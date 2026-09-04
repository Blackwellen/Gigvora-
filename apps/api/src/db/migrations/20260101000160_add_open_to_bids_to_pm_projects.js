// Domain 18 marketplace discovery gap-fix: pm_projects had no visibility
// flag at all, so a freelancer/project-member (non-owner) could never
// discover a project to bid on — bids.js already supports non-member
// submission, but there was no "open_to_bids" projects existed to submit
// against. Defaults to false: a project stays private to its members until
// an owner/manager explicitly opts it into the marketplace via project
// settings (see settings.js / projects.service.js updateProject).
export async function up(knex) {
  await knex.schema.alterTable('pm_projects', (table) => {
    table.boolean('open_to_bids').notNullable().defaultTo(false);
  });
}

export async function down(knex) {
  await knex.schema.alterTable('pm_projects', (table) => {
    table.dropColumn('open_to_bids');
  });
}
