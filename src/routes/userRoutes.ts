// src/routes/userRoutes.ts
import express from 'express';
import {
  addFavoriteProperty,
  removeFavoriteProperty,
  getFavoriteProperties,
} from '../controllers/userController.js'; // Note .js
import { protect } from '../middlewares/authMiddleware.js'; // Your auth middleware

const router = express.Router();
console.log('[[USERROUTES.TS]] User routes file is being loaded/executed.');

// All routes below are protected
router.use(protect); // Apply protect middleware to all routes in this file

router.route('/me/favorites')
  .get(getFavoriteProperties);

router.route('/me/favorites/:propertyId')
  .post(addFavoriteProperty)
  .delete(removeFavoriteProperty);

// Later, for recommendations:
// router.post('/me/recommendations/:propertyId/to/:recipientEmail', recommendPropertyToUser);
// router.get('/me/recommendations/received', getReceivedRecommendations);

export default router;