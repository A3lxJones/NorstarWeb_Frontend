/**
 * API client — makes requests from the frontend server to the backend API.
 * The browser never talks to the backend directly.
 */

const API_URL = process.env.API_URL || "http://localhost:3000";

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
        const response = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        const data = (await response.json()) as ApiResponse<T>;
        return data;
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
