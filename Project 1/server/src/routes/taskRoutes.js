import express from 'express';
import { createTask, getTasks, getBoardTasks, updateTask, deleteTask } from '../controllers/taskController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .post(createTask)
  .get(getTasks);

router.route('/board')
  .get(getBoardTasks);

router.route('/:id')
  .put(updateTask)
  .delete(deleteTask);

export default router;
