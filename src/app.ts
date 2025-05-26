// src/app.ts
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import propertyRoutes from './routes/propertyRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';

dotenv.config(); // Potentially redundant if server.ts also calls it, but harmless

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[[APP.TS]] Incoming Request: ${req.method} ${req.originalUrl}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`[[APP.TS]] Request Body:`, req.body);
  }
  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[[APP.TS]] Incoming Request: ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/', (req: Request, res: Response) => {
  res.send('Property Listing API is running!');
});

app.use('/api/v1/properties', propertyRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({
    success: false,
    message: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

export default app;