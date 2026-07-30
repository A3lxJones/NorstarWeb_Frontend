import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { authenticate } from "../middleware/auth";
import { ApiResponse } from "../types";

const router = Router();

router.use(authenticate);

/**
 * GET /api/dashboard
 * Returns role-specific dashboard data.
 *
 * - Parent:  own children, their team registrations, upcoming games
 * - Coach:   teams they coach, pending registrations, upcoming games
 * - Admin:   user counts, all teams, upcoming games, recent reports
 *
 * Supports admin impersonation: send X-View-As-Role header to view
 * the dashboard as a different role (admin only).
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
    // Admin impersonation — allow admin to preview another role's dashboard
    const viewAsRole = req.headers["x-view-as-role"] as string | undefined;
    const effectiveRole =
        req.userRole === "admin" && viewAsRole && ["parent", "coach"].includes(viewAsRole)
            ? viewAsRole
            : req.userRole;

    try {
        if (effectiveRole === "parent") {
            const data = await getParentDashboard(req.userId!);
            res.json({ success: true, data } as ApiResponse);
        } else if (effectiveRole === "coach") {
            const data = await getCoachDashboard(req.userId!);
            res.json({ success: true, data } as ApiResponse);
        } else if (effectiveRole === "admin") {
            const data = await getAdminDashboard();
            res.json({ success: true, data } as ApiResponse);
        } else {
            res.status(403).json({ success: false, error: "Unknown role" } as ApiResponse);
        }
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ success: false, error: "Failed to load dashboard data" } as ApiResponse);
    }
});

// ─── Parent dashboard ───────────────────────────────────────

async function getParentDashboard(userId: string) {
    // 1. Fetch this parent's children
    const { data: children } = await supabaseAdmin
        .from("children")
        .select("*")
        .eq("parent_id", userId)
        .order("first_name");

    const childIds = (children || []).map((c: { id: string }) => c.id);

    // 2. Fetch team registrations for those children
    let registrations: unknown[] = [];
    if (childIds.length > 0) {
        const { data: regs } = await supabaseAdmin
            .from("team_registrations")
            .select("*, team:teams(id, name, age_group), child:children(id, first_name, last_name)")
            .in("child_id", childIds);
        registrations = regs || [];
    }

    // 3. Upcoming games for teams the children are registered in
    const approvedTeamIds = [
        ...new Set(
            (registrations as { status: string; team_id: string }[])
                .filter((r) => r.status === "approved")
                .map((r) => r.team_id)
        ),
    ];

    let upcomingGames: unknown[] = [];
    if (approvedTeamIds.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const { data: games } = await supabaseAdmin
            .from("games")
            .select("*, home_team:teams!games_home_team_id_fkey(id, name)")
            .in("home_team_id", approvedTeamIds)
            .gte("game_date", today)
            .order("game_date", { ascending: true })
            .limit(10);
        upcomingGames = games || [];
    }

    return { children: children || [], registrations, upcomingGames };
}

// ─── Coach dashboard ────────────────────────────────────────

async function getCoachDashboard(userId: string) {
    // 1. Teams this coach manages
    const { data: teams } = await supabaseAdmin
        .from("teams")
        .select("*")
        .eq("coach_id", userId)
        .order("name");

    const teamIds = (teams || []).map((t: { id: string }) => t.id);

    // 2. Pending registrations for those teams
    let pendingRegistrations: unknown[] = [];
    if (teamIds.length > 0) {
        const { data: regs } = await supabaseAdmin
            .from("team_registrations")
            .select("*, team:teams(id, name), child:children(id, first_name, last_name)")
            .in("team_id", teamIds)
            .eq("status", "pending");
        pendingRegistrations = regs || [];
    }

    // 3. Upcoming games
    let upcomingGames: unknown[] = [];
    if (teamIds.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const { data: games } = await supabaseAdmin
            .from("games")
            .select("*, home_team:teams!games_home_team_id_fkey(id, name)")
            .in("home_team_id", teamIds)
            .gte("game_date", today)
            .order("game_date", { ascending: true })
            .limit(10);
        upcomingGames = games || [];
    }

    return { teams: teams || [], pendingRegistrations, upcomingGames };
}

// ─── Admin dashboard ────────────────────────────────────────

async function getAdminDashboard() {
    // 1. User counts by role
    const { data: profiles } = await supabaseAdmin.from("profiles").select("role");
    const userCounts: Record<string, number> = { parent: 0, coach: 0, admin: 0, total: 0 };
    for (const p of profiles || []) {
        userCounts[(p as { role: string }).role] = (userCounts[(p as { role: string }).role] || 0) + 1;
        userCounts.total++;
    }

    // 2. All teams
    const { data: teams } = await supabaseAdmin
        .from("teams")
        .select("*, coach:profiles(id, full_name)")
        .order("name");

    // 3. Upcoming games
    const today = new Date().toISOString().split("T")[0];
    const { data: games } = await supabaseAdmin
        .from("games")
        .select("*, home_team:teams!games_home_team_id_fkey(id, name)")
        .gte("game_date", today)
        .order("game_date", { ascending: true })
        .limit(10);

    // 4. Recent reports
    const { data: reports } = await supabaseAdmin
        .from("reports")
        .select("*, author:profiles!reports_created_by_fkey(id, full_name)")
        .order("created_at", { ascending: false })
        .limit(5);

    return {
        userCounts,
        teams: teams || [],
        teamCount: (teams || []).length,
        upcomingGames: games || [],
        recentReports: reports || [],
    };
}

export default router;
