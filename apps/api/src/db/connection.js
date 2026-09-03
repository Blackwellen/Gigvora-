import knexLib from 'knex';
import knexConfig from './knexfile.js';
import { config } from '../config/index.js';

const environment = config.env === 'production' ? 'production' : config.env === 'test' ? 'test' : 'development';

export const db = knexLib(knexConfig[environment]);
