import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { authenticate, authorize } from "../middleware/auth";
import { getMissingFields, isValidUUID } from "../utils/validation";
import { ApiResponse, CreateCalendarEventDTO } from "../types";

const router = Router();

router.use(authenticate);

const VALID_EVENT_TYPES = ["match", "training", "announcement", "meeting", "social", "other"];

// ─────────────────────────────────────────────────────────────
// GET /api/calendar
// Fetch calendar events for a date range.
// Everyone sees global events (team_id IS NULL).
// Parents also see events for their children's teams.
// Coaches/admins see all.
// Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD&team_id=...
// ─────────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response): Promise<void> => {
    const { from, to, team_id } = req.query;

    let query = supabaseAdmin
        .from("calendar_events")
        .select(
            "*, team:teams(id, name, age_group), creator:profiles!calendar_events_created_by_fkey(id, full_name)"
        );

    // Date range filter
    if (from && typeof from === "string") {
        query = query.gte("event_date", from);
    }
    if (to && typeof to === "string") {
        query = query.lte("event_date", to);
    }

    // Team filter
    if (team_id && typeof team_id === "string") {
        if (!isValidUUID(team_id)) {
            res.status(400).json({ success: false, error: "Invalid team_id" } as ApiResponse);
            return;
        }
        query = query.eq("team_id", team_id);
    }

    const { data, error } = await query.order("event_date", { ascending: true });

    if (error) {
        res.status(500).json({ success: false, error: error.message } as ApiResponse);
        return;
    }

    let filtered = data || [];

    // Parents: show global events + events for their children's teams
    if (req.userRole === "parent") {
        const { data: registrations } = await supabaseAdmin
            .from("team_registrations")
            .select("team_id, child:children!inner(parent_id)")
            .eq("child.parent_id", req.userId!)
            .eq("status", "approved");

        const parentTeamIds = new Set(
            (registrations || []).map((r: { team_id: string }) => r.team_id)
        );

        filtered = filtered.filter(
            (event: { team_id: string | null }) =>
                event.team_id === null || parentTeamIds.has(event.team_id)
        );
    }

    res.json({ success: true, data: filtered } as ApiResponse);
});

// ─────────────────────────────────────────────────────────────
// GET /api/calendar/:id
// Get a single calendar event.
// ─────────────────────────────────────────────────────────────
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
    if (!isValidUUID(req.params.id)) {
        res.status(400).json({ success: false, error: "Invalid event ID" } as ApiResponse);
        return;
    }

    const { data, error } = await supabaseAdmin
        .from("calendar_events")
        .select(
            "*, team:teams(id, name, age_group), creator:profiles!calendar_events_created_by_fkey(id, full_name)"
        )
        .eq("id", req.params.id)
        .single();

    if (error || !data) {
        res.status(404).json({ success: false, error: "Calendar event not found" } as ApiResponse);
        return;
    }

    res.json({ success: true, data } as ApiResponse);
});

// ─────────────────────────────────────────────────────────────
// POST /api/calendar
// Create a manual calendar event. Coach/admin only.
// Omit team_id to make it a global event visible to everyone.
// ─────────────────────────────────────────────────────────────
router.post(
    "/",
    authorize("coach", "admin"),
    async (req: Request, res: Response): Promise<void> => {
        const missing = getMissingFields(req.body, ["title", "event_date", "event_type"]);

        if (missing.length > 0) {
            res.status(400).json({
                success: false,
                error: `Missing required fields: ${missing.join(", ")}`,
            } as ApiResponse);
            return;
        }

        if (!VALID_EVENT_TYPES.includes(req.body.event_type)) {
            res.status(400).json({
                success: false,
                error: `event_type must be one of: ${VALID_EVENT_TYPES.join(", ")}`,
            } as ApiResponse);
            return;
        }

        if (req.body.team_id && !isValidUUID(req.body.team_id)) {
            res.status(400).json({ success: false, error: "Invalid team_id" } as ApiResponse);
            return;
        }

        const eventData: CreateCalendarEventDTO & { source: string; created_by: string } = {
            team_id: req.body.team_id || null,
            title: req.body.title,
            description: req.body.description || null,
            event_date: req.body.event_date,
            event_time: req.body.event_time || null,
            end_time: req.body.end_time || null,
            location: req.body.location || null,
            event_type: req.body.event_type,
            source: "manual",
            created_by: req.userId!,
        };

        const { data, error } = await supabaseAdmin
            .from("calendar_events")
            .insert(eventData)
            .select()
            .single();

        if (error) {
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
            return;
        }

        res.status(201).json({ success: true, data } as ApiResponse);
    }
);

// ─────────────────────────────────────────────────────────────
// PUT /api/calendar/:id
// Update a manual calendar event. Coach/admin only.
// Cannot update auto-generated events (edit the request instead).
// ─────────────────────────────────────────────────────────────
router.put(
    "/:id",
    authorize("coach", "admin"),
    async (req: Request, res: Response): Promise<void> => {
        if (!isValidUUID(req.params.id)) {
            res.status(400).json({ success: false, error: "Invalid event ID" } as ApiResponse);
            return;
        }

        // Prevent editing auto-generated events directly
        const { data: existing } = await supabaseAdmin
            .from("calendar_events")
            .select("source")
            .eq("id", req.params.id)
            .single();

        if (!existing) {
            res.status(404).json({ success: false, error: "Calendar event not found" } as ApiResponse);
            return;
        }

        if (existing.source === "auto") {
            res.status(400).json({
                success: false,
                error: "Cannot edit auto-generated events. Update the availability request instead.",
            } as ApiResponse);
            return;
        }

        if (req.body.event_type && !VALID_EVENT_TYPES.includes(req.body.event_type)) {
            res.status(400).json({
                success: false,
                error: `event_type must be one of: ${VALID_EVENT_TYPES.join(", ")}`,
            } as ApiResponse);
            return;
        }

        const { id: _id, created_at: _ca, created_by: _cb, source: _s, availability_request_id: _ar, ...updateData } = req.body;

        const { data, error } = await supabaseAdmin
            .from("calendar_events")
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

// ─────────────────────────────────────────────────────────────
// DELETE /api/calendar/:id
// Delete a calendar event. Coach/admin only.
// ─────────────────────────────────────────────────────────────
router.delete(
    "/:id",
    authorize("coach", "admin"),
    async (req: Request, res: Response): Promise<void> => {
        if (!isValidUUID(req.params.id)) {
            res.status(400).json({ success: false, error: "Invalid event ID" } as ApiResponse);
            return;
        }

        const { error } = await supabaseAdmin
            .from("calendar_events")
            .delete()
            .eq("id", req.params.id);

        if (error) {
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
            return;
        }

        res.json({ success: true, message: "Calendar event deleted" } as ApiResponse);
    }
);

// ─────────────────────────────────────────────────────────────
// POST /api/calendar/cleanup
// Manually trigger cleanup of past events (older than 1 month).
// Admin only. Also available as a Supabase cron/pg_cron job.
// ─────────────────────────────────────────────────────────────
router.post(
    "/cleanup",
    authorize("admin"),
    async (_req: Request, res: Response): Promise<void> => {
        const { data, error } = await supabaseAdmin.rpc("cleanup_old_calendar_events");

        if (error) {
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
            return;
        }

        res.json({
            success: true,
            message: "Cleanup completed",
            data: { deleted_count: data },
        } as ApiResponse);
    }
);

export default router;
