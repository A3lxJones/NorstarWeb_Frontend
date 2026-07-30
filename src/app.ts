import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import nunjucks from 'nunjucks';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

// Session & auth middleware
import { configureSession } from './middleware/session';
import { injectUser, requireAuth } from './middleware/auth';
import { apiRequest, getCurrentUser } from './utils/api';

// Import routes
import homeRoutes from './routes/index';
import fixturesRoutes from './routes/fixtures';
import newsRoutes from './routes/news';
import contactRoutes from './routes/contact';
import privacyPolicyRoutes from './routes/privacy-policy';
import loginRoutes from './routes/login';
import signupRoutes from './routes/signup';
import logoutRoutes from './routes/logout';
import forgotPasswordRoutes from './routes/forgot-password';
import resetPasswordRoutes from './routes/reset-password';
import dashboardRoutes from './routes/dashboard';
import teamsRoutes from './routes/teams';
import drillsRoutes from './routes/drills';
import childrenRoutes from './routes/children';
import usersRoutes from './routes/users';
import availabilityRoutes from './routes/availability';
import calendarRoutes from './routes/calendar';
import shopRoutes from './routes/shop';

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// ───────────────────────────────────────────
// Security: Generate a per-request CSP nonce
// ───────────────────────────────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
    next();
});

// ───────────────────────────────────────────
// Security: Helmet HTTP headers
// ───────────────────────────────────────────
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    ((_req: Request, res: Response): unknown => `'nonce-${res.locals.cspNonce}'`) as unknown as string,
                ],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'", // Required for Tailwind/DaisyUI inline styles
                    'https://fonts.googleapis.com',
                ],
                fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'"],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                upgradeInsecureRequests: isProd ? [] : null,
            },
        },
        crossOriginEmbedderPolicy: false, // Allow Google Fonts cross-origin
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
    })
);

// ───────────────────────────────────────────
// Security: Rate limiting
// ───────────────────────────────────────────
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProd ? 1000 : 5000, // limit each IP per window (higher in dev)
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests — please try again later.',
    skip: (req) => req.path.startsWith('/css/') || req.path.startsWith('/js/') || req.path.startsWith('/images/') || req.path.startsWith('/documents/'),
});
app.use(globalLimiter);

// Stricter limiter for login & contact (anti-brute-force / anti-spam)
const formLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many form submissions — please try again later.',
});

// ───────────────────────────────────────────
// Security: Disable powered-by header
// ───────────────────────────────────────────
app.disable('x-powered-by');

// ───────────────────────────────────────────
// Security: Trust proxy in production (e.g. behind nginx/cloudflare)
// ───────────────────────────────────────────
if (isProd) {
    app.set('trust proxy', 1);
}

// --- Nunjucks Configuration ---
const viewsPath = path.join(__dirname, '..', 'src', 'views');
const nunjucksEnv = nunjucks.configure(viewsPath, {
    autoescape: true,
    express: app,
    watch: !isProd,
});
app.set('view engine', 'njk');

// Global template variables
nunjucksEnv.addGlobal('year', new Date().getFullYear());

// --- Static Files (with caching) ---
const publicPath = path.join(__dirname, '..', 'src', 'public');
app.use(
    express.static(publicPath, {
        maxAge: isProd ? '7d' : 0,
        etag: true,
        lastModified: true,
    })
);

// --- Body Parsers (with size limits) ---
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// --- Session ---
configureSession(app);

// --- Inject user into all templates ---
app.use(injectUser);

// ───────────────────────────────────────────
// Security: Apply stricter rate limiter to form POST routes.
// Registered BEFORE the route handlers so the limiter runs first.
// ───────────────────────────────────────────
app.post('/contact', formLimiter);
app.post('/login', formLimiter);
app.post('/signup', formLimiter);
app.post('/forgot-password', formLimiter);
app.post('/reset-password', formLimiter);
app.post('/dashboard/children/add', formLimiter);
app.post('/dashboard/users/:id/role', formLimiter);
app.post('/dashboard/availability/create', formLimiter);
app.post('/dashboard/availability/:id/respond', formLimiter);
app.post('/dashboard/calendar/events', formLimiter);
app.post('/dashboard/calendar/cleanup', formLimiter);

