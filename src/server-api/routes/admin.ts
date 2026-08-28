import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { authenticate, authorize } from "../middleware/auth";
import { decryptDeep, encryptField } from "../utils/encryption";
import { ApiResponse } from "../types";

const router = Router();

const normalizeChildrenPayload = (children: any[] = []) => ({
    children,
    items: children,
    rows: children,
    totalChildren: children.length,
});

// Response-shape debug logging (ADMIN_ROUTE_DEBUG_KEYS) was removed on merge;
// kept as a no-op so existing call sites stay valid without console output.
const logAdminResponseKeysOnce = (_route: string, _payload: unknown): void => {
    /* no-op */
};

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize("admin"));

/**
 * GET /api/admin/users
 * Get all users with optional filtering and search.
 * Admin only.
 */
router.get("/users", async (req: Request, res: Response): Promise<void> => {
    const { role, search } = req.query;

    let query = supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, phone, role, created_at");

    // Filter by role if provided
    if (role && typeof role === "string") {
        query = query.eq("role", role);
    }

    const { data: profiles, error: profilesError } = await query;

    if (profilesError) {
        res.status(500).json({ success: false, error: profilesError.message } as ApiResponse);
        return;
    }

    if (!profiles) {
        res.json({ success: true, data: [] } as ApiResponse);
        return;
    }

    // Filter by search term if provided (name or email). Emails are stored as
    // ciphertext, so match against the decrypted values rather than in SQL.
    const decrypted = decryptDeep(profiles);
    let filtered = decrypted;
    if (search && typeof search === "string") {
        const searchLower = search.toLowerCase();
        filtered = decrypted.filter(
            (p) =>
                p.full_name?.toLowerCase().includes(searchLower) ||
                p.email?.toLowerCase().includes(searchLower)
        );
    }

    // Fetch children for every user by parent_id — coaches (and other roles)
    // can also be the guardian who added a child, not just "parent" accounts.
    const usersWithChildren = await Promise.all(
        filtered.map(async (profile) => {
            const { data: children } = await supabaseAdmin
                .from("children")
                .select("id, first_name, last_name, gender, position")
                .eq("parent_id", profile.id);

            return {
                ...profile,
                ...normalizeChildrenPayload(children || []),
            };
        })
    );

    const responsePayload = {
        success: true,
        data: usersWithChildren,
        items: usersWithChildren,
        rows: usersWithChildren,
    } as ApiResponse & { items: any[]; rows: any[] };

    logAdminResponseKeysOnce("GET /api/admin/users", responsePayload);
    res.json(responsePayload);
});

/**
 * GET /api/admin/users/:id
 * Get a single user with full details including their children.
 * Admin only.
 */
router.get("/users/:id", async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, phone, role, created_at, updated_at")
        .eq("id", id)
        .single();

    if (profileError || !profile) {
        res.status(404).json({ success: false, error: "User not found" } as ApiResponse);
        return;
    }

    // Fetch children by parent_id regardless of role — coaches can also be the
    // guardian who added a child, so we must not gate this on role === "parent".
    const { data: children } = await supabaseAdmin
        .from("children")
        .select("*")
        .eq("parent_id", profile.id)
        .order("created_at", { ascending: false });

    const userData: any = {
        ...profile,
        ...normalizeChildrenPayload(children || []),
    };

    const responsePayload = {
        success: true,
        data: userData,
        item: userData,
        row: userData,
    } as ApiResponse & { item: any; row: any };

    logAdminResponseKeysOnce("GET /api/admin/users/:id", responsePayload);
    res.json(responsePayload);
});

/**
 * PUT /api/admin/users/:id
 * Update a user's profile (name, phone, role).
 * Admin only.
 * NOTE: If role is changed, it syncs to both profiles table AND auth.users metadata.
 */
