import mongoose from 'mongoose';

const connectionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  connectedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'blocked'],
    default: 'accepted'
  },
  connectedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Ensure unique connections (no duplicate connections between same users)
connectionSchema.index({ userId: 1, connectedUserId: 1 }, { unique: true });

export default mongoose.model('Connection', connectionSchema);
