import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  sendConnectionRequest,
  getPendingRequests,
  acceptConnectionRequest,
  rejectConnectionRequest,
  getConnections,
  removeConnection,
  getConnectionStatus,
  getAvailableUsers
} from '../controllers/connectionController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Connection request endpoints
router.post('/request/send', sendConnectionRequest);
router.get('/requests/pending', getPendingRequests);
router.post('/request/accept', acceptConnectionRequest);
router.post('/request/reject', rejectConnectionRequest);

// Connection management
router.get('/', getConnections);
router.post('/remove', removeConnection);
router.get('/status/:userId', getConnectionStatus);
router.get('/available-users', getAvailableUsers);

export default router;
