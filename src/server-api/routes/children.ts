import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { authenticate, authorize } from "../middleware/auth";
import {
    getMissingFields,
    isValidUUID,
    isNotNumeric,
    isValidPhoneNumber,
    validateAge
} from "../utils/validation";
import { ApiResponse, CreateChildDTO } from "../types";

const router = Router();

/**
 * GET /api/children/setup/teams
 * Get available teams for child creation selection.
 * PUBLIC ENDPOINT - No authentication required.
 * This endpoint allows parents to see teams they can request to join
 * when creating a new child.
 */
router.get("/setup/teams", async (_req: Request, res: Response): Promise<void> => {
    try {
        const { data, error } = await supabaseAdmin
            .from("teams")
            .select("*")
            .order("name");

        if (error) {
            console.error("Teams query error:", JSON.stringify(error, null, 2));
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
        console.error("Unexpected error in /setup/teams:", err);
        res.status(500).json({
            success: false,
            error: "An unexpected error occurred while loading teams"
        } as ApiResponse);
    }
});

// All other children routes require authentication
router.use(authenticate);

const REQUIRED_CHILD_FIELDS = [
    "first_name",
    "last_name",
    "date_of_birth",
    "gender",
    "emergency_contact_name",
    "emergency_contact_phone",
    "emergency_contact_relationship",
];

/**
 * GET /api/children
 * Parents see their own children. Coaches/admins see all.
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
    let query = supabaseAdmin.from("children").select("*");

    // Parents can only see their own children
    if (req.userRole === "parent") {
        query = query.eq("parent_id", req.userId!);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
        res.status(500).json({ success: false, error: error.message } as ApiResponse);
        return;
    }

    res.json({ success: true, data } as ApiResponse);
});

/**
 * GET /api/children/:id
 * Get a single child. Parents can only view their own.
 */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
    if (!isValidUUID(req.params.id)) {
        res.status(400).json({ success: false, error: "Invalid child ID" } as ApiResponse);
        return;
    }

    const { data, error } = await supabaseAdmin
        .from("children")
        .select("*")
        .eq("id", req.params.id)
        .single();

    if (error || !data) {
        res.status(404).json({ success: false, error: "Child not found" } as ApiResponse);
        return;
    }

    // Parents can only see their own children
    if (req.userRole === "parent" && data.parent_id !== req.userId) {
        res.status(403).json({ success: false, error: "Access denied" } as ApiResponse);
        return;
    }

    res.json({ success: true, data } as ApiResponse);
});

/**
 * GET /api/children/:id/registrations
 * Get team registrations for a specific child.
 * Parents can only see their own children's registrations.
 */
router.get("/:id/registrations", async (req: Request, res: Response): Promise<void> => {
    if (!isValidUUID(req.params.id)) {
        res.status(400).json({ success: false, error: "Invalid child ID" } as ApiResponse);
        return;
    }

    // Verify parent owns the child (if parent)
    if (req.userRole === "parent") {
        const { data: child } = await supabaseAdmin
            .from("children")
            .select("parent_id")
            .eq("id", req.params.id)
            .single();

        if (!child || child.parent_id !== req.userId) {
            res.status(403).json({ success: false, error: "Access denied" } as ApiResponse);
            return;
        }
    }

    const { data, error } = await supabaseAdmin
        .from("team_registrations")
        .select("*, team:teams(id, name, age_group)")
        .eq("child_id", req.params.id)
        .order("created_at", { ascending: false });

    if (error) {
        res.status(500).json({ success: false, error: error.message } as ApiResponse);
        return;
    }

    res.json({ success: true, data } as ApiResponse);
});

/**
 * POST /api/children
 * Register a new child (parents only — linked to their account).
 * Validation:
 * - Child must be between 4 and 17 years old
 * - first_name and last_name must not be purely numeric
 * - emergency_contact_phone must be valid phone format
 */
