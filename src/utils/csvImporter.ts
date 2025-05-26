// src/utils/csvImporter.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
// Corrected import with .js extension
import Property, { IProperty } from '../models/Property.js'; // <-- MODIFIED HERE

// Calculate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('Error: MONGO_URI is not defined in the .env file');
  process.exit(1);
}

const csvFilePath = path.resolve(__dirname, '../../dataset.csv');

const parseBoolean = (value: string | undefined): boolean => {
  if (!value) return false;
  return value.trim().toLowerCase() === 'true';
};

const parseFurnishingStatus = (value: string | undefined): IProperty['furnishingStatus'] => {
  if (!value) return 'Unfurnished';
  const lowerVal = value.trim().toLowerCase();
  if (lowerVal === 'furnished') return 'Furnished';
  if (lowerVal === 'semi' || lowerVal === 'semi-furnished') return 'Semi-Furnished';
  return 'Unfurnished';
};

const connectDBAndImport = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected for CSV import...');

    // await Property.deleteMany({});
    // console.log('Cleared existing properties.');

    const results: any[] = [];

    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        console.log(`CSV file successfully processed. ${results.length} rows found.`);

        if (results.length === 0) {
          console.log('No data to import.');
          await mongoose.disconnect();
          process.exit(0);
        }
        
        if (results.length > 0) {
            console.log('CSV Headers:', Object.keys(results[0]));
        }

        const propertiesToInsert: Partial<IProperty>[] = results.map((row, index) => {
          const price = parseFloat(row.price);
          const areaSqFt = parseFloat(row.areaSqFt);
          const bedrooms = parseInt(row.bedrooms, 10);
          const bathrooms = parseInt(row.bathrooms, 10);
          const rating = parseFloat(row.rating);
          const availableFrom = row.availableFrom ? new Date(row.availableFrom) : undefined;

          const propertyData: Partial<IProperty> = {
            originalId: row.id,
            title: row.title,
            propertyType: row.type,
            price: isNaN(price) ? 0 : price,
            locationState: row.state,
            locationCity: row.city,
            areaSqFt: isNaN(areaSqFt) ? 0 : areaSqFt,
            bedrooms: isNaN(bedrooms) ? 0 : bedrooms,
            bathrooms: isNaN(bathrooms) ? 0 : bathrooms,
            amenities: row.amenities ? row.amenities.split('|').map((a: string) => a.trim()) : [],
            furnishingStatus: parseFurnishingStatus(row.furnished),
            availableFrom: availableFrom && !isNaN(availableFrom.getTime()) ? availableFrom : undefined,
            listedBy: row.listedBy as IProperty['listedBy'],
            tags: row.tags ? row.tags.split('|').map((t: string) => t.trim()) : [],
            colorTheme: row.colorTheme,
            rating: isNaN(rating) ? undefined : rating,
            isVerified: parseBoolean(row.isVerified),
            listingType: row.listingType as IProperty['listingType'],
          };
          
          if (!propertyData.originalId || !propertyData.title || !propertyData.propertyType || !propertyData.price || !propertyData.locationState || !propertyData.locationCity) {
            console.warn(`Skipping row ${index + 2} due to missing essential data: ${JSON.stringify(row)}`);
            return null;
          }
          return propertyData;
        }).filter(p => p !== null) as IProperty[];

        if (propertiesToInsert.length > 0) {
          console.log(`Attempting to insert ${propertiesToInsert.length} valid properties...`);
          try {
            await Property.insertMany(propertiesToInsert, { ordered: false });
            console.log(`${propertiesToInsert.length} properties successfully imported!`);
          } catch (insertError: any) {
            console.error('Error inserting properties:');
            if (insertError.writeErrors) {
              insertError.writeErrors.forEach((err: any, i: number) => {
                 console.error(`Failed doc originalId ${err.err.op.originalId}: ${err.errmsg}`);
              });
              console.log(`${insertError.result.nInserted} documents inserted successfully out of ${propertiesToInsert.length}.`);
            } else {
                console.error(insertError);
            }
            console.log(`Some properties might not have been inserted due to errors. Check logs.`);
          }
        } else {
          console.log('No valid properties to insert after transformation and filtering.');
        }

        await mongoose.disconnect();
        console.log('MongoDB disconnected.');
        process.exit(0);
      })
      .on('error', (error) => {
        console.error('Error reading CSV:', error);
        mongoose.disconnect();
        process.exit(1);
      });
  } catch (error) {
    console.error('Failed to connect to DB or process CSV:', error);
    process.exit(1);
  }
};

connectDBAndImport();