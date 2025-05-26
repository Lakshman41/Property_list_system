// src/controllers/propertyController.ts
import { Request, Response, NextFunction } from 'express';
import Property, { IProperty } from '../models/Property.js'; // Ensure this path and .js extension are correct
import mongoose from 'mongoose';
import * as cacheService from '../services/cacheService.js';

// TTL constants for different cache types (in seconds)
const TTL_PROPERTY_ID = 3600; // 1 hour
const TTL_PROPERTY_LIST = 300;  // 5 minutes

// --- getAllProperties ---
export const getAllProperties = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log('[[PROPCONTROLLER.TS]] getAllProperties controller function START');
  try {
    // --- Cache Check ---
    const cacheKey = cacheService.generatePropertyListCacheKey(req.query);
    const cachedData = await cacheService.getFromCache<any>(cacheKey); // Assuming the cached data structure matches responseJson

    if (cachedData) {
      console.log(`[[PROPCONTROLLER.TS]] Cache HIT for properties list with key: ${cacheKey}`);
      res.status(200).json({ ...cachedData, source: 'cache' }); // Add source for debugging
      return;
    }
    console.log(`[[PROPCONTROLLER.TS]] Cache MISS for properties list with key: ${cacheKey}`);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // --- 1. Build Query Filter Object ---
    const queryFilter: mongoose.FilterQuery<IProperty> = {}; // Use mongoose.FilterQuery for better typing

    // String exact matches
    if (req.query.propertyType) queryFilter.propertyType = req.query.propertyType as string;
    if (req.query.locationState) queryFilter.locationState = req.query.locationState as string;
    if (req.query.locationCity) queryFilter.locationCity = req.query.locationCity as string;
    if (req.query.furnishingStatus) queryFilter.furnishingStatus = req.query.furnishingStatus as IProperty['furnishingStatus'];
    if (req.query.listedBy) queryFilter.listedBy = req.query.listedBy as IProperty['listedBy'];
    if (req.query.listingType) queryFilter.listingType = req.query.listingType as IProperty['listingType'];

    // Boolean
    if (req.query.isVerified) queryFilter.isVerified = req.query.isVerified === 'true';

    // Numerical ranges
    const buildRangeQuery = (field: keyof IProperty, minValStr?: string, maxValStr?: string) => {
      const range: any = {};
      if (minValStr) {
        const minVal = parseFloat(minValStr);
        if (!isNaN(minVal)) range.$gte = minVal;
      }
      if (maxValStr) {
        const maxVal = parseFloat(maxValStr);
        if (!isNaN(maxVal)) range.$lte = maxVal;
      }
      if (Object.keys(range).length > 0) {
        queryFilter[field] = range;
      }
    };

    buildRangeQuery('price', req.query.minPrice as string, req.query.maxPrice as string);
    buildRangeQuery('areaSqFt', req.query.minAreaSqFt as string, req.query.maxAreaSqFt as string);
    buildRangeQuery('bedrooms', req.query.minBedrooms as string, req.query.maxBedrooms as string);
    // If you want exact match for bedrooms/bathrooms as well:
    if (req.query.bedrooms && !req.query.minBedrooms && !req.query.maxBedrooms) {
        const beds = parseInt(req.query.bedrooms as string);
        if(!isNaN(beds)) queryFilter.bedrooms = beds;
    }
    buildRangeQuery('bathrooms', req.query.minBathrooms as string, req.query.maxBathrooms as string);
    if (req.query.bathrooms && !req.query.minBathrooms && !req.query.maxBathrooms) {
        const baths = parseInt(req.query.bathrooms as string);
        if(!isNaN(baths)) queryFilter.bathrooms = baths;
    }
    buildRangeQuery('rating', req.query.minRating as string, req.query.maxRating as string);


    // Date range for availableFrom
    if (req.query.availableAfter || req.query.availableBefore) {
        queryFilter.availableFrom = {};
        if (req.query.availableAfter) {
            const dateAfter = new Date(req.query.availableAfter as string);
            if (!isNaN(dateAfter.getTime())) (queryFilter.availableFrom as any).$gte = dateAfter;
        }
        if (req.query.availableBefore) {
            const dateBefore = new Date(req.query.availableBefore as string);
            if (!isNaN(dateBefore.getTime())) (queryFilter.availableFrom as any).$lte = dateBefore;
        }
        if (Object.keys(queryFilter.availableFrom).length === 0) delete queryFilter.availableFrom;
    }


    // Array fields (amenities, tags) - assuming comma-separated query param
    // Use $all: requires all specified amenities/tags to be present
    // Use $in: requires at least one of the specified amenities/tags to be present
    const buildArrayQuery = (field: keyof IProperty, valuesStr?: string, operator: '$all' | '$in' = '$all') => {
      if (valuesStr) {
        const valuesArray = valuesStr.split(',').map(item => item.trim()).filter(item => item.length > 0);
        if (valuesArray.length > 0) {
          queryFilter[field] = { [operator]: valuesArray };
        }
      }
    };
    // Example: default to $all for amenities, $in for tags (or choose based on desired logic)
    buildArrayQuery('amenities', req.query.amenities as string, '$all');
    buildArrayQuery('tags', req.query.tags as string, '$in');


    // Text search
    if (req.query.keywords) {
      queryFilter.$text = { $search: req.query.keywords as string };
    }

    console.log('[[PROPCONTROLLER.TS]] Querying DB with filter:', JSON.stringify(queryFilter));

    // --- 2. Build Sort Object ---
    let sortOptions: any = { createdAt: -1 }; // Default sort: newest first
    if (req.query.sortBy) {
      const sortByStr = req.query.sortBy as string;
      const [field, order] = sortByStr.split('_'); // e.g., "price_asc" or "rating_desc"
      if (field && order) {
        // Whitelist sortable fields to prevent arbitrary sorting on any field
        const allowedSortFields = ['price', 'createdAt', 'updatedAt', 'areaSqFt', 'bedrooms', 'bathrooms', 'rating'];
        if (allowedSortFields.includes(field)) {
            sortOptions = { [field]: order === 'asc' ? 1 : -1 };
        } else {
            console.warn(`[[PROPCONTROLLER.TS]] Invalid sortBy field: ${field}. Defaulting to createdAt_desc.`);
        }
      }
    }
    console.log('[[PROPCONTROLLER.TS]] Sorting with options:', sortOptions);


    // --- 3. Execute Query ---
    const properties = await Property.find(queryFilter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    const totalProperties = await Property.countDocuments(queryFilter);
    const totalPages = Math.ceil(totalProperties / limit);

    console.log('[[PROPCONTROLLER.TS]] Properties found after filter/sort:', properties.length);
    console.log('[[PROPCONTROLLER.TS]] Total properties count after filter:', totalProperties);

    const responseJson = {
      success: true,
      count: properties.length,
      totalProperties,
      totalPages: totalPages > 0 ? totalPages : 0,
      currentPage: page,
      filtersApplied: req.query, // Optionally echo back the filters used
      data: properties,
    };

    // --- Set to Cache ---
    await cacheService.setToCache(cacheKey, responseJson, TTL_PROPERTY_LIST);

    console.log('[[PROPCONTROLLER.TS]] Sending response from DB, data set to cache.');
    res.status(200).json({ ...responseJson, source: 'database' }); // Add source for debugging

  } catch (error) {
    console.error('[[PROPCONTROLLER.TS]] Error in getAllProperties:', error);
    next(error);
  }
};

