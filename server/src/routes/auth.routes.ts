// Express Router and types for route/middleware definitions
import { Router, type NextFunction, type Request, type Response } from "express";
// JWT for token-based authentication
import * as jwt from "jsonwebtoken";
// Environment config (for secrets, etc.)
import { env } from "../config/env";
// User repository and OAuth provider types
import { UserRepository, type OAuthProvider } from "../models/User";

// Extend Express Request to include authenticated userId
type AuthedRequest = Request & { userId?: number };

// Create a new router instance for auth endpoints
const router = Router();

// Helper to sign a JWT for a given user ID
function signToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, env.JWT_SECRET, {
    expiresIn: "7d", // Token valid for 7 days
    issuer: "crater-api",
  });
}

// Extract Bearer token from Authorization header
function readBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [kind, token] = header.split(" ");
  if (kind?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

// Minimal authentication middleware
// Checks for Bearer token or 'token' cookie, verifies JWT, and loads user
// Attaches userId to request if valid, otherwise returns 401
async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const token = readBearerToken(req) ?? (req.cookies?.token as string | undefined) ?? null;
    if (!token) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing token" } });
    }

    const payload = jwt.verify(token, env.JWT_SECRET) as { sub?: string };
    const userId = Number(payload.sub);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid token" } });
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "User not found" } });
    }

    req.userId = userId;
    return next();
  } catch {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid token" } });
  }
}

/**
 * DEV ONLY: create/find a local user and return a JWT.
 * This endpoint is for development/testing only and should be removed in production.
 * Accepts email and name, upserts a user, and returns a signed JWT (and sets a cookie).
 */
router.post("/auth/dev-login", async (req, res) => {
  const email = String(req.body?.email ?? "")
    .trim()
    .toLowerCase();
  const name = String(req.body?.name ?? "").trim() || "Dev User";

  if (!email) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "email is required" },
    });
  }

  // Upsert a user with the dev provider and email as the provider ID
  const user = await UserRepository.upsertOAuthUser({
    oauthProvider: "dev",
    oauthProviderId: email, // stable ID for dev mode
    email,
    name,
  });

  const token = signToken(user.id);

  // Optionally set a cookie for browser-based auth (in addition to Bearer token)
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.IS_PROD,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({ token, user });
});

// Get the currently authenticated user's profile
router.get("/auth/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await UserRepository.findById(req.userId!);
  return res.status(200).json(user);
});

// Log out the user by clearing the auth cookie
router.post("/auth/logout", (req, res) => {
  res.clearCookie("token");
  return res.status(200).json({ success: true });
});

/**
 * Placeholder for real OAuth callback wiring.
 * When you implement Google OAuth:
 *   - exchange code for tokens
 *   - fetch user profile
 *   - upsertOAuthUser({ provider, providerId, email, name, avatarUrl })
 *   - return token + user
 */
router.get("/auth/oauth/:provider/callback", (req, res) => {
  const provider = String(req.params.provider) as OAuthProvider;
  return res.status(501).json({
    error: {
      code: "NOT_IMPLEMENTED",
      message: `OAuth callback not implemented yet for provider: ${provider}`,
    },
  });
});

// Export the router to be mounted in the main app
export default router;
