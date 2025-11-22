import express from "express"
import { createEntry, getEntries } from "../controllers/journalController.js"
import authMiddleware from "../middleware/authMiddleware.js"

const router = express.Router()

router.post("/", authMiddleware, createEntry) // POST /api/journals
router.get("/", authMiddleware, getEntries)   // GET /api/journals

export default router
