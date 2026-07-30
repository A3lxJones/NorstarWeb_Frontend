import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Express } from "express";
import { getPool } from "../lib/db";

/**
 * Extend the session to store auth data.
 */
declare module "express-session" {
    interface SessionData {
        accessToken?: string;
        refreshToken?: string;
        user?: {
            id: string;
            email: string;
            role: string;
            full_name?: string;
        };
        /** Admin impersonation: the role being viewed as */
        viewAsRole?: string;
    }
}

/**
 * Configure server-side sessions.
 * Tokens are stored in the session on the server — never exposed to the browser.
 */
export function configureSession(app: Express): void {
    const sessionSecret = process.env.SESSION_SECRET;

    if (!sessionSecret) {
        if (process.env.NODE_ENV === "production") {
            throw new Error(
                "SESSION_SECRET must be set in production. Refusing to start with an insecure default."
            );
        }
        console.warn(
            "⚠  SESSION_SECRET is not set — using an insecure development fallback. Do not use in production."
        );
    }

    // On serverless (Vercel) the default MemoryStore is unsafe: each invocation
    // is a separate instance, so sessions vanish between requests and memory
    // leaks. Use a Postgres-backed store when DATABASE_URL is configured.
    const pool = getPool();
    let store: session.Store | undefined;

    if (pool) {
        const PgStore = connectPgSimple(session);
        store = new PgStore({
            pool,
            tableName: "session",
            createTableIfMissing: true,
        });
    } else if (process.env.NODE_ENV === "production") {
        throw new Error(
            "DATABASE_URL must be set in production — the in-memory session store is not safe on serverless."
        );
    } else {
        console.warn(
            "⚠  DATABASE_URL is not set — using the in-memory session store. Fine for local dev, unsafe in production."
        );
    }

    app.use(
        session({
            store,
            secret: sessionSecret || "norstar-dev-secret",
            resave: false,
            saveUninitialized: false,
            name: "norstar.sid",
            cookie: {
                httpOnly: true, // JS can't read the cookie
                secure: process.env.NODE_ENV === "production", // HTTPS only in prod
                sameSite: "lax",
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            },
        })
    );
}
