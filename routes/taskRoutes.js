import express from "express"
import { createTask, getTasks, toggleTaskStatus } from "../controllers/taskController.js"
import authMiddleware from "../middleware/authMiddleware.js"

const router = express.Router()

router.post("/", authMiddleware, createTask)           // POST /api/tasks
router.get("/", authMiddleware, getTasks)             // GET /api/tasks
router.put("/:id/toggle", authMiddleware, toggleTaskStatus) // PUT /api/tasks/:id/toggle

export default router
