import { Router, Request, Response } from 'express';
import { apiRequest } from '../utils/api';

const router = Router();

// ─── Interfaces ─────────────────────────────────────────────

interface Team {
    id: string;
    name: string;
    age_group: string;
}

interface CalendarEvent {
    id: string;
    team_id: string | null;
    availability_request_id: string | null;
    title: string;
    description: string | null;
    event_date: string;
    event_time: string | null;
    end_time: string | null;
    location: string | null;
    event_type: 'match' | 'training' | 'announcement' | 'meeting' | 'social' | 'other';
    source: 'auto' | 'manual';
    created_by: string;
    team?: { id: string; name: string; age_group: string };
    creator?: { id: string; full_name: string };
}

// ─── GET /fixtures — render fixtures & calendar page ─────────

router.get('/', async (req: Request, res: Response) => {
    const token = req.session?.accessToken;

    try {
        // Fetch teams for filter dropdown (pass token if logged in)
        const teamsResult = await apiRequest<Team[]>('/api/teams', {
            ...(token ? { token } : {}),
        });

        res.render('fixtures.njk', {
            title: 'Fixtures & Calendar — Norstar Inline Hockey',
            teams: teamsResult.data || [],
        });
    } catch {
        res.render('fixtures.njk', {
            title: 'Fixtures & Calendar — Norstar Inline Hockey',
            teams: [],
        });
    }
});

// ─── GET /fixtures/events — JSON API for calendar events (public) ──

router.get('/events', async (req: Request, res: Response) => {
    const token = req.session?.accessToken;

    const from = String(req.query.from || '');
    const to = String(req.query.to || '');
    const teamId = req.query.team_id ? String(req.query.team_id) : undefined;

    // Validate date format (YYYY-MM-DD)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(from) || !datePattern.test(to)) {
        res.status(400).json({
            success: false,
            error: 'Invalid date format. Use YYYY-MM-DD.',
        });
        return;
    }

    try {
        let endpoint = `/api/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
        if (teamId) {
            endpoint += `&team_id=${encodeURIComponent(teamId)}`;
        }

        const result = await apiRequest<CalendarEvent[]>(endpoint, {
            ...(token ? { token } : {}),
        });

        res.json({
            success: true,
            data: result.data || [],
        });
    } catch {
        res.status(500).json({
            success: false,
            error: 'Unable to load calendar events.',
        });
    }
});

export default router;
