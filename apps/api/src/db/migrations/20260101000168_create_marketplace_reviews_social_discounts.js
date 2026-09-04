// Domain 26 — reviews/Q&A, wishlists, shop follows, discounts, collections
// and marketplace event telemetry (impressions/clicks/search), consolidated
// into one events table keyed by event_type rather than three near-identical
// tables, since they share the same shape and are always queried by time
// range + event_type.
export async function up(knex) {
  await knex.schema.createTable('marketplace_reviews', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('product_id').notNullable().references('id').inTable('marketplace_products').onDelete('CASCADE');
    t.uuid('order_item_id').nullable().references('id').inTable('marketplace_order_items').onDelete('SET NULL');
    t.uuid('reviewer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('rating').notNullable();
    t.text('body').nullable();
    t.text('media_json').nullable();
    t.text('seller_response').nullable();
    t.boolean('is_verified_purchase').notNullable().defaultTo(false);
    t.timestamps(true, true);
    t.index(['product_id']);
    t.unique(['product_id', 'order_item_id']);
  });

  await knex.schema.createTable('marketplace_questions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('product_id').notNullable().references('id').inTable('marketplace_products').onDelete('CASCADE');
    t.uuid('asked_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('body').notNullable();
    t.timestamps(true, true);
    t.index(['product_id']);
  });

  await knex.schema.createTable('marketplace_answers', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('question_id').notNullable().references('id').inTable('marketplace_questions').onDelete('CASCADE');
    t.uuid('answered_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.boolean('is_seller').notNullable().defaultTo(false);
    t.text('body').notNullable();
    t.timestamps(true, true);
    t.index(['question_id']);
  });

  await knex.schema.createTable('wishlists', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('name').notNullable().defaultTo('Saved Items');
    t.timestamps(true, true);
    t.index(['user_id']);
  });

  await knex.schema.createTable('wishlist_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('wishlist_id').notNullable().references('id').inTable('wishlists').onDelete('CASCADE');
    t.uuid('product_id').notNullable().references('id').inTable('marketplace_products').onDelete('CASCADE');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['wishlist_id', 'product_id']);
  });

  await knex.schema.createTable('shop_followers', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('shop_id').notNullable().references('id').inTable('marketplace_shops').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['shop_id', 'user_id']);
  });

  await knex.schema.createTable('discounts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('shop_id').notNullable().references('id').inTable('marketplace_shops').onDelete('CASCADE');
    t.string('code').nullable();
    t.string('title').notNullable();
    t.enu('discount_type', ['percentage', 'fixed_amount', 'free_shipping', 'bundle']).notNullable();
    t.decimal('value', 10, 2).nullable();
    t.integer('min_order_cents').nullable();
    t.integer('usage_limit').nullable();
    t.integer('usage_count').notNullable().defaultTo(0);
    t.boolean('first_purchase_only').notNullable().defaultTo(false);
    t.boolean('is_automatic').notNullable().defaultTo(false);
    t.enu('status', ['draft', 'active', 'scheduled', 'expired', 'disabled']).notNullable().defaultTo('draft');
    t.timestamp('starts_at').nullable();
    t.timestamp('ends_at').nullable();
    t.timestamps(true, true);
    t.index(['shop_id']);
    t.unique(['shop_id', 'code']);
  });

  await knex.schema.createTable('discount_rules', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('discount_id').notNullable().references('id').inTable('discounts').onDelete('CASCADE');
    t.enu('scope', ['all_products', 'category', 'product', 'collection']).notNullable().defaultTo('all_products');
    t.uuid('scope_ref_id').nullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('discount_redemptions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('discount_id').notNullable().references('id').inTable('discounts').onDelete('CASCADE');
    t.uuid('order_id').notNullable().references('id').inTable('marketplace_orders').onDelete('CASCADE');
    t.uuid('buyer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('amount_cents').notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['discount_id']);
  });

  await knex.schema.createTable('marketplace_collections', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('shop_id').notNullable().references('id').inTable('marketplace_shops').onDelete('CASCADE');
    t.string('title').notNullable();
    t.string('slug').notNullable();
    t.text('description').nullable();
    t.enu('collection_type', ['manual', 'rules_based', 'ai_assisted']).notNullable().defaultTo('manual');
    t.text('rules_json').nullable();
    t.boolean('is_published').notNullable().defaultTo(false);
    t.timestamps(true, true);
    t.unique(['shop_id', 'slug']);
  });

  await knex.schema.createTable('marketplace_collection_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('collection_id').notNullable().references('id').inTable('marketplace_collections').onDelete('CASCADE');
    t.uuid('product_id').notNullable().references('id').inTable('marketplace_products').onDelete('CASCADE');
    t.integer('sort_order').notNullable().defaultTo(0);
    t.unique(['collection_id', 'product_id']);
  });

  await knex.schema.createTable('marketplace_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.enu('event_type', ['impression', 'click', 'search']).notNullable();
    t.uuid('product_id').nullable().references('id').inTable('marketplace_products').onDelete('CASCADE');
    t.uuid('shop_id').nullable().references('id').inTable('marketplace_shops').onDelete('CASCADE');
    t.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('session_id').nullable();
    t.string('search_query').nullable();
    t.string('surface').nullable();
    t.boolean('is_sponsored').notNullable().defaultTo(false);
    t.text('metadata_json').nullable();
    t.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
    t.index(['event_type', 'occurred_at']);
    t.index(['product_id']);
    t.index(['shop_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('marketplace_events');
  await knex.schema.dropTableIfExists('marketplace_collection_items');
  await knex.schema.dropTableIfExists('marketplace_collections');
  await knex.schema.dropTableIfExists('discount_redemptions');
  await knex.schema.dropTableIfExists('discount_rules');
  await knex.schema.dropTableIfExists('discounts');
  await knex.schema.dropTableIfExists('shop_followers');
  await knex.schema.dropTableIfExists('wishlist_items');
  await knex.schema.dropTableIfExists('wishlists');
  await knex.schema.dropTableIfExists('marketplace_answers');
  await knex.schema.dropTableIfExists('marketplace_questions');
  await knex.schema.dropTableIfExists('marketplace_reviews');
}
