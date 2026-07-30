import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { authenticate, authorize } from "../middleware/auth";
import { getMissingFields, isValidUUID } from "../utils/validation";
import { ApiResponse, CreateDrillDTO, DrillsListResponse } from "../types";

const router = Router();

router.use(authenticate);

/** Ensure a value is a string[]. Handles text columns returned as plain strings. */
const ARRAY_FIELDS = ["equipment", "objectives", "instructions", "coaching_points", "variations", "suitable_for"] as const;

function toStringArray(value: unknown, delimiter = ", "): string[] {
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
    if (typeof value === "string" && value.length > 0) return value.split(delimiter).map(s => s.trim()).filter(Boolean);
    return [];
}

function normalizeDrill<T extends Record<string, unknown>>(drill: T): T {
    const result = { ...drill };
    for (const field of ARRAY_FIELDS) {
        if (field in result) {
            result[field as keyof T] = toStringArray(
                result[field as keyof T],
                field === "instructions" ? ". " : ", "
            ) as T[keyof T];
        }
    }
    return result;
}

/**
 * GET /api/drills
 * List drills with filtering, search & pagination.
 * Query params: ?category=...&difficulty=...&age_group=...&search=...&page=1&limit=24
 * Returns: { success, data: { drills, total, categories, difficulties, age_groups } }
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
    const category = (req.query.category as string) || "";
    const difficulty = (req.query.difficulty as string) || "";
    const ageGroup = (req.query.age_group as string) || "";
    const search = (req.query.search as string) || "";
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 24));
    const offset = (page - 1) * limit;

    // ── Build filtered query ────────────────────────────────
    let query = supabaseAdmin.from("drills").select("*", { count: "exact" });

    if (category) {
        query = query.eq("category", category);
    }
    if (difficulty) {
        query = query.eq("difficulty", difficulty);
    }
    if (ageGroup) {
        query = query.contains("suitable_for", [ageGroup]);
    }
    if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: drills, count, error } = await query
        .order("name", { ascending: true })
        .range(offset, offset + limit - 1);

    if (error) {
        res.status(500).json({ success: false, error: error.message } as ApiResponse);
        return;
    }

    const normalizedDrills = (drills || []).map(normalizeDrill);

    // ── Aggregate filter options (from ALL drills, unfiltered) ──
    const { data: allDrills } = await supabaseAdmin
        .from("drills")
        .select("category, difficulty, suitable_for");

    const categories = [...new Set((allDrills || []).map((d) => d.category).filter(Boolean))].sort();
    const difficulties = [...new Set((allDrills || []).map((d) => d.difficulty).filter(Boolean))].sort();
    const ageGroups = [
        ...new Set((allDrills || []).flatMap((d) => d.suitable_for || []).filter(Boolean)),
    ].sort();

    const responseData: DrillsListResponse = {
        drills: normalizedDrills,
        total: count ?? 0,
        categories,
        difficulties,
        age_groups: ageGroups,
    };

    res.json({ success: true, data: responseData } as ApiResponse<DrillsListResponse>);
});

/**
 * GET /api/drills/:id
 * Get a single drill by ID.
 */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
    if (!isValidUUID(req.params.id)) {
        res.status(400).json({ success: false, error: "Invalid drill ID" } as ApiResponse);
        return;
    }

    const { data: drill, error } = await supabaseAdmin
        .from("drills")
        .select("*")
        .eq("id", req.params.id)
        .single();

    if (error || !drill) {
        res.status(404).json({ success: false, error: "Drill not found" } as ApiResponse);
        return;
    }

    res.json({ success: true, data: normalizeDrill(drill) } as ApiResponse);
});

/**
 * POST /api/drills
 * Create a new drill (coach/admin only).
 */
router.post(
    "/",
    authorize("admin", "coach"),
    async (req: Request, res: Response): Promise<void> => {
        const missing = getMissingFields(req.body, ["name"]);

        if (missing.length > 0) {
            res.status(400).json({
                success: false,
                error: `Missing required fields: ${missing.join(", ")}`,
            } as ApiResponse);
            return;
        }

        const drillData: CreateDrillDTO & { created_by: string } = {
            name: req.body.name,
            category: req.body.category || "General",
            difficulty: req.body.difficulty || "Beginner",
            duration_minutes: req.body.duration_minutes || 15,
            min_players: req.body.min_players || 2,
            max_players: req.body.max_players || 20,
            equipment: toStringArray(req.body.equipment),
            description: req.body.description || null,
            objectives: toStringArray(req.body.objectives),
            setup: req.body.setup || null,
            instructions: toStringArray(req.body.instructions),
            coaching_points: toStringArray(req.body.coaching_points),
            variations: toStringArray(req.body.variations),
            suitable_for: toStringArray(req.body.suitable_for),
            team_id: req.body.team_id || null,
            created_by: req.userId!,
        };

        const { data, error } = await supabaseAdmin
            .from("drills")
            .insert(drillData)
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
 * PUT /api/drills/:id
 * Update a drill (coach/admin only).
 */
router.put(
    "/:id",
    authorize("admin", "coach"),
    async (req: Request, res: Response): Promise<void> => {
        if (!isValidUUID(req.params.id)) {
            res.status(400).json({ success: false, error: "Invalid drill ID" } as ApiResponse);
            return;
        }

        const { id: _id, created_at: _ca, created_by: _cb, ...updateData } = req.body;

        const { data, error } = await supabaseAdmin
            .from("drills")
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
 * DELETE /api/drills/:id
 * Delete a drill (admin/coach only).
 */
router.delete(
    "/:id",
    authorize("admin", "coach"),
    async (req: Request, res: Response): Promise<void> => {
        if (!isValidUUID(req.params.id)) {
            res.status(400).json({ success: false, error: "Invalid drill ID" } as ApiResponse);
            return;
        }

        const { error } = await supabaseAdmin
            .from("drills")
            .delete()
            .eq("id", req.params.id);

        if (error) {
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
            return;
        }

        res.json({ success: true, message: "Drill deleted" } as ApiResponse);
    }
);

export default router;
