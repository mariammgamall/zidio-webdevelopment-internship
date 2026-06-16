import express from 'express';
import { getNotifications, markAsRead, readAll, clearAll } from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getNotifications)
  .delete(clearAll);

router.route('/read-all')
  .put(readAll);

router.route('/:id')
  .put(markAsRead);

export default router;
