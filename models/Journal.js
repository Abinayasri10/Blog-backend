import mongoose from "mongoose"

const journalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    mood: { type: String, enum: ["happy", "neutral", "sad"], default: "neutral" },
    tags: [{ type: String }],
    privacy: {
      type: String,
      enum: ["private", "public", "friends"],
      default: "private",
    },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

const Journal = mongoose.model("Journal", journalSchema)
export default Journal
