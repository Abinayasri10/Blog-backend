import User from "../models/User.js";
import Blog from "../models/Blog.js";
import Task from "../models/Task.js";
import Journal from "../models/Journal.js";

// Get admin dashboard statistics
export const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const studentUsers = await User.countDocuments({ userType: "student" });
    const professionalUsers = await User.countDocuments({ userType: "professional" });
    const totalBlogs = await Blog.countDocuments();
    const totalTasks = await Task.countDocuments();
    const totalJournals = await Journal.countDocuments();

    res.json({
      success: true,
      stats: {
        totalUsers,
        studentUsers,
        professionalUsers,
        totalBlogs,
        totalTasks,
        totalJournals,
      },
    });
  } catch (error) {
    console.error("Get admin stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all users with pagination and filtering
export const getAllUsers = async (req, res) => {
  try {
    const { userType, search, limit = 10, page = 1 } = req.query;
    let query = {};

    if (userType && userType !== "all") {
      query.userType = userType;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("-password")
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    // Get blogs count for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const blogCount = await Blog.countDocuments({ author: user._id });
        const taskCount = await Task.countDocuments({ user: user._id });
        const journalCount = await Journal.countDocuments({ user: user._id });
        return {
          ...user.toObject(),
          blogCount,
          taskCount,
          journalCount,
        };
      })
    );

    res.json({
      success: true,
      users: usersWithStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalUsers: total,
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all blogs with user details
export const getAllBlogs = async (req, res) => {
  try {
    const { status, search, limit = 10, page = 1 } = req.query;
    let query = {};

    if (status && status !== "all") {
      if (status === "published") {
        query.isDraft = false;
      } else if (status === "draft") {
        query.isDraft = true;
      }
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const blogs = await Blog.find(query)
      .populate("author", "name email userType")
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      blogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalBlogs: total,
      },
    });
  } catch (error) {
    console.error("Get all blogs error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all tasks
export const getAllTasks = async (req, res) => {
  try {
    const { status, limit = 10, page = 1 } = req.query;
    let query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    const tasks = await Task.find(query)
      .populate("user", "name email userType")
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Task.countDocuments(query);

    res.json({
      success: true,
      tasks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalTasks: total,
      },
    });
  } catch (error) {
    console.error("Get all tasks error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all journals
export const getAllJournals = async (req, res) => {
  try {
    const { privacy, limit = 10, page = 1 } = req.query;
    let query = {};

    if (privacy && privacy !== "all") {
      query.privacy = privacy;
    }

    const journals = await Journal.find(query)
      .populate("user", "name email userType")
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ date: -1 });

    const total = await Journal.countDocuments(query);

    res.json({
      success: true,
      journals,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalJournals: total,
      },
    });
  } catch (error) {
    console.error("Get all journals error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get recent users
export const getRecentUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(5);

    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const blogCount = await Blog.countDocuments({ author: user._id });
        return {
          ...user.toObject(),
          blogCount,
        };
      })
    );

    res.json({
      success: true,
      users: usersWithStats,
    });
  } catch (error) {
    console.error("Get recent users error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get content pending approvals (drafts)
export const getPendingContent = async (req, res) => {
  try {
    const blogs = await Blog.find({ isDraft: true })
      .populate("author", "name email userType")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      blogs,
    });
  } catch (error) {
    console.error("Get pending content error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    await User.findByIdAndDelete(userId);
    await Blog.deleteMany({ author: userId });
    await Task.deleteMany({ user: userId });
    await Journal.deleteMany({ user: userId });

    res.json({
      success: true,
      message: "User and all associated data deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Approve blog (publish)
export const approveBlog = async (req, res) => {
  try {
    const { blogId } = req.params;

    const blog = await Blog.findByIdAndUpdate(
      blogId,
      { isDraft: false },
      { new: true }
    ).populate("author", "name email");

    res.json({
      success: true,
      blog,
      message: "Blog approved and published successfully",
    });
  } catch (error) {
    console.error("Approve blog error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Reject/Delete blog
export const rejectBlog = async (req, res) => {
  try {
    const { blogId } = req.params;

    await Blog.findByIdAndDelete(blogId);

    res.json({
      success: true,
      message: "Blog rejected and deleted successfully",
    });
  } catch (error) {
    console.error("Reject blog error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
