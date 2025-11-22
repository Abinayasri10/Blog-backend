import express from "express"
import Course from "../models/Course.js"

const router = express.Router()

// ✅ Get all courses (for SkillBuilder.jsx)
router.get("/", async (req, res) => {
  try {
    const courses = await Course.find()
    res.json({ success: true, courses })
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching courses" })
  }
})

// ✅ Add new course (for AdminDashboard.jsx)
router.post("/", async (req, res) => {
  try {
    const newCourse = new Course(req.body)
    await newCourse.save()
    res.json({ success: true, course: newCourse })
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating course" })
  }
})

export default router
