import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { apiRequest } from '../utils/api';

const router = Router();

// All calendar routes require authentication
router.use(requireAuth);

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

// ─── GET /dashboard/calendar — render calendar page ──────────

router.get('/', async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const userRole = req.session.user!.role;
    const viewAsRole =
        userRole === 'admin' ? req.session.viewAsRole : undefined;

    try {
        // Fetch teams for the filter dropdown (and create form for coach/admin)
        const teamsResult = await apiRequest<Team[]>('/api/teams', {
            token,
            viewAsRole,
        });

        res.render('dashboard/calendar/index.njk', {
            title: 'Calendar — Norstar',
            teams: teamsResult.data || [],
            userRole: viewAsRole || userRole,
            isImpersonating: userRole === 'admin' && !!viewAsRole,
            realRole: userRole,
            viewAsRole: viewAsRole || null,
        });
    } catch (error) {
        console.error('Calendar page error:', error);
        res.render('dashboard/calendar/index.njk', {
            title: 'Calendar — Norstar',
            teams: [],
            userRole: viewAsRole || userRole,
            error: 'Unable to load calendar.',
            isImpersonating: false,
            realRole: userRole,
            viewAsRole: null,
        });
    }
});

// ─── GET /dashboard/calendar/events — JSON API for fetching events ──

router.get('/events', async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const viewAsRole =
        req.session.user!.role === 'admin'
            ? req.session.viewAsRole
            : undefined;

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
            token,
            viewAsRole,
        });

        res.json({
            success: true,
            data: result.data || [],
        });
    } catch (error) {
        console.error('Calendar events fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to load calendar events.',
        });
    }
});

// ─── POST /dashboard/calendar/events — create event (coach/admin) ──

router.post(
    '/events',
    requireRole('admin', 'coach'),
    async (req: Request, res: Response) => {
        const token = req.session.accessToken!;
        const viewAsRole =
            req.session.user!.role === 'admin'
                ? req.session.viewAsRole
                : undefined;

        const {
            title,
            event_date,
            event_type,
            team_id,
            description,
            event_time,
            end_time,
            location,
            website, // honeypot
        } = req.body;

        // Honeypot check
        if (website) {
            res.status(204).end();
            return;
        }

        // Server-side validation
        if (!title || !event_date || !event_type) {
            res.status(400).json({
                success: false,
                error: 'Title, date, and event type are required.',
            });
            return;
        }

        // Validate title length
        if (typeof title !== 'string' || title.length > 200) {
            res.status(400).json({
                success: false,
                error: 'Title must be 200 characters or fewer.',
            });
            return;
        }

        // Validate event_type
        const validTypes = ['match', 'training', 'announcement', 'meeting', 'social', 'other'];
        if (!validTypes.includes(event_type)) {
            res.status(400).json({
                success: false,
                error: 'Invalid event type.',
            });
            return;
        }

        // Validate date format
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(event_date)) {
            res.status(400).json({
                success: false,
                error: 'Invalid date format.',
            });
            return;
        }

        // Validate optional time format (HH:MM or HH:MM:SS)
        const timePattern = /^\d{2}:\d{2}(:\d{2})?$/;
        if (event_time && !timePattern.test(event_time)) {
            res.status(400).json({
                success: false,
                error: 'Invalid start time format.',
            });
            return;
        }
        if (end_time && !timePattern.test(end_time)) {
            res.status(400).json({
                success: false,
                error: 'Invalid end time format.',
            });
            return;
        }

        // Validate description length
        if (description && typeof description === 'string' && description.length > 2000) {
            res.status(400).json({
                success: false,
                error: 'Description must be 2000 characters or fewer.',
            });
            return;
        }

        // Validate location length
        if (location && typeof location === 'string' && location.length > 200) {
            res.status(400).json({
                success: false,
                error: 'Location must be 200 characters or fewer.',
            });
            return;
        }

        try {
            const result = await apiRequest<CalendarEvent>('/api/calendar', {
                method: 'POST',
                token,
                viewAsRole,
                body: {
                    title: title.trim(),
                    event_date,
                    event_type,
                    team_id: team_id || undefined,
                    description: description ? description.trim() : undefined,
                    event_time: event_time || undefined,
                    end_time: end_time || undefined,
                    location: location ? location.trim() : undefined,
                },
            });

            if (!result.success) {
                res.status(400).json({
                    success: false,
                    error: result.error || 'Failed to create event.',
                });
                return;
            }

            res.json({
                success: true,
                data: result.data,
                message: 'Event created successfully.',
            });
        } catch (error) {
            console.error('Calendar create error:', error);
            res.status(500).json({
                success: false,
                error: 'An unexpected error occurred.',
            });
        }
    }
);

