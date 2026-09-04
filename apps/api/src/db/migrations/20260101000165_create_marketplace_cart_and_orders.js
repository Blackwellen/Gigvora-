// Domain 26 — cart and orders. A cart can span multiple shops; checkout
// splits it into one marketplace_order per buyer checkout with per-shop
// order_items, so fulfilment/payout can be tracked per seller while the
// buyer sees one order confirmation.
export async function up(knex) {
  await knex.schema.createTable('marketplace_carts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('buyer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('currency', 3).notNullable().defaultTo('usd');
    t.enu('status', ['active', 'converted', 'abandoned']).notNullable().defaultTo('active');
    t.timestamps(true, true);
    t.index(['buyer_id', 'status']);
  });

  await knex.schema.createTable('marketplace_cart_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('cart_id').notNullable().references('id').inTable('marketplace_carts').onDelete('CASCADE');
    t.uuid('product_id').notNullable().references('id').inTable('marketplace_products').onDelete('CASCADE');
    t.uuid('variant_id').notNullable().references('id').inTable('marketplace_product_variants').onDelete('CASCADE');
    t.uuid('shop_id').notNullable().references('id').inTable('marketplace_shops').onDelete('CASCADE');
    t.integer('quantity').notNullable().defaultTo(1);
    t.boolean('saved_for_later').notNullable().defaultTo(false);
    t.timestamps(true, true);
    t.unique(['cart_id', 'variant_id']);
  });

  await knex.schema.createTable('marketplace_orders', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('order_number').notNullable().unique();
    t.uuid('buyer_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.string('currency', 3).notNullable().defaultTo('usd');
    t.integer('subtotal_cents').notNullable();
    t.integer('discount_total_cents').notNullable().defaultTo(0);
    t.integer('shipping_total_cents').notNullable().defaultTo(0);
    t.integer('tax_total_cents').notNullable().defaultTo(0);
    t.integer('platform_fee_cents').notNullable().defaultTo(0);
    t.integer('grand_total_cents').notNullable();
    t.enu('payment_status', ['pending', 'authorized', 'paid', 'partially_refunded', 'refunded', 'failed']).notNullable().defaultTo('pending');
    t.enu('fulfilment_status', ['unfulfilled', 'partially_fulfilled', 'fulfilled', 'shipped', 'delivered', 'returned']).notNullable().defaultTo('unfulfilled');
    t.enu('order_status', ['created', 'processing', 'completed', 'cancelled', 'disputed']).notNullable().defaultTo('created');
    t.text('shipping_address_json').nullable();
    t.text('billing_address_json').nullable();
    t.text('metadata_json').nullable();
    t.timestamps(true, true);
    t.index(['buyer_id']);
    t.index(['order_status']);
  });

  await knex.schema.createTable('marketplace_order_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('order_id').notNullable().references('id').inTable('marketplace_orders').onDelete('CASCADE');
    t.uuid('shop_id').notNullable().references('id').inTable('marketplace_shops').onDelete('RESTRICT');
    t.uuid('product_id').notNullable().references('id').inTable('marketplace_products').onDelete('RESTRICT');
    t.uuid('variant_id').notNullable().references('id').inTable('marketplace_product_variants').onDelete('RESTRICT');
    t.uuid('seller_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.integer('quantity').notNullable();
    t.integer('unit_price_cents').notNullable();
    t.integer('tax_amount_cents').notNullable().defaultTo(0);
    t.integer('discount_amount_cents').notNullable().defaultTo(0);
    t.enu('fulfilment_status', ['unfulfilled', 'ready_to_ship', 'shipped', 'delivered', 'cancelled', 'returned']).notNullable().defaultTo('unfulfilled');
    t.timestamps(true, true);
    t.index(['order_id']);
    t.index(['shop_id']);
    t.index(['seller_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('marketplace_order_items');
  await knex.schema.dropTableIfExists('marketplace_orders');
  await knex.schema.dropTableIfExists('marketplace_cart_items');
  await knex.schema.dropTableIfExists('marketplace_carts');
}
