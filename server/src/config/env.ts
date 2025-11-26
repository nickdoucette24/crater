dotenv.config();

// Load environment variables from .env file into process.env
import * as dotenv from "dotenv";
dotenv.config();

// Define allowed values for NODE_ENV
type NodeEnv = "development" | "production" | "test";

// Helper to require a specific environment variable, throws if missing
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

// Parse a string as an integer, or use fallback if invalid
function asInt(value: string, fallback: number): number {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

// Parse a comma-separated string of origins into an array
function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Set the current environment (default to development)
const NODE_ENV = (process.env.NODE_ENV ?? "development") as NodeEnv;

// Export a strongly-typed env object for use throughout the app
// Throws on missing required variables, provides defaults where appropriate
export const env = {
  NODE_ENV,
  PORT: asInt(process.env.PORT ?? "", 4000), // Default to 4000 if not set

  DATABASE_URL: requireEnv("DATABASE_URL"), // Required for DB connection

  JWT_SECRET: requireEnv("JWT_SECRET"), // Required for JWT auth

  CLIENT_URL: process.env.CLIENT_URL ?? "http://localhost:5173", // Default client URL
  CORS_ORIGINS: parseOrigins(process.env.CORS_ORIGINS), // Allowed CORS origins

  IS_PROD: NODE_ENV === "production", // Convenience boolean for prod checks
} as const;

// List of allowed CORS origins for the API
// Uses CORS_ORIGINS if set, otherwise falls back to common local dev URLs
export const corsAllowList: string[] =
  env.CORS_ORIGINS.length > 0
    ? env.CORS_ORIGINS
    : [env.CLIENT_URL, "http://localhost:5173", "http://localhost:3000"];
