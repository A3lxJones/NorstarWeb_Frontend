// ─── User roles ─────────────────────────────────────────────
export type UserRole = "parent" | "coach" | "admin";

export interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    role: UserRole;
    created_at: string;
    updated_at: string;
}

// ─── Children ───────────────────────────────────────────────
export interface Child {
    id: string;
    parent_id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: "male" | "female" | "other";
    medical_conditions: string | null;
    allergies: string | null;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    emergency_contact_relationship: string;
    photo_consent: boolean;
    skill_level: "beginner" | "intermediate" | "advanced" | null;
    position: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateChildDTO {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: "male" | "female" | "other";
    medical_conditions?: string;
    allergies?: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    emergency_contact_relationship: string;
    photo_consent: boolean;
    skill_level?: "beginner" | "intermediate" | "advanced";
    position?: string;
}

// ─── Teams ──────────────────────────────────────────────────
export interface Team {
    id: string;
    name: string;
    age_group: string;
    coach_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface TeamRegistration {
    id: string;
    team_id: string;
    child_id: string;
    registered_by: string;
    status: "pending" | "approved" | "rejected";
    created_at: string;
}

// ─── Games / Matches ────────────────────────────────────────
export interface Game {
    id: string;
    home_team_id: string;
    away_team_id: string | null;
    opponent_name: string | null;
    location: string;
    game_date: string;
    game_time: string;
    game_type: "league" | "friendly" | "tournament" | "training";
    status: "scheduled" | "in_progress" | "completed" | "cancelled";
    home_score: number | null;
    away_score: number | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateGameDTO {
    home_team_id: string;
    away_team_id?: string;
    opponent_name?: string;
    location: string;
    game_date: string;
    game_time: string;
    game_type: "league" | "friendly" | "tournament" | "training";
    notes?: string;
}

// ─── Availability ───────────────────────────────────────────
export type AvailabilityType = "match" | "training";
export type AvailabilityStatus = "available" | "unavailable" | "tentative";

export interface Availability {
    id: string;
    child_id: string;
    game_id: string | null;
    availability_type: AvailabilityType;
    event_date: string;
    status: AvailabilityStatus;
    reason: string | null;
    submitted_by: string;
    created_at: string;
    updated_at: string;
}

export interface SubmitAvailabilityDTO {
    child_id: string;
    game_id?: string;
    availability_type: AvailabilityType;
    event_date: string;
    status: AvailabilityStatus;
    reason?: string;
}

// ─── Availability Requests ──────────────────────────────────
export type AvailabilityRequestStatus = "open" | "closed";

export interface AvailabilityRequest {
    id: string;
    team_id: string;
    game_id: string | null;
    request_type: AvailabilityType;
    title: string;
    event_date: string;
    event_time: string | null;
    location: string | null;
    message: string | null;
    deadline: string | null;
    status: AvailabilityRequestStatus;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface CreateAvailabilityRequestDTO {
    team_id: string;
    game_id?: string;
    request_type: AvailabilityType;
    title: string;
    event_date: string;
    event_time?: string;
    location?: string;
    message?: string;
    deadline?: string;
}

export interface AvailabilityResponse {
    id: string;
    request_id: string;
    child_id: string;
    status: AvailabilityStatus;
    reason: string | null;
    responded_by: string;
    created_at: string;
    updated_at: string;
}

export interface SubmitAvailabilityResponseDTO {
    child_id: string;
    status: AvailabilityStatus;
    reason?: string;
}

// ─── Reports (admin) ────────────────────────────────────────
export interface Report {
    id: string;
    title: string;
    content: string;
    report_type: "incident" | "feedback" | "general";
    created_by: string;
    related_child_id: string | null;
    related_game_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateReportDTO {
    title: string;
    content: string;
    report_type: "incident" | "feedback" | "general";
    related_child_id?: string;
    related_game_id?: string;
}

// ─── Drills ─────────────────────────────────────────────────
export interface Drill {
    id: string;
    name: string;
    category: string;
    difficulty: string;
    duration_minutes: number;
    min_players: number;
    max_players: number;
    equipment: string[];
    description: string | null;
    objectives: string[];
    setup: string | null;
    instructions: string[];
    coaching_points: string[];
    variations: string[];
    suitable_for: string[];
    team_id: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface CreateDrillDTO {
    name: string;
    category?: string;
    difficulty?: string;
    duration_minutes?: number;
    min_players?: number;
    max_players?: number;
    equipment?: string[];
    description?: string;
    objectives?: string[];
    setup?: string;
    instructions?: string[];
    coaching_points?: string[];
    variations?: string[];
    suitable_for?: string[];
    team_id?: string;
}

export interface DrillsListResponse {
    drills: Drill[];
    total: number;
    categories: string[];
    difficulties: string[];
    age_groups: string[];
}

// ─── Calendar Events ────────────────────────────────────────
export type CalendarEventType = "match" | "training" | "announcement" | "meeting" | "social" | "other";
export type CalendarEventSource = "auto" | "manual";

export interface CalendarEvent {
    id: string;
    team_id: string | null;
    availability_request_id: string | null;
    title: string;
    description: string | null;
    event_date: string;
    event_time: string | null;
    end_time: string | null;
    location: string | null;
    event_type: CalendarEventType;
    source: CalendarEventSource;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface CreateCalendarEventDTO {
    team_id?: string;
    title: string;
    description?: string;
    event_date: string;
    event_time?: string;
    end_time?: string;
    location?: string;
    event_type: CalendarEventType;
}

// ─── API response helpers ───────────────────────────────────
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
