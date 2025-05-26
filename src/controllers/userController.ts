// src/controllers/userController.ts
import { Request, Response, NextFunction } from 'express';
import User, { IUser } from '../models/User.js';
import Property, { IProperty } from '../models/Property.js'; // Needed to validate property existence
import mongoose from 'mongoose';

// @desc    Add a property to user's favorites
// @route   POST /api/v1/users/me/favorites/:propertyId
// @access  Private
export const addFavoriteProperty = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log(`[[USERCONTROLLER.TS]] addFavoriteProperty for user: ${req.user?._id}, property: ${req.params.propertyId}`);
  try {
    const userId = req.user?._id; // From protect middleware
    const { propertyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      res.status(400).json({ success: false, message: 'Invalid property ID format' });
      return;
    }

    // Check if property exists
    const propertyExists = await Property.findById(propertyId);
    if (!propertyExists) {
      res.status(404).json({ success: false, message: 'Property not found' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      // Should not happen if protect middleware is working
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Add to favorites if not already there
    if (user.favorites.includes(new mongoose.Types.ObjectId(propertyId))) {
      res.status(400).json({ success: false, message: 'Property already in favorites' });
      return;
    }

    user.favorites.push(new mongoose.Types.ObjectId(propertyId));
    await user.save();

    res.status(200).json({ success: true, message: 'Property added to favorites', data: user.favorites });
  } catch (error) {
    console.error('[[USERCONTROLLER.TS]] Error in addFavoriteProperty:', error);
    next(error);
  }
};

// @desc    Remove a property from user's favorites
// @route   DELETE /api/v1/users/me/favorites/:propertyId
// @access  Private
export const removeFavoriteProperty = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log(`[[USERCONTROLLER.TS]] removeFavoriteProperty for user: ${req.user?._id}, property: ${req.params.propertyId}`);
  try {
    const userId = req.user?._id;
    const { propertyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      res.status(400).json({ success: false, message: 'Invalid property ID format' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Remove from favorites
    const initialLength = user.favorites.length;
    user.favorites = user.favorites.filter(
      (favId) => favId.toString() !== propertyId
    );

    if (user.favorites.length === initialLength) {
        res.status(404).json({ success: false, message: 'Property not found in favorites' });
        return;
    }

    await user.save();

    res.status(200).json({ success: true, message: 'Property removed from favorites', data: user.favorites });
  } catch (error) {
    console.error('[[USERCONTROLLER.TS]] Error in removeFavoriteProperty:', error);
    next(error);
  }
};

// @desc    Get current user's favorite properties
// @route   GET /api/v1/users/me/favorites
// @access  Private
export const getFavoriteProperties = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log(`[[USERCONTROLLER.TS]] getFavoriteProperties for user: ${req.user?._id}`);
  try {
    const userId = req.user?._id;
    const user = await User.findById(userId).populate<{ favorites: IProperty[] }>({
        path: 'favorites',
        model: 'Property' // Explicitly specify model name if needed, Mongoose usually infers from ref
        // select: 'title price locationCity propertyType imageUrl' // Select specific fields to return
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.status(200).json({ success: true, count: user.favorites.length, data: user.favorites });
  } catch (error) {
    console.error('[[USERCONTROLLER.TS]] Error in getFavoriteProperties:', error);
    next(error);
  }
};