// --- getPropertyById ---
export const getPropertyById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log(`[[PROPCONTROLLER.TS]] getPropertyById controller function START for ID: ${req.params.id}`);
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ success: false, message: 'Invalid property ID format' });
      return;
    }

    // --- Cache Check ---
    const cacheKey = cacheService.CACHE_KEYS.PROPERTY_BY_ID(req.params.id);
    const cachedProperty = await cacheService.getFromCache<IProperty>(cacheKey);

    if (cachedProperty) {
      console.log(`[[PROPCONTROLLER.TS]] Cache HIT for property ID: ${req.params.id}`);
      res.status(200).json({ success: true, data: cachedProperty, source: 'cache' });
      return;
    }
    console.log(`[[PROPCONTROLLER.TS]] Cache MISS for property ID: ${req.params.id}`);

    // --- DB Query (if cache miss) ---
    const property = await Property.findById(req.params.id).lean();

    if (!property) {
      res.status(404).json({ success: false, message: 'Property not found' });
      return;
    }

    // --- Set to Cache ---
    await cacheService.setToCache(cacheKey, property, TTL_PROPERTY_ID);

    console.log('[[PROPCONTROLLER.TS]] Sending response from DB, property set to cache.');
    res.status(200).json({ success: true, data: property, source: 'database' });

  } catch (error) {
    console.error(`[[PROPCONTROLLER.TS]] Error in getPropertyById for ID ${req.params.id}:`, error);
    next(error);
  }
};