router.put("/users/:id", async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { full_name, phone, role } = req.body;

    // Validate role if provided
    if (role && !["parent", "coach", "admin"].includes(role)) {
        res.status(400).json({ success: false, error: "Invalid role" } as ApiResponse);
        return;
    }

    const updateData: any = {
        updated_at: new Date().toISOString(),
    };

    if (full_name) updateData.full_name = full_name;
    if (phone) updateData.phone = encryptField(phone as string);
    if (role) updateData.role = role;

    // Update profiles table
    const { data, error } = await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

    if (error || !data) {
        res.status(500).json({ success: false, error: error?.message || "Update failed" } as ApiResponse);
        return;
    }

    // If role was changed, also update the auth.users metadata so JWT tokens reflect the change
    if (role) {
        const userId = typeof id === "string" ? id : id[0];
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: {
                role,
            },
        });

        if (authError) {
            console.warn(`Failed to sync role to auth.users for user ${userId}:`, authError);
            // Don't fail the request, but log the warning
        }
    }

    res.json({ success: true, data } as ApiResponse);
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user (soft delete by setting inactive flag, or hard delete).
 * Admin only.
 */
router.delete("/users/:id", async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.userId) {
        res.status(403).json({ success: false, error: "Cannot delete your own account" } as ApiResponse);
        return;
    }

    // Delete the Supabase auth user (this will cascade delete profile due to ON DELETE CASCADE)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id as string);

    if (error) {
        res.status(500).json({ success: false, error: error.message } as ApiResponse);
        return;
    }

    res.json({ success: true, data: { message: "User deleted successfully" } } as ApiResponse);
});

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics.
 * Admin only.
 */
router.get("/stats", async (_req: Request, res: Response): Promise<void> => {
    try {
        // Count users by role
        const { data: profiles } = await supabaseAdmin.from("profiles").select("role");

        const stats = {
            total_users: profiles?.length || 0,
            admins: profiles?.filter((p) => p.role === "admin").length || 0,
            coaches: profiles?.filter((p) => p.role === "coach").length || 0,
            parents: profiles?.filter((p) => p.role === "parent").length || 0,
        };

        // Count children
        const { count: childrenCount } = await supabaseAdmin
            .from("children")
            .select("id", { count: "exact", head: true });

        // Count teams
        const { count: teamsCount } = await supabaseAdmin
            .from("teams")
            .select("id", { count: "exact", head: true });

        // Count games
        const { count: gamesCount } = await supabaseAdmin
            .from("games")
            .select("id", { count: "exact", head: true });

        res.json({
            success: true,
            data: {
                ...stats,
                children: childrenCount || 0,
                teams: teamsCount || 0,
                games: gamesCount || 0,
            },
        } as ApiResponse);
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || "Failed to fetch statistics",
        } as ApiResponse);
    }
});

/**
 * GET /api/admin/parents-with-children
 * Returns parent profiles and their nested children.
 * Admin only.
 */
