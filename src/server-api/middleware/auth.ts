import { Request, Response, NextFunction } from "express";
import { supabase, supabaseAdmin } from "../config/supabase";
import { UserRole } from "../types";

// Extend Express Request to include user info
declare global {
    namespace Express {
        interface Request {
            userId?: string;
            userRole?: UserRole;
            userEmail?: string;
        }
    }
}

/**
 * Middleware: Verify Supabase JWT and attach user info to request.
 * Expects header: Authorization: Bearer <supabase-access-token>
 */
export async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ success: false, error: "Missing or invalid authorization header" });
        return;
    }

    const token = authHeader.split(" ")[1];

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
        res.status(401).json({ success: false, error: "Invalid or expired token" });
        return;
    }

    // Always fetch the user's role from the profiles table (source of truth)
    // This ensures role changes are reflected immediately on the next request
    const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    // If profile doesn't exist yet (e.g., race condition on signup), fall back to JWT metadata
    let userRole: UserRole = "parent"; // default fallback
    
    if (profile?.role) {
        // Use the database role (source of truth)
        userRole = profile.role as UserRole;
    } else if (user.user_metadata?.role) {
        // Fallback to JWT metadata only if profile lookup fails
        userRole = user.user_metadata.role as UserRole;
    }

    req.userId = user.id;
    req.userEmail = user.email;
    req.userRole = userRole;

    next();
}

/**
 * Middleware factory: Restrict route to specific roles.
 * Usage: authorize("admin", "coach")
 */
export function authorize(...allowedRoles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.userRole || !allowedRoles.includes(req.userRole)) {
            res.status(403).json({
                success: false,
                error: "You do not have permission to access this resource",
            });
            return;
        }
        next();
    };
}
