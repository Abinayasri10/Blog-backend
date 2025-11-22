import express from "express";
import multer from "multer";
import * as blogController from "../controllers/blogController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Blog CRUD Routes
router.post("/", authMiddleware, upload.single('coverImage'), blogController.createBlog);
router.get("/", blogController.getBlogs);
router.get("/my-blogs", authMiddleware, blogController.getUserBlogs);
router.get("/:id", blogController.getBlogById);
router.put("/:id", authMiddleware, upload.single('coverImage'), blogController.updateBlog);
router.delete("/:id", authMiddleware, blogController.deleteBlog);

// Social Interaction Routes
router.post("/:id/like", authMiddleware, blogController.likeBlog);
router.post("/:id/comment", authMiddleware, blogController.addComment);
router.get("/:id/comments", blogController.getComments);
router.delete("/:id/comments/:commentId", authMiddleware, blogController.deleteComment);

export default router;
