import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from 'dotenv';

config();

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined');
}

export const pool = new Pool({
  connectionString: databaseUrl,
});

export const db = drizzle(pool);