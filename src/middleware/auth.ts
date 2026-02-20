import { Request, Response, NextFunction } from "express";

/**
 * Middleware: Require the user to be logged in.
 * Redirects to /login if not authenticated.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    if (!req.session?.accessToken || !req.session?.user) {
        res.redirect("/login");
        return;
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
