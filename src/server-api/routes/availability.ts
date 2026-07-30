import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { authenticate, authorize } from "../middleware/auth";
import { getMissingFields, isValidUUID } from "../utils/validation";
import { ApiResponse, SubmitAvailabilityDTO } from "../types";

const router = Router();

router.use(authenticate);

/**
 * GET /api/availability
 * Get availability records.
 * Parents see their children's records. Coaches/admins see all.
 * Optional query: ?child_id=...&game_id=...&type=match|training
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
    let query = supabaseAdmin
        .from("availability")
        .select("*, child:children(id, first_name, last_name, parent_id)");

    if (req.query.child_id && typeof req.query.child_id === "string") {
        query = query.eq("child_id", req.query.child_id);
    }

    if (req.query.game_id && typeof req.query.game_id === "string") {
        query = query.eq("game_id", req.query.game_id);
    }

    if (req.query.type && typeof req.query.type === "string") {
        query = query.eq("availability_type", req.query.type);
    }

    const { data, error } = await query.order("event_date", { ascending: true });

    if (error) {
        res.status(500).json({ success: false, error: error.message } as ApiResponse);
        return;
    }

    // Filter for parents — only show their children's availability
    let filtered = data || [];
    if (req.userRole === "parent") {
        filtered = filtered.filter(
            (record: { child: { parent_id: string } | null }) =>
                record.child?.parent_id === req.userId
        );
    }

    res.json({ success: true, data: filtered } as ApiResponse);
});

/**
 * POST /api/availability
 * Submit availability for a child (match or training).
 * Parents submit for their own children.
 */
router.post(
    "/",
    authorize("parent"),
    async (req: Request, res: Response): Promise<void> => {
        const missing = getMissingFields(req.body, [
            "child_id",
            "availability_type",
            "event_date",
            "status",
        ]);

        if (missing.length > 0) {
            res.status(400).json({
                success: false,
                error: `Missing required fields: ${missing.join(", ")}`,
            } as ApiResponse);
            return;
        }

        // Verify parent owns the child
        const { data: child } = await supabaseAdmin
            .from("children")
            .select("parent_id")
            .eq("id", req.body.child_id)
            .single();

        if (!child || child.parent_id !== req.userId) {
            res.status(403).json({
                success: false,
                error: "You can only submit availability for your own children",
            } as ApiResponse);
            return;
        }

        const availabilityData: SubmitAvailabilityDTO & { submitted_by: string } = {
            child_id: req.body.child_id,
            game_id: req.body.game_id || null,
            availability_type: req.body.availability_type,
            event_date: req.body.event_date,
            status: req.body.status,
            reason: req.body.reason || null,
            submitted_by: req.userId!,
        };

        // Upsert — if availability already exists for this child+event, update it
        const { data, error } = await supabaseAdmin
            .from("availability")
            .upsert(availabilityData, {
                onConflict: "child_id,event_date,availability_type",
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
 * PUT /api/availability/:id
 * Update an availability record. Parents update their own children's records only.
 */
router.put("/:id", async (req: Request, res: Response): Promise<void> => {
    if (!isValidUUID(req.params.id)) {
        res.status(400).json({ success: false, error: "Invalid availability ID" } as ApiResponse);
        return;
    }

    // Check ownership for parents
    if (req.userRole === "parent") {
        const { data: record } = await supabaseAdmin
            .from("availability")
            .select("submitted_by")
            .eq("id", req.params.id)
            .single();

        if (!record || record.submitted_by !== req.userId) {
            res.status(403).json({ success: false, error: "Access denied" } as ApiResponse);
            return;
        }
    }

    const { id: _id, created_at: _ca, submitted_by: _sb, ...updateData } = req.body;

    const { data, error } = await supabaseAdmin
        .from("availability")
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq("id", req.params.id)
        .select()
        .single();

    if (error) {
        res.status(500).json({ success: false, error: error.message } as ApiResponse);
        return;
    }

    res.json({ success: true, data } as ApiResponse);
});

/**
 * DELETE /api/availability/:id
 * Delete an availability record (parent for own, admin for any).
 */
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
    if (!isValidUUID(req.params.id)) {
        res.status(400).json({ success: false, error: "Invalid availability ID" } as ApiResponse);
        return;
    }

    if (req.userRole === "parent") {
        const { data: record } = await supabaseAdmin
            .from("availability")
            .select("submitted_by")
            .eq("id", req.params.id)
            .single();

        if (!record || record.submitted_by !== req.userId) {
            res.status(403).json({ success: false, error: "Access denied" } as ApiResponse);
            return;
        }
    }

    const { error } = await supabaseAdmin
        .from("availability")
        .delete()
        .eq("id", req.params.id);

    if (error) {
        res.status(500).json({ success: false, error: error.message } as ApiResponse);
        return;
    }

    res.json({ success: true, message: "Availability record deleted" } as ApiResponse);
});

export default router;
