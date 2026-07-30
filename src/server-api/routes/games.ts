import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { authenticate, authorize } from "../middleware/auth";
import { getMissingFields, isValidUUID } from "../utils/validation";
import { ApiResponse, CreateGameDTO } from "../types";

const router = Router();

router.use(authenticate);

/**
 * GET /api/games
 * List games. Optional query params: ?team_id=...&status=...&type=...
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
    let query = supabaseAdmin
        .from("games")
        .select("*, home_team:teams!home_team_id(id, name), away_team:teams!away_team_id(id, name)");

    if (req.query.team_id && typeof req.query.team_id === "string") {
        query = query.or(`home_team_id.eq.${req.query.team_id},away_team_id.eq.${req.query.team_id}`);
    }

    if (req.query.status && typeof req.query.status === "string") {
        query = query.eq("status", req.query.status);
    }

    if (req.query.type && typeof req.query.type === "string") {
        query = query.eq("game_type", req.query.type);
    }

    const { data, error } = await query.order("game_date", { ascending: true });

    if (error) {
        res.status(500).json({ success: false, error: error.message } as ApiResponse);
        return;
    }

    res.json({ success: true, data } as ApiResponse);
});

/**
 * GET /api/games/:id
 * Get a single game with availability info.
 */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
    if (!isValidUUID(req.params.id)) {
        res.status(400).json({ success: false, error: "Invalid game ID" } as ApiResponse);
        return;
    }

    const { data: game, error } = await supabaseAdmin
        .from("games")
        .select("*, home_team:teams!home_team_id(id, name), away_team:teams!away_team_id(id, name)")
        .eq("id", req.params.id)
        .single();

    if (error || !game) {
        res.status(404).json({ success: false, error: "Game not found" } as ApiResponse);
        return;
    }

    // Also fetch availability for this game
    const { data: availability } = await supabaseAdmin
        .from("availability")
        .select("*, child:children(id, first_name, last_name)")
        .eq("game_id", req.params.id);

    res.json({ success: true, data: { ...game, availability: availability || [] } } as ApiResponse);
});

/**
 * POST /api/games
 * Create a new game/match/training session (coach/admin only).
 */
router.post(
    "/",
    authorize("admin", "coach"),
    async (req: Request, res: Response): Promise<void> => {
        const missing = getMissingFields(req.body, [
            "home_team_id",
            "location",
            "game_date",
            "game_time",
            "game_type",
        ]);

        if (missing.length > 0) {
            res.status(400).json({
                success: false,
                error: `Missing required fields: ${missing.join(", ")}`,
            } as ApiResponse);
            return;
        }

        const gameData: CreateGameDTO = {
            home_team_id: req.body.home_team_id,
            away_team_id: req.body.away_team_id || null,
            opponent_name: req.body.opponent_name || null,
            location: req.body.location,
            game_date: req.body.game_date,
            game_time: req.body.game_time,
            game_type: req.body.game_type,
            notes: req.body.notes || null,
        };

        const { data, error } = await supabaseAdmin
            .from("games")
            .insert({ ...gameData, status: "scheduled" })
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
 * PUT /api/games/:id
 * Update game details (coach/admin only).
 */
router.put(
    "/:id",
    authorize("admin", "coach"),
    async (req: Request, res: Response): Promise<void> => {
        if (!isValidUUID(req.params.id)) {
            res.status(400).json({ success: false, error: "Invalid game ID" } as ApiResponse);
            return;
        }

        const { id: _id, created_at: _ca, ...updateData } = req.body;

        const { data, error } = await supabaseAdmin
            .from("games")
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
 * PATCH /api/games/:id/score
 * Update game score (coach/admin only).
 * Body: { home_score, away_score }
 */
router.patch(
    "/:id/score",
    authorize("admin", "coach"),
    async (req: Request, res: Response): Promise<void> => {
        if (!isValidUUID(req.params.id)) {
            res.status(400).json({ success: false, error: "Invalid game ID" } as ApiResponse);
            return;
        }

        const { home_score, away_score } = req.body;

        if (typeof home_score !== "number" || typeof away_score !== "number") {
            res.status(400).json({
                success: false,
                error: "home_score and away_score must be numbers",
            } as ApiResponse);
            return;
        }

        const { data, error } = await supabaseAdmin
            .from("games")
            .update({
                home_score,
                away_score,
                status: "completed",
                updated_at: new Date().toISOString(),
            })
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
 * DELETE /api/games/:id
 * Delete a game (admin only).
 */
router.delete(
    "/:id",
    authorize("admin"),
    async (req: Request, res: Response): Promise<void> => {
        if (!isValidUUID(req.params.id)) {
            res.status(400).json({ success: false, error: "Invalid game ID" } as ApiResponse);
            return;
        }

        const { error } = await supabaseAdmin
            .from("games")
            .delete()
            .eq("id", req.params.id);

        if (error) {
            res.status(500).json({ success: false, error: error.message } as ApiResponse);
            return;
        }

        res.json({ success: true, message: "Game deleted" } as ApiResponse);
    }
);

export default router;
