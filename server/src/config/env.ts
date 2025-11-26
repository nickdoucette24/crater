import * as dotenv from "dotenv";

dotenv.config();

type NodeEnv = "development" | "production" | "test";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function asInt(value: string, fallback: number): number {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const NODE_ENV = (process.env.NODE_ENV ?? "development") as NodeEnv;

export const env = {
  NODE_ENV,
  PORT: asInt(process.env.PORT ?? "", 4000),

  DATABASE_URL: requireEnv("DATABASE_URL"),

  JWT_SECRET: requireEnv("JWT_SECRET"),

  CLIENT_URL: process.env.CLIENT_URL ?? "http://localhost:5173",
  CORS_ORIGINS: parseOrigins(process.env.CORS_ORIGINS),

  IS_PROD: NODE_ENV === "production",
} as const;

export const corsAllowList: string[] =
  env.CORS_ORIGINS.length > 0
    ? env.CORS_ORIGINS
    : [env.CLIENT_URL, "http://localhost:5173", "http://localhost:3000"];
