import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { authenticate, authorize } from "../middleware/auth";
import { getMissingFields, isValidUUID } from "../utils/validation";
import { ApiResponse } from "../types";

const router = Router();

/**
 * GET /api/teams/public/list
 * List all teams publicly (no authentication required).
 * Used for child registration/team selection during signup.
 */
router.get("/public/list", async (_req: Request, res: Response): Promise<void> => {
    try {
        const { data, error } = await supabaseAdmin
            .from("teams")
            .select("*")
            .order("name");

        if (error) {
            console.error("Public teams query error:", JSON.stringify(error, null, 2));
            res.status(500).json({
                success: false,
                error: `Failed to load teams: ${error.message}`
            } as ApiResponse);
            return;
        }

        if (!data) {
            res.json({ success: true, data: [] } as ApiResponse);
            return;
        }

        res.json({ success: true, data } as ApiResponse);
    } catch (err) {
        console.error("Unexpected error in /public/list:", err);
        res.status(500).json({
            success: false,
            error: "An unexpected error occurred while loading teams"
        } as ApiResponse);
    }
});

// All other team routes require authentication
router.use(authenticate);

/**
 * GET /api/teams
 * List all teams. Everyone can see teams.
 */
router.get("/", async (_req: Request, res: Response): Promise<void> => {
    const { data, error } = await supabaseAdmin
        .from("teams")
        .select("*, coach:profiles(id, full_name, email)")
        .order("name");

    if (error) {
        res.status(500).json({ success: false, error: error.message } as ApiResponse);
        return;
    }

    res.json({ success: true, data } as ApiResponse);
});

/**
 * GET /api/teams/:id
 * Get a single team with its registered children.
 */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
    if (!isValidUUID(req.params.id)) {
        res.status(400).json({ success: false, error: "Invalid team ID" } as ApiResponse);
        return;
    }

    const { data: team, error } = await supabaseAdmin
        .from("teams")
        .select("*, coach:profiles(id, full_name, email)")
        .eq("id", req.params.id)
        .single();

    if (error || !team) {
        res.status(404).json({ success: false, error: "Team not found" } as ApiResponse);
        return;
    }

    // Fetch approved members
    const { data: approved } = await supabaseAdmin
        .from("team_registrations")
        .select("*, child:children(id, first_name, last_name, date_of_birth, skill_level, position), registered_by_profile:profiles!team_registrations_registered_by_fkey(id, full_name, email)")
        .eq("team_id", req.params.id)
        .eq("status", "approved");

    // Fetch pending registrations (visible to coaches/admins, or to the parent who submitted)
    let pending: typeof approved = [];
    if (req.userRole === "coach" || req.userRole === "admin") {
        const { data } = await supabaseAdmin
            .from("team_registrations")
            .select("*, child:children(id, first_name, last_name, date_of_birth, skill_level, position), registered_by_profile:profiles!team_registrations_registered_by_fkey(id, full_name, email)")
            .eq("team_id", req.params.id)
            .eq("status", "pending");
        pending = data || [];
    } else if (req.userRole === "parent") {
        const { data } = await supabaseAdmin
            .from("team_registrations")
            .select("*, child:children(id, first_name, last_name, date_of_birth, skill_level, position), registered_by_profile:profiles!team_registrations_registered_by_fkey(id, full_name, email)")
            .eq("team_id", req.params.id)
            .eq("status", "pending")
            .eq("registered_by", req.userId!);
        pending = data || [];
    }

    res.json({
        success: true,
        data: {
            ...team,
            members: approved || [],
            pendingRegistrations: pending || [],
        },
    } as ApiResponse);
});

/**
 * GET /api/teams/:id/registrations
 * Get all registrations for a team (coaches/admins see all, parents see their own).
 * Supports ?status=pending|approved|rejected filter.
 */
