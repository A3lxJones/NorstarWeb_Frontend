import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { authenticate, authorize } from "../middleware/auth";
import { getMissingFields, isValidUUID } from "../utils/validation";
import { ApiResponse, CreateAvailabilityRequestDTO, SubmitAvailabilityResponseDTO } from "../types";

const router = Router();

router.use(authenticate);

// ─────────────────────────────────────────────────────────────
// COACH / ADMIN  —  Manage availability requests
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/availability-requests
 * Create a new availability request for a team.
 * Coach/admin only.
 */
router.post(
    "/",
    authorize("coach", "admin"),
    async (req: Request, res: Response): Promise<void> => {
        const missing = getMissingFields(req.body, [
            "team_id",
            "request_type",
            "title",
            "event_date",
        ]);

        if (missing.length > 0) {
            res.status(400).json({
                success: false,
                error: `Missing required fields: ${missing.join(", ")}`,
            } as ApiResponse);
            return;
        }

        if (!isValidUUID(req.body.team_id)) {
            res.status(400).json({ success: false, error: "Invalid team_id" } as ApiResponse);
            return;
        }

        if (req.body.game_id && !isValidUUID(req.body.game_id)) {
            res.status(400).json({ success: false, error: "Invalid game_id" } as ApiResponse);
            return;
        }

        if (!["match", "training"].includes(req.body.request_type)) {
            res.status(400).json({
                success: false,
                error: "request_type must be 'match' or 'training'",
            } as ApiResponse);
            return;
        }

        // Verify the team exists
        const { data: team } = await supabaseAdmin
            .from("teams")
            .select("id")
            .eq("id", req.body.team_id)
            .single();

        if (!team) {
            res.status(404).json({ success: false, error: "Team not found" } as ApiResponse);
            return;
        }

        const requestData: CreateAvailabilityRequestDTO & { created_by: string } = {
            team_id: req.body.team_id,
            game_id: req.body.game_id || null,
            request_type: req.body.request_type,
            title: req.body.title,
            event_date: req.body.event_date,
            event_time: req.body.event_time || null,
            location: req.body.location || null,
            message: req.body.message || null,
            deadline: req.body.deadline || null,
            created_by: req.userId!,
        };

        const { data, error } = await supabaseAdmin
            .from("availability_requests")
            .insert(requestData)
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
 * GET /api/availability-requests
 * List availability requests.
 * - Coaches/admins see all (optionally filtered by team_id, status).
 * - Parents see only requests for teams their children belong to.
 * Optional query: ?team_id=...&status=open|closed
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
    let query = supabaseAdmin
        .from("availability_requests")
        .select(
            "*, team:teams(id, name, age_group), creator:profiles!availability_requests_created_by_fkey(id, full_name)"
        );

    if (req.query.team_id && typeof req.query.team_id === "string") {
        if (!isValidUUID(req.query.team_id)) {
            res.status(400).json({ success: false, error: "Invalid team_id" } as ApiResponse);
            return;
        }
        query = query.eq("team_id", req.query.team_id);
    }

    if (req.query.status && typeof req.query.status === "string") {
        query = query.eq("status", req.query.status);
    }

    const { data, error } = await query.order("event_date", { ascending: true });

    if (error) {
        res.status(500).json({ success: false, error: error.message } as ApiResponse);
        return;
    }

    let filtered = data || [];

    // Parents only see requests for teams their children are registered in
    if (req.userRole === "parent") {
        const { data: registrations } = await supabaseAdmin
            .from("team_registrations")
            .select("team_id, child:children!inner(parent_id)")
            .eq("child.parent_id", req.userId!)
            .eq("status", "approved");

        const parentTeamIds = new Set(
            (registrations || []).map((r: { team_id: string }) => r.team_id)
        );

        filtered = filtered.filter((request: { team_id: string }) =>
            parentTeamIds.has(request.team_id)
        );
    }

    res.json({ success: true, data: filtered } as ApiResponse);
});

/**
 * GET /api/availability-requests/pending
 * Get open requests that the parent's children have NOT yet responded to.
 * Designed for the parent dashboard.
 */
