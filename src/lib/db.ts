/**
 * Shared Postgres connection pool.
 *
 * Used by the session store (connect-pg-simple) and can be used for direct
 * SQL queries once route logic is migrated off the internal API. On Vercel's
 * serverless runtime the pool is created once per warm instance and reused
 * across invocations. Point DATABASE_URL at the Supabase connection pooler
 * (port 6543) so serverless functions don't exhaust direct connections.
 */

import { Pool } from 'pg';

let pool: Pool | undefined;

/**
 * Returns the shared pool, or undefined when DATABASE_URL is not configured
 * (e.g. local dev without a database). Callers must handle the undefined case.
 */
export function getPool(): Pool | undefined {
    if (pool) {
        return pool;
    }

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        return undefined;
    }

    pool = new Pool({
        connectionString,
        // Supabase requires TLS. In production verify the chain; the pooler
        // presents a valid certificate.
        ssl: { rejectUnauthorized: true },
        max: 5,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 10_000,
    });

    return pool;
}
