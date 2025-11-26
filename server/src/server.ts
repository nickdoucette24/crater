import { app } from "./app";
import { env } from "./config/env";
import * as mysql from "mysql2/promise";

export const db = mysql.createPool({
  uri: env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0, // change to 50-ish come production
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

async function connectDatabase(): Promise<void> {
  await db.query("SELECT 1");
  // eslint-disable-next-line no-console
  console.log("[DB] MySQL connected");
}

async function main() {
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[API] running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`\n[API] received ${signal}. Shutting down...`);

    server.close(async () => {
      try {
        await db.end();
        // eslint-disable-next-line no-console
        console.log("[DB] pool closed");
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[DB] error closing pool:", err);
      } finally {
        process.exit(0);
      }
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[API] failed to start:", err);
  process.exit(1);
});
