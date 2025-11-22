
import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  content: { 
    type: String, 
    required: true,
    trim: true
  },
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  replies: [{
    content: { 
      type: String, 
      required: true,
      trim: true
    },
    author: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    createdAt: { 
      type: Date, 
      default: Date.now 
    }
  }]
});

const blogSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 200
  },
  content: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String, 
    default: 'Other',
    enum: ['Technology', 'Lifestyle', 'Travel', 'Food', 'Health', 'Business', 'Education', 'Entertainment', 'Sports', 'Other']
  },
  tags: [{ 
    type: String, 
    trim: true,
    maxlength: 50
  }],
  visibility: { 
    type: String, 
    enum: ['public', 'friends', 'private'], 
    default: 'public' 
  },
  isDraft: { 
    type: Boolean, 
    default: false 
  },
  coverImage: { 
    type: String 
  },
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  likes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  views: { 
    type: Number, 
    default: 0 
  },
  comments: [commentSchema]
}, { 
  timestamps: true 
});

// Indexes for better performance
blogSchema.index({ title: 'text', content: 'text' });
blogSchema.index({ author: 1, createdAt: -1 });
blogSchema.index({ visibility: 1, isDraft: 1 });

export default mongoose.model('Blog', blogSchema);
