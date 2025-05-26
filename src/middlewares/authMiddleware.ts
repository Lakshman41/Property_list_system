// src/middlewares/authMiddleware.ts
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User, { IUser } from '../models/User.js'; // Note .js
// import ApiError from '../utils/apiError.js'; // For custom errors

// Extend Express Request type to include 'user'
declare global {
  namespace Express {
    interface Request {
      user?: IUser; // Or just { id: string; } if you only need the ID
    }
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let token;
  console.log('[[AUTH MIDDLEWARE]] protect middleware called');

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  }
  // Else if check for token in cookie (optional)
  // else if (req.cookies.token) {
  //   token = req.cookies.token;
  // }

  // Make sure token exists
  if (!token) {
    console.log('[[AUTH MIDDLEWARE]] No token found');
    // return next(new ApiError('Not authorized to access this route (no token)', 401));
    res.status(401).json({ success: false, message: 'Not authorized, no token' });
    return;
  }

  try {
    // Verify token
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined for token verification.');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload & { id: string };
    console.log('[[AUTH MIDDLEWARE]] Token decoded:', decoded);

    // Find user by ID from token (ensure user still exists)
    const user = await User.findById(decoded.id);

    if (!user) {
      console.log('[[AUTH MIDDLEWARE]] User not found for token ID');
      // return next(new ApiError('Not authorized to access this route (user not found)', 401));
      res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      return;
    }

    req.user = user; // Attach user to the request object
    console.log('[[AUTH MIDDLEWARE]] User attached to request:', req.user._id);
    next();
  } catch (err) {
    console.error('[[AUTH MIDDLEWARE]] Token verification failed:', err);
    // return next(new ApiError('Not authorized to access this route (token failed)', 401));
    res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};