// Fixed blogController.js with proper Cloudinary config
import Blog from "../models/Blog.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configure Cloudinary with proper error handling
const configureCloudinary = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error('Missing Cloudinary credentials:');
    console.error('CLOUD_NAME:', CLOUDINARY_CLOUD_NAME ? 'Set' : 'Missing');
    console.error('API_KEY:', CLOUDINARY_API_KEY ? 'Set' : 'Missing');
    console.error('API_SECRET:', CLOUDINARY_API_SECRET ? 'Set' : 'Missing');
    throw new Error('Cloudinary credentials not properly configured');
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true
  });
  
  console.log('✅ Cloudinary configured successfully');
};

// Initialize Cloudinary
try {
  configureCloudinary();
} catch (error) {
  console.error('❌ Cloudinary configuration failed:', error.message);
}

// Helper function to clean up uploaded files
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Deleted temporary file:', filePath);
    }
  } catch (error) {
    console.error('Error deleting file:', error.message);
  }
};

// Create new blog
export const createBlog = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('Creating blog for user:', userId);
    console.log('Request body:', req.body);
    console.log('Uploaded file:', req.file);

    let { title, content, category, tags, visibility, isDraft } = req.body;

    // Handle JSON stringified data from FormData
    if (typeof tags === 'string') {
      try {
        tags = JSON.parse(tags);
      } catch (e) {
        tags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
    }

    // Convert string boolean to actual boolean
    if (typeof isDraft === 'string') {
      isDraft = isDraft === 'true';
    }

    // Validation
    if (!title?.trim() || !content?.trim()) {
      if (req.file) deleteFile(req.file.path);
      return res.status(400).json({ 
        success: false, 
        message: "Title and content are required" 
      });
    }

    let uploadedImageUrl;
    if (req.file) {
      try {
        console.log('Uploading image to Cloudinary...');
        console.log('File path:', req.file.path);
        
        // Verify Cloudinary is configured before upload
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
          throw new Error('Cloudinary credentials not configured');
        }

        const result = await cloudinary.uploader.upload(req.file.path, { 
          folder: "blog-images",
          transformation: [
            { width: 1200, height: 800, crop: "limit" },
            { quality: "auto:good" }
          ],
          resource_type: "auto"
        });
        
        uploadedImageUrl = result.secure_url;
        console.log('✅ Image uploaded successfully:', uploadedImageUrl);
        
        // Delete temporary file
        deleteFile(req.file.path);
      } catch (uploadError) {
        console.error('❌ Cloudinary upload error:', uploadError);
        deleteFile(req.file.path);
        
        // Continue without image instead of failing completely
        console.warn('Continuing blog creation without image due to upload error');
        uploadedImageUrl = undefined;
      }
    }

    const blog = await Blog.create({
      title: title.trim(),
      content: content.trim(),
      category: category || "Other",
      tags: Array.isArray(tags) ? tags : [],
      visibility: visibility || "public",
      isDraft: isDraft || false,
      coverImage: uploadedImageUrl,
      author: userId
    });

    await blog.populate("author", "name email");
    
    console.log('✅ Blog created successfully:', blog._id);
    res.status(201).json({ 
      success: true, 
      blog,
      message: uploadedImageUrl 
        ? 'Blog created successfully with image' 
        : 'Blog created successfully (image upload failed but post was saved)'
    });
  } catch (error) {
    console.error("Create blog error:", error);
    if (req.file) deleteFile(req.file.path);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ 
        success: false, 
        message: `Validation error: ${messages}` 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create blog'
    });
  }
};

// Test Cloudinary connection endpoint
export const testCloudinary = async (req, res) => {
  try {
    // Test upload a simple text file
    const result = await cloudinary.uploader.upload("data:text/plain;base64,SGVsbG8gV29ybGQ=", {
      folder: "test",
      resource_type: "raw"
    });
    
    // Delete the test file
    await cloudinary.uploader.destroy(result.public_id, { resource_type: "raw" });
    
    res.json({
      success: true,
      message: 'Cloudinary connection successful',
      cloudName: process.env.CLOUDINARY_CLOUD_NAME
    });
  } catch (error) {
    console.error('Cloudinary test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Cloudinary connection failed',
      error: error.message
    });
  }
};

