import express from "express";
import {
  getAdminStats,
  getAllUsers,
  getAllBlogs,
  getAllTasks,
  getAllJournals,
  getRecentUsers,
  getPendingContent,
  deleteUser,
  approveBlog,
  rejectBlog,
} from "../controllers/adminController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

// Stats
router.get("/stats", getAdminStats);

// Users
router.get("/users", getAllUsers);
router.get("/users/recent", getRecentUsers);
router.delete("/users/:userId", deleteUser);

// Blogs
router.get("/blogs", getAllBlogs);
router.get("/content/pending", getPendingContent);
router.put("/blogs/:blogId/approve", approveBlog);
router.delete("/blogs/:blogId/reject", rejectBlog);

// Tasks
router.get("/tasks", getAllTasks);

// Journals
router.get("/journals", getAllJournals);

export default router;
