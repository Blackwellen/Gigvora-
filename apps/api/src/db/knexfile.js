import { config } from '../config/index.js';

const base = {
  client: 'pg',
  connection: config.db.connectionString || {
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
  },
  pool: config.db.pool,
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
    extension: 'js',
  },
  seeds: {
    directory: './seeds',
    extension: 'js',
  },
};

export default {
  development: base,
  test: { ...base, connection: { ...base.connection, database: `${config.db.database}_test` } },
  production: base,
};
