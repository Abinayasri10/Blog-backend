import express from "express"
import * as libraryController from "../controllers/libraryController.js"
import authMiddleware from "../middleware/authMiddleware.js"

const router = express.Router()

// Library operations
router.post("/save", authMiddleware, libraryController.saveBlogToLibrary)
router.get("/my-library", authMiddleware, libraryController.getUserLibrary)
router.get("/stats", authMiddleware, libraryController.getLibraryStats)
router.put("/:libraryId", authMiddleware, libraryController.updateLibraryEntry)
router.delete("/:libraryId", authMiddleware, libraryController.removeFromLibrary)
router.get("/check/:blogId", authMiddleware, libraryController.checkIfSaved)

// Folder operations
router.post("/folders/create", authMiddleware, libraryController.createFolder)
router.get("/folders/all", authMiddleware, libraryController.getUserFolders)
router.delete("/folders/:folderId", authMiddleware, libraryController.deleteFolder)

export default router
