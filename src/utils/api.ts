/**
 * API client — dispatches requests to the merged, in-process API.
 *
 * By default requests are injected directly into the in-process API app
 * (src/server-api) with no network hop. When API_URL is set (e.g. the e2e
 * suite pointing at the mock backend) requests go over HTTP instead. The
 * browser never talks to the API directly either way.
 */

// Set only in environments that want the HTTP transport (e.g. e2e tests).
const API_URL = process.env.API_URL;

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

interface RequestOptions {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: Record<string, unknown>;
    token?: string;
    /** Admin-only: temporarily view as a different role */
    viewAsRole?: string;
}

export async function apiRequest<T = unknown>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<ApiResponse<T>> {
    const { method = "GET", body, token, viewAsRole } = options;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    if (viewAsRole) {
        headers["X-View-As-Role"] = viewAsRole;
    }

    try {
        // HTTP transport — used when an external API URL is configured.
        if (API_URL) {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            });
            return (await response.json()) as ApiResponse<T>;
        }

        // In-process transport — dispatch straight into the merged API app.
        const { dispatch } = await import("../server-api/dispatch");
        const { default: apiApp } = await import("../server-api");

        const res = await dispatch(apiApp, {
            method,
            url: endpoint,
            headers,
            payload: body ? JSON.stringify(body) : undefined,
        });

        return (res.payload
            ? JSON.parse(res.payload)
            : { success: false, error: "Empty response from the server." }) as ApiResponse<T>;
    } catch (error) {
        console.error(`API request failed: ${endpoint}`, error);
        return {
            success: false,
            error: "Unable to connect to the server. Please try again later.",
        };
    }
}

// ─── Auth helpers ───────────────────────────────────────────

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        role: string;
    };
}

export async function login(email: string, password: string) {
    return apiRequest<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: { email, password },
    });
}

export async function signup(data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    role?: string;
}) {
    return apiRequest<{ userId: string }>("/api/auth/signup", {
        method: "POST",
        body: data,
    });
}

export async function refreshToken(refresh_token: string) {
    return apiRequest<{ accessToken: string; refreshToken: string }>(
        "/api/auth/refresh",
        { method: "POST", body: { refresh_token } }
    );
}

// ─── Password reset helpers ────────────────────────────────

export async function forgotPassword(email: string, redirectTo: string) {
    return apiRequest<{ message: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: { email, redirectTo },
    });
}

export async function resetPassword(accessToken: string, newPassword: string) {
    return apiRequest<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        token: accessToken,
        body: { password: newPassword },
    });
}

export async function exchangeRecoveryCode(code: string) {
    return apiRequest<{ accessToken: string }>("/api/auth/exchange-recovery-code", {
        method: "POST",
        body: { code },
    });
}

// ─── Get current user info ────────────────────────────────

export interface CurrentUserResponse {
    id: string;
    email: string;
    role: string;
    full_name?: string;
}

export async function getCurrentUser(token: string) {
    return apiRequest<CurrentUserResponse>("/api/auth/me", {
        method: "GET",
        token,
    });
}
