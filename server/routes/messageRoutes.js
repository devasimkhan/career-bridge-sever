import express from "express";
import protect from "../middleware/authMiddleware.js";
import messageControllers from "../controllers/messageControllers.js";

const router = express.Router();

router.get("/", protect.forUser, messageControllers.getInbox);
// Specific routes pehle — taaki /:uid se clash na ho
router.post("/mark-seen/:uid", protect.forUser, messageControllers.markSeen);
router.delete("/conversation/:uid", protect.forUser, messageControllers.clearConversation);
router.delete("/message/:mid", protect.forUser, messageControllers.deleteMessage);
router.get("/user-info/:uid", protect.forUser, messageControllers.getTargetUser);
router.get("/:uid", protect.forUser, messageControllers.getConversation);

export default router;
