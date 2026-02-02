import { Router } from 'express';
import * as Controller from './auth.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.post('/login', Controller.login);
router.post('/users', authenticate, Controller.createUser);
router.get('/me', authenticate, Controller.getMe);
router.post('/logout', Controller.logout);

export default router;
