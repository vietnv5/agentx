import { Provider } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export const DRIZZLE_PROVIDER = 'DRIZZLE_PROVIDER';

export const drizzleProvider: Provider = {
  provide: DRIZZLE_PROVIDER,
  useFactory: () => {
    const pool = new Pool({
      host: process.env.DATABASE_HOST || 'localhost',
      port: Number(process.env.DATABASE_PORT) || 5432,
      user: process.env.DATABASE_USER || 'agentx_user',
      password: process.env.DATABASE_PASSWORD || 'agentx_secure_password',
      database: process.env.DATABASE_NAME || 'agentx_db',
    });
    return drizzle(pool, { schema }) as NodePgDatabase<typeof schema>;
  },
};