router.get("/parents-with-children", async (req: Request, res: Response): Promise<void> => {
    try {
        const page = Math.max(parseInt(String(req.query.page ?? "1"), 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "25"), 10) || 25, 1), 100);
        const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

        const parentsQuery = supabaseAdmin
            .from("profiles")
            .select("id, full_name, email, phone", { count: "exact" })
            .eq("role", "parent")
            .order("created_at", { ascending: false });

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Emails are stored encrypted, so a SQL ILIKE can never match them.
        // When searching, load the (club-sized) parent list, decrypt, then
        // filter and paginate in memory. Unsearched requests keep DB paging.
        let parents: any[];
        let total: number;

        if (search) {
            const { data, error: parentsError } = await parentsQuery;

            if (parentsError) {
                res.status(500).json({ success: false, error: parentsError.message } as ApiResponse);
                return;
            }

            const searchLower = search.toLowerCase();
            const matches = decryptDeep(data || []).filter(
                (p) =>
                    p.full_name?.toLowerCase().includes(searchLower) ||
                    p.email?.toLowerCase().includes(searchLower)
            );

            total = matches.length;
            parents = matches.slice(from, from + limit);
        } else {
            const { data, count, error: parentsError } = await parentsQuery.range(from, to);

            if (parentsError) {
                res.status(500).json({ success: false, error: parentsError.message } as ApiResponse);
                return;
            }

            parents = data || [];
            total = count || 0;
        }

        const parentIds = (parents || []).map((p) => p.id);

        let childrenByParent = new Map<string, any[]>();
        if (parentIds.length > 0) {
            const { data: children, error: childrenError } = await supabaseAdmin
                .from("children")
                .select("id, parent_id, first_name, last_name")
                .in("parent_id", parentIds)
                .order("created_at", { ascending: false });

            if (childrenError) {
                res.status(500).json({ success: false, error: childrenError.message } as ApiResponse);
                return;
            }

            childrenByParent = (children || []).reduce((acc, child) => {
                const list = acc.get(child.parent_id) || [];
                list.push({
                    id: child.id,
                    firstName: child.first_name,
                    lastName: child.last_name,
                });
                acc.set(child.parent_id, list);
                return acc;
            }, new Map<string, any[]>());
        }

        const data = (parents || []).map((parent) => ({
            parent: {
                id: parent.id,
                name: parent.full_name,
                email: parent.email,
                phone: parent.phone,
            },
            ...normalizeChildrenPayload(childrenByParent.get(parent.id) || []),
        }));

        const responsePayload = {
            success: true,
            data,
            items: data,
            rows: data,
            meta: {
                page,
                limit,
                total: total || 0,
                totalPages: Math.ceil((total || 0) / limit),
                hasNextPage: page * limit < (total || 0),
                hasPrevPage: page > 1,
                search: search || null,
            },
        } as ApiResponse & { items: any[]; rows: any[] };

        logAdminResponseKeysOnce("GET /api/admin/parents-with-children", responsePayload);
        res.json(responsePayload);
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || "Failed to fetch parents with children",
        } as ApiResponse);
    }
});

/**
 * GET /api/admin/children
 * Returns all children with pagination, filtering, and search.
 * Admin only.
 */
router.get("/children", async (req: Request, res: Response): Promise<void> => {
    try {
        const page = Math.max(parseInt(String(req.query.page ?? "1"), 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "25"), 10) || 25, 1), 100);
        const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

        let query = supabaseAdmin
            .from("children")
            .select(
                `id, 
                first_name, 
                last_name, 
                gender, 
                position, 
                medical_conditions, 
                allergies,
                emergency_contact_name,
                emergency_contact_phone,
                emergency_contact_relationship,
                parent_id,
                parent:profiles(id, full_name, email),
                created_at, 
                updated_at`,
                { count: "exact" }
            );

        // Search by name
        if (search) {
            query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
        }

        // Sort and paginate
        query = query.order("created_at", { ascending: false });
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data: children, count: total, error } = await query.range(from, to);

        if (error) {
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
            return;
        }

        const responsePayload = {
            success: true,
            data: children || [],
            items: children || [],
            rows: children || [],
            meta: {
                page,
                limit,
                total: total || 0,
                totalPages: Math.ceil((total || 0) / limit),
                hasNextPage: page * limit < (total || 0),
                hasPrevPage: page > 1,
                search: search || null,
            },
        } as ApiResponse & { items: any[]; rows: any[] };

        logAdminResponseKeysOnce("GET /api/admin/children", responsePayload);
        res.json(responsePayload);
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || "Failed to fetch children",
        } as ApiResponse);
    }
});

/**
 * GET /api/admin/children/count
 * Returns total children count for admin dashboard cards.
 * Admin only.
 */
router.get("/children/count", async (_req: Request, res: Response): Promise<void> => {
    const { count, error } = await supabaseAdmin
        .from("children")
        .select("id", { count: "exact", head: true });

    if (error) {
        res.status(500).json({ success: false, error: error.message } as ApiResponse);
        return;
    }

    res.json({
        success: true,
        data: { totalChildren: count || 0 },
    } as ApiResponse);
});

export default router;