export const createProperty = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  console.log('[[PROPCONTROLLER.TS]] createProperty controller function START');
  try {
    // More robust check for required fields based on your schema
    const {
        originalId, title, propertyType, price, locationState, locationCity,
        areaSqFt, bedrooms, bathrooms, furnishingStatus, listedBy, isVerified, listingType,
        // Potentially other required fields from your schema
    } = req.body;

    // Example of a more comprehensive check:
    const requiredFields = ['originalId', 'title', 'propertyType', 'price', 'locationState', 'locationCity', 'areaSqFt', 'bedrooms', 'bathrooms', 'furnishingStatus', 'listedBy', 'isVerified', 'listingType'];
    const missingFields = requiredFields.filter(field => !(field in req.body) || req.body[field] === null || req.body[field] === undefined || req.body[field] === '');
    
    if (missingFields.length > 0) {
      console.log('[[PROPCONTROLLER.TS]] Missing required fields:', missingFields.join(', '));
      res.status(400).json({ success: false, message: `Please provide all required fields. Missing: ${missingFields.join(', ')}` });
      return;
    }

    // Ensure req.user is asserted or checked
    if (!(req as any).user || !(req as any).user._id) {
      console.error('[[PROPCONTROLLER.TS]] User not authenticated for createProperty');
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }
    const userId = (req as any).user._id;
    const newPropertyData = { ...req.body, createdBy: userId }; // Assign createdBy
    console.log('[[PROPCONTROLLER.TS]] Attempting to create property with data (and createdBy):', newPropertyData);

    const property = await Property.create(newPropertyData);
    console.log('[[PROPCONTROLLER.TS]] Property created successfully:', property);

    // --- Cache Invalidation ---
    console.log('[[PROPCONTROLLER.TS]] Property created. Invalidating relevant caches.');
    await cacheService.clearCacheByPattern('properties_list:*'); // Clear all list caches

    res.status(201).json({ success: true, data: property });

  } catch (error: any) {
    console.error('[[PROPCONTROLLER.TS]] Error in createProperty:', error);
    if (error.code === 11000 && error.keyPattern && error.keyPattern.originalId) {
      console.log(`[[PROPCONTROLLER.TS]] Duplicate originalId: ${error.keyValue.originalId}`);
      res.status(400).json({ success: false, message: `Property with originalId '${error.keyValue.originalId}' already exists.` });
      return;
    }
    next(error);
  }
};

