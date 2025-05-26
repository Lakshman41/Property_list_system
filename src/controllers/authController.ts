// src/controllers/authController.ts
import { Request, Response, NextFunction } from 'express';
import User, { IUser } from '../models/User.js'; // Note .js
// You might want a custom error handler class later, e.g., ApiError
// import ApiError from '../utils/apiError.js';

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log('[[AUTHCONTROLLER.TS]] registerUser START');
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
      return;
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ success: false, message: 'User already exists with this email' });
      return;
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
    });

    sendTokenResponse(user, 201, res);
  } catch (error: any) {
    console.error('[[AUTHCONTROLLER.TS]] Error in registerUser:', error);
    // Handle Mongoose validation errors more gracefully
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((val: any) => val.message);
        res.status(400).json({ success: false, message: messages.join(', ') });
        return;
    }
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const loginUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log('[[AUTHCONTROLLER.TS]] loginUser START');
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Please provide an email and password' });
      return;
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password'); // Explicitly select password

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials (user not found)' });
      return;
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials (password mismatch)' });
      return;
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('[[AUTHCONTROLLER.TS]] Error in loginUser:', error);
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log('[[AUTHCONTROLLER.TS]] getMe START');
  try {
    // req.user is set by the protect middleware
    const user = await User.findById((req as any).user.id); // Type assertion for req.user

    if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('[[AUTHCONTROLLER.TS]] Error in getMe:', error);
    next(error);
  }
};

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user: IUser, statusCode: number, res: Response) => {
  const token = user.getSignedJwtToken();

  // Cookie options (consider security implications - HttpOnly, Secure in production)
  const options = {
    expires: new Date(
      Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRE || '30') * 24 * 60 * 60 * 1000) // JWT_COOKIE_EXPIRE in days
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Only secure (HTTPS) in production
    // sameSite: 'strict' as 'strict' | 'lax' | 'none' | undefined, // For CSRF protection
  };

  // Remove password from output if it was somehow selected
  const userOutput = { ...user.toObject() };
  delete userOutput.password;


  res
    .status(statusCode)
    .cookie('token', token, options) // Optionally send token in cookie
    .json({
      success: true,
      token, // Also send token in response body
      data: userOutput,
    });
};