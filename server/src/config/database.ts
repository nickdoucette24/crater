import * as mysql from "mysql2/promise";
import { Pool, RowDataPacket } from "mysql2/promise";
import { env } from "./env";

export const db: Pool = mysql.createPool({
  uri: env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

/**
 * Simple connectivity check you can call on server start.
 */
export async function connectDatabase(): Promise<void> {
  await db.query("SELECT 1");
  // eslint-disable-next-line no-console
  console.log("[DB] MySQL connected");
}

/**
 * Typed query helper:
 * - Use for SELECT queries (returns rows).
 * - For INSERT/UPDATE, use db.execute directly if you need insertId/affectedRows.
 */
export async function query<T extends RowDataPacket[]>(
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  const [rows] = await db.execute<T>(sql, params);
  return rows;
}
