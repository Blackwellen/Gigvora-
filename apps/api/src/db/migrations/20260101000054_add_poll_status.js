// Poll Detail needs an "Active"/"Closed" state so the poll owner can close
// voting early (matches the reference design's "Close poll" action). The
// "closes in N days" countdown and "allows multiple choices" toggle already
// have real columns from 20260101000032 (polls.ends_at, polls.multiple_choice)
// so this migration only adds what's genuinely missing: status.
export async function up(knex) {
  await knex.schema.alterTable('polls', (t) => {
    t.string('status').notNullable().defaultTo('active'); // active | closed
  });
}

export async function down(knex) {
  await knex.schema.alterTable('polls', (t) => {
    t.dropColumn('status');
  });
}