router.get("/:id/registrations", async (req: Request, res: Response): Promise<void> => {
    if (!isValidUUID(req.params.id)) {
        res.status(400).json({ success: false, error: "Invalid team ID" } as ApiResponse);
        return;
    }

    let query = supabaseAdmin
        .from("team_registrations")
        .select("*, child:children(id, first_name, last_name, date_of_birth, skill_level, position), registered_by_profile:profiles!team_registrations_registered_by_fkey(id, full_name, email)")
        .eq("team_id", req.params.id);

    // Filter by status if provided
    const statusFilter = req.query.status as string | undefined;
    if (statusFilter && ["pending", "approved", "rejected"].includes(statusFilter)) {
        query = query.eq("status", statusFilter);
    }

    // Parents can only see their own children's registrations
    if (req.userRole === "parent") {
        query = query.eq("registered_by", req.userId!);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
        res.status(500).json({ success: false, error: error.message } as ApiResponse);
        return;
    }

    res.json({ success: true, data } as ApiResponse);
});

/**
 * POST /api/teams
 * Create a new team (admin/coach only).
 * Validation:
 * - Team name is required
 * - Age group cannot contain negative numbers
 */
router.post(
    "/",
    authorize("admin", "coach"),
    async (req: Request, res: Response): Promise<void> => {
        const missing = getMissingFields(req.body, ["name", "age_group"]);
        if (missing.length > 0) {
            res.status(400).json({
                success: false,
                error: `Missing required fields: ${missing.join(", ")}`,
            } as ApiResponse);
            return;
        }

        // Validate age_group doesn't contain negative numbers
        const ageGroupStr = String(req.body.age_group).trim();
        if (ageGroupStr.startsWith("-") || parseInt(ageGroupStr) < 0) {
            res.status(400).json({
                success: false,
                error: "Age group cannot be a negative number",
            } as ApiResponse);
            return;
        }

        const { data, error } = await supabaseAdmin
            .from("teams")
            .insert({
                name: req.body.name,
                age_group: req.body.age_group,
                coach_id: req.body.coach_id || (req.userRole === "coach" ? req.userId : null),
            })
            .select()
            .single();

        if (error) {
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
            return;
        }

        res.status(201).json({ success: true, data } as ApiResponse);
    }
);

/**
 * POST /api/teams/:id/register
 * Register a child for a team.
 * - Parents: submit their own children (status = pending, needs coach/admin approval).
 * - Coaches/Admins: can register any child (status = approved immediately).
 * Body: { child_id }
 */
router.post(
    "/:id/register",
    authorize("parent", "coach", "admin"),
    async (req: Request, res: Response): Promise<void> => {
        if (!isValidUUID(req.params.id) || !isValidUUID(req.body.child_id)) {
            res.status(400).json({ success: false, error: "Invalid team or child ID" } as ApiResponse);
            return;
        }

        // Verify parent owns the child (parents only)
        if (req.userRole === "parent") {
            const { data: child } = await supabaseAdmin
                .from("children")
                .select("parent_id")
                .eq("id", req.body.child_id)
                .single();

            if (!child || child.parent_id !== req.userId) {
                res.status(403).json({ success: false, error: "You can only register your own children" } as ApiResponse);
                return;
            }
        }

        // Check for existing registration
        const { data: existing } = await supabaseAdmin
            .from("team_registrations")
            .select("id")
            .eq("team_id", req.params.id)
            .eq("child_id", req.body.child_id)
            .maybeSingle();

        if (existing) {
            res.status(409).json({ success: false, error: "Child is already registered for this team" } as ApiResponse);
            return;
        }

        // Coaches/admins auto-approve; parents go to pending
        const initialStatus = req.userRole === "parent" ? "pending" : "approved";

        const { data, error } = await supabaseAdmin
            .from("team_registrations")
            .insert({
                team_id: req.params.id,
                child_id: req.body.child_id,
                registered_by: req.userId,
                status: initialStatus,
            })
            .select()
            .single();

        if (error) {
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
            return;
        }

        const message = initialStatus === "pending"
            ? "Registration submitted for approval"
            : "Child registered and approved";

        res.status(201).json({ success: true, data, message } as ApiResponse);
    }
);

/**
 * PATCH /api/teams/registrations/:id/approve
 * Approve or reject a team registration (coach/admin only).
 * Body: { status: "approved" | "rejected" }
 */
