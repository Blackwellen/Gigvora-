// Domain 26 — Marketplace, Commerce, Orders & Fulfilment.
// Shops, catalog taxonomy, products, variants and listing media. Shop
// ownership is polymorphic (owner_type/owner_id, no FK) mirroring the
// disputes table's object_type/object_id pattern, since a shop can be owned
// by an individual user or a company (`companies` table, Domain 5).
export async function up(knex) {
  await knex.schema.createTable('marketplace_shops', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.enu('owner_type', ['user', 'company']).notNullable();
    t.uuid('owner_id').notNullable();
    t.string('slug').notNullable().unique();
    t.string('name').notNullable();
    t.text('description').nullable();
    t.string('logo_asset_key').nullable();
    t.string('cover_asset_key').nullable();
    t.enu('status', ['draft', 'active', 'paused', 'suspended', 'archived']).notNullable().defaultTo('draft');
    t.enu('verification_status', ['unverified', 'pending', 'verified', 'rejected']).notNullable().defaultTo('unverified');
    t.string('default_currency', 3).notNullable().defaultTo('usd');
    t.string('country', 2).nullable();
    t.text('settings_json').nullable();
    t.text('policies_json').nullable();
    t.decimal('rating_avg', 3, 2).notNullable().defaultTo(0);
    t.integer('rating_count').notNullable().defaultTo(0);
    t.integer('follower_count').notNullable().defaultTo(0);
    t.integer('sales_count').notNullable().defaultTo(0);
    t.timestamp('published_at').nullable();
    t.timestamps(true, true);
    t.index(['owner_type', 'owner_id']);
    t.index(['status']);
  });

  await knex.schema.createTable('marketplace_shop_members', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('shop_id').notNullable().references('id').inTable('marketplace_shops').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('role', ['owner', 'manager', 'inventory', 'fulfilment', 'support', 'finance', 'marketing', 'viewer']).notNullable().defaultTo('viewer');
    t.text('permissions_json').nullable();
    t.enu('status', ['active', 'invited', 'suspended']).notNullable().defaultTo('active');
    t.timestamps(true, true);
    t.unique(['shop_id', 'user_id']);
  });

  await knex.schema.createTable('marketplace_categories', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('parent_id').nullable().references('id').inTable('marketplace_categories').onDelete('SET NULL');
    t.string('slug').notNullable().unique();
    t.string('name').notNullable();
    t.text('description').nullable();
    t.string('icon').nullable();
    t.text('attribute_schema_json').nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
    t.index(['parent_id']);
  });

  await knex.schema.createTable('marketplace_products', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('shop_id').notNullable().references('id').inTable('marketplace_shops').onDelete('CASCADE');
    t.uuid('seller_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('category_id').nullable().references('id').inTable('marketplace_categories').onDelete('SET NULL');
    t.string('title').notNullable();
    t.string('slug').notNullable().unique();
    t.text('description').nullable();
    t.enu('product_type', ['physical', 'digital', 'service']).notNullable().defaultTo('physical');
    t.enu('status', ['draft', 'active', 'out_of_stock', 'archived', 'rejected', 'needs_review']).notNullable().defaultTo('draft');
    t.enu('condition', ['new', 'used_like_new', 'used_good', 'used_fair', 'refurbished']).notNullable().defaultTo('new');
    t.string('currency', 3).notNullable().defaultTo('usd');
    t.integer('base_price_cents').notNullable();
    t.integer('compare_at_price_cents').nullable();
    t.string('tax_code').nullable();
    t.decimal('weight_kg', 8, 3).nullable();
    t.text('dimensions_json').nullable();
    t.text('attributes_json').nullable();
    t.text('seo_json').nullable();
    t.decimal('quality_score', 5, 2).nullable();
    t.decimal('rating_avg', 3, 2).notNullable().defaultTo(0);
    t.integer('rating_count').notNullable().defaultTo(0);
    t.integer('view_count').notNullable().defaultTo(0);
    t.integer('order_count').notNullable().defaultTo(0);
    t.timestamp('published_at').nullable();
    t.timestamps(true, true);
    t.index(['shop_id']);
    t.index(['seller_id']);
    t.index(['category_id']);
    t.index(['status']);
  });

  await knex.schema.createTable('marketplace_product_variants', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('product_id').notNullable().references('id').inTable('marketplace_products').onDelete('CASCADE');
    t.string('sku').notNullable();
    t.string('barcode').nullable();
    t.string('title').nullable();
    t.text('option_values_json').nullable();
    t.integer('price_cents').notNullable();
    t.integer('compare_at_price_cents').nullable();
    t.decimal('weight_kg', 8, 3).nullable();
    t.enu('status', ['active', 'inactive']).notNullable().defaultTo('active');
    t.timestamps(true, true);
    t.unique(['product_id', 'sku']);
  });

  await knex.schema.createTable('marketplace_listing_assets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('product_id').notNullable().references('id').inTable('marketplace_products').onDelete('CASCADE');
    t.uuid('variant_id').nullable().references('id').inTable('marketplace_product_variants').onDelete('CASCADE');
    t.enu('media_type', ['image', 'video']).notNullable().defaultTo('image');
    t.string('object_key').notNullable();
    t.string('url').nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['product_id', 'sort_order']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('marketplace_listing_assets');
  await knex.schema.dropTableIfExists('marketplace_product_variants');
  await knex.schema.dropTableIfExists('marketplace_products');
  await knex.schema.dropTableIfExists('marketplace_categories');
  await knex.schema.dropTableIfExists('marketplace_shop_members');
  await knex.schema.dropTableIfExists('marketplace_shops');
}
