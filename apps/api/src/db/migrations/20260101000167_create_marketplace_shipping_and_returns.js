// Domain 26 — shipping and returns. Disputes reuse the existing generic
// `disputes` table via object_type='marketplace_order' (see
// modules/disputes/registry.js) rather than a new table.
export async function up(knex) {
  await knex.schema.createTable('shipments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('order_id').notNullable().references('id').inTable('marketplace_orders').onDelete('CASCADE');
    t.uuid('shop_id').notNullable().references('id').inTable('marketplace_shops').onDelete('CASCADE');
    t.string('carrier').nullable();
    t.string('service').nullable();
    t.string('tracking_number').nullable();
    t.string('label_object_key').nullable();
    t.enu('status', ['pending', 'label_created', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'cancelled']).notNullable().defaultTo('pending');
    t.timestamp('shipped_at').nullable();
    t.timestamp('estimated_delivery_at').nullable();
    t.timestamp('delivered_at').nullable();
    t.integer('cost_cents').nullable();
    t.timestamps(true, true);
    t.index(['order_id']);
    t.index(['shop_id']);
    t.index(['status']);
  });

  await knex.schema.createTable('shipment_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('shipment_id').notNullable().references('id').inTable('shipments').onDelete('CASCADE');
    t.uuid('order_item_id').notNullable().references('id').inTable('marketplace_order_items').onDelete('CASCADE');
    t.integer('quantity').notNullable();
  });

  await knex.schema.createTable('returns', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('order_id').notNullable().references('id').inTable('marketplace_orders').onDelete('CASCADE');
    t.uuid('shop_id').notNullable().references('id').inTable('marketplace_shops').onDelete('CASCADE');
    t.uuid('buyer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('reason').notNullable();
    t.text('description').nullable();
    t.enu('status', ['requested', 'approved', 'rejected', 'label_sent', 'in_transit', 'received', 'inspected', 'refunded', 'closed']).notNullable().defaultTo('requested');
    t.text('seller_response').nullable();
    t.string('return_label_object_key').nullable();
    t.timestamp('received_at').nullable();
    t.timestamps(true, true);
    t.index(['order_id']);
    t.index(['shop_id']);
    t.index(['status']);
  });

  await knex.schema.createTable('return_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('return_id').notNullable().references('id').inTable('returns').onDelete('CASCADE');
    t.uuid('order_item_id').notNullable().references('id').inTable('marketplace_order_items').onDelete('CASCADE');
    t.integer('quantity').notNullable();
    t.text('evidence_json').nullable();
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('return_items');
  await knex.schema.dropTableIfExists('returns');
  await knex.schema.dropTableIfExists('shipment_items');
  await knex.schema.dropTableIfExists('shipments');
}