router.get(
    "/pending",
    authorize("parent"),
    async (req: Request, res: Response): Promise<void> => {
        // Get the parent's children
        const { data: children } = await supabaseAdmin
            .from("children")
            .select("id, first_name, last_name")
            .eq("parent_id", req.userId!);

        if (!children || children.length === 0) {
            res.json({ success: true, data: [] } as ApiResponse);
            return;
        }

        const childIds = children.map((c: { id: string }) => c.id);

        // Get teams the children are registered in
        const { data: registrations } = await supabaseAdmin
            .from("team_registrations")
            .select("team_id, child_id")
            .in("child_id", childIds)
            .eq("status", "approved");

        if (!registrations || registrations.length === 0) {
            res.json({ success: true, data: [] } as ApiResponse);
            return;
        }

        const teamIds = [...new Set(registrations.map((r: { team_id: string }) => r.team_id))];

        // Get open requests for those teams
        const { data: requests, error } = await supabaseAdmin
            .from("availability_requests")
            .select(
                "*, team:teams(id, name, age_group), creator:profiles!availability_requests_created_by_fkey(id, full_name)"
            )
            .in("team_id", teamIds)
            .eq("status", "open")
            .order("event_date", { ascending: true });

        if (error) {
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
            return;
        }

        // Get existing responses for these requests from this parent's children
        const requestIds = (requests || []).map((r: { id: string }) => r.id);
        let existingResponses: { request_id: string; child_id: string }[] = [];

        if (requestIds.length > 0) {
            const { data: responses } = await supabaseAdmin
                .from("availability_responses")
                .select("request_id, child_id")
                .in("request_id", requestIds)
                .in("child_id", childIds);

            existingResponses = responses || [];
        }

        // Build a map of which children belong to which teams
        const childTeamMap = new Map<string, string[]>();
        for (const reg of registrations) {
            const existing = childTeamMap.get(reg.team_id) || [];
            existing.push(reg.child_id);
            childTeamMap.set(reg.team_id, existing);
        }

        // For each request, find children that haven't responded yet
        const respondedSet = new Set(
            existingResponses.map((r) => `${r.request_id}:${r.child_id}`)
        );

        const pendingRequests = (requests || [])
            .map((request: { id: string; team_id: string }) => {
                const teamChildren = childTeamMap.get(request.team_id) || [];
                const pendingChildren = teamChildren.filter(
                    (childId) => !respondedSet.has(`${request.id}:${childId}`)
                );

                const pendingChildDetails = children.filter(
                    (c: { id: string }) => pendingChildren.includes(c.id)
                );

                return {
                    ...request,
                    pending_children: pendingChildDetails,
                };
            })
            .filter(
                (request: { pending_children: unknown[] }) =>
                    request.pending_children.length > 0
            );

        res.json({ success: true, data: pendingRequests } as ApiResponse);
    }
);

/**
 * GET /api/availability-requests/:id
 * Get a single availability request with its responses.
 */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
    if (!isValidUUID(req.params.id)) {
        res.status(400).json({ success: false, error: "Invalid request ID" } as ApiResponse);
        return;
    }

    const { data: request, error } = await supabaseAdmin
        .from("availability_requests")
        .select(
            "*, team:teams(id, name, age_group), creator:profiles!availability_requests_created_by_fkey(id, full_name)"
        )
        .eq("id", req.params.id)
        .single();

    if (error || !request) {
        res.status(404).json({ success: false, error: "Availability request not found" } as ApiResponse);
        return;
    }

    // Get responses for this request
    const { data: responses } = await supabaseAdmin
        .from("availability_responses")
        .select("*, child:children(id, first_name, last_name, parent_id)")
        .eq("request_id", req.params.id);

    // Get all children registered (approved) in this team
    const { data: teamRegistrations } = await supabaseAdmin
        .from("team_registrations")
        .select("child:children(id, first_name, last_name, parent_id)")
        .eq("team_id", request.team_id)
        .eq("status", "approved");

    // Build the set of child IDs that have already responded
    const respondedChildIds = new Set(
        (responses || []).map((r: { child: { id: string } | null }) => r.child?.id).filter(Boolean)
    );

    // Pending members = registered children who haven't responded
    const pendingMembers = (teamRegistrations || [])
        .map((reg: any) => reg.child)
        .flat()
        .filter((child: any) => child && !respondedChildIds.has(child.id));

    // For parents, only show their own children's responses
    let filteredResponses = responses || [];
    if (req.userRole === "parent") {
        filteredResponses = filteredResponses.filter(
            (r: { child: { parent_id: string } | null }) =>
                r.child?.parent_id === req.userId
        );
    }

    res.json({
        success: true,
        data: { ...request, responses: filteredResponses, pending_members: pendingMembers },
    } as ApiResponse);
});

/**
 * PUT /api/availability-requests/:id
 * Update an availability request (coach/admin only).
 */
