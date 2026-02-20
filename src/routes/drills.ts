import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { apiRequest } from '../utils/api';

const router = Router();

// All drills routes require auth + coach or admin role
router.use(requireAuth);
router.use(requireRole('admin', 'coach'));

// ─── Drill interfaces ──────────────────────────────────────

interface Drill {
    id: string;
    name: string;
    category: string;
    difficulty: string;
    duration_minutes: number;
    min_players: number;
    max_players: number;
    equipment: string[];
    description: string;
    objectives: string[];
    setup: string;
    instructions: string[];
    coaching_points: string[];
    variations: string[];
    suitable_for: string[];
}

interface DrillsApiResponse {
    drills: Drill[];
    total: number;
    categories: string[];
    difficulties: string[];
    age_groups: string[];
}

// ─── GET /dashboard/drills — filterable drill library ───────

router.get('/', async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const user = req.session.user!;
    const viewAsRole = user.role === 'admin' ? req.session.viewAsRole : undefined;

    // Collect filter query params
    const category = (req.query.category as string) || '';
    const difficulty = (req.query.difficulty as string) || '';
    const ageGroup = (req.query.age_group as string) || '';
    const search = (req.query.search as string) || '';
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = 24;

    // Build query string for the backend
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (difficulty) params.set('difficulty', difficulty);
    if (ageGroup) params.set('age_group', ageGroup);
    if (search) params.set('search', search);
    params.set('page', String(page));
    params.set('limit', String(limit));

    try {
        const result = await apiRequest<DrillsApiResponse>(
            `/api/drills?${params.toString()}`,
            { token, viewAsRole }
        );

        const data = result.data || {
            drills: [],
            total: 0,
            categories: [],
            difficulties: [],
            age_groups: [],
        };

        const totalPages = Math.ceil(data.total / limit);

        res.render('dashboard/drills/index.njk', {
            title: 'Drill Library — Norstar',
            drills: data.drills,
            total: data.total,
            categories: data.categories,
            difficulties: data.difficulties,
            ageGroups: data.age_groups,
            // Current filters (for sticky form state)
            filters: { category, difficulty, ageGroup, search },
            // Pagination
            page,
            totalPages,
            limit,
            isImpersonating: user.role === 'admin' && !!viewAsRole,
            viewAsRole: viewAsRole || null,
            realRole: user.role,
        });
    } catch (error) {
        console.error('Drills list error:', error);
        res.render('dashboard/drills/index.njk', {
            title: 'Drill Library — Norstar',
            drills: [],
            total: 0,
            categories: [],
            difficulties: [],
            ageGroups: [],
            filters: { category: '', difficulty: '', ageGroup: '', search: '' },
            page: 1,
            totalPages: 0,
            limit,
            error: 'Unable to load drills. Please try again later.',
            isImpersonating: false,
            viewAsRole: null,
            realRole: req.session.user?.role || null,
        });
    }
});

// ─── GET /dashboard/drills/:id — single drill detail ────────

router.get('/:id', async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const user = req.session.user!;
    const viewAsRole = user.role === 'admin' ? req.session.viewAsRole : undefined;
    const drillId = req.params.id;

    try {
        const result = await apiRequest<Drill>(
            `/api/drills/${drillId}`,
            { token, viewAsRole }
        );

        if (!result.success || !result.data) {
            res.status(404).render('404.njk', { title: 'Drill Not Found' });
            return;
        }

        res.render('dashboard/drills/detail.njk', {
            title: `${result.data.name} — Drill Library`,
            drill: result.data,
            isImpersonating: user.role === 'admin' && !!viewAsRole,
            viewAsRole: viewAsRole || null,
            realRole: user.role,
        });
    } catch (error) {
        console.error('Drill detail error:', error);
        res.status(500).render('404.njk', { title: 'Error Loading Drill' });
    }
});

export default router;
