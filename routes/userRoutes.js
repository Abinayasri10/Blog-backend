import express from "express";
import User from "../models/User.js";
import { updateProfile, updatePassword } from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Get all professionals
router.get("/professionals", async (req, res) => {
  try {
    const professionals = await User.find({
      userType: { $regex: /^professional$/i }
    }).select("-password");

    res.json({ success: true, professionals });
  } catch (error) {
    console.error("Error fetching professionals:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Use authMiddleware instead of protect
router.put("/profile", authMiddleware, updateProfile);

router.put("/password", authMiddleware, updatePassword);

export default router;
