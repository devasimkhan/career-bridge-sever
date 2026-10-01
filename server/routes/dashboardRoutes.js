import express from "express";
import protect from "../middleware/authMiddleware.js";
import { getUserDashboard } from "../controllers/dashboardControllers.js";

const router = express.Router();

// GET /api/user/dashboard
router.get("/dashboard", protect.forUser, getUserDashboard);

export default router;
