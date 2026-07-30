import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { authenticate, authorize } from "../middleware/auth";
import { getMissingFields, isValidUUID } from "../utils/validation";
import { ApiResponse, CreateReportDTO } from "../types";

const router = Router();

router.use(authenticate);

/**
 * GET /api/reports
 * List all reports (admin only).
 * Optional query: ?type=incident|feedback|general
 */
router.get(
    "/",
    authorize("admin"),
    async (req: Request, res: Response): Promise<void> => {
        let query = supabaseAdmin
            .from("reports")
            .select(
                "*, author:profiles!created_by(id, full_name), child:children(id, first_name, last_name), game:games(id, game_date, game_type)"
            );

        if (req.query.type && typeof req.query.type === "string") {
            query = query.eq("report_type", req.query.type);
        }

        const { data, error } = await query.order("created_at", { ascending: false });

        if (error) {
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
            return;
        }

        res.json({ success: true, data } as ApiResponse);
    }
);

/**
 * GET /api/reports/:id
 * Get a single report (admin only).
 */
router.get(
    "/:id",
    authorize("admin"),
    async (req: Request, res: Response): Promise<void> => {
        if (!isValidUUID(req.params.id)) {
            res.status(400).json({ success: false, error: "Invalid report ID" } as ApiResponse);
            return;
        }

        const { data, error } = await supabaseAdmin
            .from("reports")
            .select(
                "*, author:profiles!created_by(id, full_name, email), child:children(id, first_name, last_name), game:games(id, game_date, game_type, location)"
            )
            .eq("id", req.params.id)
            .single();

        if (error || !data) {
            res.status(404).json({ success: false, error: "Report not found" } as ApiResponse);
            return;
        }

        res.json({ success: true, data } as ApiResponse);
    }
);

/**
 * POST /api/reports
 * Create a report (admin/coach can create).
 * Body: { title, content, report_type, related_child_id?, related_game_id? }
 */
router.post(
    "/",
    authorize("admin", "coach"),
    async (req: Request, res: Response): Promise<void> => {
        const missing = getMissingFields(req.body, ["title", "content", "report_type"]);
        if (missing.length > 0) {
            res.status(400).json({
                success: false,
                error: `Missing required fields: ${missing.join(", ")}`,
            } as ApiResponse);
            return;
        }

        const reportData: CreateReportDTO & { created_by: string } = {
            title: req.body.title,
            content: req.body.content,
            report_type: req.body.report_type,
            related_child_id: req.body.related_child_id || null,
            related_game_id: req.body.related_game_id || null,
            created_by: req.userId!,
        };

        const { data, error } = await supabaseAdmin
            .from("reports")
            .insert(reportData)
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
 * PUT /api/reports/:id
 * Update a report (admin only).
 */
router.put(
    "/:id",
    authorize("admin"),
    async (req: Request, res: Response): Promise<void> => {
        if (!isValidUUID(req.params.id)) {
            res.status(400).json({ success: false, error: "Invalid report ID" } as ApiResponse);
            return;
        }

        const { id: _id, created_at: _ca, created_by: _cb, ...updateData } = req.body;

        const { data, error } = await supabaseAdmin
            .from("reports")
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
 * DELETE /api/reports/:id
 * Delete a report (admin only).
 */
router.delete(
    "/:id",
    authorize("admin"),
    async (req: Request, res: Response): Promise<void> => {
        if (!isValidUUID(req.params.id)) {
            res.status(400).json({ success: false, error: "Invalid report ID" } as ApiResponse);
            return;
        }

        const { error } = await supabaseAdmin
            .from("reports")
            .delete()
            .eq("id", req.params.id);

        if (error) {
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
            return;
        }

        res.json({ success: true, message: "Report deleted" } as ApiResponse);
    }
);

export default router;
