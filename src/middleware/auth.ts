import { Request, Response, NextFunction } from "express";
import { refreshToken as refreshAccessToken } from "../utils/api";

/** Refresh the access token when it has fewer than this many seconds left. */
const REFRESH_SKEW_SECONDS = 60;

/**
 * Decode a JWT's `exp` claim (seconds since epoch) without verifying it.
 * Verification happens server-side in the API; here we only need the expiry
 * to decide whether to proactively refresh. Returns null if it can't be read.
 */
function getTokenExpiry(token: string): number | null {
    const parts = token.split(".");
    if (parts.length !== 3) {
        return null;
    }
    try {
        const payload = JSON.parse(
            Buffer.from(parts[1], "base64url").toString("utf8")
        ) as { exp?: number };
        return typeof payload.exp === "number" ? payload.exp : null;
    } catch {
        return null;
    }
}

/**
 * Middleware: Require the user to be logged in.
 * Redirects to /login if not authenticated. If the Supabase access token has
 * expired (or is about to), it is silently refreshed using the stored refresh
 * token so long-lived sessions don't hit "Invalid or expired token" errors.
 */
export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    if (!req.session?.accessToken || !req.session?.user) {
        res.redirect("/login");
        return;
    }

    const expiry = getTokenExpiry(req.session.accessToken);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const needsRefresh = expiry !== null && expiry - nowSeconds <= REFRESH_SKEW_SECONDS;

    if (needsRefresh && req.session.refreshToken) {
        const result = await refreshAccessToken(req.session.refreshToken);

        if (result.success && result.data?.accessToken) {
            req.session.accessToken = result.data.accessToken;
            req.session.refreshToken = result.data.refreshToken;
        } else {
            // Refresh token is invalid/expired — end the session and re-login.
            req.session.destroy(() => res.redirect("/login"));
            return;
        }
    }

    next();
}

/**
 * Middleware factory: Require a specific role.
 * Usage: requireRole("admin", "coach")
 */
export function requireRole(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.session?.user || !roles.includes(req.session.user.role)) {
            res.status(403).render("404.njk", { title: "Access Denied" });
            return;
        }
        next();
    };
}

/**
 * Middleware: Pass the current user (if any) to all templates.
 * Available as {{ user }}, {{ isLoggedIn }}, {{ isImpersonating }} in Nunjucks.
 */
export function injectUser(req: Request, res: Response, next: NextFunction): void {
    const user = req.session?.user || null;
    const isAdmin = user?.role === 'admin';
    const viewAsRole = isAdmin ? req.session?.viewAsRole : undefined;

    res.locals.user = user;
    res.locals.isLoggedIn = !!user;
    res.locals.isImpersonating = isAdmin && !!viewAsRole;
    res.locals.viewAsRole = viewAsRole || null;
    res.locals.realRole = user?.role || null;
    next();
}
