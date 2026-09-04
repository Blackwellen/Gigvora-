// Domain 26 — real per-location inventory tracking (available/reserved/
// incoming/damaged) with an immutable movement ledger, not just a stock
// counter on the variant, so oversell can be prevented via reservation and
// every stock change is auditable back to its source (order, return,
// manual adjustment, receiving).
export async function up(knex) {
  await knex.schema.createTable('inventory_locations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('shop_id').notNullable().references('id').inTable('marketplace_shops').onDelete('CASCADE');
    t.string('name').notNullable();
    t.enu('type', ['warehouse', 'store', 'dropship', 'third_party']).notNullable().defaultTo('warehouse');
    t.text('address_json').nullable();
    t.boolean('is_default').notNullable().defaultTo(false);
    t.timestamps(true, true);
    t.index(['shop_id']);
  });

  await knex.schema.createTable('inventory_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('shop_id').notNullable().references('id').inTable('marketplace_shops').onDelete('CASCADE');
    t.uuid('variant_id').notNullable().references('id').inTable('marketplace_product_variants').onDelete('CASCADE');
    t.string('sku').notNullable();
    t.string('supplier').nullable();
    t.integer('reorder_point').notNullable().defaultTo(0);
    t.integer('safety_stock').notNullable().defaultTo(0);
    t.integer('cost_cents').nullable();
    t.timestamps(true, true);
    t.unique(['variant_id']);
    t.index(['shop_id']);
  });

  await knex.schema.createTable('inventory_balances', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('inventory_item_id').notNullable().references('id').inTable('inventory_items').onDelete('CASCADE');
    t.uuid('location_id').notNullable().references('id').inTable('inventory_locations').onDelete('CASCADE');
    t.integer('available_qty').notNullable().defaultTo(0);
    t.integer('reserved_qty').notNullable().defaultTo(0);
    t.integer('incoming_qty').notNullable().defaultTo(0);
    t.integer('damaged_qty').notNullable().defaultTo(0);
    t.timestamps(true, true);
    t.unique(['inventory_item_id', 'location_id']);
  });

  await knex.schema.createTable('inventory_movements', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('inventory_item_id').notNullable().references('id').inTable('inventory_items').onDelete('CASCADE');
    t.uuid('location_id').notNullable().references('id').inTable('inventory_locations').onDelete('CASCADE');
    t.enu('movement_type', ['receive', 'reserve', 'release', 'commit', 'adjust', 'return', 'damage', 'transfer_in', 'transfer_out', 'cycle_count']).notNullable();
    t.integer('quantity').notNullable();
    t.string('reference_type').nullable();
    t.uuid('reference_id').nullable();
    t.uuid('actor_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.text('note').nullable();
    t.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
    t.index(['inventory_item_id', 'occurred_at']);
    t.index(['reference_type', 'reference_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('inventory_movements');
  await knex.schema.dropTableIfExists('inventory_balances');
  await knex.schema.dropTableIfExists('inventory_items');
  await knex.schema.dropTableIfExists('inventory_locations');
}
