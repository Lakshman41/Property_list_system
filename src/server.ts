// src/server.ts
console.log('Attempting to start server.ts...');

import app from './app.js'; // <--- UNCOMMENT
import { connectDB } from './config/index.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => { // <--- UNCOMMENT
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
    // console.log(`server.ts with DB connection executed.`); // Remove previous temp log
  } catch (error) {
    console.error('Failed to start the server:', error);
    process.exit(1);
  }
};

startServer();