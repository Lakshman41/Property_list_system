// src/routes/propertyRoutes.ts
import express from 'express';
import {
  getAllProperties,
  getPropertyById,
  createProperty,
  updatePropertyById,
  deletePropertyById,
} from '../controllers/propertyController.js';
import { protect } from '../middlewares/authMiddleware.js'; // <-- IMPORT

const router = express.Router();
console.log('[[PROROUTES.TS]] Property routes file is being loaded/executed.');

router.use((req, res, next) => {
    console.log(`[[PROROUTES.TS]] Request received by propertyRoutes for path: ${req.path}, method: ${req.method}`);
    next();
});

router.route('/')
  .get(getAllProperties) // Stays public
  .post(protect, createProperty); // Now protected

router.route('/:id')
  .get(getPropertyById) // Stays public
  .put(protect, updatePropertyById)    // Now protected
  .delete(protect, deletePropertyById); // Now protected

export default router;