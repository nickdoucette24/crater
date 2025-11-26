// Import the Express app instance
import { app } from "./app";
// Import environment variables (e.g., port, database URL)
import { env } from "./config/env";
// Import MySQL promise-based client
import * as mysql from "mysql2/promise";

// Create a MySQL connection pool for efficient DB access
// Uses environment variable for DB connection string
export const db = mysql.createPool({
  uri: env.DATABASE_URL,
  waitForConnections: true, // Only allow queries when a connection is available
  connectionLimit: 10, // Max number of concurrent connections
  queueLimit: 0, // Unlimited queue (raise in production for safety)
  enableKeepAlive: true, // Keep connections alive
  keepAliveInitialDelay: 0, // Start keep-alive immediately
});

// Test the database connection by running a simple query
async function connectDatabase(): Promise<void> {
  await db.query("SELECT 1");
  // eslint-disable-next-line no-console
  console.log("[DB] MySQL connected");
}

// Main entry point for the server
async function main() {
  // Ensure DB is connected before starting the server
  await connectDatabase();

  // Start the Express server on the configured port
  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[API] running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  // Graceful shutdown handler for SIGINT/SIGTERM
  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`\n[API] received ${signal}. Shutting down...`);

    // Stop accepting new connections, then close DB pool
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

  // Listen for termination signals to trigger graceful shutdown
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

// Start the server, and handle startup errors
main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[API] failed to start:", err);
  process.exit(1);
});