export const updatePropertyById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  console.log(`[[PROPCONTROLLER.TS]] updatePropertyById controller function START for ID: ${req.params.id}`);
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        console.log('[[PROPCONTROLLER.TS]] Invalid property ID format for update');
        res.status(400).json({ success: false, message: 'Invalid property ID format' });
        return;
    }
    
    let propertyToUpdate = await Property.findById(req.params.id);

    if (!propertyToUpdate) {
      console.log('[[PROPCONTROLLER.TS]] Property not found for update');
      res.status(404).json({ success: false, message: 'Property not found' });
      return;
    }

    // Ownership check
    if (!(req as any).user || !(req as any).user._id) {
      console.error('[[PROPCONTROLLER.TS]] User not authenticated for updatePropertyById');
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }
    const userId = (req as any).user._id;
    if (propertyToUpdate.createdBy && propertyToUpdate.createdBy.toString() !== userId.toString()) {
        console.log(`[[PROPCONTROLLER.TS]] User ${userId} not authorized to update property ${propertyToUpdate._id} owned by ${propertyToUpdate.createdBy}`);
        res.status(403).json({ success: false, message: 'User not authorized to update this property' });
        return;
    }

    // Prevent updating originalId
    if (req.body.originalId && req.body.originalId !== propertyToUpdate.originalId) {
        console.warn("[[PROPCONTROLLER.TS]] Attempt to update originalId was blocked.");
        delete req.body.originalId;
    }
    // Prevent updating createdBy manually if it exists (should be system managed)
    if (req.body.createdBy) {
        delete req.body.createdBy;
    }

    console.log('[[PROPCONTROLLER.TS]] Attempting to update property with data:', req.body);
    const updatedProperty = await Property.findByIdAndUpdate(req.params.id, req.body, {
      new: true,           // Return the modified document rather than the original
      runValidators: true, // Ensures new data adheres to schema validations
    });

    console.log('[[PROPCONTROLLER.TS]] Property updated successfully:', updatedProperty);

    // --- Cache Invalidation ---
    console.log(`[[PROPCONTROLLER.TS]] Property updated. Invalidating relevant caches for ID: ${req.params.id}`);
    await cacheService.deleteFromCache(cacheService.CACHE_KEYS.PROPERTY_BY_ID(req.params.id));
    await cacheService.clearCacheByPattern('properties_list:*');

    res.status(200).json({ success: true, data: updatedProperty });

  } catch (error) {
    console.error(`[[PROPCONTROLLER.TS]] Error in updatePropertyById for ID ${req.params.id}:`, error);
    next(error);
  }
};

export const deletePropertyById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  console.log(`[[PROPCONTROLLER.TS]] deletePropertyById controller function START for ID: ${req.params.id}`);
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        console.log('[[PROPCONTROLLER.TS]] Invalid property ID format for delete');
        res.status(400).json({ success: false, message: 'Invalid property ID format' });
        return;
    }
    
    const property = await Property.findById(req.params.id);

    if (!property) {
      console.log('[[PROPCONTROLLER.TS]] Property not found for delete');
      res.status(404).json({ success: false, message: 'Property not found' });
      return;
    }

    // Ownership check
    if (!(req as any).user || !(req as any).user._id) {
      console.error('[[PROPCONTROLLER.TS]] User not authenticated for deletePropertyById');
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }
    const userId = (req as any).user._id;
    if (property.createdBy && property.createdBy.toString() !== userId.toString()) {
      console.log(`[[PROPCONTROLLER.TS]] User ${userId} not authorized to delete property ${property._id} owned by ${property.createdBy}`);
      res.status(403).json({ success: false, message: 'User not authorized to delete this property' });
      return;
    }
    
    await property.deleteOne();
    console.log('[[PROPCONTROLLER.TS]] Property deleted successfully');

    // --- Cache Invalidation ---
    console.log(`[[PROPCONTROLLER.TS]] Property deleted. Invalidating relevant caches for ID: ${req.params.id}`);
    await cacheService.deleteFromCache(cacheService.CACHE_KEYS.PROPERTY_BY_ID(req.params.id));
    await cacheService.clearCacheByPattern('properties_list:*');

    res.status(200).json({ success: true, message: 'Property deleted successfully' });

  } catch (error) {
    console.error(`[[PROPCONTROLLER.TS]] Error in deletePropertyById for ID ${req.params.id}:`, error);
    next(error);
  }
};

// Helper function to fill in missing parts from your previous controller for brevity
const buildRangeQuery = (field: keyof IProperty, minValStr?: string, maxValStr?: string, queryFilter?: any) => {
  if (!queryFilter) return;
  const range: any = {};
  if (minValStr) {
    const minVal = parseFloat(minValStr);
    if (!isNaN(minVal)) range.$gte = minVal;
  }
  if (maxValStr) {
    const maxVal = parseFloat(maxValStr);
    if (!isNaN(maxVal)) range.$lte = maxVal;
  }
  if (Object.keys(range).length > 0) {
    queryFilter[field] = range;
  }
};
const buildArrayQuery = (field: keyof IProperty, valuesStr?: string, operator: '$all' | '$in' = '$all', queryFilter?: any) => {
  if (!queryFilter) return;
  if (valuesStr) {
    const valuesArray = valuesStr.split(',').map(item => item.trim()).filter(item => item.length > 0);
    if (valuesArray.length > 0) {
      queryFilter[field] = { [operator]: valuesArray };
    }
  }
};