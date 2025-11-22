import Connection from '../models/Connection.js';
import ConnectionRequest from '../models/ConnectionRequest.js';
import User from '../models/User.js';

// Send connection request
export const sendConnectionRequest = async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    const senderId = req.user._id;

    // Check if already connected
    const existingConnection = await Connection.findOne({
      $or: [
        { userId: senderId, connectedUserId: receiverId },
        { userId: receiverId, connectedUserId: senderId }
      ]
    });

    if (existingConnection) {
      return res.status(400).json({
        success: false,
        message: 'Already connected with this user'
      });
    }

    // Check if request already exists
    const existingRequest = await ConnectionRequest.findOne({
      senderId,
      receiverId,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Connection request already sent'
      });
    }

    const connectionRequest = new ConnectionRequest({
      senderId,
      receiverId,
      message
    });

    await connectionRequest.save();

    res.status(201).json({
      success: true,
      message: 'Connection request sent successfully',
      data: connectionRequest
    });
  } catch (error) {
    console.error('Error sending connection request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send connection request',
      error: error.message
    });
  }
};

// Get pending connection requests
export const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await ConnectionRequest.find({
      receiverId: userId,
      status: 'pending'
    })
      .populate('senderId', 'name email profession department userType bio')
      .sort({ sentAt: -1 });

    res.status(200).json({
      success: true,
      data: requests,
      count: requests.length
    });
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending requests',
      error: error.message
    });
  }
};

// Accept connection request
export const acceptConnectionRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const userId = req.user._id;

    const request = await ConnectionRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Connection request not found'
      });
    }

    if (request.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to accept this request'
      });
    }

    // Update request status
    request.status = 'accepted';
    request.respondedAt = new Date();
    await request.save();

    // Create connection (both directions)
    const connection1 = new Connection({
      userId: request.senderId,
      connectedUserId: userId,
      status: 'accepted'
    });

    const connection2 = new Connection({
      userId: userId,
      connectedUserId: request.senderId,
      status: 'accepted'
    });

    await connection1.save();
    await connection2.save();

    res.status(200).json({
      success: true,
      message: 'Connection request accepted',
      data: request
    });
  } catch (error) {
    console.error('Error accepting connection request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept connection request',
      error: error.message
    });
  }
};

// Reject connection request
export const rejectConnectionRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const userId = req.user._id;

    const request = await ConnectionRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Connection request not found'
      });
    }

    if (request.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to reject this request'
      });
    }

    request.status = 'rejected';
    request.respondedAt = new Date();
    await request.save();

    res.status(200).json({
      success: true,
      message: 'Connection request rejected',
      data: request
    });
  } catch (error) {
    console.error('Error rejecting connection request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject connection request',
      error: error.message
    });
  }
};

// Get all connections
export const getConnections = async (req, res) => {
  try {
    const userId = req.user._id;
    const { search, userType } = req.query;

    let query = { userId };

    const connections = await Connection.find(query)
      .populate('connectedUserId')
      .sort({ connectedAt: -1 });

    // Filter by search term and userType
    let filteredConnections = connections.filter(conn => {
      const user = conn.connectedUserId;
      const matchesSearch = !search || 
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        (user.profession && user.profession.toLowerCase().includes(search.toLowerCase()));
      
      const matchesType = !userType || user.userType === userType;
      
      return matchesSearch && matchesType;
    });

    res.status(200).json({
      success: true,
      data: filteredConnections,
      count: filteredConnections.length
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch connections',
      error: error.message
    });
  }
};

// Remove connection
export const removeConnection = async (req, res) => {
  try {
    const { connectedUserId } = req.body;
    const userId = req.user._id;

    // Delete both directions of connection
    await Connection.deleteMany({
      $or: [
        { userId, connectedUserId },
        { userId: connectedUserId, connectedUserId: userId }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Connection removed successfully'
    });
  } catch (error) {
    console.error('Error removing connection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove connection',
      error: error.message
    });
  }
};

// Get connection status between two users
export const getConnectionStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Check if connected
    const connection = await Connection.findOne({
      userId: currentUserId,
      connectedUserId: userId
    });

    if (connection) {
      return res.status(200).json({
        success: true,
        status: 'connected'
      });
    }

    // Check if request pending
    const request = await ConnectionRequest.findOne({
      $or: [
        { senderId: currentUserId, receiverId: userId, status: 'pending' },
        { senderId: userId, receiverId: currentUserId, status: 'pending' }
      ]
    });

    if (request) {
      return res.status(200).json({
        success: true,
        status: request.senderId.toString() === currentUserId.toString() ? 'pending_sent' : 'pending_received'
      });
    }

    res.status(200).json({
      success: true,
      status: 'not_connected'
    });
  } catch (error) {
    console.error('Error checking connection status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check connection status',
      error: error.message
    });
  }
};

// Get users available to connect (excluding connected and self)
export const getAvailableUsers = async (req, res) => {
  try {
    const userId = req.user._id;
    const { search, userType } = req.query;

    // Get all connected users
    const connections = await Connection.find({ userId }).select('connectedUserId');
    const connectedIds = connections.map(c => c.connectedUserId);
    
    // Get all pending requests
    const pendingRequests = await ConnectionRequest.find({
      $or: [
        { senderId: userId, status: 'pending' },
        { receiverId: userId, status: 'pending' }
      ]
    });
    
    const pendingIds = pendingRequests.map(r => 
      r.senderId.toString() === userId.toString() ? r.receiverId : r.senderId
    );

    // Exclude self, connected users, and pending requests
    const excludeIds = [userId, ...connectedIds, ...pendingIds];

    let query = { _id: { $nin: excludeIds } };

    if (userType) {
      query.userType = userType;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { profession: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('name email profession department userType bio')
      .limit(20);

    res.status(200).json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('Error fetching available users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available users',
      error: error.message
    });
  }
};