router.post(
    "/",
    authorize("parent", "coach", "admin"),
    async (req: Request, res: Response): Promise<void> => {
        const missing = getMissingFields(req.body, REQUIRED_CHILD_FIELDS);
        if (missing.length > 0) {
            res.status(400).json({
                success: false,
                error: `Missing required fields: ${missing.join(", ")}`,
            } as ApiResponse);
            return;
        }

        // Validate age (must be 4-17)
        const ageError = validateAge(req.body.date_of_birth, 4, 17);
        if (ageError) {
            res.status(400).json({
                success: false,
                error: ageError,
            } as ApiResponse);
            return;
        }

        // Validate first_name is not purely numeric
        if (!isNotNumeric(req.body.first_name)) {
            res.status(400).json({
                success: false,
                error: "First name cannot be purely numeric",
            } as ApiResponse);
            return;
        }

        // Validate last_name is not purely numeric
        if (!isNotNumeric(req.body.last_name)) {
            res.status(400).json({
                success: false,
                error: "Last name cannot be purely numeric",
            } as ApiResponse);
            return;
        }

        // Validate emergency_contact_name is not purely numeric
        if (!isNotNumeric(req.body.emergency_contact_name)) {
            res.status(400).json({
                success: false,
                error: "Emergency contact name cannot be purely numeric",
            } as ApiResponse);
            return;
        }

        // Validate emergency_contact_phone format
        if (!isValidPhoneNumber(req.body.emergency_contact_phone)) {
            res.status(400).json({
                success: false,
                error: "Emergency contact phone must be a valid phone number",
            } as ApiResponse);
            return;
        }

        const childData: CreateChildDTO & { parent_id: string } = {
            ...req.body,
            parent_id: req.userId!,
            photo_consent: req.body.photo_consent ?? false,
        };

        const { data, error } = await supabaseAdmin
            .from("children")
            .insert(childData)
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
 * PUT /api/children/:id
 * Update a child's details. Parents can update their own children only.
 */
router.put("/:id", async (req: Request, res: Response): Promise<void> => {
    if (!isValidUUID(req.params.id)) {
        res.status(400).json({ success: false, error: "Invalid child ID" } as ApiResponse);
        return;
    }

    // Check ownership for parents
    if (req.userRole === "parent") {
        const { data: existing } = await supabaseAdmin
            .from("children")
            .select("parent_id")
            .eq("id", req.params.id)
            .single();

        if (!existing || existing.parent_id !== req.userId) {
            res.status(403).json({ success: false, error: "Access denied" } as ApiResponse);
            return;
        }
    }

    // Strip fields that shouldn't be updated directly
    const { id: _id, parent_id: _pid, created_at: _ca, ...updateData } = req.body;

    const { data, error } = await supabaseAdmin
        .from("children")
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
 * PATCH /api/children/:id/team-details
 * Coaches can update the player type for children in their team.
 * Admins can update any child.
 * Body: { position?: "player" | "goalie" }
 */
router.patch(
    "/:id/team-details",
    authorize("coach", "admin"),
    async (req: Request, res: Response): Promise<void> => {
        if (!isValidUUID(req.params.id)) {
            res.status(400).json({ success: false, error: "Invalid child ID" } as ApiResponse);
            return;
        }

        const { position } = req.body;

        // Validate that a field is provided
        if (position === undefined) {
            res.status(400).json({
                success: false,
                error: "position must be provided",
            } as ApiResponse);
            return;
        }

        // Coaches must verify the child is in one of their teams
        if (req.userRole === "coach") {
            const { data: registration } = await supabaseAdmin
                .from("team_registrations")
                .select("id, team:teams!inner(coach_id)")
                .eq("child_id", req.params.id)
                .eq("status", "approved")
                .eq("team.coach_id", req.userId!)
                .limit(1)
                .maybeSingle();

            if (!registration) {
                res.status(403).json({
                    success: false,
                    error: "You can only update children in your own team",
                } as ApiResponse);
                return;
            }
        }

        // Build the update payload (only allowed fields)
        const updatePayload: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };
        if (position !== undefined) updatePayload.position = position;

        const { data, error } = await supabaseAdmin
            .from("children")
            .update(updatePayload)
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
 * DELETE /api/children/:id
 * Remove a child record. Parents delete their own; admins can delete any.
 */
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
    if (!isValidUUID(req.params.id)) {
        res.status(400).json({ success: false, error: "Invalid child ID" } as ApiResponse);
        return;
    }

    if (req.userRole === "parent") {
        const { data: existing } = await supabaseAdmin
            .from("children")
            .select("parent_id")
            .eq("id", req.params.id)
            .single();

        if (!existing || existing.parent_id !== req.userId) {
            res.status(403).json({ success: false, error: "Access denied" } as ApiResponse);
            return;
        }
    }

    const { error } = await supabaseAdmin
        .from("children")
        .delete()
        .eq("id", req.params.id);

    if (error) {
        res.status(500).json({ success: false, error: error.message } as ApiResponse);
        return;
    }

    res.json({ success: true, message: "Child record deleted" } as ApiResponse);
});

export default router;