// --- Routes ---
app.use('/', homeRoutes);
app.use('/fixtures', requireAuth, fixturesRoutes);
app.use('/news', newsRoutes);
app.use('/contact', contactRoutes);
app.use('/privacy-policy', privacyPolicyRoutes);
app.use('/shop', shopRoutes);
app.use('/login', loginRoutes);
app.use('/signup', signupRoutes);
app.use('/logout', logoutRoutes);
app.use('/forgot-password', forgotPasswordRoutes);
app.use('/reset-password', resetPasswordRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/dashboard/teams', teamsRoutes);
app.use('/dashboard/drills', drillsRoutes);
app.use('/dashboard/children', childrenRoutes);
app.use('/dashboard/users', usersRoutes);
app.use('/dashboard/availability', availabilityRoutes);
app.use('/dashboard/calendar', calendarRoutes);

// ─── GET /api/auth/me — fetch current user and update cached role ───
app.get('/api/auth/me', requireAuth, async (req: Request, res: Response) => {
    try {
        const token = req.session.accessToken!;
        const result = await getCurrentUser(token);

        if (!result.success || !result.data) {
            res.status(401).json({
                success: false,
                error: 'Failed to fetch current user data.',
            });
            return;
        }

        const updatedUser = result.data;
        const oldRole = req.session.user?.role;
        const newRole = updatedUser.role;

        // Update session with latest user data
        if (req.session.user) {
            req.session.user.role = newRole;
            req.session.user.email = updatedUser.email;
            if (updatedUser.full_name) {
                req.session.user.full_name = updatedUser.full_name;
            }
        }

        res.json({
            success: true,
            data: {
                id: updatedUser.id,
                email: updatedUser.email,
                role: updatedUser.role,
                full_name: updatedUser.full_name,
                roleChanged: oldRole !== newRole,
                oldRole,
                newRole,
            },
        });
    } catch (error) {
        console.error('Auth ME error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching user data.',
        });
    }
});

// ─── POST /api/auth/refresh-role — sync user role from backend ───
app.post('/api/auth/refresh-role', requireAuth, async (req: Request, res: Response) => {
    try {
        const token = req.session.accessToken!;
        const result = await getCurrentUser(token);

        if (!result.success || !result.data) {
            res.status(401).json({
                success: false,
                error: 'Failed to fetch current user data.',
            });
            return;
        }

        const oldRole = req.session.user?.role;
        const newRole = result.data.role;

        // Update session with latest role
        if (req.session.user) {
            req.session.user.role = newRole;
            req.session.user.email = result.data.email;
            if (result.data.full_name) {
                req.session.user.full_name = result.data.full_name;
            }
        }

        res.json({
            success: true,
            data: {
                id: result.data.id,
                email: result.data.email,
                role: result.data.role,
                full_name: result.data.full_name,
                roleChanged: oldRole !== newRole,
                oldRole,
                newRole,
            },
        });
    } catch (error) {
        console.error('Role refresh error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while refreshing role.',
        });
    }
});

// ─── PATCH /api/children/:id/team-details — update child player type ───
app.patch('/api/children/:id/team-details', requireAuth, async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const childId = req.params.id;
    const { position } = req.body;

    try {
        const result = await apiRequest<unknown>(
            `/api/children/${childId}/team-details`,
            {
                method: 'PATCH',
                token,
                body: {
                    position: position || undefined,
                },
            }
        );

        if (!result.success) {
            res.status(400).json({
                success: false,
                error: result.error || 'Failed to update member.',
            });
            return;
        }

        res.json({
            success: true,
            message: 'Member updated successfully.',
            data: result.data,
        });
    } catch (error) {
        console.error('Update member error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while updating the member.',
        });
    }
});

// --- 404 Handler ---
app.use((_req: Request, res: Response) => {
    res.status(404).render('404.njk', { title: 'Page Not Found' });
});

// --- Global Error Handler ---
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[ERROR]', err.message);
    res.status(500).render('404.njk', { title: 'Something Went Wrong' });
});

export default app;