router.put(
    "/:id",
    authorize("coach", "admin"),
    async (req: Request, res: Response): Promise<void> => {
        if (!isValidUUID(req.params.id)) {
            res.status(400).json({ success: false, error: "Invalid request ID" } as ApiResponse);
            return;
        }

        const { id: _id, created_at: _ca, created_by: _cb, ...updateData } = req.body;

        const { data, error } = await supabaseAdmin
            .from("availability_requests")
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
 * DELETE /api/availability-requests/:id
 * Delete an availability request (coach/admin only).
 * Also deletes all associated responses (CASCADE).
 */
router.delete(
    "/:id",
    authorize("coach", "admin"),
    async (req: Request, res: Response): Promise<void> => {
        if (!isValidUUID(req.params.id)) {
            res.status(400).json({ success: false, error: "Invalid request ID" } as ApiResponse);
            return;
        }

        const { error } = await supabaseAdmin
            .from("availability_requests")
            .delete()
            .eq("id", req.params.id);

        if (error) {
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
            return;
        }

        res.json({ success: true, message: "Availability request deleted" } as ApiResponse);
    }
);

// ─────────────────────────────────────────────────────────────
// PARENT  —  Respond to availability requests
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/availability-requests/:id/respond
 * Parent submits availability for one of their children.
 * Body: { child_id, status, reason? }
 * Upserts so a parent can change their response.
 */
router.post(
    "/:id/respond",
    authorize("parent"),
    async (req: Request, res: Response): Promise<void> => {
        if (!isValidUUID(req.params.id)) {
            res.status(400).json({ success: false, error: "Invalid request ID" } as ApiResponse);
            return;
        }

        const missing = getMissingFields(req.body, ["child_id", "status"]);
        if (missing.length > 0) {
            res.status(400).json({
                success: false,
                error: `Missing required fields: ${missing.join(", ")}`,
            } as ApiResponse);
            return;
        }

        if (!isValidUUID(req.body.child_id)) {
            res.status(400).json({ success: false, error: "Invalid child_id" } as ApiResponse);
            return;
        }

        if (!["available", "unavailable", "tentative"].includes(req.body.status)) {
            res.status(400).json({
                success: false,
                error: "status must be 'available', 'unavailable', or 'tentative'",
            } as ApiResponse);
            return;
        }

        // Verify the request exists and is open
        const { data: request } = await supabaseAdmin
            .from("availability_requests")
            .select("id, team_id, status, deadline")
            .eq("id", req.params.id)
            .single();

        if (!request) {
            res.status(404).json({ success: false, error: "Availability request not found" } as ApiResponse);
            return;
        }

        if (request.status === "closed") {
            res.status(400).json({
                success: false,
                error: "This availability request is closed",
            } as ApiResponse);
            return;
        }

        if (request.deadline && new Date(request.deadline) < new Date()) {
            res.status(400).json({
                success: false,
                error: "The deadline for this request has passed",
            } as ApiResponse);
            return;
        }

        // Verify parent owns the child
        const { data: child } = await supabaseAdmin
            .from("children")
            .select("id, parent_id")
            .eq("id", req.body.child_id)
            .single();

        if (!child || child.parent_id !== req.userId) {
            res.status(403).json({
                success: false,
                error: "You can only submit responses for your own children",
            } as ApiResponse);
            return;
        }

        // Verify the child is registered in the team
        const { data: registration } = await supabaseAdmin
            .from("team_registrations")
            .select("id")
            .eq("team_id", request.team_id)
            .eq("child_id", req.body.child_id)
            .eq("status", "approved")
            .single();

        if (!registration) {
            res.status(400).json({
                success: false,
                error: "This child is not registered in the team for this request",
            } as ApiResponse);
            return;
        }

        const responseData: SubmitAvailabilityResponseDTO & {
            request_id: string;
            responded_by: string;
        } = {
            request_id: req.params.id as string,
            child_id: req.body.child_id,
            status: req.body.status,
            reason: req.body.reason || null,
            responded_by: req.userId!,
        };

        // Upsert — allow parent to change their response
        const { data, error } = await supabaseAdmin
            .from("availability_responses")
            .upsert(responseData, {
                onConflict: "request_id,child_id",
            })
            .select("*, child:children(id, first_name, last_name)")
            .single();

        if (error) {
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
            return;
        }

        res.status(201).json({ success: true, data } as ApiResponse);
    }
);

/**
 * GET /api/availability-requests/:id/responses
 * Get all responses for a request.
 * Coaches/admins see all; parents see only their children's.
 */
router.get("/:id/responses", async (req: Request, res: Response): Promise<void> => {
    if (!isValidUUID(req.params.id)) {
        res.status(400).json({ success: false, error: "Invalid request ID" } as ApiResponse);
        return;
    }

    const { data, error } = await supabaseAdmin
        .from("availability_responses")
        .select("*, child:children(id, first_name, last_name, parent_id)")
        .eq("request_id", req.params.id);

    if (error) {
        res.status(500).json({ success: false, error: error.message } as ApiResponse);
        return;
    }

    let filtered = data || [];
    if (req.userRole === "parent") {
        filtered = filtered.filter(
            (r: { child: { parent_id: string } | null }) =>
                r.child?.parent_id === req.userId
        );
    }

    res.json({ success: true, data: filtered } as ApiResponse);
});

export default router;
