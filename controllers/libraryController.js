import Library from "../models/Library.js"
import LibraryFolder from "../models/LibraryFolder.js"
import Blog from "../models/Blog.js"
import mongoose from "mongoose" // Import mongoose to declare the variable

// Save a blog to library
export const saveBlogToLibrary = async (req, res) => {
  try {
    const userId = req.user._id
    const { blogId, folder } = req.body

    if (!blogId) {
      return res.status(400).json({
        success: false,
        message: "Blog ID is required",
      })
    }

    // Check if blog exists
    const blog = await Blog.findById(blogId)
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      })
    }

    // Check if already saved
    const existing = await Library.findOne({ user: userId, blog: blogId })
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Blog already saved to your library",
      })
    }

    const library = await Library.create({
      user: userId,
      blog: blogId,
      folder: folder || "My Saves",
    })

    await library.populate("blog")

    res.status(201).json({
      success: true,
      message: "Blog saved to library",
      library,
    })
  } catch (error) {
    console.error("Save blog to library error:", error)
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Get user's library
export const getUserLibrary = async (req, res) => {
  try {
    const userId = req.user._id
    const { folder, category, search, limit = 10, page = 1 } = req.query

    const query = { user: userId }

    if (folder && folder !== "all") {
      query.folder = folder
    }

    if (search) {
      const blogs = await Blog.find({
        $or: [
          { title: { $regex: search, $options: "i" } },
          { content: { $regex: search, $options: "i" } },
          { tags: { $regex: search, $options: "i" } },
        ],
      }).select("_id")

      query.blog = { $in: blogs.map((b) => b._id) }
    }

    if (category && category !== "all") {
      const blogs = await Blog.find({ category }).select("_id")
      query.blog = { $in: blogs.map((b) => b._id) }
    }

    const library = await Library.find(query)
      .populate({
        path: "blog",
        populate: { path: "author", select: "name email department userType" },
      })
      .sort({ savedAt: -1 })
      .limit(Number.parseInt(limit))
      .skip((Number.parseInt(page) - 1) * Number.parseInt(limit))

    const total = await Library.countDocuments(query)

    res.json({
      success: true,
      library,
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(total / Number.parseInt(limit)),
        totalItems: total,
      },
    })
  } catch (error) {
    console.error("Get user library error:", error)
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Get library stats
export const getLibraryStats = async (req, res) => {
  try {
    const userId = req.user._id

    const totalSaved = await Library.countDocuments({ user: userId })
    const folders = await LibraryFolder.countDocuments({ user: userId })

    // This week saves
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const thisWeek = await Library.countDocuments({
      user: userId,
      savedAt: { $gte: oneWeekAgo },
    })

    // Get most active folder
    const topFolder = await Library.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId) } },
      { $group: { _id: "$folder", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ])

    res.json({
      success: true,
      stats: {
        totalSaved,
        folders,
        thisWeek,
        mostActiveFolder: topFolder.length > 0 ? topFolder[0]._id : "None",
      },
    })
  } catch (error) {
    console.error("Get library stats error:", error)
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Create folder
export const createFolder = async (req, res) => {
  try {
    const userId = req.user._id
    const { name, description, color } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Folder name is required",
      })
    }

    // Check if folder already exists
    const existing = await LibraryFolder.findOne({ user: userId, name: name.trim() })
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Folder with this name already exists",
      })
    }

    const folder = await LibraryFolder.create({
      user: userId,
      name: name.trim(),
      description: description || "",
      color: color || "bg-blue-500",
    })

    res.status(201).json({
      success: true,
      message: "Folder created successfully",
      folder,
    })
  } catch (error) {
    console.error("Create folder error:", error)
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Get user's folders
export const getUserFolders = async (req, res) => {
  try {
    const userId = req.user._id

    const folders = await LibraryFolder.find({ user: userId }).sort({ createdAt: -1 })

    // Count items in each folder
    const foldersWithCounts = await Promise.all(
      folders.map(async (folder) => {
        const count = await Library.countDocuments({
          user: userId,
          folder: folder.name,
        })
        return {
          ...folder.toObject(),
          count,
        }
      }),
    )

    res.json({
      success: true,
      folders: foldersWithCounts,
    })
  } catch (error) {
    console.error("Get user folders error:", error)
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Update library entry (move to different folder or add notes)
export const updateLibraryEntry = async (req, res) => {
  try {
    const userId = req.user._id
    const { libraryId } = req.params
    const { folder, notes } = req.body

    const library = await Library.findOne({ _id: libraryId, user: userId })
    if (!library) {
      return res.status(404).json({
        success: false,
        message: "Library entry not found",
      })
    }

    if (folder) library.folder = folder
    if (notes !== undefined) library.notes = notes

    await library.save()

    res.json({
      success: true,
      message: "Library entry updated",
      library,
    })
  } catch (error) {
    console.error("Update library entry error:", error)
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Remove blog from library
export const removeFromLibrary = async (req, res) => {
  try {
    const userId = req.user._id
    const { libraryId } = req.params

    const library = await Library.findOne({ _id: libraryId, user: userId })
    if (!library) {
      return res.status(404).json({
        success: false,
        message: "Library entry not found",
      })
    }

    await Library.findByIdAndDelete(libraryId)

    res.json({
      success: true,
      message: "Blog removed from library",
    })
  } catch (error) {
    console.error("Remove from library error:", error)
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Delete folder
export const deleteFolder = async (req, res) => {
  try {
    const userId = req.user._id
    const { folderId } = req.params

    const folder = await LibraryFolder.findOne({ _id: folderId, user: userId })
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: "Folder not found",
      })
    }

    // Move all items in this folder to 'My Saves'
    await Library.updateMany({ user: userId, folder: folder.name }, { folder: "My Saves" })

    await LibraryFolder.findByIdAndDelete(folderId)

    res.json({
      success: true,
      message: "Folder deleted successfully",
    })
  } catch (error) {
    console.error("Delete folder error:", error)
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Check if blog is saved
export const checkIfSaved = async (req, res) => {
  try {
    const userId = req.user._id
    const { blogId } = req.params

    const saved = await Library.findOne({ user: userId, blog: blogId })

    res.json({
      success: true,
      isSaved: !!saved,
      libraryId: saved?._id,
    })
  } catch (error) {
    console.error("Check if saved error:", error)
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}
