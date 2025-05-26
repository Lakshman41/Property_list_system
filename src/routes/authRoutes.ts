// src/routes/authRoutes.ts
import express from 'express';
import {
  registerUser,
  loginUser,
  getMe,
} from '../controllers/authController.js'; // Note .js
import { protect } from '../middlewares/authMiddleware.js'; // Will create next

const router = express.Router();
console.log('[[AUTHROUTES.TS]] Auth routes file is being loaded/executed.');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe); // Protect this route

export default router;