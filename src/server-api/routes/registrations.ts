import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { authenticate } from "../middleware/auth";
import { ApiResponse } from "../types";

const router = Router();

router.use(authenticate);

/**
 * POST /api/registrations
 * Body: registration fields (see validation below)
 * Inserts into player_registrations and creates notification rows for coaches/managers.
 */
router.post("/", async (req: Request, res: Response): Promise<void> => {
    try {
        const submitterId = req.userId!;
        const submitterEmail = req.userEmail || null;

        // Honeypot check
        if (req.body.website) {
            res.status(200).json({ success: true, data: null } as ApiResponse);
            return;
        }

        // Basic validation and sanitisation
        const player_email = typeof req.body.player_email === "string" ? req.body.player_email.trim().slice(0, 254) : null;
        const player_name = typeof req.body.player_name === "string" ? req.body.player_name.trim().slice(0, 200) : null;
        const player_dob = req.body.player_dob || null; // expect YYYY-MM-DD

        if (!player_email || !player_name || !player_dob) {
            res.status(400).json({ success: false, error: "player_email, player_name and player_dob are required" } as ApiResponse);
            return;
        }

        // Map boolean inputs
        function toBool(v: any) { return v === true || v === "true" || v === "on" || v === "yes" || v === 1 || v === "1"; }

        const payload = {
            submitter_id: submitterId,
            submitter_email: submitterEmail,
            player_email,
            player_name,
            player_dob,
            nominated_person_email: (req.body.nominated_person_email || null) as string | null,
            nominated_person_name: (req.body.nominated_person_name || null) as string | null,
            nominated_person_relationship: (req.body.nominated_person_relationship || null) as string | null,
            nominated_person_address: (req.body.nominated_person_address || null) as string | null,
            nominated_person_phone: (req.body.nominated_person_phone || null) as string | null,
            emergency_contact_name: (req.body.emergency_contact_name || null) as string | null,
            emergency_contact_phone: (req.body.emergency_contact_phone || null) as string | null,
            emergency_contact_relationship: (req.body.emergency_contact_relationship || null) as string | null,
            ice_hockey_experience: req.body.ice_hockey_experience ? toBool(req.body.ice_hockey_experience) : null,
            gp: (req.body.gp || null) as string | null,
            medical_conditions: (req.body.medical_conditions || null) as string | null,
            dietary_requirements: (req.body.dietary_requirements || null) as string | null,
            allergies: (req.body.allergies || null) as string | null,
            photo_permission: req.body.photo_permission ? toBool(req.body.photo_permission) : null,
            inform_club_secretary: req.body.inform_club_secretary ? toBool(req.body.inform_club_secretary) : null,
            medical_permission: req.body.medical_permission ? toBool(req.body.medical_permission) : null,
            emergency_hospital_treatment: req.body.emergency_hospital_treatment ? toBool(req.body.emergency_hospital_treatment) : null,
            policies_ack: req.body.policies_ack ? toBool(req.body.policies_ack) : null,
            parental_consent: req.body.parental_consent ? toBool(req.body.parental_consent) : null,
            other_medical: (req.body.other_medical || null) as string | null,
            meta: {
                ip: req.ip,
                user_agent: req.get("user-agent") || null,
            },
        } as Record<string, unknown>;

        // Insert registration (use admin client)
        const { data: inserted, error: insertError } = await supabaseAdmin
            .from("player_registrations")
            .insert(payload)
            .select("id, player_name, player_email, created_at")
            .single();

        if (insertError || !inserted) {
            console.error("Registration insert error:", insertError);
            res.status(500).json({ success: false, error: insertError?.message || "Failed to save registration" } as ApiResponse);
            return;
        }

        // Notify coaches/managers: find recipients (profiles.role = 'coach') and team_managers
        const { data: coaches } = await supabaseAdmin.from("profiles").select("email").eq("role", "coach");
        const { data: managers } = await supabaseAdmin.from("team_managers").select("email");

        const recipients = new Set<string>();
        if (Array.isArray(coaches)) {
            for (const c of coaches) if ((c as any).email) recipients.add((c as any).email);
        }
        if (Array.isArray(managers)) {
            for (const m of managers) if ((m as any).email) recipients.add((m as any).email);
        }

        const recipientArray = Array.from(recipients);
        if (recipientArray.length > 0) {
            const notifications = recipientArray.map((email) => ({
                registration_id: (inserted as any).id,
                recipient_email: email,
                payload: {
                    registration: {
                        id: (inserted as any).id,
                        player_name: (inserted as any).player_name,
                        player_email: (inserted as any).player_email,
                        created_at: (inserted as any).created_at,
                    },
                },
            }));

            const { error: notifError } = await supabaseAdmin.from("registration_notifications").insert(notifications);
            if (notifError) {
                console.error("Failed to create notifications:", notifError);
                // not fatal — continue
            }
        }

        res.json({ success: true, data: inserted } as ApiResponse);
    } catch (err) {
        console.error("/api/registrations error:", err);
        res.status(500).json({ success: false, error: "Server error" } as ApiResponse);
    }
});

export default router;
