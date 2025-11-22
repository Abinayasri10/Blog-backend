import mongoose from "mongoose"

const librarySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    blog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Blog",
      required: true,
    },
    folder: {
      type: String,
      default: "My Saves",
    },
    notes: {
      type: String,
      default: "",
    },
    savedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
)

// Index for faster queries
librarySchema.index({ user: 1, blog: 1 })
librarySchema.index({ user: 1, folder: 1 })

export default mongoose.model("Library", librarySchema)
