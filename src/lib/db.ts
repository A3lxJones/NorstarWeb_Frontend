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

    // Fail fast with a clear message. pg parses this with `new URL()` deep in a
    // request, surfacing only a cryptic "Invalid URL" 500. Common causes: an
    // unreplaced `[YOUR-PASSWORD]` placeholder, unencoded special characters in
    // the password, or stray quotes/whitespace.
    try {
        new URL(connectionString);
    } catch {
        throw new Error(
            'DATABASE_URL is malformed and cannot be parsed as a URL. Expected ' +
            'postgres://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres ' +
            '— check for a leftover [YOUR-PASSWORD] placeholder, unencoded special ' +
            'characters in the password, or surrounding quotes/whitespace.'
        );
    }

    pool = new Pool({
        connectionString,
        // Supabase's pooler cert doesn't chain to a CA in Node's default trust
        // store, so strict verification fails with "self-signed certificate in
        // certificate chain". Traffic stays TLS-encrypted; chain check is skipped.
        ssl: { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 10_000,
    });

    return pool;
}
