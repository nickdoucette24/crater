// Import Express Router to define modular route handlers
import { Router } from "express";

// Create a new router instance for health check endpoints
const router = Router();

// Health check endpoint
// Returns a simple status and timestamp to verify the API is running
router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Crater Finance Tracker API",
    timestamp: new Date().toISOString(),
  });
});

// Export the router to be mounted in the main app
export default router;
