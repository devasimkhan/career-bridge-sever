import express from "express"
import protect from "../middleware/authMiddleware.js"
import { generateRoadmap, getMyRoadmap } from "../controllers/roadmapControllers.js"

const router = express.Router()

router.post("/roadmap" ,protect.forUser , generateRoadmap)
router.get("/roadmap" ,protect.forUser , getMyRoadmap)

export default router


