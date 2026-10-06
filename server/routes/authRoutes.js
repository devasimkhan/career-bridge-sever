

import express from "express"
import authControllers from "../controllers/authControllers.js"
import protect from "../middleware/authMiddleware.js"
import upload from "../middleware/fileUploadMiddleware.js"

const router = express.Router()



router.post("/register", upload.single("profile_image"), authControllers.registerUser)
router.post("/login", authControllers.loginUser)
router.post("/private", protect.forUser, authControllers.privateController)


export default router