/**
 * In-process API application.
 *
 * This is the former standalone backend, merged into the frontend as an
 * in-process module. It exposes the same Express routers the backend did, but
 * is never bound to a port: the frontend dispatches requests into it directly
 * (see src/utils/api.ts), so there is no network hop and no second deployment.
 *
 * Security note: every secret (Supabase service-role key, etc.) stays on the
 * server. Nunjucks renders server-side, so nothing here reaches the browser.
 */

// Patch Express 4 so rejected promises in async handlers reach the error
// handler (Express 5 does this natively; the routers were written for it).
import "express-async-errors";

import express from "express";

import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth";
import dashboardRoutes from "./routes/dashboard";
import childrenRoutes from "./routes/children";
import teamsRoutes from "./routes/teams";
import gamesRoutes from "./routes/games";
import availabilityRoutes from "./routes/availability";
import availabilityRequestRoutes from "./routes/availability-requests";
import reportsRoutes from "./routes/reports";
import drillsRoutes from "./routes/drills";
import calendarRoutes from "./routes/calendar";
import adminRoutes from "./routes/admin";
import registrationsRoutes from "./routes/registrations";

const apiApp = express();

// x-powered-by is already disabled on the public app; do the same here.
apiApp.disable("x-powered-by");

// Body parsing — mirrors the former backend limits.
apiApp.use(express.json({ limit: "10kb" }));
apiApp.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Health check (kept for parity / diagnostics).
apiApp.get("/api/health", (_req, res) => {
    res.json({ success: true, message: "Norstar API is running", timestamp: new Date().toISOString() });
});

// ─── Routes ─────────────────────────────────────────────────
// Rate limiting is handled by the public frontend app; internal dispatch is
// trusted, so the per-endpoint limiters from the old backend are omitted.
apiApp.use("/api/auth", authRoutes);
apiApp.use("/api/dashboard", dashboardRoutes);
apiApp.use("/api/children", childrenRoutes);
apiApp.use("/api/teams", teamsRoutes);
apiApp.use("/api/games", gamesRoutes);
apiApp.use("/api/availability", availabilityRoutes);
apiApp.use("/api/availability-requests", availabilityRequestRoutes);
apiApp.use("/api/reports", reportsRoutes);
apiApp.use("/api/drills", drillsRoutes);
apiApp.use("/api/calendar", calendarRoutes);
apiApp.use("/api/admin", adminRoutes);
apiApp.use("/api/registrations", registrationsRoutes);

// 404 for unknown API routes — same shape the frontend already handles.
apiApp.use((_req, res) => {
    res.status(404).json({ success: false, error: "Route not found" });
});

// Global error handler.
apiApp.use(errorHandler);

export default apiApp;
