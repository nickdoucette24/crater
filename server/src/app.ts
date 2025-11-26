import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import healthRoutes from "./routes/health.routes";
import { corsAllowList, env } from "./config/env";

export const app = express();

app.set("trust proxy", 1);

if (!env.IS_PROD) {
  app.use(morgan("dev"));
}

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (corsAllowList.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  }),
);

app.use("/api", healthRoutes);

app.use("/api", (_req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
    },
  });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Unknown error";

  // CORS errors often end up here
  if (message.startsWith("CORS blocked")) {
    return res.status(403).json({
      error: { code: "CORS_FORBIDDEN", message },
    });
  }

  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message,
    },
  });
});
