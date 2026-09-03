// Article Detail (Domain 05 Phase 2). An article is a post (post_type =
// 'article') with a 1:1 post_articles row carrying the long-form content.
// content_json is an array of typed blocks (paragraph | heading | list |
// quote | image), never raw HTML — the web block renderer can render it
// safely without a client-side HTML sanitizer.
//
// cover image follows the same convention already used across the codebase
// (resource_articles.cover_image_url, projects.cover_image_url,
// podcasts.cover_image_url, webinars.cover_image_url) rather than a
// cover_asset_id FK — there is no `assets` table in this schema to point at,
// so a plain nullable URL column matches every existing "cover image" column
// in the codebase (including post_attachments.url, which stores a plain URL
// rather than referencing an asset row).
export async function up(knex) {
  await knex.schema.createTable('post_articles', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE').unique();
    t.string('title').notNullable();
    t.string('subtitle').nullable();
    t.string('cover_image_url').nullable();
    t.jsonb('content_json').notNullable().defaultTo('[]');
    t.integer('reading_time_minutes').notNullable().defaultTo(1);
    t.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('post_articles');
}
