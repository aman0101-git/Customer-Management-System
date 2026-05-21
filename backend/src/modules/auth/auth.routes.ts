import { Router } from 'express';
import * as Controller from './auth.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { loginRateLimiter } from '../../middlewares/rateLimiter.middleware.js';

const router = Router();

// Phase 9: loginRateLimiter applied before the login handler.
// 10 attempts per IP per 15 min window — brute force protection.
router.post('/login', loginRateLimiter, Controller.login);
router.post('/users', authenticate, Controller.createUser);
router.get('/me', authenticate, Controller.getMe);
router.post('/logout', Controller.logout);

export default router;
