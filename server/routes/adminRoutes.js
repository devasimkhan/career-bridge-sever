
import express from "express"
import adminControllers from "../controllers/adminControllers.js"
import protect from "../middleware/authMiddleware.js"
import { AdminAiChat } from "../controllers/roadmapControllers.js"


const router = express.Router()

router.get("/users" , protect.forAdmin,  adminControllers.getAllUser)
router.post("/category" , protect.forAdmin , adminControllers.createCategory)
router.get("/category" , protect.forAdmin , adminControllers.getAllCategory)
router.post("/career/:cid" ,protect.forAdmin   , adminControllers.createCareer)
router.get("/career" , protect.forAdmin ,  adminControllers.getAllCareer)
router.get("/career/category/:cid" , protect.forAdmin , adminControllers.getCareerByCategoryId)
router.get("/counselors" ,protect.forAdmin , adminControllers.getAllCounselor )
router.put("/counselors/:cnid"  ,protect.forAdmin, adminControllers.updateCounselor)
router.get("/credits" , protect.forAdmin , adminControllers.getAllCreditsRequest)
router.put("/credits/:rid" , protect.forAdmin , adminControllers.updatedCreditRequest)
router.put("/:uid" , protect.forAdmin , adminControllers.updateUser)
router.post("/ai" , protect.forAdmin , AdminAiChat)
router.get("/roadmaps" , protect.forUser , adminControllers.getAllRoadsMap )
export default router