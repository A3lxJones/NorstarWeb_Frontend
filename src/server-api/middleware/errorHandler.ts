import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../types";

/**
 * Global error handler — catches unhandled errors and returns
 * a consistent JSON response. Never leaks stack traces in production.
 */
export function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    console.error("Unhandled error:", err.message);

    if (process.env.NODE_ENV !== "production") {
        console.error(err.stack);
    }

    const response: ApiResponse = {
        success: false,
        error:
            process.env.NODE_ENV === "production"
                ? "Internal server error"
                : err.message,
    };

    res.status(500).json(response);
}
