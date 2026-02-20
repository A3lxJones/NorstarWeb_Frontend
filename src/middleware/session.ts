import session from "express-session";
import { Express } from "express";

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
    app.use(
        session({
            secret: process.env.SESSION_SECRET || "norstar-dev-secret",
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

    // Make session user available in all Nunjucks templates
    app.use((req, _res, next) => {
        if (req.app.locals) {
            // This will be available as `user` in templates
        }
        next();
    });
}
