// src/models/Property.ts
import mongoose, { Schema, Document } from 'mongoose';

// Define an interface representing a document in MongoDB.
export interface IProperty extends Document {
  originalId: string; // From CSV 'id' column
  title: string;
  propertyType: string; // From CSV 'type' column
  price: number;
  locationState: string; // From CSV 'state' column
  locationCity: string; // From CSV 'city' column
  areaSqFt: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[]; // Parsed from pipe-separated CSV 'amenities' column
  furnishingStatus: 'Furnished' | 'Semi-Furnished' | 'Unfurnished'; // From CSV 'furnished' column
  availableFrom?: Date; // From CSV 'availableFrom' column
  listedBy: 'Builder' | 'Owner' | 'Agent'; // From CSV 'listedBy' column
  tags: string[]; // Parsed from pipe-separated CSV 'tags' column
  colorTheme?: string; // From CSV 'colorTheme' column
  rating?: number; // From CSV 'rating' column
  isVerified: boolean; // From CSV 'isVerified' column
  listingType: 'rent' | 'sale'; // From CSV 'listingType' column

  // Fields managed by our system
  createdBy?: mongoose.Schema.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const PropertySchema: Schema = new Schema(
  {
    originalId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    propertyType: { type: String, required: true, trim: true, index: true }, // e.g., 'Apartment', 'Villa'
    price: { type: Number, required: true, min: 0 },
    locationState: { type: String, required: true, trim: true, index: true },
    locationCity: { type: String, required: true, trim: true, index: true },
    areaSqFt: { type: Number, required: true, min: 0 },
    bedrooms: { type: Number, required: true, min: 0 },
    bathrooms: { type: Number, required: true, min: 0 },
    amenities: [{ type: String, trim: true }],
    furnishingStatus: {
      type: String,
      required: true,
      enum: ['Furnished', 'Semi-Furnished', 'Unfurnished'], // Standardize based on CSV values like "Semi"
    },
    availableFrom: { type: Date },
    listedBy: {
      type: String,
      required: true,
      enum: ['Builder', 'Owner', 'Agent'],
      index: true
    },
    tags: [{ type: String, trim: true }],
    colorTheme: { type: String, trim: true },
    rating: { type: Number, min: 0, max: 5 },
    isVerified: { type: Boolean, required: true, default: false },
    listingType: {
      type: String,
      required: true,
      enum: ['rent', 'sale'],
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Text index for broader search capabilities
PropertySchema.index({
  title: 'text',
  propertyType: 'text',
  locationState: 'text',
  locationCity: 'text',
  tags: 'text',
  amenities: 'text',
  // 'description' is not in CSV, if it were, it would be good here
});

// Indexing common filter fields
PropertySchema.index({ price: 1 });
PropertySchema.index({ bedrooms: 1 });
PropertySchema.index({ bathrooms: 1 });
PropertySchema.index({ areaSqFt: 1 });
PropertySchema.index({ furnishingStatus: 1 });
PropertySchema.index({ rating: 1 });
PropertySchema.index({ isVerified: 1 });

const Property = mongoose.model<IProperty>('Property', PropertySchema);
export default Property;