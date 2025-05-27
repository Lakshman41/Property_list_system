// src/models/User.ts
import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Define the structure of a single recommendation
export interface IRecommendation {
  property: mongoose.Types.ObjectId; // Reference to the Property model
  recommendedBy: mongoose.Types.ObjectId; // Reference to the User model (who recommended it)
  message?: string; // Optional message from the recommender
  recommendedAt: Date;
}

// Interface for User document
export interface IUser extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password?: string; // Optional because it will be selected explicitly or not returned
  favorites: mongoose.Types.ObjectId[];
  recommendationsReceived: IRecommendation[];
  createdAt: Date;
  updatedAt: Date;
  // Instance methods
  matchPassword(enteredPassword: string): Promise<boolean>;
  getSignedJwtToken(): string;
  // For later tasks (can be added when needed)
  // favorites: mongoose.Types.ObjectId[];
  // recommendationsReceived: {
  //   property: mongoose.Types.ObjectId;
  //   recommendedBy: mongoose.Types.ObjectId;
  //   recommendedAt: Date;
  // }[];
}

// Interface for User model statics (if any, not strictly needed here yet)
// interface IUserModel extends Model<IUser> {
//   // any static methods here
// }

const UserSchema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Don't return password by default
    },
    favorites: [
      { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Property' 
      }
    ],
    recommendationsReceived: [ // <--- ADD THIS SCHEMA DEFINITION
      {
        property: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Property', // References the 'Property' model
          required: true,
        },
        recommendedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User', // References the 'User' model
          required: true,
        },
        message: {
          type: String,
          trim: true,
          maxlength: [500, 'Recommendation message cannot be more than 500 characters'],
        },
        recommendedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Encrypt password using bcrypt before saving
UserSchema.pre<IUser>('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to match entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate and sign a JWT
UserSchema.methods.getSignedJwtToken = function (): string {
    if (!process.env.JWT_SECRET) {
      console.error('FATAL ERROR: JWT_SECRET is not defined.');
      process.exit(1);
    }
  
    const secret: jwt.Secret = process.env.JWT_SECRET;
  
    // Convert '30d' to seconds (30 days * 24 hours * 60 minutes * 60 seconds)
    const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
    let expiresInSeconds: number;
  
    if (process.env.JWT_EXPIRE_SECONDS && !isNaN(parseInt(process.env.JWT_EXPIRE_SECONDS))) {
      expiresInSeconds = parseInt(process.env.JWT_EXPIRE_SECONDS);
    } else {
      expiresInSeconds = thirtyDaysInSeconds;
      console.warn(`JWT_EXPIRE_SECONDS environment variable not set or invalid, defaulting to ${thirtyDaysInSeconds} seconds (30 days).`);
    }
  
    const options: jwt.SignOptions = {
      expiresIn: expiresInSeconds, // Use a number (seconds)
    };
  
    console.log(`[[USER MODEL]] Signing JWT with ID: ${this._id}, expiresIn (seconds): ${expiresInSeconds}`);
    return jwt.sign({ id: this._id }, secret, options);
};
  
const User = mongoose.model<IUser>('User', UserSchema);

export default User;