// ─── PUT /dashboard/calendar/events/:id — update event (coach/admin) ──

router.put(
    '/events/:id',
    requireRole('admin', 'coach'),
    async (req: Request, res: Response) => {
        const token = req.session.accessToken!;
        const viewAsRole =
            req.session.user!.role === 'admin'
                ? req.session.viewAsRole
                : undefined;
        const eventId = req.params.id;

        const { title, event_date, event_type, team_id, description, event_time, end_time, location } = req.body;

        // Validate title length if provided
        if (title && (typeof title !== 'string' || title.length > 200)) {
            res.status(400).json({ success: false, error: 'Title must be 200 characters or fewer.' });
            return;
        }

        // Validate event_type if provided
        const validTypes = ['match', 'training', 'announcement', 'meeting', 'social', 'other'];
        if (event_type && !validTypes.includes(event_type)) {
            res.status(400).json({ success: false, error: 'Invalid event type.' });
            return;
        }

        try {
            const body: Record<string, unknown> = {};
            if (title !== undefined) body.title = typeof title === 'string' ? title.trim() : title;
            if (event_date !== undefined) body.event_date = event_date;
            if (event_type !== undefined) body.event_type = event_type;
            if (team_id !== undefined) body.team_id = team_id || null;
            if (description !== undefined) body.description = typeof description === 'string' ? description.trim() : description;
            if (event_time !== undefined) body.event_time = event_time || null;
            if (end_time !== undefined) body.end_time = end_time || null;
            if (location !== undefined) body.location = typeof location === 'string' ? location.trim() : location;

            const result = await apiRequest<CalendarEvent>(
                `/api/calendar/${encodeURIComponent(eventId)}`,
                {
                    method: 'PUT',
                    token,
                    viewAsRole,
                    body,
                }
            );

            if (!result.success) {
                res.status(400).json({
                    success: false,
                    error: result.error || 'Failed to update event.',
                });
                return;
            }

            res.json({
                success: true,
                data: result.data,
                message: 'Event updated successfully.',
            });
        } catch (error) {
            console.error('Calendar update error:', error);
            res.status(500).json({
                success: false,
                error: 'An unexpected error occurred.',
            });
        }
    }
);

// ─── DELETE /dashboard/calendar/events/:id — delete event (coach/admin) ──

router.delete(
    '/events/:id',
    requireRole('admin', 'coach'),
    async (req: Request, res: Response) => {
        const token = req.session.accessToken!;
        const viewAsRole =
            req.session.user!.role === 'admin'
                ? req.session.viewAsRole
                : undefined;
        const eventId = req.params.id;

        try {
            const result = await apiRequest<unknown>(
                `/api/calendar/${encodeURIComponent(eventId)}`,
                {
                    method: 'DELETE',
                    token,
                    viewAsRole,
                }
            );

            if (!result.success) {
                res.status(400).json({
                    success: false,
                    error: result.error || 'Failed to delete event.',
                });
                return;
            }

            res.json({
                success: true,
                message: 'Event deleted successfully.',
            });
        } catch (error) {
            console.error('Calendar delete error:', error);
            res.status(500).json({
                success: false,
                error: 'An unexpected error occurred.',
            });
        }
    }
);

// ─── POST /dashboard/calendar/cleanup — admin only ──────────

router.post(
    '/cleanup',
    requireRole('admin'),
    async (req: Request, res: Response) => {
        const token = req.session.accessToken!;

        try {
            const result = await apiRequest<{ deleted_count: number }>(
                '/api/calendar/cleanup',
                { method: 'POST', token }
            );

            if (!result.success) {
                res.status(400).json({
                    success: false,
                    error: result.error || 'Cleanup failed.',
                });
                return;
            }

            res.json({
                success: true,
                message: `Cleanup complete. ${result.data?.deleted_count || 0} old events removed.`,
            });
        } catch (error) {
            console.error('Calendar cleanup error:', error);
            res.status(500).json({
                success: false,
                error: 'An unexpected error occurred.',
            });
        }
    }
);

export default router;
