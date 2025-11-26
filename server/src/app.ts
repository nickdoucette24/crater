// Core Express imports and types
import express, { type NextFunction, type Request, type Response } from "express";
// Middleware for CORS, cookies, logging
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
// Health check route
import healthRoutes from "./routes/health.routes";
// Authentication routes
import authRoutes from "./routes/auth.routes";
// Environment and CORS config
import { corsAllowList, env } from "./config/env";

// Create the Express app instance
export const app = express();

// Trust the first proxy (for correct client IPs behind reverse proxies)
app.set("trust proxy", 1);

// Use request logging in non-production environments
if (!env.IS_PROD) {
  app.use(morgan("dev"));
}

// Parse JSON and URL-encoded bodies, and cookies
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS middleware: allow credentials and restrict origins to allowlist
app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Allow non-browser requests

      if (corsAllowList.includes(origin)) {
        return callback(null, true);
      }

      // Block disallowed origins
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  }),
);

// Mount health check and API routes
app.use("/api", healthRoutes);

// Mount authentication routes
app.use("/api", authRoutes);

// Catch-all for undefined /api routes (404 handler)
app.use("/api", (_req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
    },
  });
});

// Global error handler for all uncaught errors
// Handles CORS errors and generic server errors
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Unknown error";

  // CORS errors often end up here
  if (message.startsWith("CORS blocked")) {
    return res.status(403).json({
      error: { code: "CORS_FORBIDDEN", message },
    });
  }

  // Fallback for all other errors
  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message,
    },
  });
});
