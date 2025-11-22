import mongoose from "mongoose"

const materialSchema = new mongoose.Schema({
  type: String, // "video", "pdf", etc.
  label: String,
  url: String,
})

const quizSchema = new mongoose.Schema({
  question: String,
  options: [String],
  answer: String,
})

const moduleSchema = new mongoose.Schema({
  id: Number,
  title: String,
  content: String,
  materials: [materialSchema],
  quiz: [quizSchema],
})

const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  modules: [moduleSchema],
})

const Course = mongoose.model("Course", courseSchema)
export default Course
