// src/controllers/userController.ts
import { Request, Response, NextFunction } from 'express';
import User, { IUser , IRecommendation } from '../models/User.js';
import Property, { IProperty } from '../models/Property.js'; // Needed to validate property existence
import mongoose, { Types as MongooseTypes } from 'mongoose'; 

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

// @desc    Recommend a property to another registered user
// @route   POST /api/v1/users/me/recommend/:propertyId  (Body: { recipientEmail, message? })
// @access  Private
export const recommendProperty = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const recommendingUserObject = req.user; // Typed as IUser | undefined
  const { propertyId: propertyIdParam } = req.params;
  const { recipientEmail, message } = req.body;

  console.log(`[[USERCONTROLLER.TS]] User ${recommendingUserObject?._id} recommending property ${propertyIdParam} to email ${recipientEmail}`);

  try {
    if (!recommendingUserObject || !recommendingUserObject._id) {
      res.status(401).json({ success: false, message: 'Not authorized, user information missing' });
      return;
    }
    const recommendingUserId = recommendingUserObject._id as MongooseTypes.ObjectId; // Cast to ObjectId

    if (!recipientEmail) {
      res.status(400).json({ success: false, message: 'Recipient email is required in the request body' });
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(propertyIdParam)) {
      res.status(400).json({ success: false, message: 'Invalid property ID format' });
      return;
    }
    const propertyObjectId = new MongooseTypes.ObjectId(propertyIdParam);


    const recipientUserDoc: IUser | null = await User.findOne({ email: (recipientEmail as string).toLowerCase() }).exec();

    if (!recipientUserDoc) {
      res.status(404).json({ success: false, message: `User with email ${recipientEmail} not found` });
      return;
    }
    const recipientUserId = recipientUserDoc._id as MongooseTypes.ObjectId; // Cast to ObjectId

    // ---RUNTIME TYPE CHECKS ---
    console.log(`Runtime type of recommendingUserId: ${typeof recommendingUserId}, is ObjectId: ${recommendingUserId instanceof MongooseTypes.ObjectId}`);
    console.log(`Value of recommendingUserId: ${recommendingUserId}`);
    console.log(`Runtime type of recipientUserId: ${typeof recipientUserId}, is ObjectId: ${recipientUserId instanceof MongooseTypes.ObjectId}`);
    console.log(`Value of recipientUserId: ${recipientUserId}`);
    // --- END RUNTIME TYPE CHECKS ---

    if (recipientUserId.equals(recommendingUserId)) {
        res.status(400).json({ success: false, message: 'You cannot recommend a property to yourself.' });
        return;
    }

    const propertyExistsDoc: IProperty | null = await Property.findById(propertyObjectId).exec();
    if (!propertyExistsDoc) {
      res.status(404).json({ success: false, message: 'Property to recommend not found' });
      return;
    }
    const existingPropertyId = propertyExistsDoc._id as MongooseTypes.ObjectId; // Cast to ObjectId

    const alreadyRecommended = recipientUserDoc.recommendationsReceived.find(
        (rec: IRecommendation) => {
            const recPropertyId = rec.property as MongooseTypes.ObjectId;
            const recRecommendedById = rec.recommendedBy as MongooseTypes.ObjectId;
            return recPropertyId.equals(existingPropertyId) && recRecommendedById.equals(recommendingUserId);
        }
    );

    if (alreadyRecommended) {
        res.status(400).json({ success: false, message: 'You have already recommended this property to this user.' });
        return;
    }

    const newRecommendation: Partial<IRecommendation> = {
      property: existingPropertyId,
      recommendedBy: recommendingUserId,
      message: message || undefined,
    };

    recipientUserDoc.recommendationsReceived.unshift(newRecommendation as IRecommendation);
    await recipientUserDoc.save();

    res.status(200).json({ success: true, message: `Property "${propertyExistsDoc.title}" recommended to ${recipientEmail}` });

  } catch (error) {
    console.error('[[USERCONTROLLER.TS]] Error in recommendProperty:', error);
    next(error);
  }
};

// @desc    Get properties recommended to the current user
// @route   GET /api/v1/users/me/recommendations
// @access  Private
export const getReceivedRecommendations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const currentUser = req.user; // Typed as IUser | undefined
  console.log(`[[USERCONTROLLER.TS]] getReceivedRecommendations for user: ${currentUser?._id}`);
  try {
    if (!currentUser || !currentUser._id) {
      res.status(401).json({ success: false, message: 'Not authorized' });
      return;
    }
    // currentUser is IUser, currentUser._id is mongoose.Types.ObjectId

    const userWithRecommendations = await User.findById(currentUser._id)
      .populate<{ recommendationsReceived: (IRecommendation & { property: IProperty, recommendedBy: Pick<IUser, 'name' | 'email' | '_id'> })[] }>([
        {
          path: 'recommendationsReceived.property',
          model: 'Property',
          select: 'title price locationCity imageUrl propertyType originalId',
        },
        {
          path: 'recommendationsReceived.recommendedBy',
          model: 'User',
          select: 'name email',
        }
      ])
      .exec();

    if (!userWithRecommendations) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    
    const sortedRecommendations = userWithRecommendations.recommendationsReceived.sort(
        (a, b) => b.recommendedAt.getTime() - a.recommendedAt.getTime()
    );

    res.status(200).json({ success: true, count: sortedRecommendations.length, data: sortedRecommendations });
  } catch (error) {
    console.error('[[USERCONTROLLER.TS]] Error in getReceivedRecommendations:', error);
    next(error);
  }
};