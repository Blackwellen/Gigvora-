export async function up(knex) {
  await knex.schema.createTable('companies', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('owner_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('slug').notNullable().unique();
    t.text('description');
    t.string('logo_url');
    t.string('website');
    t.string('industry');
    t.string('size');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('jobs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    t.uuid('posted_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('title').notNullable();
    t.text('description').notNullable();
    t.jsonb('requirements').notNullable().defaultTo('[]');
    t.string('location');
    t.enu('employment_type', ['full_time', 'part_time', 'contract', 'internship', 'temporary']).notNullable().defaultTo('full_time');
    t.enu('work_mode', ['onsite', 'remote', 'hybrid']).notNullable().defaultTo('onsite');
    t.integer('salary_min');
    t.integer('salary_max');
    t.string('salary_currency').defaultTo('USD');
    t.enu('status', ['draft', 'open', 'closed', 'archived']).notNullable().defaultTo('open');
    t.jsonb('skills').notNullable().defaultTo('[]');
    t.timestamp('expires_at');
    t.timestamps(true, true);
  });

  await knex.schema.alterTable('jobs', (t) => {
    t.index(['status', 'work_mode']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('jobs');
  await knex.schema.dropTableIfExists('companies');
}
