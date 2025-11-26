import { Router } from "express";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Crater Finance Tracker API",
    timestamp: new Date().toISOString(),
  });
});

export default router;
