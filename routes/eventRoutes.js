import express from 'express';
import * as eventController from '../controllers/eventController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Event CRUD routes
router.post('/', authMiddleware, eventController.createEvent);
router.get('/', eventController.getAllEvents);
router.get('/stats', eventController.getEventStats);
router.get('/:id', eventController.getEventById);
router.put('/:id', authMiddleware, eventController.updateEvent);
router.delete('/:id', authMiddleware, eventController.deleteEvent);

// Registration routes
router.post('/:id/register', authMiddleware, eventController.registerEvent);
router.post('/:id/unregister', authMiddleware, eventController.unregisterEvent);

export default router;
