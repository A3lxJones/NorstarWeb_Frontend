import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import nunjucks from 'nunjucks';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

// Session & auth middleware
import { configureSession } from './middleware/session';
import { injectUser } from './middleware/auth';

// Import routes
import homeRoutes from './routes/index';
import fixturesRoutes from './routes/fixtures';
import newsRoutes from './routes/news';
import contactRoutes from './routes/contact';
import loginRoutes from './routes/login';
import signupRoutes from './routes/signup';
import logoutRoutes from './routes/logout';
import dashboardRoutes from './routes/dashboard';
import teamsRoutes from './routes/teams';

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
                    ((_req: Request, res: Response) => `'nonce-${res.locals.cspNonce}'`) as any,
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
    max: 200, // limit each IP to 200 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests — please try again later.',
});
app.use(globalLimiter);

// Stricter limiter for login & contact (anti-brute-force / anti-spam)
const formLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
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

// --- Routes ---
app.use('/', homeRoutes);
app.use('/fixtures', fixturesRoutes);
app.use('/news', newsRoutes);
app.use('/contact', contactRoutes);
app.use('/login', loginRoutes);
app.use('/signup', signupRoutes);
app.use('/logout', logoutRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/dashboard/teams', teamsRoutes);

// Apply stricter rate limiter to form POST routes
app.post('/contact', formLimiter);
app.post('/login', formLimiter);
app.post('/signup', formLimiter);

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
