import { Router, Request, Response } from "express";
import { supabase } from "../config/supabase";
import { supabaseAdmin } from "../config/supabase";
import { isValidEmail, isNonEmptyString } from "../utils/validation";
import { encryptField } from "../utils/encryption";
import { ApiResponse, UserRole } from "../types";

const router = Router();

/**
 * POST /api/auth/signup
 * Register a new user (parent by default).
 * Body: { email, password, full_name, phone?, role? }
 */
router.post("/signup", async (req: Request, res: Response): Promise<void> => {
    const { email, password, full_name, phone, role } = req.body;

    if (!isValidEmail(email) || !isNonEmptyString(password) || !isNonEmptyString(full_name)) {
        res.status(400).json({
            success: false,
            error: "email, password, and full_name are required",
        } as ApiResponse);
        return;
    }

    if (password.length < 8) {
        res.status(400).json({
            success: false,
            error: "Password must be at least 8 characters",
        } as ApiResponse);
        return;
    }

    // Public signup always creates a parent account. Elevated roles (coach, admin)
    // must be granted by an existing admin via the admin API — never self-assigned.
    if (role !== undefined && role !== "parent") {
        res.status(403).json({
            success: false,
            error: "You cannot self-assign this role. Contact an administrator.",
        } as ApiResponse);
        return;
    }

    const userRole: UserRole = "parent";

    // Encrypt once, up front. The values below are handed to Supabase Auth as
    // user metadata because the `handle_new_user` DB trigger seeds the profile
    // row from it — passing ciphertext means the profile is never written in
    // plaintext, not even momentarily.
    const emailEnc = encryptField(email as string);
    const phoneEnc = encryptField((phone || null) as string | null);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name, phone: phoneEnc, email_enc: emailEnc, role: userRole },
        },
    });

    if (error) {
        res.status(400).json({ success: false, error: error.message } as ApiResponse);
        return;
    }

    // Create profile row (the DB trigger also does this, but belt-and-braces)
    if (data.user) {
        await supabaseAdmin.from("profiles").upsert({
            id: data.user.id,
            email: emailEnc,
            full_name,
            phone: phoneEnc,
            role: userRole,
        });
    }

    res.status(201).json({
        success: true,
        message: "Account created. You can now sign in.",
        data: { userId: data.user?.id },
    } as ApiResponse);
});

/**
 * POST /api/auth/login
 * Sign in with email + password. Returns access & refresh tokens.
 * Body: { email, password }
 */
router.post("/login", async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    if (!isValidEmail(email) || !isNonEmptyString(password)) {
        res.status(400).json({
            success: false,
            error: "email and password are required",
        } as ApiResponse);
        return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        res.status(401).json({ success: false, error: "Invalid email or password" } as ApiResponse);
        return;
    }

    res.json({
        success: true,
        data: {
            accessToken: data.session?.access_token,
            refreshToken: data.session?.refresh_token,
            user: {
                id: data.user?.id,
                email: data.user?.email,
                role: data.user?.user_metadata?.role,
            },
        },
    } as ApiResponse);
});

/**
 * POST /api/auth/logout
 * Sign out the current session.
 */
router.post("/logout", async (_req: Request, res: Response): Promise<void> => {
    const { error } = await supabase.auth.signOut();

    if (error) {
        res.status(500).json({ success: false, error: error.message } as ApiResponse);
        return;
    }

    res.json({ success: true, message: "Logged out successfully" } as ApiResponse);
});

/**
 * POST /api/auth/forgot-password
 * Send a password-recovery email.
 * Body: { email }
 */