export const getBlogs = async (req, res) => {
  try {
    const { category, search, limit = 10, page = 1 } = req.query;
    let query = { isDraft: false, visibility: "public" };

    if (category && category !== "all") {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } }
      ];
    }

    const blogs = await Blog.find(query)
      .populate("author", "name email")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      blogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalBlogs: total
      }
    });
  } catch (error) {
    console.error("Get blogs error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Get user's own blogs
export const getUserBlogs = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('Fetching blogs for user:', userId);

    const blogs = await Blog.find({ author: userId })
      .populate("author", "name email")
      .sort({ createdAt: -1 });

    console.log(`Found ${blogs.length} blogs for user`);
    res.json({ success: true, blogs });
  } catch (error) {
    console.error("Get user blogs error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Get blog by ID
export const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate("author", "name email")
      .populate("comments.author", "name email")
      .populate("comments.replies.author", "name email");

    if (!blog) {
      return res.status(404).json({ 
        success: false, 
        message: "Blog not found" 
      });
    }

    // Increment views
    blog.views = (blog.views || 0) + 1;
    await blog.save();

    res.json({ success: true, blog });
  } catch (error) {
    console.error("Get blog by ID error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Update blog
export const updateBlog = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('Updating blog:', req.params.id, 'by user:', userId);

    const blog = await Blog.findOne({ 
      _id: req.params.id, 
      author: userId 
    });
    
    if (!blog) {
      if (req.file) deleteFile(req.file.path);
      return res.status(404).json({ 
        success: false, 
        message: "Blog not found or you don't have permission to edit it" 
      });
    }

    let { title, content, category, tags, visibility, isDraft } = req.body;

    // Handle JSON stringified data from FormData
    if (typeof tags === 'string') {
      try {
        tags = JSON.parse(tags);
      } catch (e) {
        tags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
    }

    // Convert string boolean to actual boolean
    if (typeof isDraft === 'string') {
      isDraft = isDraft === 'true';
    }

    // Handle new image upload
    let uploadedImageUrl = blog.coverImage;
    if (req.file) {
      try {
        // Delete old image from Cloudinary
        if (blog.coverImage) {
          try {
            const publicId = blog.coverImage.split('/').pop().split('.')[0];
            await cloudinary.v2.uploader.destroy(`blog-images/${publicId}`);
            console.log('Deleted old image from Cloudinary');
          } catch (deleteError) {
            console.error('Error deleting old image:', deleteError);
          }
        }

        // Upload new image
        const result = await cloudinary.v2.uploader.upload(req.file.path, { 
          folder: "blog-images",
          transformation: [
            { width: 1200, height: 800, crop: "limit" },
            { quality: "auto:good" }
          ]
        });
        uploadedImageUrl = result.secure_url;
        
        // Delete temporary file
        deleteFile(req.file.path);
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        deleteFile(req.file.path);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload new image'
        });
      }
    }

    // Update blog fields
    Object.assign(blog, {
      title: title?.trim() || blog.title,
      content: content?.trim() || blog.content,
      category: category || blog.category,
      tags: Array.isArray(tags) ? tags : blog.tags,
      visibility: visibility || blog.visibility,
      isDraft: isDraft !== undefined ? isDraft : blog.isDraft,
      coverImage: uploadedImageUrl
    });

    await blog.save();
    await blog.populate("author", "name email");

    console.log('Blog updated successfully');
    res.json({ success: true, blog });
  } catch (error) {
    console.error('Update blog error:', error);
    if (req.file) deleteFile(req.file.path);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ 
        success: false, 
        message: `Validation error: ${messages}` 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Delete blog
export const deleteBlog = async (req, res) => {
  try {
    const userId = req.user._id;
    const blog = await Blog.findOne({ 
      _id: req.params.id, 
      author: userId 
    });
    
    if (!blog) {
      return res.status(404).json({ 
        success: false, 
        message: "Blog not found or you don't have permission to delete it" 
      });
    }

    // Delete image from Cloudinary if exists
    if (blog.coverImage) {
      try {
        const publicId = blog.coverImage.split('/').pop().split('.')[0];
        await cloudinary.v2.uploader.destroy(`blog-images/${publicId}`);
        console.log('Deleted image from Cloudinary');
      } catch (cloudinaryError) {
        console.error('Error deleting image from Cloudinary:', cloudinaryError);
      }
    }

    await Blog.findByIdAndDelete(req.params.id);
    console.log('Blog deleted successfully');
    res.json({ success: true, message: "Blog deleted successfully" });
  } catch (error) {
    console.error('Delete blog error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Like/Unlike blog
export const likeBlog = async (req, res) => {
  try {
    const userId = req.user._id;
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ 
        success: false, 
        message: "Blog not found" 
      });
    }

    const isLiked = blog.likes.some(like => like.toString() === userId.toString());

    if (isLiked) {
      blog.likes = blog.likes.filter(like => like.toString() !== userId.toString());
    } else {
      blog.likes.push(userId);
    }

    await blog.save();
    
    res.json({ 
      success: true, 
      isLiked: !isLiked, 
      likesCount: blog.likes.length 
    });
  } catch (error) {
    console.error('Like blog error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Add comment
export const addComment = async (req, res) => {
  try {
    const { content, parentCommentId } = req.body;
    const userId = req.user._id;
    
    if (!content?.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: "Comment content is required" 
      });
    }

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ 
        success: false, 
        message: "Blog not found" 
      });
    }

    if (parentCommentId) {
      const comment = blog.comments.id(parentCommentId);
      if (!comment) {
        return res.status(404).json({ 
          success: false, 
          message: "Parent comment not found" 
        });
      }
      
      comment.replies.push({
        content: content.trim(),
        author: userId
      });
    } else {
      blog.comments.push({
        content: content.trim(),
        author: userId
      });
    }

    await blog.save();
    await blog.populate("comments.author", "name email");
    await blog.populate("comments.replies.author", "name email");

    res.json({ success: true, comments: blog.comments });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Get comments
export const getComments = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate("comments.author", "name email")
      .populate("comments.replies.author", "name email")
      .select("comments");

    if (!blog) {
      return res.status(404).json({ 
        success: false, 
        message: "Blog not found" 
      });
    }

    res.json({ success: true, comments: blog.comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Delete comment
export const deleteComment = async (req, res) => {
  try {
    const userId = req.user._id;
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ 
        success: false, 
        message: "Blog not found" 
      });
    }

    const comment = blog.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ 
        success: false, 
        message: "Comment not found" 
      });
    }

    // Check if user owns the comment or the blog
    const canDelete = comment.author.toString() === userId.toString() || 
                     blog.author.toString() === userId.toString();

    if (!canDelete) {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to delete this comment" 
      });
    }

    blog.comments.id(req.params.commentId).remove();
    await blog.save();

    res.json({ success: true, message: "Comment deleted successfully" });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
}; 