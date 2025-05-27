// src/routes/userRoutes.ts
import express from 'express';
import {
  addFavoriteProperty,
  removeFavoriteProperty,
  getFavoriteProperties,
  recommendProperty, // <-- ADD
  getReceivedRecommendations, // <-- ADD
} from '../controllers/userController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();
console.log('[[USERROUTES.TS]] User routes file is being loaded/executed.');

router.use(protect); // Apply protect middleware to all routes in this file

// --- Favorites Routes ---
router.route('/me/favorites')
  .get(getFavoriteProperties);

router.route('/me/favorites/:propertyId')
  .post(addFavoriteProperty)
  .delete(removeFavoriteProperty);

// --- Recommendation Routes ---
// Expects { recipientEmail: string, message?: string } in the request body
router.post('/me/recommend/:propertyId', recommendProperty);

router.get('/me/recommendations', getReceivedRecommendations);


export default router;