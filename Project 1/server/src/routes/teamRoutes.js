import express from 'express';
import { createTeam, getTeams, inviteMember } from '../controllers/teamController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .post(createTeam)
  .get(getTeams);

router.route('/:id/invite')
  .post(inviteMember);

export default router;