router.patch(
    "/registrations/:id/approve",
    authorize("admin", "coach"),
    async (req: Request, res: Response): Promise<void> => {
        const { status } = req.body;
        if (!["approved", "rejected"].includes(status)) {
            res.status(400).json({ success: false, error: "Status must be 'approved' or 'rejected'" } as ApiResponse);
            return;
        }

        const { data, error } = await supabaseAdmin
            .from("team_registrations")
            .update({ status })
            .eq("id", req.params.id)
            .select()
            .single();

        if (error) {
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
            return;
        }

        res.json({ success: true, data } as ApiResponse);
    }
);

/**
 * PUT /api/teams/:id
 * Update team details (admin/coach only).
 * Validation:
 * - Age group cannot be negative if provided
 */
router.put(
    "/:id",
    authorize("admin", "coach"),
    async (req: Request, res: Response): Promise<void> => {
        if (!isValidUUID(req.params.id)) {
            res.status(400).json({ success: false, error: "Invalid team ID" } as ApiResponse);
            return;
        }

        // Validate age_group if provided
        if (req.body.age_group !== undefined) {
            const ageGroupStr = String(req.body.age_group).trim();
            if (ageGroupStr.startsWith("-") || parseInt(ageGroupStr) < 0) {
                res.status(400).json({
                    success: false,
                    error: "Age group cannot be a negative number",
                } as ApiResponse);
                return;
            }
        }

        const { id: _id, created_at: _ca, ...updateData } = req.body;

        const { data, error } = await supabaseAdmin
            .from("teams")
            .update({ ...updateData, updated_at: new Date().toISOString() })
            .eq("id", req.params.id)
            .select()
            .single();

        if (error) {
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
            return;
        }

        res.json({ success: true, data } as ApiResponse);
    }
);

/**
 * DELETE /api/teams/:id
 * Delete a team (admin only).
 */
router.delete(
    "/:id",
    authorize("admin"),
    async (req: Request, res: Response): Promise<void> => {
        if (!isValidUUID(req.params.id)) {
            res.status(400).json({ success: false, error: "Invalid team ID" } as ApiResponse);
            return;
        }

        const { error } = await supabaseAdmin
            .from("teams")
            .delete()
            .eq("id", req.params.id);

        if (error) {
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
            return;
        }

        res.json({ success: true, message: "Team deleted" } as ApiResponse);
    }
);

/**
 * GET /api/coaches
 * Fetch a list of all coaches for the dropdown/selection UI.
 * Optional query parameter: available_only (boolean)
 * If available_only=true, only return coaches not currently assigned to a team.
 */
router.get(
    "/coaches",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const availableOnly = req.query.available_only === "true";

            // Fetch all coaches
            const { data: coaches, error } = await supabaseAdmin
                .from("profiles")
                .select("id, full_name, email, phone, role")
                .eq("role", "coach");

            if (error) {
                res.status(500).json({ success: false, error: error.message } as ApiResponse);
                return;
            }

            if (!coaches) {
                res.json({ success: true, data: [] } as ApiResponse);
                return;
            }

            // For each coach, fetch their team assignment if any
            const coachesWithTeams = await Promise.all(
                coaches.map(async (coach) => {
                    const { data: teamAssignment } = await supabaseAdmin
                        .from("teams")
                        .select("id")
                        .eq("coach_id", coach.id)
                        .maybeSingle();

                    return {
                        id: coach.id,
                        full_name: coach.full_name,
                        email: coach.email,
                        phone: coach.phone || null,
                        team_id: teamAssignment?.id || null,
                    };
                })
            );

            // Filter to only available coaches if requested
            let result = coachesWithTeams;
            if (availableOnly) {
                result = coachesWithTeams.filter((coach) => coach.team_id === null);
            }

            res.json({ success: true, data: result } as ApiResponse);
        } catch (err) {
            console.error("Unexpected error in GET /coaches:", err);
            res.status(500).json({
                success: false,
                error: "An unexpected error occurred while fetching coaches",
            } as ApiResponse);
        }
    }
);

/**
 * PATCH /api/teams/:teamId/coach
 * Assign or update the coach for a specific team.
 * Body: { coach_id: string | null }
 * coach_id can be null to remove a coach.
 * Admin only.
 */
