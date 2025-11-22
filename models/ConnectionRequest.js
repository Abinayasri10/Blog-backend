import mongoose from 'mongoose';

const connectionRequestSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
    default: 'pending'
  },
  message: {
    type: String,
    default: ''
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Prevent duplicate requests
connectionRequestSchema.index({ senderId: 1, receiverId: 1, status: 1 }, { unique: false });

export default mongoose.model('ConnectionRequest', connectionRequestSchema);