router.post("/forgot-password", async (req: Request, res: Response): Promise<void> => {
    const { email, redirectTo: bodyRedirectTo } = req.body;

    if (!isValidEmail(email)) {
        res.status(400).json({
            success: false,
            error: "A valid email is required",
        } as ApiResponse);
        return;
    }

    // Use env var first, fall back to request body if it matches allowed origin
    let redirectTo = process.env.PASSWORD_RESET_REDIRECT_URL;
    if (!redirectTo && bodyRedirectTo) {
        const allowedOrigin = process.env.CORS_ORIGIN || "";
        if (typeof bodyRedirectTo === "string" && bodyRedirectTo.startsWith(allowedOrigin)) {
            redirectTo = bodyRedirectTo;
        }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        ...(redirectTo ? { redirectTo } : {}),
    });

    if (error) {
        res.status(500).json({ success: false, error: error.message } as ApiResponse);
        return;
    }

    // Always return success to prevent email enumeration
    res.json({
        success: true,
        message: "If that email exists, a password reset link has been sent.",
    } as ApiResponse);
});

/**
 * POST /api/auth/exchange-recovery-code
 * Exchange a PKCE recovery code for an access token.
 * Body: { code }
 */
router.post("/exchange-recovery-code", async (req: Request, res: Response): Promise<void> => {
    const { code } = req.body;

    if (!isNonEmptyString(code)) {
        res.status(400).json({ success: false, error: "code is required" } as ApiResponse);
        return;
    }

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.session) {
        res.status(400).json({
            success: false,
            error: error?.message || "Invalid or expired recovery code",
        } as ApiResponse);
        return;
    }

    res.json({
        success: true,
        data: { accessToken: data.session.access_token },
    } as ApiResponse);
});

/**
 * POST /api/auth/reset-password
 * Set a new password using the access token from the recovery link.
 * Headers: Authorization: Bearer <access_token from recovery link>
 * Body: { password }
 */
router.post("/reset-password", async (req: Request, res: Response): Promise<void> => {
    const { password } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
            success: false,
            error: "Access token is required",
        } as ApiResponse);
        return;
    }

    if (!isNonEmptyString(password) || password.length < 8) {
        res.status(400).json({
            success: false,
            error: "Password must be at least 8 characters",
        } as ApiResponse);
        return;
    }

    const token = authHeader.split(" ")[1];

    // Verify the recovery token and get the user
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
        res.status(401).json({
            success: false,
            error: "Invalid or expired reset token",
        } as ApiResponse);
        return;
    }

    // Use admin API to update the password (avoids AuthSessionMissingError)
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
        userData.user.id,
        { password }
    );

    if (error) {
        res.status(400).json({ success: false, error: error.message } as ApiResponse);
        return;
    }

    res.json({
        success: true,
        message: "Password has been reset successfully",
    } as ApiResponse);
});

/**
 * POST /api/auth/refresh
 * Refresh an expired access token.
 * Body: { refresh_token }
 */
router.post("/refresh", async (req: Request, res: Response): Promise<void> => {
    const { refresh_token } = req.body;

    if (!isNonEmptyString(refresh_token)) {
        res.status(400).json({
            success: false,
            error: "refresh_token is required",
        } as ApiResponse);
        return;
    }

    const { data, error } = await supabase.auth.refreshSession({
        refresh_token,
    });

    if (error) {
        res.status(401).json({ success: false, error: "Invalid refresh token" } as ApiResponse);
        return;
    }

    res.json({
        success: true,
        data: {
            accessToken: data.session?.access_token,
            refreshToken: data.session?.refresh_token,
        },
    } as ApiResponse);
});

/**
 * GET /api/auth/me
 * Fetch the current authenticated user's latest profile data from Supabase.
 * Used to refresh/sync user roles and other profile information on the frontend.
 * Protected: Requires valid JWT token in Authorization header.
 * Returns: id, email, full_name, role
 */
router.get("/me", async (req: Request, res: Response): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ success: false, error: "Missing or invalid authorization header" });
        return;
    }

    const token = authHeader.split(" ")[1];

    // Verify the token and extract user ID
    const {
        data: { user },
        error: tokenError,
    } = await supabase.auth.getUser(token);

    if (tokenError || !user) {
        res.status(401).json({ success: false, error: "Invalid or expired token" });
        return;
    }

    // Fetch the latest user profile from Supabase (bypasses any client-side caching)
    const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
        res.status(404).json({ success: false, error: "User profile not found" });
        return;
    }

    res.json({
        success: true,
        data: profile,
    } as ApiResponse);
});

export default router;