router.patch(
    "/:teamId/coach",
    authorize("admin"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { teamId } = req.params;
            const { coach_id } = req.body;

            if (!isValidUUID(teamId)) {
                res.status(400).json({ success: false, error: "Invalid team ID" } as ApiResponse);
                return;
            }

            // coach_id can be null or a valid UUID
            if (coach_id !== null && coach_id !== undefined && !isValidUUID(coach_id)) {
                res.status(400).json({ success: false, error: "Invalid coach ID" } as ApiResponse);
                return;
            }

            // Verify team exists
            const { data: team, error: teamError } = await supabaseAdmin
                .from("teams")
                .select("id, name, age_group, coach_id")
                .eq("id", teamId)
                .single();

            if (teamError || !team) {
                res.status(404).json({ success: false, error: "Team not found" } as ApiResponse);
                return;
            }

            // If assigning a coach, verify coach exists and is not already assigned
            if (coach_id !== null && coach_id !== undefined) {
                const { data: coach, error: coachError } = await supabaseAdmin
                    .from("profiles")
                    .select("id, full_name, email, role")
                    .eq("id", coach_id)
                    .single();

                if (coachError || !coach) {
                    res.status(404).json({ success: false, error: "Coach not found" } as ApiResponse);
                    return;
                }

                if (coach.role !== "coach") {
                    res.status(400).json({
                        success: false,
                        error: "Selected user is not a coach",
                    } as ApiResponse);
                    return;
                }

                // Check if coach is already assigned to another team
                const { data: existingAssignment } = await supabaseAdmin
                    .from("teams")
                    .select("id")
                    .eq("coach_id", coach_id)
                    .neq("id", teamId)
                    .maybeSingle();

                if (existingAssignment) {
                    res.status(400).json({
                        success: false,
                        error: "Coach is already assigned to another team",
                    } as ApiResponse);
                    return;
                }
            }

            // Update team with new coach_id
            const { data: updatedTeam, error: updateError } = await supabaseAdmin
                .from("teams")
                .update({
                    coach_id: coach_id || null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", teamId)
                .select("id, name, age_group, coach_id")
                .single();

            if (updateError) {
                res.status(500).json({ success: false, error: updateError.message } as ApiResponse);
                return;
            }

            // If coach_id is set, fetch coach details
            let coachDetails = null;
            if (updatedTeam.coach_id) {
                const { data: coach } = await supabaseAdmin
                    .from("profiles")
                    .select("id, full_name, email")
                    .eq("id", updatedTeam.coach_id)
                    .single();

                coachDetails = coach || null;
            }

            res.json({
                success: true,
                data: {
                    ...updatedTeam,
                    coach: coachDetails,
                },
            } as ApiResponse);
        } catch (err) {
            console.error("Unexpected error in PATCH /teams/:teamId/coach:", err);
            res.status(500).json({
                success: false,
                error: "An unexpected error occurred while assigning coach",
            } as ApiResponse);
        }
    }
);

/**
 * DELETE /api/teams/:teamId/coach
 * Remove the coach from a team.
 * Admin only.
 */
router.delete(
    "/:teamId/coach",
    authorize("admin"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { teamId } = req.params;

            if (!isValidUUID(teamId)) {
                res.status(400).json({ success: false, error: "Invalid team ID" } as ApiResponse);
                return;
            }

            // Verify team exists
            const { data: team, error: teamError } = await supabaseAdmin
                .from("teams")
                .select("id, name, age_group, coach_id")
                .eq("id", teamId)
                .single();

            if (teamError || !team) {
                res.status(404).json({ success: false, error: "Team not found" } as ApiResponse);
                return;
            }

            // Update team to remove coach
            const { data: updatedTeam, error: updateError } = await supabaseAdmin
                .from("teams")
                .update({
                    coach_id: null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", teamId)
                .select("id, name, age_group, coach_id")
                .single();

            if (updateError) {
                res.status(500).json({ success: false, error: updateError.message } as ApiResponse);
                return;
            }

            res.json({
                success: true,
                data: {
                    ...updatedTeam,
                    coach: null,
                },
            } as ApiResponse);
        } catch (err) {
            console.error("Unexpected error in DELETE /teams/:teamId/coach:", err);
            res.status(500).json({
                success: false,
                error: "An unexpected error occurred while removing coach",
            } as ApiResponse);
        }
    }
);

export default router;
